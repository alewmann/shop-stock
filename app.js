let expandedItemId = null;
let flow = null; // {mode:'sale'|'restock', item, size, qty}

/* ---------- icons ---------- */
function itemEmoji(key){
  const emoji = {
    tshirt: '👕',
    shirt: '👔',
    trouser: '👖',
    sweater: '🧶',
    coat: '🧥',
    shoe: '👟'
  };
  return emoji[key] || '🛍️';
}
function iconBadge(item){
  const grad = item.color ? `background:linear-gradient(155deg, ${item.color[0]}, ${item.color[1]});` : '';
  return `<div class="item-icon" style="${grad}">${itemEmoji(item.icon)}</div>`;
}
const checkIcon = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 12.5 L9.5 18 L20 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const chevronIcon = '<svg class="chevron" viewBox="0 0 24 24" width="18" height="18"><path d="M6 9 L12 15 L18 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------- helpers ---------- */
function fmtBirr(n){ return Math.round(n).toLocaleString() + ' birr'; }
function totalQty(item){ return item.sizes.reduce((s,v)=>s+v.qty,0); }
function hasLowStock(item){ return item.sizes.some(s=>s.qty <= s.threshold); }
function anyLowStock(){ return state.items.some(hasLowStock); }
function lowStockCount(){
  let c = 0;
  state.items.forEach(it => it.sizes.forEach(s => { if(s.qty <= s.threshold) c++; }));
  return c;
}
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(showToast._h);
  showToast._h = setTimeout(()=>{ t.hidden = true; }, 2200);
}
function uid(){ return Math.random().toString(36).slice(2,10); }

/* ---------- navigation ---------- */
function showScreen(name){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
  document.querySelectorAll('.navbtn').forEach(b=>{
    b.classList.toggle('active', b.dataset.screen === name);
  });
  if(name === 'stock') renderStock();
  if(name === 'history') renderHistory();
  if(name === 'settings') renderSettings();
}

document.querySelectorAll('.navbtn[data-screen]').forEach(btn=>{
  btn.addEventListener('click', ()=> showScreen(btn.dataset.screen));
});
document.querySelector('[data-action="new-sale"]').addEventListener('click', ()=> startFlow('sale'));
document.querySelector('[data-action="new-restock"]').addEventListener('click', ()=> startFlow('restock'));

document.getElementById('lowStockBtn').addEventListener('click', ()=>{
  showScreen('stock');
  window.scrollTo({top:0,behavior:'smooth'});
});
document.getElementById('lowStockBanner').addEventListener('click', ()=>{
  showScreen('stock');
});
document.getElementById('scanBtn').addEventListener('click', ()=>{
  if(typeof openScanner === 'function') openScanner(handleScannedCode);
});

/* ---------- STOCK SCREEN ---------- */
function renderDashboard(){
  const totalUnits = state.items.reduce((s,it)=>s+totalQty(it),0);
  const today0 = new Date(); today0.setHours(0,0,0,0);
  const todaysSales = state.transactions.filter(t=>t.type==='sale' && t.timestamp >= today0.getTime());
  const todaysRevenue = todaysSales.reduce((s,t)=>s+t.amount,0);
  const lowCount = lowStockCount();

  const wrap = document.getElementById('dashStats');
  wrap.innerHTML = `
    <div class="dash-greeting">
      <div class="dash-eyebrow">${greetingLabel()}</div>
      <div class="dash-date">${new Date().toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'})}</div>
    </div>
    <div class="dash-grid">
      <div class="dash-card">
        <div class="dash-card-label">Today's revenue</div>
        <div class="dash-card-val">${fmtBirr(todaysRevenue)}</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-label">Units in stock</div>
        <div class="dash-card-val">${totalUnits}</div>
      </div>
      <div class="dash-card ${lowCount>0 ? 'dash-card-warn' : ''}">
        <div class="dash-card-label">Low stock</div>
        <div class="dash-card-val">${lowCount}</div>
      </div>
    </div>
  `;
}

function greetingLabel(){
  const h = new Date().getHours();
  if(h < 12) return 'Good morning';
  if(h < 17) return 'Good afternoon';
  return 'Good evening';
}

