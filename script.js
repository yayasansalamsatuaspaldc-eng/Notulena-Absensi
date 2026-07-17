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
                body: JSON.stringify({ action: key, args: args })
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
      window.location.href = halamanTujuan + ".html";
    });
  });
});
