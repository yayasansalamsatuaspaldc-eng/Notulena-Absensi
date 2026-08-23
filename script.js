// === STATE SESI LOGIN (diisi setelah login / restore sesi) ===
window.YASSA_AUTH = { token: null, user: null };

// === JEMBATAN PENGHUBUNG GITHUB KE GAS ===
const GAS_URL = "https://script.google.com/macros/s/AKfycbz5AONoccZluzzT-fl-aBGbfzzNcYEX7y4_7p8E8MGfa8ZU06DEiXokO4-k__5GWZKt0A/exec";

window.google = {
  script: {
    run: new Proxy({}, {
      get: function(_, prop) {
        const state = { onSuccess: null, onFailure: null };
        const handler = {
          get: function(target, key) {
            if (key === 'withSuccessHandler') return (cb) => { target.onSuccess = cb; return new Proxy(target, handler); };
            if (key === 'withFailureHandler') return (cb) => { target.onFailure = cb; return new Proxy(target, handler); };
            return (...args) => {
              fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: key, args: args, token: (window.YASSA_AUTH && window.YASSA_AUTH.token) || '' })
              })
              .then(res => res.json())
              .then(data => {
                if (data.success !== false) {
                  if (target.onSuccess) target.onSuccess(data._dibungkus ? data.data : data);
                } else {
                  if (target.onFailure) target.onFailure(data);
                }
              })
              .catch(err => {
                if (target.onFailure) target.onFailure(err);
              });
            };
          }
        };
        return handler.get(state, prop);
      }
    })
  }
};
// =========================================

// ============================================================
// YASSA - Shared JS Utilities
// ============================================================

// ---- Toast Notification ----
function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all .3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---- Loading ----
function showLoading(msg = 'Memproses...') {
  let overlay = document.getElementById('loadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `<div class="spinner"></div><span>${msg}</span>`;
    document.body.appendChild(overlay);
  } else {
    overlay.querySelector('span').textContent = msg;
    overlay.style.display = 'flex';
  }
}
function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

