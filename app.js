let expandedItemId = null;
let flow = null; // {mode:'sale'|'restock', item, size, qty}
let currentRole = 'admin';

function isStaff(){ return currentRole === 'staff'; }

function applyRoleRestrictions(role){
  currentRole = role || 'admin';
  const stockBtn = document.getElementById('stockRestockBtn');
  if(stockBtn) stockBtn.style.display = isStaff() ? 'none' : '';
  requestAnimationFrame(positionNavPill);
}

function positionNavPill(){
  const pill = document.getElementById('navPill');
  const nav = document.querySelector('.bottomnav');
  if(!pill || !nav) return;
  const activeBtn = nav.querySelector('.navbtn.active');
  if(!activeBtn || activeBtn.offsetParent === null) return;
  pill.style.left = activeBtn.offsetLeft + 'px';
  pill.style.width = activeBtn.offsetWidth + 'px';
}
window.addEventListener('resize', ()=> requestAnimationFrame(positionNavPill));

function positionSegPill(container){
  if(!container) return;
  const pill = container.querySelector('.seg-pill');
  const activeBtn = container.querySelector('.seg-btn.active');
  if(!pill || !activeBtn) return;
  pill.style.left = activeBtn.offsetLeft + 'px';
  pill.style.width = activeBtn.offsetWidth + 'px';
}
function positionAllSegPills(){
  document.querySelectorAll('.segmented').forEach(el => positionSegPill(el));
}
window.addEventListener('resize', ()=> requestAnimationFrame(positionAllSegPills));

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
function buzz(ms){
  try{ if(navigator.vibrate) navigator.vibrate(ms || 8); }catch(e){}
}

const NAV_PARENT = {
  home:'home', products:'products', sales:'sales', stockhealth:'stockhealth', more:'more',
  history:'more', settings:'more'
};

function showScreen(name){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-'+name).classList.add('active');
  const navTarget = NAV_PARENT[name] || name;
  document.querySelectorAll('.navbtn').forEach(b=>{
    b.classList.toggle('active', b.dataset.screen === navTarget);
  });
  requestAnimationFrame(positionNavPill);
  requestAnimationFrame(positionAllSegPills);
  if(name === 'home') renderHome();
  if(name === 'products') renderProducts();
  if(name === 'sales') renderSalesScreen();
  if(name === 'stockhealth') renderStockHealth();
  if(name === 'history') renderHistory();
  if(name === 'settings') renderSettings();
}

document.querySelectorAll('.navbtn[data-screen]').forEach(btn=>{
  btn.addEventListener('click', ()=> { buzz(6); showScreen(btn.dataset.screen); });
});

document.getElementById('lowStockBtn').addEventListener('click', ()=>{
  showScreen('stockhealth');
  window.scrollTo({top:0,behavior:'smooth'});
});
document.getElementById('lowStockBanner').addEventListener('click', ()=>{
  showScreen('stockhealth');
});
document.getElementById('scanBtn').addEventListener('click', ()=>{
  if(typeof openScanner === 'function') openScanner(handleScannedCode);
});
document.getElementById('salesRecordBtn').addEventListener('click', ()=> startFlow('sale'));
document.getElementById('stockRestockBtn').addEventListener('click', ()=> startFlow('restock'));
document.querySelectorAll('.more-menu-item').forEach(btn=>{
  btn.addEventListener('click', ()=> { buzz(6); showScreen(btn.dataset.screen); });
});
document.querySelectorAll('.back-to-more').forEach(btn=>{
  btn.addEventListener('click', ()=> showScreen('more'));
});

