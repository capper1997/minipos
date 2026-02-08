let transactions = [];
let fileSha = null;

const USERS = { safar: 'safar1997', renu: 'renu' };
const USER_NAMES = ['safar', 'renu'];
const getCurrentUser = () => sessionStorage.getItem('wallet_user');
const setCurrentUser = (u) => { if(u) sessionStorage.setItem('wallet_user', u); else sessionStorage.removeItem('wallet_user'); };
const getTrackUser = () => sessionStorage.getItem('track_user') || getCurrentUser() || 'safar';
const setTrackUser = (u) => sessionStorage.setItem('track_user', u);

function doLogin() {
    const u = (document.getElementById('login-username').value || '').trim().toLowerCase();
    const p = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    if (!USERS[u] || USERS[u] !== p) { err.textContent = 'Invalid username or password'; return; }
    err.textContent = '';
    setCurrentUser(u);
    setTrackUser(u);
    showApp();
}

function logout() {
    setCurrentUser('');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.remove('visible');
    toggleSettings();
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.add('visible');
    document.getElementById('add-transaction-form').style.display = getCurrentUser() === 'renu' ? 'none' : 'block';
    const sel = document.getElementById('user-select');
    sel.innerHTML = USER_NAMES.map(u => `<option value="${u}" ${u === getTrackUser() ? 'selected' : ''}>${u}</option>`).join('');
}
function switchTrackUser() {
    setTrackUser(document.getElementById('user-select').value);
    updateUI();
}

