const SESSION_KEY = 'shopstock_session_v2';
const ROLE_KEY = 'shopstock_role_v2';
const SESSION_ID_KEY = 'shopstock_device_session_id_v1';
const DISPLAY_NAME_KEY = 'shopstock_display_name_v1';

async function sha256(text){
  const enc = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function getOrCreateSessionId(){
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if(!id){
    id = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

function rememberDisplayName(name){
  try{ localStorage.setItem(DISPLAY_NAME_KEY, name); }catch(e){}
}
function getRememberedDisplayName(){
  try{ return localStorage.getItem(DISPLAY_NAME_KEY) || ''; }catch(e){ return ''; }
}

async function startSessionTracking(role, label){
  const sessionId = getOrCreateSessionId();
  try{
    await cloudRegisterSession(sessionId, role, label);
    watchOwnSession(sessionId, ()=>{
      showToast('You have been logged out by the admin.');
      setTimeout(()=> logOut(true), 900);
    });
  }catch(e){ /* offline — session tracking just won't be visible to admin until reconnected */ }
}

function isLoggedIn(){
  return sessionStorage.getItem(SESSION_KEY) === '1';
}
function getRole(){
  return sessionStorage.getItem(ROLE_KEY) || null;
}
function setLoggedIn(role){
  sessionStorage.setItem(SESSION_KEY, '1');
  sessionStorage.setItem(ROLE_KEY, role);
}
function logOut(skipRevoke){
  if(!skipRevoke){
    try{ cloudRevokeSession(getOrCreateSessionId()); }catch(e){}
  }
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(ROLE_KEY);
  sessionStorage.removeItem(SESSION_ID_KEY);
  location.reload();
}
// Clears any leftover credentials from the old per-device login system
// (before admin/staff accounts moved to the shared database).
function clearAuth(){
  try{ localStorage.removeItem('shopstock_auth_v1'); }catch(e){}
  logOut();
}

async function showAuthScreen(){
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';

  const setupBlock = document.getElementById('authSetup');
  const loginBlock = document.getElementById('authLogin');
  setupBlock.style.display = 'none';
  loginBlock.style.display = 'none';

  const config = await getAccessConfig();
  if(!config || !config.adminPasswordHash){
    setupBlock.style.display = 'block';
  }else{
    loginBlock.style.display = 'block';
    setTimeout(()=> {
      const el = document.getElementById('loginUser');
      if(el) el.focus();
      if(typeof positionSegPill === 'function') positionSegPill(document.getElementById('loginRoleToggle'));
    }, 50);
  }
}

function enterApp(role, label){
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  if(typeof applyRoleRestrictions === 'function') applyRoleRestrictions(role);
  if(typeof renderHome === 'function') renderHome();
  startSessionTracking(role, label || getRememberedDisplayName());
}

document.getElementById('setupBtn').addEventListener('click', async ()=>{
  const user = document.getElementById('setupUser').value.trim();
  const pass = document.getElementById('setupPass').value;
  const pass2 = document.getElementById('setupPass2').value;
  const err = document.getElementById('setupError');

  if(!user || !pass){
    err.style.display = 'block';
    err.textContent = 'Please fill in a username and password.';
    return;
  }
  if(pass.length < 4){
    err.style.display = 'block';
    err.textContent = 'Password should be at least 4 characters.';
    return;
  }
  if(pass !== pass2){
    err.style.display = 'block';
    err.textContent = 'Passwords do not match.';
    return;
  }
  err.style.display = 'none';
  const hash = await sha256(pass);
  try{
    await cloudSaveAdminAccess(user, hash);
    rememberDisplayName(user);
    setLoggedIn('admin');
    enterApp('admin', user);
  }catch(e){
    err.style.display = 'block';
    err.textContent = 'Could not save — check your internet connection and try again.';
  }
});

/* ---------- login role toggle ---------- */
let loginRole = 'admin';
document.querySelectorAll('#loginRoleToggle .seg-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    if(typeof buzz === 'function') buzz(6);
    document.querySelectorAll('#loginRoleToggle .seg-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    if(typeof positionSegPill === 'function') positionSegPill(document.getElementById('loginRoleToggle'));
    loginRole = btn.dataset.role;
    document.getElementById('loginUserRow').style.display = loginRole === 'admin' ? 'block' : 'none';
    document.getElementById('loginNameRow').style.display = loginRole === 'staff' ? 'block' : 'none';
    document.getElementById('loginPassLabel').textContent = loginRole === 'admin' ? 'Password' : 'Staff password';
    document.getElementById('loginError').style.display = 'none';
    if(loginRole === 'staff'){
      const remembered = getRememberedDisplayName();
      if(remembered) document.getElementById('loginName').value = remembered;
    }
  });
});

document.getElementById('loginBtn').addEventListener('click', async ()=>{
  const pass = document.getElementById('loginPass').value;
  const err = document.getElementById('loginError');
  err.style.display = 'none';

  const config = await getAccessConfig();
  if(!config){
    err.style.display = 'block';
    err.textContent = 'Could not connect — check your internet connection and try again.';
    return;
  }
  const hash = await sha256(pass);

  if(loginRole === 'admin'){
    const user = document.getElementById('loginUser').value.trim();
    if(user === config.adminUsername && hash === config.adminPasswordHash){
      rememberDisplayName(user);
      setLoggedIn('admin');
      enterApp('admin', user);
      return;
    }
    err.style.display = 'block';
    err.textContent = 'Incorrect username or password.';
  }else{
    const name = document.getElementById('loginName').value.trim();
    if(!name){
      err.style.display = 'block';
      err.textContent = 'Please enter your name so the admin knows it\'s you.';
      return;
    }
    if(config.staffPasswordHash && hash === config.staffPasswordHash){
      rememberDisplayName(name);
      setLoggedIn('staff');
      enterApp('staff', name);
      return;
    }
    err.style.display = 'block';
    err.textContent = config.staffPasswordHash ? 'Incorrect staff password.' : 'Staff access has not been set up yet — ask the admin.';
  }
});

// allow Enter key to submit
['setupPass2','loginPass'].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.addEventListener('keydown', e=>{
    if(e.key === 'Enter'){
      const btnId = id === 'setupPass2' ? 'setupBtn' : 'loginBtn';
      document.getElementById(btnId).click();
    }
  });
});

/* ---------- init auth ---------- */
(async function initAuth(){
  if(isLoggedIn()){
    enterApp(getRole());
  }else{
    await showAuthScreen();
  }
})();
