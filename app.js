let transactions = [];
let fileSha = null;

// Default users
const DEFAULT_USERS = { safar: 'safar1997', renu: 'renu' };
const DEFAULT_ADMINS = ['safar'];
const DEFAULT_PERMS = { safar: { read: 1, write: 1, view: 1, delete: 1 }, renu: { read: 1, write: 0, view: 1, delete: 0 } };

const getUsers = () => { try { return JSON.parse(localStorage.getItem('wallet_users') || '{}'); } catch(e) { return {}; } };
const setUsers = (u) => localStorage.setItem('wallet_users', JSON.stringify(u));
const getUserNames = () => Object.keys({ ...DEFAULT_USERS, ...getUsers() });
const getPassword = (u) => getUsers()[u] || DEFAULT_USERS[u];
const isAdminUser = (u) => { try { return (JSON.parse(localStorage.getItem('wallet_admins') || '[]')).includes(u) || DEFAULT_ADMINS.includes(u); } catch(e) { return DEFAULT_ADMINS.includes(u); } };
const PERMS = ['read', 'write', 'view', 'delete'];

const getPerms = () => { try { return JSON.parse(localStorage.getItem('user_perms') || '{}'); } catch(e) { return {}; } };
const getPerm = (user, perm) => { if (!user) return 0; const p = getPerms(); return (p[user] && p[user][perm]) || (DEFAULT_PERMS[user] && DEFAULT_PERMS[user][perm]) ? 1 : 0; };
const setPerms = (p) => localStorage.setItem('user_perms', JSON.stringify(p));
const getCurrentUser = () => sessionStorage.getItem('wallet_user');
const setCurrentUser = (u) => { if(u) sessionStorage.setItem('wallet_user', u); else sessionStorage.removeItem('wallet_user'); };
const isAdmin = () => isAdminUser(getCurrentUser());
const getTrackUser = () => {
    if (!isAdmin()) return getCurrentUser() || 'safar';
    return sessionStorage.getItem('track_user') || getCurrentUser() || 'safar';
};
const setTrackUser = (u) => sessionStorage.setItem('track_user', u);

function doLogin() {
    const u = (document.getElementById('login-username').value || '').trim().toLowerCase();
    const p = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    if (!getUserNames().includes(u) || getPassword(u) !== p) { err.textContent = 'Invalid username or password'; return; }
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

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.getElementById('nav-' + page).classList.add('active');
    if (page === 'users') {
        renderUserList();
        loadGhSettings();
    }
}

function loadGhSettings() {
    document.getElementById('gh-username').value = getSetting('gh_username') || '';
    document.getElementById('gh-repo').value = getSetting('gh_repo') || '';
    document.getElementById('gh-filename').value = getSetting('gh_filename') || 'data.json';
    document.getElementById('gh-token').value = getSetting('gh_token') || '';
}

function saveGhSetting() {
    localStorage.setItem('gh_username', document.getElementById('gh-username').value);
    localStorage.setItem('gh_repo', document.getElementById('gh-repo').value);
    localStorage.setItem('gh_filename', document.getElementById('gh-filename').value);
    localStorage.setItem('gh_token', document.getElementById('gh-token').value);
}