function renderStock(){
  renderDashboard();
  const grid = document.getElementById('itemGrid');
  grid.innerHTML = '';
  state.items.forEach(item=>{
    const card = document.createElement('div');
    card.className = 'item-card' + (expandedItemId === item.id ? ' expanded' : '');
    const low = hasLowStock(item);
    card.innerHTML = `
      <div class="row">
        ${iconBadge(item)}
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-sub">${totalQty(item)} in stock</div>
        </div>
        ${low ? '<span class="item-flag"></span>' : ''}
        ${chevronIcon}
      </div>
    `;
    if(expandedItemId === item.id){
      const sizeList = document.createElement('div');
      sizeList.className = 'size-list';
      sizeList.innerHTML = item.sizes.map(s => `
        <div class="size-row ${s.qty <= s.threshold ? 'low' : ''}">
          <span class="size-label">${s.label}</span>
          <span class="size-qty">${s.qty} left</span>
        </div>
      `).join('');
      const actions = document.createElement('div');
      actions.className = 'card-actions';
      actions.innerHTML = `
        <button class="primary" data-sale="${item.id}">Record sale</button>
        <button data-restock="${item.id}">Restock</button>
      `;
      card.appendChild(sizeList);
      card.appendChild(actions);
      actions.querySelector('[data-sale]').addEventListener('click', e=>{
        e.stopPropagation();
        startFlow('sale', item);
      });
      actions.querySelector('[data-restock]').addEventListener('click', e=>{
        e.stopPropagation();
        startFlow('restock', item);
      });
    }
    card.addEventListener('click', ()=>{
      expandedItemId = expandedItemId === item.id ? null : item.id;
      renderStock();
    });
    grid.appendChild(card);
  });
  updateLowStockUI();
}

function updateLowStockUI(){
  const count = lowStockCount();
  const dot = document.getElementById('lowStockDot');
  const banner = document.getElementById('lowStockBanner');
  dot.hidden = count === 0;
  if(count > 0){
    banner.hidden = false;
    banner.textContent = count === 1 ? '1 size is running low' : count + ' sizes are running low';
  }else{
    banner.hidden = true;
  }
}

/* ---------- SALE / RESTOCK FLOW ---------- */
function startFlow(mode, presetItem){
  flow = { mode, item: presetItem || null, size: null, qty: 1 };
  renderFlow();
}

function handleScannedCode(code){
  // If no flow is active yet (scanned from the top bar), default to recording a sale
  if(!flow){
    flow = { mode: 'sale', item: null, size: null, qty: 1 };
  }
  const mapped = state.barcodeMap && state.barcodeMap[code];
  if(mapped){
    const item = state.items.find(i => i.id === mapped.itemId);
    const size = item && item.sizes.find(s => s.id === mapped.sizeId);
    if(item && size){
      flow.item = item;
      flow.size = size;
      flow.qty = 1;
      flow.linkingBarcode = null;
      renderFlow();
      showToast('Scanned: ' + item.name + ' · ' + size.label);
      return;
    }
  }
  // Unknown barcode — ask which item/size to link it to
  flow.linkingBarcode = code;
  flow.item = null;
  flow.size = null;
  renderFlow();
}