/* ---------- HOME (dashboard) ---------- */
function greetingLabel(){
  const h = new Date().getHours();
  if(h < 12) return 'Good morning';
  if(h < 17) return 'Good afternoon';
  return 'Good evening';
}

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
        <div class="dash-card-label">Today's sales</div>
        <div class="dash-card-val">${fmtBirr(todaysRevenue)}</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-label">Products</div>
        <div class="dash-card-val">${state.items.length}</div>
      </div>
      <div class="dash-card ${lowCount>0 ? 'dash-card-warn' : ''}">
        <div class="dash-card-label">Low stock</div>
        <div class="dash-card-val">${lowCount}</div>
      </div>
    </div>
  `;
}

function renderBestSellers(){
  const wrap = document.getElementById('homeBestSellers');
  const totals = {};
  state.transactions.forEach(t=>{
    if(t.type !== 'sale') return;
    totals[t.itemId] = (totals[t.itemId] || 0) + t.qty;
  });
  const ranked = Object.entries(totals)
    .map(([itemId, qty]) => ({ item: state.items.find(i=>i.id===itemId), qty }))
    .filter(r => r.item)
    .sort((a,b) => b.qty - a.qty)
    .slice(0, 3);

  if(ranked.length === 0){
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = `
    <div class="section-header"><span class="section-title">Best-selling products</span></div>
    <div class="home-list">
      ${ranked.map(r => `
        <div class="home-list-row">
          ${iconBadge(r.item)}
          <div class="home-list-info">
            <div class="home-list-name">${r.item.name}</div>
            <div class="home-list-sub">${r.qty} sold all-time</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderHomeRecentSales(){
  const wrap = document.getElementById('homeRecentSales');
  const recent = state.transactions.filter(t=>t.type==='sale').slice(0, 5);
  wrap.innerHTML = `
    <div class="section-header"><span class="section-title">Recent sales</span></div>
    ${recent.length === 0 ? '<div class="empty-note">No sales recorded yet.</div>' : `
    <div class="home-list">
      ${recent.map(t=>{
        const d = new Date(t.timestamp);
        return `
        <div class="home-list-row">
          <div class="hist-type sale">&minus;</div>
          <div class="home-list-info">
            <div class="home-list-name">${t.itemName} &middot; ${t.sizeLabel}</div>
            <div class="home-list-sub">${t.qty} unit${t.qty>1?'s':''} &middot; ${d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</div>
          </div>
          <div class="home-list-amt">${fmtBirr(t.amount)}</div>
        </div>`;
      }).join('')}
    </div>`}
  `;
}

function renderHomeLowStock(){
  const wrap = document.getElementById('homeLowStock');
  const rows = [];
  state.items.forEach(item=>{
    item.sizes.forEach(s=>{
      if(s.qty <= s.threshold) rows.push({ item, size: s });
    });
  });
  rows.sort((a,b) => a.size.qty - b.size.qty);
  const shown = rows.slice(0, 8);

  wrap.innerHTML = `
    <div class="section-header"><span class="section-title">Low stock products</span></div>
    ${shown.length === 0 ? '<div class="empty-note">Nothing running low right now.</div>' : `
    <div class="home-list">
      ${shown.map(r => `
        <div class="home-list-row">
          ${iconBadge(r.item)}
          <div class="home-list-info">
            <div class="home-list-name">${r.item.name}</div>
            <div class="home-list-sub">Size ${r.size.label}</div>
          </div>
          <div class="home-list-amt" style="color:var(--danger);">${r.size.qty} left</div>
        </div>
      `).join('')}
    </div>`}
  `;
}

function renderHome(){
  renderDashboard();
  renderBestSellers();
  renderHomeRecentSales();
  renderHomeLowStock();
  updateLowStockUI();
}

/* ---------- PRODUCTS (catalog grid) ---------- */
function renderProducts(){
  const grid = document.getElementById('itemGrid');
  if(!grid) return;
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
        ${isStaff() ? '' : `<button data-restock="${item.id}">Restock</button>`}
      `;
      card.appendChild(sizeList);
      card.appendChild(actions);
      actions.querySelector('[data-sale]').addEventListener('click', e=>{
        e.stopPropagation();
        startFlow('sale', item);
      });
      const restockBtn = actions.querySelector('[data-restock]');
      if(restockBtn){
        restockBtn.addEventListener('click', e=>{
          e.stopPropagation();
          startFlow('restock', item);
        });
      }
    }
    card.addEventListener('click', ()=>{
      expandedItemId = expandedItemId === item.id ? null : item.id;
      renderProducts();
    });
    grid.appendChild(card);
  });
  updateLowStockUI();
}