function renderUserList() {
    const list = document.getElementById('user-list');
    const users = getUserNames();
    list.innerHTML = '';
    users.forEach(u => {
        const isAdmin = isAdminUser(u);
        const isDefault = DEFAULT_USERS[u];
        const div = document.createElement('div');
        div.className = 'transaction';
        div.innerHTML = `
            <div class="t-left">
                <div class="t-desc">${u} ${isAdmin ? '(Admin)' : ''} ${isDefault ? '(Default)' : ''}</div>
            </div>
            <div class="t-right">
                <button onclick="editUser('${u}')" style="padding: 8px 15px; width: auto; font-size: 0.85rem; margin-right: 5px;">Edit</button>
                <button onclick="deleteUser('${u}')" ${isDefault ? 'disabled' : ''} style="padding: 8px 15px; width: auto; font-size: 0.85rem; background: ${isDefault ? '#ccc' : '#dc3545'};">Delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function editUser(username) {
    document.getElementById('user-username').value = username;
    document.getElementById('user-password').value = '';
}

function deleteUser(username) {
    if (!confirm('Delete user ' + username + '?')) return;
    const users = getUsers();
    delete users[username];
    setUsers(users);
    const perms = getPerms();
    delete perms[username];
    setPerms(perms);
    renderUserList();
    alert('User deleted!');
}

function saveUser() {
    const username = (document.getElementById('user-username').value || '').trim().toLowerCase();
    const password = document.getElementById('user-password').value;
    if (!username || !password) return alert('Please fill username and password');
    const users = getUsers();
    users[username] = password;
    setUsers(users);
    if (!getPerms()[username]) {
        setPerms({ ...getPerms(), [username]: { read: 1, write: 1, view: 1, delete: 0 } });
    }
    clearUserForm();
    renderUserList();
    alert('User saved!');
}

function clearUserForm() {
    document.getElementById('user-username').value = '';
    document.getElementById('user-password').value = '';
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.add('visible');
    const u = getCurrentUser();
    document.getElementById('add-transaction-form').style.display = getPerm(u, 'write') ? 'block' : 'none';
    document.getElementById('main-content').style.display = getPerm(u, 'view') ? 'block' : 'none';
    document.getElementById('no-permission-msg').style.display = getPerm(u, 'view') ? 'none' : 'block';
    const sel = document.getElementById('user-select');
    sel.style.display = isAdmin() ? 'block' : 'none';
    document.getElementById('permissions-btn').style.display = isAdmin() ? 'block' : 'none';
    if (isAdmin()) { sel.innerHTML = getUserNames().map(un => `<option value="${un}" ${un === getTrackUser() ? 'selected' : ''}>${un}</option>`).join(''); }
    else setTrackUser(u);
}
function switchTrackUser() {
    if (!isAdmin()) return;
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

function togglePermissions() {
    const m = document.getElementById('permissions-modal');
    m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
    if (m.style.display === 'flex') {
        const p = getPerms();
        const html = `<table class="permissions-table"><thead><tr><th>User</th>${PERMS.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${getUserNames().map(u=>`<tr><td>${u}</td>${PERMS.map(perm=>`<td><input type="checkbox" id="perm-${u}-${perm}" ${getPerm(u,perm)?'checked':''}></td>`).join('')}</tr>`).join('')}</tbody></table>`;
        document.getElementById('permissions-grid').innerHTML = html;
    }
}
function savePermissions() {
    const p = {};
    getUserNames().forEach(u => { p[u] = {}; PERMS.forEach(perm => { p[u][perm] = document.getElementById(`perm-${u}-${perm}`)?.checked ? 1 : 0; }); });
    setPerms(p);
    const u = getCurrentUser();
    document.getElementById('add-transaction-form').style.display = getPerm(u, 'write') ? 'block' : 'none';
    const canView = getPerm(u, 'view');
    document.getElementById('main-content').style.display = canView ? 'block' : 'none';
    document.getElementById('no-permission-msg').style.display = canView ? 'none' : 'block';
    togglePermissions();
    updateUI();
}

function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    if(modal.style.display === 'block') {
        document.getElementById('gh-username').value = getSetting('gh_username') || '';
        document.getElementById('gh-repo').value = getSetting('gh_repo') || '';
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
    if (!getPerm(getCurrentUser(), 'read')) { showStatus('No read permission'); return; }
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
    try {
        const r = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${file}`, { headers: { 'Authorization': `token ${token}` } });
        if (r.ok) {
            const d = await r.json();
            fileSha = d.sha;
            let remote = JSON.parse(decodeURIComponent(escape(atob(d.content))));
            remote = Array.isArray(remote) ? remote : Object.values(remote).flat();
            const byId = {};
            remote.forEach(t => { byId[t.id] = t; });
            transactions.forEach(t => { byId[t.id] = t; });
            transactions = Object.values(byId);
        }
    } catch(e) {}
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
    const canDelete = getPerm(getCurrentUser(), 'delete');
    filtered.forEach((t, i) => {
        const amt = parseFloat(t.amount);
        if(t.type === 'asset') asset += amt; else if(t.type === 'income') inc += amt; else exp += amt;
        const typeClass = t.type === 'asset' ? 'asset' : (t.type === 'income' ? 'inc' : 'exp');
        const sign = (t.type === 'asset' || t.type === 'income') ? '+' : '-';
        const globalIdx = transactions.findIndex(x => x.id === t.id);
        const delBtn = canDelete ? `<span class="del-btn" onclick="removeTransaction(${globalIdx})">&times;</span>` : '';
        const item = document.createElement('div');
        item.className = 'transaction';
        item.innerHTML = `<div class="t-left"><div class="t-desc">${t.desc || '—'}</div><div class="t-meta"><span>${t.date ? formatDate(t.date) : 'No Date'}</span><span class="t-tag">${t.category || 'Uncategorized'}</span></div></div><div class="t-right"><span class="t-amount ${typeClass}">${sign}${formatAmount(amt)} AED</span>${delBtn}</div>`;
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

    // By Month
    const monthTotals = {};
    filtered.forEach(t => {
        const month = t.date ? t.date.substring(0, 7) : 'Unknown';
        const amt = parseFloat(t.amount);
        if (!monthTotals[month]) monthTotals[month] = 0;
        monthTotals[month] += (t.type === 'asset' || t.type === 'income') ? amt : -amt;
    });
    const ml = document.getElementById('month-list');
    ml.innerHTML = '';
    Object.entries(monthTotals).sort((a, b) => b[0].localeCompare(a[0])).forEach(([month, total]) => {
        const it = document.createElement('div');
        it.className = 'month-card';
        const isPos = total >= 0;
        const [y, m] = month.split('-');
        const monthName = new Date(y, m - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        it.innerHTML = `<h3>${monthName}</h3><p class="${isPos ? '' : ''}" style="color: ${isPos ? '#28a745' : '#dc3545'}">${isPos ? '+' : '-'}${formatAmount(Math.abs(total))} AED</p>`;
        ml.appendChild(it);
    });
}

function removeTransaction(idx) {
    if (!getPerm(getCurrentUser(), 'delete')) return;
    if (confirm('Delete this transaction?')) { transactions.splice(idx, 1); updateUI(); saveToGitHub(); }
}

function addTransaction() {
    if (!getPerm(getCurrentUser(), 'write')) return;
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
if (getPerm(getCurrentUser(), 'read')) loadFromGitHub();