function renderFlow(){
  // Ensure the flow screen is visible (it's not part of bottom nav)
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-flow').classList.add('active');
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.remove('active'));

  const body = document.getElementById('flowBody');
  const title = document.getElementById('flowTitle');

  if(!flow.item){
    title.textContent = flow.linkingBarcode
      ? 'New barcode — link it'
      : (flow.mode === 'sale' ? 'Record a sale' : 'Restock item');
    const linkNote = flow.linkingBarcode
      ? `<div class="link-note">This barcode isn't linked yet. Choose the item it belongs to — you'll only need to do this once.</div>`
      : '';
    body.innerHTML = `
      ${linkNote}
      <button class="scan-btn full" id="scanFromFlow">
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 8 V5.5 Q4 4 5.5 4 H8 M16 4 H18.5 Q20 4 20 5.5 V8 M20 16 V18.5 Q20 20 18.5 20 H16 M8 20 H5.5 Q4 20 4 18.5 V16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="6.5" y1="12" x2="17.5" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        Scan barcode
      </button>
      <div class="step-label" style="margin-top:18px;">Or pick the item</div>
      <div class="pick-grid" id="pickItems"></div>
    `;
    document.getElementById('scanFromFlow').addEventListener('click', ()=>{
      if(typeof openScanner === 'function') openScanner(handleScannedCode);
    });
    const g = document.getElementById('pickItems');
    state.items.forEach(item=>{
      const c = document.createElement('div');
      c.className = 'pick-card';
      c.innerHTML = `${iconBadge(item)}<div class="pick-card-label">${item.name}</div>`;
      c.addEventListener('click', ()=>{ flow.item = item; renderFlow(); });
      g.appendChild(c);
    });
    return;
  }

  const needsSizePicker = flow.mode === 'sale' || flow.linkingBarcode;

  if(!flow.size && needsSizePicker){
    title.textContent = flow.item.name;
    body.innerHTML = `<div class="step-label">Which size?</div><div class="pick-grid sizes" id="pickSizes"></div>`;
    const g = document.getElementById('pickSizes');
    flow.item.sizes.forEach(sz=>{
      const c = document.createElement('div');
      c.className = 'pick-card';
      const low = sz.qty <= sz.threshold;
      c.innerHTML = `<div class="pick-card-label">${sz.label}</div><div class="pick-card-sub" style="${low?'color:var(--danger);font-weight:700;':''}">${sz.qty} in stock</div>`;
      c.addEventListener('click', async ()=>{
        if(flow.mode === 'sale' && sz.qty <= 0){
          showToast('No stock left for this size.');
          return;
        }
        if(flow.linkingBarcode){
          const code = flow.linkingBarcode;
          flow.linkingBarcode = null;
          try{
            await cloudSaveBarcode(code, flow.item.id, sz.id, sz.label);
            showToast('Barcode linked to ' + flow.item.name + ' · ' + sz.label);
          }catch(e){
            showToast('Could not save the barcode link — try again.');
          }
        }
        flow.size = sz;
        flow.qty = 1;
        renderFlow();
      });
      g.appendChild(c);
    });
    return;
  }

  if(!flow.size && flow.mode === 'restock'){
    renderBulkRestock();
    return;
  }

  if(flow.mode === 'restock'){
    renderRestockSingleQty();
    return;
  }

  // Step 3 (sale only): quantity stepper + confirm
  title.textContent = 'Confirm';
  const s = flow.size;
  const unitLabel = 'sold';
  body.innerHTML = `
    <div class="summary-card">
      ${iconBadge(flow.item)}
      <div>
        <div class="item-name">${flow.item.name} &middot; ${s.label}</div>
        <div class="item-sub">${s.qty} currently in stock</div>
      </div>
    </div>
    <div class="step-label">Quantity ${unitLabel}</div>
    <div class="qty-control">
      <button class="qty-btn" id="qtyMinus">&minus;</button>
      <span class="qty-val" id="qtyVal">${flow.qty}</span>
      <button class="qty-btn" id="qtyPlus">&plus;</button>
    </div>
    <div class="total-row">
      <span class="total-label">Total</span>
      <span class="total-val" id="totalVal">${fmtBirr(s.sellPrice * flow.qty)}</span>
    </div>
    <div id="flowError" class="error-text" style="display:none;"></div>
    <button class="primary full" id="confirmBtn">Confirm sale</button>
  `;

  document.getElementById('qtyMinus').addEventListener('click', ()=>{
    if(flow.qty > 1){ flow.qty--; updateQtyUI(); }
  });
  document.getElementById('qtyPlus').addEventListener('click', ()=>{
    if(flow.qty >= s.qty){
      showToast('Only ' + s.qty + ' in stock.');
      return;
    }
    flow.qty++; updateQtyUI();
  });
  document.getElementById('confirmBtn').addEventListener('click', confirmFlow);
}

