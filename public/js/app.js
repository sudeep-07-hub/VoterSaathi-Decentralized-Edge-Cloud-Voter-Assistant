/**
 * App v2 — Collapsible sidebar/chat (D4), voter card modal (D3), nav wiring.
 */

let sidebarOpen = true;
let chatOpen = false;

// ── Sidebar Toggle (D4) ─────────────────────────────────────
function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  const sb    = document.getElementById('sidebar');
  const strip = document.getElementById('logoStrip');
  const main  = document.getElementById('mainContent');

  if (sidebarOpen) {
    sb.classList.remove('collapsed');
    strip.classList.remove('visible');
    main.style.paddingLeft = '24px';
  } else {
    sb.classList.add('collapsed');
    strip.classList.add('visible');
    main.style.paddingLeft = '24px';
  }
}

// ── Chat Toggle (D4) ────────────────────────────────────────
function toggleChat() {
  chatOpen = !chatOpen;
  const cp  = document.getElementById('chatPanel');
  const btn = document.getElementById('chatToggleBtn');

  if (chatOpen) {
    const saved = localStorage.getItem(CHAT_WIDTH_KEY);
    cp.style.width = (saved ? saved + 'px' : CHAT_DEFAULT_WIDTH + 'px');
    cp.classList.add('open');
    btn.innerHTML = '<span>✕</span> <span>Close</span>';
  } else {
    cp.style.width = '0';
    cp.classList.remove('open');
    btn.innerHTML = '<span>💬</span> <span>Saathi Bot</span>';
  }
}

// ── Send Chat Message (auto-opens chat if closed) ───────────
function sendChatMessage(text) {
  if (!chatOpen) toggleChat();
  document.getElementById('chatInput').value = text;
  Chat.sendMessage();
}

// ─── Chat Panel Resize ────────────────────────────────────────────────────

const CHAT_MIN_WIDTH = 220;
const CHAT_MAX_WIDTH = 480;
const CHAT_DEFAULT_WIDTH = 272;
const CHAT_WIDTH_KEY = 'votersaathi_chat_width';

let isResizing = false;
let resizeStartX = 0;
let resizeStartWidth = 0;

function initChatResize() {
  const handle = document.getElementById('chatResizeHandle');
  const panel  = document.getElementById('chatPanel');
  if (!handle || !panel) return;

  const saved = localStorage.getItem(CHAT_WIDTH_KEY);
  if (saved && chatOpen) {
    panel.style.width = saved + 'px';
  }

  handle.addEventListener('mousedown', (e) => {
    if (!chatOpen) return;

    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartWidth = panel.offsetWidth;

    panel.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    requestAnimationFrame(() => {
      const delta    = resizeStartX - e.clientX;
      const newWidth = Math.min(
        CHAT_MAX_WIDTH,
        Math.max(CHAT_MIN_WIDTH, resizeStartWidth + delta)
      );
      panel.style.width = newWidth + 'px';
    });
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;

    const panel = document.getElementById('chatPanel');
    panel.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    localStorage.setItem(CHAT_WIDTH_KEY, panel.offsetWidth);
  });
}

// ── Voter Card Modal (D3) ───────────────────────────────────
function openVoterCard() {
  document.getElementById('modalOverlay').classList.add('open');
}

function closeVoterCard() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closeVoterCard();
}

function populateVoterCardFromAgent(data) {
  if (!data) return;
  document.getElementById('vc-name').textContent = data.full_name || '—';
  document.getElementById('vc-epic').textContent = data.epic_masked || '—';
  document.getElementById('vc-dob').textContent = data.dob || '—';
  document.getElementById('vc-gender').textContent = data.gender || '—';
  document.getElementById('vc-constituency').textContent = data.constituency || '—';
  document.getElementById('vc-assembly').textContent = data.assembly_no || '—';
  document.getElementById('vc-part').textContent = data.part_no || '—';
  document.getElementById('vc-serial').textContent = data.serial_no || '—';
  document.getElementById('vc-address').textContent = data.address || '—';
  document.getElementById('vc-footer-state').textContent = `${data.state || '—'} · 2026 Roll`;
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initChatResize();
  Dashboard.load();
  Chat.init();

  // Sidebar nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      const page = item.dataset.page;

      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      if (action === 'deadlines')  sendChatMessage('Show upcoming deadlines');
      if (action === 'checkroll')  sendChatMessage('Check my voter roll status');
      if (action === 'trackapp')   sendChatMessage('Check my application status');
      if (action === 'update')     sendChatMessage('I want to update my details');
      if (page === 'booth')        sendChatMessage('Show my polling booth on map');
      if (page === 'dashboard') {
        document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
      }
      // page === 'votercard' handled by onclick="openVoterCard()" in HTML
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
    });
  });

  // Glance card clicks
  document.getElementById('cardEpic')?.addEventListener('click', (e) => {
    if (e.target.closest('.icard-action')) return; // let the "View full card" handler work
    sendChatMessage('Show my EPIC number and voter details');
  });
  document.getElementById('cardRoll')?.addEventListener('click', () => {
    sendChatMessage('Check my voter roll status');
  });

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeVoterCard();
  });

  // Idle proactive trigger (30s)
  let idleTimer;
  const resetIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (document.querySelectorAll('.msg-user').length === 0 && chatOpen) {
        Chat.addBotMessage(
          'I noticed some upcoming deadlines that might affect you. Would you like me to show the details?',
          'Fallback'
        );
      }
    }, 30000);
  };
  document.addEventListener('mousemove', resetIdle);
  document.addEventListener('keydown', resetIdle);
  resetIdle();
});