/* ---------- SALES landing ---------- */
function renderSalesScreen(){
  const wrap = document.getElementById('salesTodayList');
  const today0 = new Date(); today0.setHours(0,0,0,0);
  const todays = state.transactions.filter(t=>t.type==='sale' && t.timestamp >= today0.getTime());

  if(todays.length === 0){
    wrap.innerHTML = '<div class="empty-note">No sales recorded yet today.</div>';
    return;
  }
  wrap.innerHTML = `
    <div class="home-list">
      ${todays.map(t=>{
        const d = new Date(t.timestamp);
        return `
        <div class="home-list-row">
          <div class="hist-type sale">&minus;</div>
          <div class="home-list-info">
            <div class="home-list-name">${t.itemName} &middot; ${t.sizeLabel}</div>
            <div class="home-list-sub">${t.qty} unit${t.qty>1?'s':''} &middot; ${d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</div>
          </div>
          <div class="home-list-amt">${fmtBirr(t.amount)}</div>
        </div>`;
      }).join('')}
    </div>
  `;
}

/* ---------- STOCK health ---------- */
function stockStatus(item){
  const total = totalQty(item);
  if(total === 0) return 'out';
  if(hasLowStock(item)) return 'low';
  return 'healthy';
}
function renderStockHealth(){
  const stockBtn = document.getElementById('stockRestockBtn');
  if(stockBtn) stockBtn.style.display = isStaff() ? 'none' : '';

  const wrap = document.getElementById('stockHealthList');
  wrap.innerHTML = state.items.map(item=>{
    const status = stockStatus(item);
    const label = status === 'out' ? 'Out of stock' : status === 'low' ? 'Low stock' : 'Healthy';
    return `
      <div class="home-list-row">
        ${iconBadge(item)}
        <div class="home-list-info">
          <div class="home-list-name">${item.name}</div>
          <div class="home-list-sub">${totalQty(item)} in stock</div>
        </div>
        <span class="status-pill status-${status}">${label}</span>
      </div>
    `;
  }).join('');
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
  if(mode === 'restock' && isStaff()){
    showToast('Only the admin can restock.');
    return;
  }
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
  buzz(14);
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
    showScreen('stockhealth');
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
  buzz(14);
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
    showScreen(flow.mode === 'sale' ? 'sales' : 'stockhealth');
  });
  document.getElementById('anotherBtn').addEventListener('click', ()=>{
    startFlow(flow.mode);
  });
}