/* ---------- Restock: fill every size at once, typed numbers ---------- */
function renderBulkRestock(){
  const title = document.getElementById('flowTitle');
  const body = document.getElementById('flowBody');
  title.textContent = flow.item.name + ' — restock';

  let rows = '';
  flow.item.sizes.forEach(sz=>{
    rows += `
      <div class="bulk-size-row">
        <div class="bulk-size-label">${sz.label}</div>
        <div class="bulk-size-current">${sz.qty} in stock</div>
        <input type="number" min="0" step="1" inputmode="numeric" class="bulk-size-input" data-size-label="${sz.label}" placeholder="0">
      </div>`;
  });

  body.innerHTML = `
    <div class="step-label">Enter quantity to add for each size</div>
    <div class="bulk-size-list">${rows}</div>
    <div id="flowError" class="error-text" style="display:none;"></div>
    <button class="accent full" id="bulkConfirmBtn">Confirm restock</button>
  `;
  document.getElementById('bulkConfirmBtn').addEventListener('click', confirmBulkRestock);
}

async function confirmBulkRestock(){
  const body = document.getElementById('flowBody');
  const errEl = document.getElementById('flowError');
  const inputs = document.querySelectorAll('.bulk-size-input');
  const entries = [];
  inputs.forEach(inp=>{
    const val = Math.floor(Number(inp.value) || 0);
    if(val > 0){
      const size = flow.item.sizes.find(s=>s.label === inp.dataset.sizeLabel);
      entries.push({ size, qty: val });
    }
  });

  if(entries.length === 0){
    errEl.style.display = 'block';
    errEl.textContent = 'Enter a quantity for at least one size.';
    return;
  }
  errEl.style.display = 'none';
  const btn = document.getElementById('bulkConfirmBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try{
    for(const entry of entries){
      await cloudRecordTransaction(flow.item, entry.size, 'restock', entry.qty);
    }
  }catch(e){
    errEl.style.display = 'block';
    errEl.textContent = 'Could not save — check your internet connection and try again.';
    btn.disabled = false;
    btn.textContent = 'Confirm restock';
    return;
  }

  const summary = entries.map(e => e.size.label + ' ×' + e.qty).join(', ');
  const totalUnits = entries.reduce((sum,e) => sum + e.qty, 0);
  document.getElementById('flowTitle').textContent = 'Restock recorded';
  body.innerHTML = `
    <div class="confirm-screen">
      <div class="confirm-icon">${checkIcon}</div>
      <div class="confirm-title">Stock added</div>
      <div class="confirm-sub">${flow.item.name}: ${summary} &middot; ${totalUnits} unit${totalUnits>1?'s':''} total</div>
      <div class="confirm-actions">
        <button id="doneBtn">Done</button>
        <button class="primary" id="anotherBtn">Restock another item</button>
      </div>
    </div>
  `;
  document.getElementById('doneBtn').addEventListener('click', ()=>{
    expandedItemId = null;
    showScreen('stock');
  });
  document.getElementById('anotherBtn').addEventListener('click', ()=>{
    startFlow('restock');
  });
}

/* ---------- Restock: single size (e.g. via barcode scan), typed number ---------- */
function renderRestockSingleQty(){
  const title = document.getElementById('flowTitle');
  const body = document.getElementById('flowBody');
  title.textContent = 'Confirm';
  const s = flow.size;
  body.innerHTML = `
    <div class="summary-card">
      ${iconBadge(flow.item)}
      <div>
        <div class="item-name">${flow.item.name} &middot; ${s.label}</div>
        <div class="item-sub">${s.qty} currently in stock</div>
      </div>
    </div>
    <div class="step-label">Quantity to add</div>
    <div class="field-row">
      <input type="number" min="1" step="1" inputmode="numeric" id="restockQtyInput" placeholder="0">
    </div>
    <div id="flowError" class="error-text" style="display:none;"></div>
    <button class="accent full" id="confirmBtn">Confirm restock</button>
  `;
  const input = document.getElementById('restockQtyInput');
  input.addEventListener('input', ()=>{ flow.qty = Math.floor(Number(input.value) || 0); });
  document.getElementById('confirmBtn').addEventListener('click', confirmFlow);
}

