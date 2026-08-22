let state = Store.load();
let expandedItemId = null;
let flow = null; // {mode:'sale'|'restock', item, size, qty}

/* ---------- icons ---------- */
function iconSvg(name){
  const icons = {
    shirt: '<path d="M8.5 3.5 L4 6.5 L6.2 9.7 L8.5 8.2 V20.5 H15.5 V8.2 L17.8 9.7 L20 6.5 L15.5 3.5 Q14.3 5.6 12 5.6 Q9.7 5.6 8.5 3.5 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>',
    trouser: '<path d="M7 3.5 H17 L17.8 20.5 H13.6 L12 11.5 L10.4 20.5 H6.2 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><line x1="7.15" y1="6.3" x2="16.85" y2="6.3" stroke="currentColor" stroke-width="1.5"/>',
    sweater: '<path d="M8 3.6 L3.8 6.3 L5.9 9.6 L8 8.3 V20.4 H16 V8.3 L18.1 9.6 L20.2 6.3 L16 3.6 Q14.6 6.1 12 6.1 Q9.4 6.1 8 3.6 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><path d="M9.6 3.9 Q10.6 5 12 5 Q13.4 5 14.4 3.9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
    coat: '<path d="M8.2 3.6 L4 6.3 L6.1 9.5 L8.2 8.2 V21 H10.6 L12 15.5 L13.4 21 H15.8 V8.2 L17.9 9.5 L20 6.3 L15.8 3.6 L12 6.6 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><line x1="10.6" y1="9" x2="10.6" y2="15" stroke="currentColor" stroke-width="1.2"/>',
    shoe: '<path d="M3.5 17.2 Q3.3 14.6 6 13.9 L9.3 13 L12.6 9 Q13.6 7.7 15 8.4 L15.6 9.9 Q17.6 10.4 19.3 12.5 Q20.9 14.4 20.4 17.2 Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/><line x1="9.3" y1="13" x2="9.3" y2="17.2" stroke="currentColor" stroke-width="1.3"/>'
  };
  return `<svg viewBox="0 0 24 24" width="20" height="20">${icons[name]||icons.shirt}</svg>`;
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
        <div class="item-icon">${iconSvg(item.icon)}</div>
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

function renderFlow(){
  // Ensure the flow screen is visible (it's not part of bottom nav)
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-flow').classList.add('active');
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.remove('active'));

  const body = document.getElementById('flowBody');
  const title = document.getElementById('flowTitle');

  if(!flow.item){
    title.textContent = flow.mode === 'sale' ? 'Record a sale' : 'Restock item';
    body.innerHTML = `<div class="step-label">Which item?</div><div class="pick-grid" id="pickItems"></div>`;
    const g = document.getElementById('pickItems');
    state.items.forEach(item=>{
      const c = document.createElement('div');
      c.className = 'pick-card';
      c.innerHTML = `<div class="item-icon">${iconSvg(item.icon)}</div><div class="pick-card-label">${item.name}</div>`;
      c.addEventListener('click', ()=>{ flow.item = item; renderFlow(); });
      g.appendChild(c);
    });
    return;
  }

  if(!flow.size){
    title.textContent = flow.item.name;
    body.innerHTML = `<div class="step-label">Which size?</div><div class="pick-grid sizes" id="pickSizes"></div>`;
    const g = document.getElementById('pickSizes');
    flow.item.sizes.forEach(sz=>{
      const c = document.createElement('div');
      c.className = 'pick-card';
      const low = sz.qty <= sz.threshold;
      c.innerHTML = `<div class="pick-card-label">${sz.label}</div><div class="pick-card-sub" style="${low?'color:var(--danger);font-weight:700;':''}">${sz.qty} in stock</div>`;
      c.addEventListener('click', ()=>{
        if(flow.mode === 'sale' && sz.qty <= 0){
          showToast('No stock left for this size.');
          return;
        }
        flow.size = sz;
        flow.qty = 1;
        renderFlow();
      });
      g.appendChild(c);
    });
    return;
  }

  // Step 3: quantity + confirm
  title.textContent = 'Confirm';
  const s = flow.size;
  const unitLabel = flow.mode === 'sale' ? 'sold' : 'to add';
  body.innerHTML = `
    <div class="summary-card">
      <div class="item-icon">${iconSvg(flow.item.icon)}</div>
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
    ${flow.mode === 'sale' ? `
    <div class="total-row">
      <span class="total-label">Total</span>
      <span class="total-val" id="totalVal">${fmtBirr(s.sellPrice * flow.qty)}</span>
    </div>` : ''}
    <div id="flowError" class="error-text" style="display:none;"></div>
    <button class="${flow.mode==='sale' ? 'primary' : 'accent'} full" id="confirmBtn">
      ${flow.mode === 'sale' ? 'Confirm sale' : 'Confirm restock'}
    </button>
  `;

  document.getElementById('qtyMinus').addEventListener('click', ()=>{
    if(flow.qty > 1){ flow.qty--; updateQtyUI(); }
  });
  document.getElementById('qtyPlus').addEventListener('click', ()=>{
    if(flow.mode === 'sale' && flow.qty >= s.qty){
      showToast('Only ' + s.qty + ' in stock.');
      return;
    }
    flow.qty++; updateQtyUI();
  });
  document.getElementById('confirmBtn').addEventListener('click', confirmFlow);
}

