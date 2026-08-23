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

async function seedItemsIfMissing(){
  const snap = await db.collection('items').get();
  const existingIds = new Set();
  snap.forEach(doc => existingIds.add(doc.id));

  const seeds = DEFAULT_ITEMS.filter(def => !existingIds.has(def.id));
  for(const def of seeds){
    const sizes = {};
    def.sizes.forEach(label => { sizes[label] = 0; });
    await db.collection('items').doc(def.id).set({
      name: def.name,
      icon: def.icon,
      color: def.color,
      sellPrice: def.sellPrice,
      threshold: DEFAULT_THRESHOLD,
      sizes
    });
  }
}

function subscribeAll(){
  seedItemsIfMissing().catch(()=>{});

  db.collection('items').onSnapshot(snap=>{
    const items = [];
    snap.forEach(doc=>{
      const d = doc.data();
      const def = DEFAULT_ITEMS.find(x => x.id === doc.id);
      const labels = def ? def.sizes : Object.keys(d.sizes || {});
      const sizes = labels.map(label => ({
        id: doc.id + '-' + label,
        label,
        sellPrice: d.sellPrice,
        qty: (d.sizes && d.sizes[label]) || 0,
        threshold: d.threshold != null ? d.threshold : DEFAULT_THRESHOLD
      }));
      items.push({ id: doc.id, name: d.name, icon: d.icon, color: d.color, sizes });
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
  if(stockActive && typeof renderStock === 'function') renderStock();
  if(historyActive && typeof renderHistory === 'function') renderHistory();
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
    const current = (data.sizes && data.sizes[size.label]) || 0;
    const next = Math.max(0, current + delta);
    t.update(itemRef, { [`sizes.${size.label}`]: next });
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

async function cloudDeleteTransaction(txn){
  const itemRef = db.collection('items').doc(txn.itemId);
  const delta = txn.type === 'sale' ? txn.qty : -txn.qty; // reverse its effect

  await db.runTransaction(async (t)=>{
    const doc = await t.get(itemRef);
    if(!doc.exists) return;
    const data = doc.data();
    const current = (data.sizes && data.sizes[txn.sizeLabel]) || 0;
    const next = Math.max(0, current + delta);
    t.update(itemRef, { [`sizes.${txn.sizeLabel}`]: next });
  });

  await db.collection('transactions').doc(txn.id).delete();
}

async function cloudUpdateItemPricing(itemId, sellPrice, threshold){
  await db.collection('items').doc(itemId).update({ sellPrice, threshold });
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
    const sizes = {};
    def.sizes.forEach(label => { sizes[label] = 0; });
    await db.collection('items').doc(def.id).set({
      name: def.name,
      icon: def.icon,
      color: def.color,
      sellPrice: def.sellPrice,
      threshold: DEFAULT_THRESHOLD,
      sizes
    });
  }
}

initSync();
