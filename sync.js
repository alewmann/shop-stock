/* sync.js — shared, real-time stock data across every phone running this app */
let state = { items: [], transactions: [], barcodeMap: {} };
let db = null;
let syncConnected = false;

function initSync(){
  try{
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    db.enablePersistence({ synchronizeTabs: true }).catch(()=>{ /* fine if unsupported */ });

    firebase.auth().onAuthStateChanged(user=>{
      if(user){
        syncConnected = true;
        updateSyncBadge(true);
        subscribeAll();
      }
    });
    firebase.auth().signInAnonymously().catch(()=>{
      updateSyncBadge(false);
      showToastSafe('Could not connect to shared data. Check your internet connection.');
    });
  }catch(e){
    updateSyncBadge(false);
    showToastSafe('Cloud sync is not set up for this app yet.');
  }
}

function showToastSafe(msg){
  if(typeof showToast === 'function') showToast(msg);
}

function updateSyncBadge(connected){
  const el = document.getElementById('syncBadge');
  if(!el) return;
  el.textContent = connected ? 'Synced' : 'Offline';
  el.className = 'sync-badge ' + (connected ? 'sync-on' : 'sync-off');
}

function blankSizesMap(def){
  const sizes = {};
  def.sizes.forEach(label => {
    sizes[label] = { qty: 0, sellPrice: def.sellPrice, threshold: DEFAULT_THRESHOLD };
  });
  return sizes;
}

async function seedItemsIfMissing(){
  const snap = await db.collection('items').get();
  const existingIds = new Set();
  snap.forEach(doc => existingIds.add(doc.id));

  const seeds = DEFAULT_ITEMS.filter(def => !existingIds.has(def.id));
  for(const def of seeds){
    await db.collection('items').doc(def.id).set({
      name: def.name,
      icon: def.icon,
      color: def.color,
      sizes: blankSizesMap(def)
    });
  }
}

/* Older versions of this app stored sizes as plain numbers (label -> qty).
   If we see that shape, upgrade it in place to the new per-size
   {qty, sellPrice, threshold} object shape, without losing any stock counts. */
async function migrateItemIfNeeded(docId, data){
  const def = DEFAULT_ITEMS.find(x => x.id === docId);
  if(!def || !data.sizes) return;
  const labels = Object.keys(data.sizes);
  const needsMigration = labels.some(l => typeof data.sizes[l] === 'number');
  if(!needsMigration) return;

  const fallbackPrice = data.sellPrice || def.sellPrice;
  const fallbackThreshold = data.threshold != null ? data.threshold : DEFAULT_THRESHOLD;
  const newSizes = {};
  def.sizes.forEach(label=>{
    const old = data.sizes[label];
    newSizes[label] = (typeof old === 'number')
      ? { qty: old, sellPrice: fallbackPrice, threshold: fallbackThreshold }
      : (old || { qty: 0, sellPrice: fallbackPrice, threshold: fallbackThreshold });
  });
  try{
    await db.collection('items').doc(docId).set({ sizes: newSizes }, { merge: true });
  }catch(e){ /* another device may have migrated it already — fine either way */ }
}

function subscribeAll(){
  seedItemsIfMissing().catch(()=>{});

  db.collection('items').onSnapshot(snap=>{
    const items = [];
    snap.forEach(doc=>{
      const d = doc.data();
      const def = DEFAULT_ITEMS.find(x => x.id === doc.id);
      if(!def) return; // ignore any leftover/old item docs no longer in the catalog

      migrateItemIfNeeded(doc.id, d);

      const sizes = def.sizes.map(label=>{
        const raw = d.sizes && d.sizes[label];
        const isOldNumber = typeof raw === 'number';
        return {
          id: doc.id + '-' + label,
          label,
          qty: isOldNumber ? raw : ((raw && raw.qty) || 0),
          sellPrice: isOldNumber ? (d.sellPrice || def.sellPrice) : ((raw && raw.sellPrice) || def.sellPrice),
          threshold: isOldNumber ? (d.threshold != null ? d.threshold : DEFAULT_THRESHOLD) : ((raw && raw.threshold != null) ? raw.threshold : DEFAULT_THRESHOLD)
        };
      });
      items.push({ id: doc.id, name: def.name, icon: def.icon, color: def.color, sizes });
    });
    items.sort((a,b) => DEFAULT_ITEMS.findIndex(x=>x.id===a.id) - DEFAULT_ITEMS.findIndex(x=>x.id===b.id));
    state.items = items;
    refreshCurrentScreen();
  }, ()=> updateSyncBadge(false));

  db.collection('transactions').orderBy('timestamp','desc').limit(500).onSnapshot(snap=>{
    const txns = [];
    snap.forEach(doc => txns.push({ id: doc.id, ...doc.data() }));
    state.transactions = txns;
    refreshCurrentScreen();
  }, ()=> updateSyncBadge(false));

  db.collection('barcodes').onSnapshot(snap=>{
    const map = {};
    snap.forEach(doc => { map[doc.id] = doc.data(); });
    state.barcodeMap = map;
  }, ()=> updateSyncBadge(false));
}