function updateQtyUI(){
  document.getElementById('qtyVal').textContent = flow.qty;
  const totalEl = document.getElementById('totalVal');
  if(totalEl) totalEl.textContent = fmtBirr(flow.size.sellPrice * flow.qty);
}

async function confirmFlow(){
  const errEl = document.getElementById('flowError');
  if(!flow.qty || flow.qty < 1){
    errEl.style.display = 'block';
    errEl.textContent = 'Enter a quantity of at least 1.';
    return;
  }
  if(flow.mode === 'sale' && flow.qty > flow.size.qty){
    errEl.style.display = 'block';
    errEl.textContent = 'Not enough stock for that quantity.';
    return;
  }
  errEl.style.display = 'none';

  const s = flow.size;
  const confirmBtn = document.getElementById('confirmBtn');
  if(confirmBtn){ confirmBtn.disabled = true; confirmBtn.textContent = 'Saving...'; }

  try{
    await cloudRecordTransaction(flow.item, s, flow.mode, flow.qty);
  }catch(e){
    errEl.style.display = 'block';
    errEl.textContent = 'Could not save — check your internet connection and try again.';
    if(confirmBtn){ confirmBtn.disabled = false; confirmBtn.textContent = flow.mode === 'sale' ? 'Confirm sale' : 'Confirm restock'; }
    return;
  }

  const amount = flow.mode === 'sale' ? s.sellPrice * flow.qty : 0;
  const body = document.getElementById('flowBody');
  document.getElementById('flowTitle').textContent = flow.mode === 'sale' ? 'Sale recorded' : 'Restock recorded';
  body.innerHTML = `
    <div class="confirm-screen">
      <div class="confirm-icon">${checkIcon}</div>
      <div class="confirm-title">${flow.mode === 'sale' ? 'Sale recorded' : 'Stock added'}</div>
      <div class="confirm-sub">${flow.qty} &times; ${flow.item.name} (${s.label})${flow.mode==='sale' ? ' &middot; ' + fmtBirr(amount) : ''}</div>
      <div class="confirm-actions">
        <button id="doneBtn">Done</button>
        <button class="primary" id="anotherBtn">${flow.mode === 'sale' ? 'Record another sale' : 'Restock another'}</button>
      </div>
    </div>
  `;
  document.getElementById('doneBtn').addEventListener('click', ()=>{
    expandedItemId = null;
    showScreen('stock');
  });
  document.getElementById('anotherBtn').addEventListener('click', ()=>{
    startFlow(flow.mode);
  });
}

document.getElementById('flowBack').addEventListener('click', ()=>{
  if(!flow) { showScreen('stock'); return; }
  if(flow.size){ flow.size = null; renderFlow(); }
  else if(flow.item){ flow.item = null; renderFlow(); }
  else { showScreen('stock'); }
});

