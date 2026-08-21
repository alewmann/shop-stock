const AUTH_KEY = 'shopstock_auth_v1';
const SESSION_KEY = 'shopstock_session_v1';

async function sha256(text){
  const enc = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function getAuth(){
  try{
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function setAuth(username, passHash){
  localStorage.setItem(AUTH_KEY, JSON.stringify({ username, passHash }));
}
function clearAuth(){
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(SESSION_KEY);
}
function isLoggedIn(){
  return sessionStorage.getItem(SESSION_KEY) === '1';
}
function setLoggedIn(){
  sessionStorage.setItem(SESSION_KEY, '1');
}
function logOut(){
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}

function showAuthScreen(){
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';

  const existing = getAuth();
  const setupBlock = document.getElementById('authSetup');
  const loginBlock = document.getElementById('authLogin');

  if(!existing){
    setupBlock.style.display = 'block';
    loginBlock.style.display = 'none';
  }else{
    setupBlock.style.display = 'none';
    loginBlock.style.display = 'block';
    setTimeout(()=> document.getElementById('loginUser').focus(), 50);
  }
}

function enterApp(){
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  if(typeof renderStock === 'function') renderStock();
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
  setAuth(user, hash);
  setLoggedIn();
  enterApp();
});

document.getElementById('loginBtn').addEventListener('click', async ()=>{
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const err = document.getElementById('loginError');
  const stored = getAuth();

  if(!stored){
    showAuthScreen();
    return;
  }
  const hash = await sha256(pass);
  if(user === stored.username && hash === stored.passHash){
    err.style.display = 'none';
    setLoggedIn();
    enterApp();
  }else{
    err.style.display = 'block';
    err.textContent = 'Incorrect username or password.';
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
(function initAuth(){
  const stored = getAuth();
  if(stored && isLoggedIn()){
    enterApp();
  }else{
    showAuthScreen();
  }
})();