function updateQtyUI(){
  document.getElementById('qtyVal').textContent = flow.qty;
  const totalEl = document.getElementById('totalVal');
  if(totalEl) totalEl.textContent = fmtBirr(flow.size.sellPrice * flow.qty);
}

function confirmFlow(){
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
  if(flow.mode === 'sale'){
    s.qty -= flow.qty;
  }else{
    s.qty += flow.qty;
  }
  const txn = {
    id: uid(),
    itemId: flow.item.id,
    itemName: flow.item.name,
    sizeLabel: s.label,
    type: flow.mode,
    qty: flow.qty,
    amount: flow.mode === 'sale' ? s.sellPrice * flow.qty : 0,
    timestamp: Date.now()
  };
  state.transactions.unshift(txn);
  Store.save(state);

  const body = document.getElementById('flowBody');
  document.getElementById('flowTitle').textContent = flow.mode === 'sale' ? 'Sale recorded' : 'Restock recorded';
  body.innerHTML = `
    <div class="confirm-screen">
      <div class="confirm-icon">${checkIcon}</div>
      <div class="confirm-title">${flow.mode === 'sale' ? 'Sale recorded' : 'Stock added'}</div>
      <div class="confirm-sub">${flow.qty} &times; ${flow.item.name} (${s.label})${flow.mode==='sale' ? ' &middot; ' + fmtBirr(txn.amount) : ''}</div>
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
      </div>
    `;
  }).join('');
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
function renderSettings(){
  const wrap = document.getElementById('settingsList');
  let html = `<div class="settings-section">
    <div class="settings-title">Items &amp; pricing</div>`;
  state.items.forEach(item=>{
    html += `<div class="settings-item-row" data-item="${item.id}">
      <div class="row">
        <div class="item-name">${item.name}</div>
        <div class="item-sub">${item.sizes.length} sizes</div>
      </div>
      <div class="mini-field">
        <label>Price per unit</label>
        <input type="number" min="0" step="1" data-price-item="${item.id}" value="${item.sizes[0].sellPrice}">
      </div>
      <div class="mini-field">
        <label>Low-stock alert below</label>
        <input type="number" min="0" step="1" data-threshold-item="${item.id}" value="${item.sizes[0].threshold}">
      </div>
    </div>`;
  });
  html += `</div>
  <div class="settings-section">
    <div class="settings-title">Account</div>
    <button class="full" id="logoutBtn">Log out</button>
  </div>
  <div class="settings-section">
    <div class="settings-title">Data</div>
    <button class="full" id="resetBtn" style="border-color:var(--danger);color:var(--danger);">Reset all data</button>
  </div>`;
  wrap.innerHTML = html;

  wrap.querySelectorAll('[data-price-item]').forEach(inp=>{
    inp.addEventListener('change', ()=>{
      const id = inp.dataset.priceItem;
      const val = Math.max(0, Number(inp.value) || 0);
      const item = state.items.find(i=>i.id===id);
      item.sizes.forEach(s => s.sellPrice = val);
      Store.save(state);
      showToast('Price updated for ' + item.name);
    });
  });
  wrap.querySelectorAll('[data-threshold-item]').forEach(inp=>{
    inp.addEventListener('change', ()=>{
      const id = inp.dataset.thresholdItem;
      const val = Math.max(0, Number(inp.value) || 0);
      const item = state.items.find(i=>i.id===id);
      item.sizes.forEach(s => s.threshold = val);
      Store.save(state);
      showToast('Alert threshold updated for ' + item.name);
      updateLowStockUI();
    });
  });
  document.getElementById('logoutBtn').addEventListener('click', ()=>{
    if(typeof logOut === 'function') logOut();
  });
  document.getElementById('resetBtn').addEventListener('click', ()=>{
    if(confirm('This clears all stock counts and sales history. This cannot be undone. Continue?')){
      state = buildDefaultState();
      Store.save(state);
      showToast('All data reset.');
      showScreen('stock');
    }
  });
}

/* ---------- init ---------- */
renderStock();

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