document.getElementById('flowBack').addEventListener('click', ()=>{
  const fallback = (flow && flow.mode === 'restock') ? 'stockhealth' : 'sales';
  if(!flow) { showScreen('home'); return; }
  if(flow.size){ flow.size = null; renderFlow(); }
  else if(flow.item){ flow.item = null; renderFlow(); }
  else { showScreen(fallback); }
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
  let txns = state.transactions.filter(t => t.timestamp >= start);
  if(isStaff()) txns = txns.filter(t => t.type === 'sale'); // restock activity is admin-only

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
        ${isStaff() ? '' : `
        <button class="hist-delete" data-txn="${t.id}" aria-label="Delete transaction">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 7 H19 M9 7 V4.5 Q9 3.5 10 3.5 H14 Q15 3.5 15 4.5 V7 M7 7 L7.8 19 Q7.9 20 9 20 H15 Q16.1 20 16.2 19 L17 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>`}
      </div>
    `;
  }).join('');

  list.querySelectorAll('.hist-delete').forEach(btn=>{
    btn.addEventListener('click', ()=> deleteTransaction(btn.dataset.txn));
  });
}

async function deleteTransaction(txnId){
  if(isStaff()){
    showToast('Only the admin can delete transactions.');
    return;
  }
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
    buzz(6);
    document.querySelectorAll('#historySegmented .seg-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    positionSegPill(document.getElementById('historySegmented'));
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

function relativeTimeAgo(ts){
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if(mins < 1) return 'just now';
  if(mins < 60) return mins + ' min ago';
  const hrs = Math.floor(mins / 60);
  if(hrs < 24) return hrs + ' hr' + (hrs>1?'s':'') + ' ago';
  const days = Math.floor(hrs / 24);
  return days + ' day' + (days>1?'s':'') + ' ago';
}

function renderDevicesList(){
  const sessions = (typeof sessionsList !== 'undefined') ? sessionsList : [];
  const myId = (typeof getOrCreateSessionId === 'function') ? getOrCreateSessionId() : null;
  if(sessions.length === 0){
    return `<div class="settings-item-row"><div class="item-sub">No active sessions yet.</div></div>`;
  }
  return sessions.map(s=>{
    const isMe = s.id === myId;
    const roleLabel = s.role === 'admin' ? 'Admin' : 'Staff';
    const displayName = s.label ? s.label : roleLabel;
    return `
      <div class="settings-item-row">
        <div class="row">
          <div>
            <div class="item-name">${displayName}${isMe ? ' (this device)' : ''}</div>
            <div class="item-sub">${roleLabel} &middot; logged in ${relativeTimeAgo(s.createdAt)}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="ghost" data-rename="${s.id}" data-current="${(s.label||'').replace(/"/g,'&quot;')}" aria-label="Rename device">Rename</button>
            ${isMe ? '' : `<button class="ghost" style="color:var(--danger);" data-kick="${s.id}">Log out</button>`}
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderSettings(){
  const wrap = document.getElementById('settingsList');

  if(isStaff()){
    wrap.innerHTML = `
      <div class="settings-section">
        <div class="settings-title">Account</div>
        <div class="settings-hint">You're logged in as staff. Pricing, restock, deleting transactions, and other admin settings aren't shown here.</div>
        <button class="full" id="logoutBtn">Log out</button>
      </div>
    `;
    document.getElementById('logoutBtn').addEventListener('click', ()=>{
      if(typeof logOut === 'function') logOut();
    });
    return;
  }

  let html = `<div class="settings-section">
    <div class="settings-title">Items &amp; pricing</div>
    <div class="settings-hint">Tap an item to set the price and low-stock alert for each size individually.</div>`;
  if(typeof startSessionsListenerOnce === 'function') startSessionsListenerOnce();
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
    <div class="settings-title">Staff access</div>
    <div class="settings-hint">Staff can view stock and record sales only — restock and settings stay admin-only. Share this password with employees.</div>
    <div class="field-row">
      <label class="field-label">Staff password</label>
      <input type="password" id="staffPassInput" placeholder="Set or change staff password" autocomplete="new-password">
    </div>
    <button class="full" id="saveStaffPassBtn">Save staff password</button>
  </div>
  <div class="settings-section">
    <div class="settings-title">Active devices</div>
    <div class="settings-hint">Everyone currently logged in. Log out a device remotely if needed.</div>
    ${renderDevicesList()}
  </div>
  <div class="settings-section">
    <div class="settings-title">Account</div>
    <button class="full" id="logoutBtn">Log out</button>
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
  document.getElementById('saveStaffPassBtn').addEventListener('click', async ()=>{
    const val = document.getElementById('staffPassInput').value;
    if(!val || val.length < 4){
      showToast('Staff password should be at least 4 characters.');
      return;
    }
    try{
      const hash = await sha256(val);
      await cloudSaveStaffPassword(hash);
      document.getElementById('staffPassInput').value = '';
      showToast('Staff password saved.');
    }catch(e){
      showToast('Could not save — check your internet connection.');
    }
  });
  wrap.querySelectorAll('[data-kick]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(!confirm('Log this device out now? It will be signed out immediately, even if it\'s mid-use.')) return;
      try{
        await cloudRevokeSession(btn.dataset.kick);
        showToast('Device logged out.');
      }catch(e){
        showToast('Could not reach the shared database — try again.');
      }
    });
  });
  wrap.querySelectorAll('[data-rename]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const current = btn.dataset.current || '';
      const name = prompt('Name for this device (e.g. the staff member\'s name):', current);
      if(name === null) return; // cancelled
      try{
        await cloudRenameSession(btn.dataset.rename, name.trim());
        showToast('Device renamed.');
      }catch(e){
        showToast('Could not reach the shared database — try again.');
      }
    });
  });
  document.getElementById('logoutBtn').addEventListener('click', ()=>{
    if(typeof logOut === 'function') logOut();
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
        showScreen('home');
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