const getSetting = (key) => localStorage.getItem(key);
const formatAmount = (n) => parseFloat(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const formatDate = (dateString) => {
    if(!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};
const setToday = () => {
    const n = new Date();
    document.getElementById('t-date').value = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
};

function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    if(modal.style.display === 'block') {
        document.getElementById('gh-username').value = getSetting('gh_username') || 'safarmansoor';
        document.getElementById('gh-repo').value = getSetting('gh_repo') || 'wallet-app';
        document.getElementById('gh-filename').value = getSetting('gh_filename') || 'data.json';
        document.getElementById('gh-token').value = getSetting('gh_token') || '';
    }
}

function saveSettings() {
    localStorage.setItem('gh_username', document.getElementById('gh-username').value);
    localStorage.setItem('gh_repo', document.getElementById('gh-repo').value);
    localStorage.setItem('gh_filename', document.getElementById('gh-filename').value);
    localStorage.setItem('gh_token', document.getElementById('gh-token').value);
    toggleSettings();
    loadFromGitHub();
}

function showStatus(msg) { document.getElementById('status-bar').innerText = msg; }

async function loadFromGitHub() {
    const user = getSetting('gh_username'), repo = getSetting('gh_repo'), file = getSetting('gh_filename'), token = getSetting('gh_token');
    if (!user || !repo || !token) { showStatus('Tap ⚙ to setup GitHub sync'); return; }
    showStatus('Fetching data...');
    try {
        const r = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${file}`, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
        if (r.status === 404) { transactions = []; showStatus('New file will be created on first add.'); }
        else if (r.ok) {
            const d = await r.json();
            fileSha = d.sha;
            let raw = JSON.parse(decodeURIComponent(escape(atob(d.content))));
            transactions = Array.isArray(raw) ? raw : Object.values(raw).flat();
            transactions.forEach(t => { if (!t.user) t.user = 'renu'; });
            showStatus('Synced with GitHub');
        } else showStatus('Error fetching data');
        updateUI();
    } catch (e) {
        try {
            const lr = await fetch('data.json');
            if (lr.ok) {
                let raw = await lr.json();
                transactions = Array.isArray(raw) ? raw : Object.values(raw).flat();
                transactions.forEach(t => { if (!t.user) t.user = 'renu'; });
                showStatus('Loaded from local (GitHub unavailable)'); updateUI(); return;
            }
        } catch(e2) {}
        showStatus('Offline / Connection Error');
        updateUI();
    }
}

async function saveToGitHub() {
    const user = getSetting('gh_username'), repo = getSetting('gh_repo'), file = getSetting('gh_filename'), token = getSetting('gh_token');
    showStatus('Saving...');
    const addBtn = document.getElementById('add-btn');
    if (addBtn) { addBtn.disabled = true; addBtn.innerText = 'Saving...'; }
    if (!user || !repo || !token) { showStatus('Tap ⚙ to setup GitHub sync'); if (addBtn) { addBtn.disabled = false; addBtn.innerText = 'Add Transaction'; } return; }
    if (!fileSha) {
        try { const r = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${file}`, { headers: { 'Authorization': `token ${token}` } }); if (r.ok) { const d = await r.json(); fileSha = d.sha; } } catch(e) {}
    }
    const body = { message: "Update data [skip ci]", content: btoa(unescape(encodeURIComponent(JSON.stringify(transactions)))) };
    if (fileSha) body.sha = fileSha;
    try {
        const r = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${file}`, { method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (r.ok) { const d = await r.json(); fileSha = d.content.sha; showStatus('Saved successfully!'); }
        else showStatus('Save Failed! Check Settings.');
    } catch(e) { showStatus('Save Error'); }
    if (addBtn) { addBtn.disabled = false; addBtn.innerText = 'Add Transaction'; }
}

function updateUI() {
    const trackUser = getTrackUser();
    const filtered = transactions.filter(t => (t.user || 'renu') === trackUser);
    document.getElementById('history-list').innerHTML = '';
    let asset = 0, inc = 0, exp = 0;
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    filtered.forEach((t, i) => {
        const amt = parseFloat(t.amount);
        if(t.type === 'asset') asset += amt; else if(t.type === 'income') inc += amt; else exp += amt;
        const typeClass = t.type === 'asset' ? 'asset' : (t.type === 'income' ? 'inc' : 'exp');
        const sign = (t.type === 'asset' || t.type === 'income') ? '+' : '-';
        const item = document.createElement('div');
        item.className = 'transaction';
        item.innerHTML = `<div class="t-left"><div class="t-desc">${t.desc || '—'}</div><div class="t-meta"><span>${t.date ? formatDate(t.date) : 'No Date'}</span><span class="t-tag">${t.category || 'Uncategorized'}</span></div></div><div class="t-right"><span class="t-amount ${typeClass}">${sign}${formatAmount(amt)} AED</span></div>`;
        document.getElementById('history-list').appendChild(item);
    });
    document.getElementById('total-asset').innerText = `${formatAmount(asset)} AED`;
    document.getElementById('total-inc').innerText = `${formatAmount(inc)} AED`;
    document.getElementById('total-exp').innerText = `${formatAmount(exp)} AED`;
    const balance = inc - exp;
    document.getElementById('total-balance').innerText = balance < 0 ? `-${formatAmount(Math.abs(balance))} AED` : `${formatAmount(balance)} AED`;
    document.getElementById('balance-card').classList.toggle('negative', balance < 0);
    const categoryTotals = {};
    filtered.forEach(t => {
        const cat = (t.category || '').trim() || 'Uncategorized';
        const amt = parseFloat(t.amount);
        if (!categoryTotals[cat]) categoryTotals[cat] = 0;
        categoryTotals[cat] += (t.type === 'asset' || t.type === 'income') ? amt : -amt;
    });
    const cl = document.getElementById('category-list');
    cl.innerHTML = '';
    Object.entries(categoryTotals).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).forEach(([cat, total]) => {
        const it = document.createElement('div');
        it.className = 'category-item';
        const isPos = total >= 0;
        it.innerHTML = `<span>${cat}</span><span class="cat-amount ${isPos ? 'positive' : 'negative'}">${isPos ? '+' : '-'}${formatAmount(Math.abs(total))} AED</span>`;
        cl.appendChild(it);
    });
}

function addTransaction() {
    const date = document.getElementById('t-date').value, type = document.getElementById('type').value;
    const desc = document.getElementById('desc').value, category = document.getElementById('category').value, amount = document.getElementById('amount').value;
    if(!amount || !date) return alert('Please fill date and amount');
    transactions.push({ id: Date.now(), createdAt: new Date().toISOString(), date, type, desc: desc || '', category, amount, user: getTrackUser() });
    updateUI();
    saveToGitHub();
    document.getElementById('desc').value = '';
    document.getElementById('amount').value = '';
    setToday();
}

if (getCurrentUser()) showApp();
setToday();
loadFromGitHub();