/* ---------- HISTORY SCREEN ---------- */
function rangeStart(range){
  const now = new Date();
  if(range === 'today'){
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  if(range === 'week'){
    const d = new Date(now);
    const day = d.getDay() === 0 ? 6 : d.getDay() - 1; // Monday start
    d.setDate(d.getDate() - day);
    d.setHours(0,0,0,0);
    return d.getTime();
  }
  if(range === 'month'){
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  return 0;
}

let historyRangeValue = 'today';

function renderHistory(){
  const range = historyRangeValue;
  const start = rangeStart(range);
  const txns = state.transactions.filter(t => t.timestamp >= start);

  const sales = txns.filter(t=>t.type==='sale');
  const revenue = sales.reduce((s,t)=>s+t.amount,0);
  const unitsSold = sales.reduce((s,t)=>s+t.qty,0);

  document.getElementById('historySummary').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Revenue</div>
      <div class="stat-val">${fmtBirr(revenue)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Units sold</div>
      <div class="stat-val">${unitsSold}</div>
    </div>
  `;

  const list = document.getElementById('historyList');
  if(txns.length === 0){
    list.innerHTML = `<div class="empty-note">No activity in this period yet.</div>`;
    return;
  }
  list.innerHTML = txns.map(t=>{
    const d = new Date(t.timestamp);
    const dateStr = d.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + ' &middot; ' + d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
    return `
      <div class="history-row">
        <div class="hist-type ${t.type}">${t.type === 'sale' ? '&minus;' : '&plus;'}</div>
        <div class="hist-info">
          <div class="hist-name">${t.itemName} &middot; ${t.sizeLabel}</div>
          <div class="hist-meta">${dateStr}</div>
        </div>
        <div class="hist-amt">${t.qty} unit${t.qty>1?'s':''}${t.type==='sale' ? ' &middot; ' + fmtBirr(t.amount) : ''}</div>
        <button class="hist-delete" data-txn="${t.id}" aria-label="Delete transaction">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 7 H19 M9 7 V4.5 Q9 3.5 10 3.5 H14 Q15 3.5 15 4.5 V7 M7 7 L7.8 19 Q7.9 20 9 20 H15 Q16.1 20 16.2 19 L17 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.hist-delete').forEach(btn=>{
    btn.addEventListener('click', ()=> deleteTransaction(btn.dataset.txn));
  });
}

async function deleteTransaction(txnId){
  const txn = state.transactions.find(t => t.id === txnId);
  if(!txn) return;

  const verb = txn.type === 'sale' ? 'sale' : 'restock';
  const confirmMsg = `Delete this ${verb} of ${txn.qty} \u00d7 ${txn.itemName} (${txn.sizeLabel})? This will also reverse its effect on stock.`;
  if(!confirm(confirmMsg)) return;

  try{
    await cloudDeleteTransaction(txn);
    showToast('Transaction deleted.');
  }catch(e){
    showToast('Could not delete — check your internet connection.');
  }
}

document.querySelectorAll('#historySegmented .seg-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#historySegmented .seg-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    historyRangeValue = btn.dataset.range;
    renderHistory();
  });
});