// ---- Modal ----
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open');
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ---- Dark Mode ----
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('yassa-dark', isDark);
  const btn = document.getElementById('darkModeBtn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}
function initDarkMode() {
  const isDark = localStorage.getItem('yassa-dark') === 'true';
  if (isDark) document.body.classList.add('dark-mode');
  const btn = document.getElementById('darkModeBtn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

// ---- Sidebar ----
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}

// ---- Format helpers ----
function formatDate(d) {
  if (!d) return '-';
  if (typeof d === 'string' && d.includes('/')) return d;
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
}

function formatDatetime(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  return d.toLocaleString('id-ID');
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ---- GAS runner ----
function runGAS(fnName, ...args) {
  return new Promise((resolve, reject) => {
    const call = args.length ? google.script.run[fnName](...args) : google.script.run[fnName]();
    call
      .withSuccessHandler(resolve)
      .withFailureHandler(reject);
  });
}

// ---- Confirm dialog ----
function confirmAction(msg) {
  return new Promise(resolve => {
    const confirmed = window.confirm(msg);
    resolve(confirmed);
  });
}

// ---- On DOM ready ----
document.addEventListener('DOMContentLoaded', function() {
  // Inisialisasi tema tampilan gelap/terang
  initDarkMode();

  // Halaman yang wajib login (punya atribut data-auth-required di <body>)
  // akan menampilkan gerbang login & memuat sesi tersimpan terlebih dulu.
  if (document.body.hasAttribute('data-auth-required')) {
    yassaInitAuth();
  }

  // ============ MODE EMBED (dipanggil dari YASSA Hub) ============
  // Kalau dibuka lewat overlay iframe Hub (?embed=1), sembunyikan
  // sidebar + topbar bawaan halaman ini biar gak dobel sama header Hub.
  if (new URLSearchParams(window.location.search).get('embed') === '1') {
    document.body.classList.add('embed-mode');
  }

  // Penanganan klik overlay menu sidebar pada perangkat mobile
  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) overlay.addEventListener('click', toggleSidebar);

  // INTERCEPTOR NAVIGASI: Disesuaikan untuk GitHub Pages
  document.querySelectorAll('a[href^="?page="]').forEach(link => {
    link.addEventListener('click', function(e) {
      const target = this.getAttribute('target');

      // Jangan intersep jika link memang diperuntukkan membuka tab baru
      if (target === '_blank') return;

      e.preventDefault();
      showLoading('Mengalihkan halaman...');

      // Ambil nama halaman dari parameter (contoh: dari "?page=kegiatan" menjadi "kegiatan")
      let halamanTujuan = this.getAttribute('href').replace('?page=', '');

      // Ubah huruf pertama jadi huruf besar agar cocok dengan nama file (Dashboard.html, Kegiatan.html)
      if (halamanTujuan !== 'index') {
        halamanTujuan = halamanTujuan.charAt(0).toUpperCase() + halamanTujuan.slice(1);
      }

      // Arahkan langsung ke file HTML lokal yang ada di GitHub
      // (pertahankan ?embed=1 kalau lagi dibuka dari overlay Hub)
      const isEmbed = new URLSearchParams(window.location.search).get('embed') === '1';
      window.location.href = halamanTujuan + ".html" + (isEmbed ? "?embed=1" : "");
    });
  });
});


// ============================================================
// YASSA - AUTH & LOGIN TERPUSAT
// Login sheet "Akun" terpusat (SAMA PERSIS dengan YASSA Hub & AWG/
// Ahli Waris/Mobile) -- satu sumber akun buat semua app YASSA.
// Hanya role SUPERADMIN & ADMIN yang boleh menambah/edit/hapus data;
// role lain (kalau ada) cuma bisa lihat. Pembatasan asli ditegakkan
// di server (Code.gs), ini cuma nyembunyiin tombolnya di tampilan.
// ============================================================
const YASSA_ADMIN_ROLES = ['SUPERADMIN', 'ADMIN'];

function yassaRoleLabel(role) {
  const map = {
    SUPERADMIN: 'Super Admin',
    ADMIN: 'Admin',
    PENGURUS: 'Pengurus',
    KORWIL: 'Korwil',
    TIM_KERJA: 'Tim Kerja',
    RELAWAN: 'Relawan'
  };
  return map[role] || role || '-';
}

function yassaIsAdmin() {
  const user = window.YASSA_AUTH.user;
  return !!(user && YASSA_ADMIN_ROLES.indexOf(String(user.role || '').toUpperCase()) !== -1);
}

function yassaInjectLoginGate() {
  if (document.getElementById('yassaLoginGate')) return;
  const gate = document.createElement('div');
  gate.id = 'yassaLoginGate';
  gate.className = 'yassa-login-gate';
  gate.innerHTML =
    '<div class="yassa-login-card">' +
      '<div class="yassa-login-icon">🕌</div>' +
      '<h2 class="yassa-login-title">YASSA Sistem Digital</h2>' +
      '<p class="yassa-login-sub">Masuk dengan akun pengurus untuk melanjutkan</p>' +
      '<div id="yassaLoginError" class="yassa-login-error" style="display:none"></div>' +
      '<form id="yassaLoginForm">' +
        '<div class="form-group">' +
          '<label class="form-label">Username</label>' +
          '<input type="text" id="yassaLoginUsername" class="form-control" placeholder="Username" autocomplete="username" required>' +
        '</div>' +
        '<div class="form-group mb-0">' +
          '<label class="form-label">Password</label>' +
          '<input type="password" id="yassaLoginPassword" class="form-control" placeholder="Password" autocomplete="current-password" required>' +
        '</div>' +
        '<button type="submit" id="yassaLoginBtn" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:18px">Masuk</button>' +
      '</form>' +
    '</div>';
  document.body.appendChild(gate);
  document.getElementById('yassaLoginForm').addEventListener('submit', yassaHandleLoginSubmit);
}

function yassaShowLoginGate() {
  yassaInjectLoginGate();
  document.getElementById('yassaLoginGate').style.display = 'flex';
}

function yassaHideLoginGate() {
  const gate = document.getElementById('yassaLoginGate');
  if (gate) gate.style.display = 'none';
}

function yassaShowLoginError(msg) {
  const el = document.getElementById('yassaLoginError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function yassaHandleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('yassaLoginUsername').value.trim();
  const password = document.getElementById('yassaLoginPassword').value;
  const btn = document.getElementById('yassaLoginBtn');
  document.getElementById('yassaLoginError').style.display = 'none';

  if (!username) { yassaShowLoginError('Username wajib diisi.'); return; }

  btn.disabled = true;
  btn.textContent = 'Memproses...';

  runGAS('login', username, password)
    .then(function (res) {
      window.YASSA_AUTH.token = res.token;
      window.YASSA_AUTH.user = res;
      sessionStorage.setItem('yassa_auth_token', res.token);
      sessionStorage.setItem('yassa_auth_user', JSON.stringify(res));
      yassaHideLoginGate();
      yassaApplyUserUI();
      showToast('Selamat datang, ' + (res.nama || res.username) + '!', 'success');
    })
    .catch(function (err) {
      yassaShowLoginError(err.message || 'Username atau password salah.');
    })
    .finally(function () {
      btn.disabled = false;
      btn.textContent = 'Masuk';
    });
}

// Terapkan data user (nama/jabatan di sidebar) & sembunyikan tombol
// tambah/edit/hapus data buat role selain SUPERADMIN/ADMIN.
function yassaApplyUserUI() {
  const user = window.YASSA_AUTH.user;
  if (!user) return;

  document.querySelectorAll('.sidebar-user-info .name').forEach(function (el) {
    el.textContent = user.nama || user.username || '-';
  });
  document.querySelectorAll('.sidebar-user-info .role').forEach(function (el) {
    el.textContent = user.jabatan || yassaRoleLabel(user.role);
  });

  const admin = yassaIsAdmin();
  document.querySelectorAll('.yassa-admin-only').forEach(function (el) {
    if (admin) el.classList.remove('yassa-admin-only');
    else el.classList.add('yassa-admin-only');
  });
}

// Dipanggil dari tombol "Keluar (Logout)" -- selain redirect bawaan
// tiap halaman (logoutUtama), pastikan sesi server juga ditutup.
function yassaLogoutSession() {
  const token = window.YASSA_AUTH.token;
  window.YASSA_AUTH.token = null;
  window.YASSA_AUTH.user = null;
  if (token) {
    try { runGAS('logoutSession', token); } catch (e) { /* diabaikan */ }
  }
}

// Dipanggil sekali di awal load halaman yang butuh login (body punya
// atribut data-auth-required). Restore sesi dari sessionStorage kalau
// ada & masih valid; kalau tidak, tampilkan gerbang login.
function yassaInitAuth() {
  yassaInjectLoginGate();
  const savedToken = sessionStorage.getItem('yassa_auth_token');
  const savedUser = sessionStorage.getItem('yassa_auth_user');

  if (!savedToken || !savedUser) {
    yassaShowLoginGate();
    return;
  }

  window.YASSA_AUTH.token = savedToken;
  try { window.YASSA_AUTH.user = JSON.parse(savedUser); } catch (e) { window.YASSA_AUTH.user = null; }
  // Tampilkan dulu pakai data tersimpan (biar gak keliatan gerbang login
  // sekilas), lalu validasi ulang ke server di belakang layar.
  yassaHideLoginGate();
  yassaApplyUserUI();

  runGAS('checkSession', savedToken)
    .then(function (session) {
      window.YASSA_AUTH.user = session;
      sessionStorage.setItem('yassa_auth_user', JSON.stringify(session));
      yassaApplyUserUI();
    })
    .catch(function () {
      sessionStorage.removeItem('yassa_auth_token');
      sessionStorage.removeItem('yassa_auth_user');
      window.YASSA_AUTH.token = null;
      window.YASSA_AUTH.user = null;
      yassaShowLoginGate();
    });
}