function refreshCurrentScreen(){
  const stockActive = document.getElementById('screen-stock') && document.getElementById('screen-stock').classList.contains('active');
  const historyActive = document.getElementById('screen-history') && document.getElementById('screen-history').classList.contains('active');
  const settingsActive = document.getElementById('screen-settings') && document.getElementById('screen-settings').classList.contains('active');
  if(stockActive && typeof renderStock === 'function') renderStock();
  if(historyActive && typeof renderHistory === 'function') renderHistory();
  if(settingsActive && typeof renderSettings === 'function') renderSettings();
  if(typeof updateLowStockUI === 'function') updateLowStockUI();
}

/* ---------- writes (all shared instantly across every device) ---------- */

async function cloudRecordTransaction(item, size, mode, qty){
  const amount = mode === 'sale' ? size.sellPrice * qty : 0;
  const delta = mode === 'sale' ? -qty : qty;
  const itemRef = db.collection('items').doc(item.id);

  await db.runTransaction(async (t)=>{
    const doc = await t.get(itemRef);
    const data = doc.data() || {};
    const raw = data.sizes && data.sizes[size.label];
    const current = typeof raw === 'number' ? raw : ((raw && raw.qty) || 0);
    const next = Math.max(0, current + delta);
    t.update(itemRef, { [`sizes.${size.label}.qty`]: next });
  });

  await db.collection('transactions').add({
    itemId: item.id,
    itemName: item.name,
    sizeId: size.id,
    sizeLabel: size.label,
    type: mode,
    qty,
    amount,
    timestamp: Date.now()
  });
}

/* Recompute a size's stock from the full remaining transaction history,
   rather than applying a simple delta — this keeps stock consistent no
   matter what order transactions are deleted in. */
async function recomputeSizeQty(itemId, sizeLabel){
  const snap = await db.collection('transactions').where('itemId','==',itemId).get();
  let sum = 0;
  snap.forEach(doc=>{
    const d = doc.data();
    if(d.sizeLabel !== sizeLabel) return;
    sum += d.type === 'sale' ? -d.qty : d.qty;
  });
  return Math.max(0, sum);
}

async function cloudDeleteTransaction(txn){
  // delete first, then recompute from what's left — so the deleted
  // transaction is correctly excluded from the recalculated total
  await db.collection('transactions').doc(txn.id).delete();
  const newQty = await recomputeSizeQty(txn.itemId, txn.sizeLabel);
  await db.collection('items').doc(txn.itemId).update({ [`sizes.${txn.sizeLabel}.qty`]: newQty });
}

async function cloudUpdateSizePricing(itemId, sizeLabel, sellPrice, threshold){
  await db.collection('items').doc(itemId).update({
    [`sizes.${sizeLabel}.sellPrice`]: sellPrice,
    [`sizes.${sizeLabel}.threshold`]: threshold
  });
}

async function cloudSaveBarcode(code, itemId, sizeId, sizeLabel){
  await db.collection('barcodes').doc(code).set({ itemId, sizeId, sizeLabel });
}

async function cloudResetBarcodes(){
  const snap = await db.collection('barcodes').get();
  const deletes = [];
  snap.forEach(doc => deletes.push(doc.ref.delete()));
  await Promise.all(deletes);
}

async function cloudResetAll(){
  const txnsSnap = await db.collection('transactions').get();
  const bcSnap = await db.collection('barcodes').get();
  const deletes = [];
  txnsSnap.forEach(doc => deletes.push(doc.ref.delete()));
  bcSnap.forEach(doc => deletes.push(doc.ref.delete()));
  await Promise.all(deletes);

  for(const def of DEFAULT_ITEMS){
    await db.collection('items').doc(def.id).set({
      name: def.name,
      icon: def.icon,
      color: def.color,
      sizes: blankSizesMap(def)
    });
  }
}

initSync();