document.getElementById('exportBtn').addEventListener('click', ()=>{
  if(state.transactions.length === 0){
    showToast('No transactions to export yet.');
    return;
  }
  const rows = [['Date','Time','Item','Size','Type','Quantity','Amount (birr)']];
  state.transactions.slice().reverse().forEach(t=>{
    const d = new Date(t.timestamp);
    rows.push([
      d.toLocaleDateString(),
      d.toLocaleTimeString(),
      t.itemName,
      t.sizeLabel,
      t.type,
      t.qty,
      t.type === 'sale' ? t.amount : ''
    ]);
  });
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shop-stock-history.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

/* ---------- SETTINGS SCREEN ---------- */
let expandedSettingsItemId = null;

function renderSettings(){
  const wrap = document.getElementById('settingsList');
  let html = `<div class="settings-section">
    <div class="settings-title">Items &amp; pricing</div>
    <div class="settings-hint">Tap an item to set the price and low-stock alert for each size individually.</div>`;
  state.items.forEach(item=>{
    const expanded = expandedSettingsItemId === item.id;
    const prices = item.sizes.map(s=>s.sellPrice);
    const priceLabel = (Math.min(...prices) === Math.max(...prices))
      ? fmtBirr(prices[0])
      : fmtBirr(Math.min(...prices)) + '–' + fmtBirr(Math.max(...prices));
    html += `<div class="settings-item-row settings-item-expandable ${expanded ? 'expanded' : ''}" data-settings-item="${item.id}">
      <div class="row" style="cursor:pointer;">
        <div>
          <div class="item-name">${item.name}</div>
          <div class="item-sub">${item.sizes.length} sizes &middot; ${priceLabel}</div>
        </div>
        ${chevronIcon}
      </div>`;
    if(expanded){
      html += `<div class="size-price-list">`;
      item.sizes.forEach(s=>{
        html += `
          <div class="size-price-row">
            <span class="size-price-label">${s.label}</span>
            <div class="mini-field">
              <label>Price</label>
              <input type="number" min="0" step="1" data-price-size="${item.id}|${s.label}" value="${s.sellPrice}">
            </div>
            <div class="mini-field">
              <label>Alert below</label>
              <input type="number" min="0" step="1" data-threshold-size="${item.id}|${s.label}" value="${s.threshold}">
            </div>
          </div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  });
  html += `</div>
  <div class="settings-section">
    <div class="settings-title">Barcodes</div>
    <div class="settings-item-row">
      <div class="row">
        <div class="item-name">Linked barcodes</div>
        <div class="item-sub">${Object.keys(state.barcodeMap||{}).length} linked</div>
      </div>
    </div>
    <button class="full" id="resetBarcodesBtn" style="border-color:var(--danger);color:var(--danger);">Unlink all barcodes</button>
  </div>
  <div class="settings-section">
    <div class="settings-title">Account</div>
    <button class="full" id="logoutBtn">Log out</button>
    <button class="full" id="forgetDeviceBtn" style="border-color:var(--danger);color:var(--danger);margin-top:8px;">Forget this device's login</button>
  </div>
  <div class="settings-section">
    <div class="settings-title">Data</div>
    <button class="full" id="resetBtn" style="border-color:var(--danger);color:var(--danger);">Reset all data</button>
  </div>`;
  wrap.innerHTML = html;

  wrap.querySelectorAll('[data-settings-item]').forEach(row=>{
    row.querySelector('.row').addEventListener('click', ()=>{
      const id = row.dataset.settingsItem;
      expandedSettingsItemId = expandedSettingsItemId === id ? null : id;
      renderSettings();
    });
  });

  wrap.querySelectorAll('[data-price-size]').forEach(inp=>{
    inp.addEventListener('change', async ()=>{
      const [itemId, label] = inp.dataset.priceSize.split('|');
      const val = Math.max(0, Number(inp.value) || 0);
      const item = state.items.find(i=>i.id===itemId);
      const size = item.sizes.find(s=>s.label===label);
      try{
        await cloudUpdateSizePricing(itemId, label, val, size.threshold);
        showToast('Price updated for ' + item.name + ' · ' + label);
      }catch(e){
        showToast('Could not save — check your internet connection.');
      }
    });
  });
  wrap.querySelectorAll('[data-threshold-size]').forEach(inp=>{
    inp.addEventListener('change', async ()=>{
      const [itemId, label] = inp.dataset.thresholdSize.split('|');
      const val = Math.max(0, Number(inp.value) || 0);
      const item = state.items.find(i=>i.id===itemId);
      const size = item.sizes.find(s=>s.label===label);
      try{
        await cloudUpdateSizePricing(itemId, label, size.sellPrice, val);
        showToast('Alert threshold updated for ' + item.name + ' · ' + label);
        updateLowStockUI();
      }catch(e){
        showToast('Could not save — check your internet connection.');
      }
    });
  });
  document.getElementById('logoutBtn').addEventListener('click', ()=>{
    if(typeof logOut === 'function') logOut();
  });
  document.getElementById('forgetDeviceBtn').addEventListener('click', ()=>{
    if(confirm('This removes the saved admin login from this phone only. The shop\'s stock data is not affected, and other devices keep working normally. You\'ll need to set up a new login (or someone else\'s) to use the app on this phone again. Continue?')){
      if(typeof clearAuth === 'function') clearAuth();
      showToast('Login removed from this device.');
      location.reload();
    }
  });
  document.getElementById('resetBarcodesBtn').addEventListener('click', async ()=>{
    if(confirm('This unlinks every scanned barcode. You\'ll need to link them again next time you scan. Continue?')){
      try{
        await cloudResetBarcodes();
        showToast('All barcode links removed.');
        renderSettings();
      }catch(e){
        showToast('Could not reset — check your internet connection.');
      }
    }
  });
  document.getElementById('resetBtn').addEventListener('click', async ()=>{
    if(confirm('This clears all stock counts and sales history for everyone using this app. This cannot be undone. Continue?')){
      try{
        await cloudResetAll();
        showToast('All data reset.');
        showScreen('stock');
      }catch(e){
        showToast('Could not reset — check your internet connection.');
      }
    }
  });
}

/* ---------- init ---------- */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
