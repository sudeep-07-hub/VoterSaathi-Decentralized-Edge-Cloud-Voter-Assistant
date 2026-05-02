/**
 * Chat Panel — Handles conversation UI, message sending, and quick actions.
 */

const Chat = {
  messages: [],
  isTyping: false,

  init() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');

    sendBtn.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
    });

    // Welcome message
    this.addBotMessage(
      'Namaste! 🙏 I\'m your VoterSaathi assistant. I found some things that need your attention. Ask me anything about your voter profile, polling booth, deadlines, or applications — in any language!',
      'ORCHESTRATOR'
    );

    this.renderQuickActions([
      { label: '📍 Show my booth on map', query: 'Show my booth on map' },
      { label: '📄 Download voter slip', query: 'Download my voter slip' },
      { label: '📋 Check Form 8 status', query: 'Check my Form 8 application status' },
      { label: '⏰ Upcoming deadlines', query: 'What are my upcoming deadlines?' },
    ]);
  },

  async sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || this.isTyping) return;

    input.value = '';
    this.addUserMessage(text);
    this.showTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, user_id: 'USR-TN-001' }),
      });

      const data = await res.json();
      this.showTyping(false);
      this.addBotMessage(data.response_text, data.agent_used, data);
      this.handleUIAction(data);
      this.updateQuickActions(data);
    } catch (err) {
      this.showTyping(false);
      this.addBotMessage(
        'I apologise — I couldn\'t connect right now. Please try again. Your data is safe offline.',
        'FALLBACK'
      );
    }
  },

  addUserMessage(text) {
    const container = document.getElementById('chatMessages');
    const indicator = document.getElementById('typingIndicator');
    const msg = document.createElement('div');
    msg.className = 'chat-msg user';
    msg.innerHTML = `<div class="msg-text">${this.escapeHtml(text)}</div>
      <div class="msg-meta">${this.timeStr()}</div>`;
    container.insertBefore(msg, indicator);
    this.scrollToBottom();
  },

  addBotMessage(text, agent, data) {
    const container = document.getElementById('chatMessages');
    const indicator = document.getElementById('typingIndicator');
    const msg = document.createElement('div');
    msg.className = 'chat-msg bot';

    const agentLabel = agent || 'SAATHI';
    const offlineSafe = data?.offline_safe;
    const offlineBadge = offlineSafe ? '<span class="offline-badge">⚡ Offline-safe</span>' : '';

    msg.innerHTML = `
      <div class="agent-tag">${agentLabel} Agent</div>
      <div class="msg-text">${this.escapeHtml(text)}</div>
      <div class="msg-meta">${this.timeStr()} ${offlineBadge}</div>`;
    container.insertBefore(msg, indicator);
    this.scrollToBottom();
  },

  showTyping(show) {
    this.isTyping = show;
    const el = document.getElementById('typingIndicator');
    el.classList.toggle('visible', show);
    document.getElementById('chatSendBtn').disabled = show;
    if (show) this.scrollToBottom();
  },

  handleUIAction(data) {
    if (!data || !data.ui_action) return;

    switch (data.ui_action) {
      case 'open_map':
        if (data.ui_payload?.maps_embed_url) {
          Dashboard.showMap(data.ui_payload.maps_embed_url);
        } else if (data.agent_data?.maps_embed_url) {
          Dashboard.showMap(data.agent_data.maps_embed_url);
        }
        break;
      case 'highlight_card':
        document.getElementById('cardEpic')?.classList.add('highlight');
        setTimeout(() => document.getElementById('cardEpic')?.classList.remove('highlight'), 3000);
        break;
      case 'show_deadline':
        // Scroll to alerts
        document.querySelector('.alerts-section')?.scrollIntoView({ behavior: 'smooth' });
        break;
    }
  },

  updateQuickActions(data) {
    const actions = [];

    if (data.agent_used === 'BOOTH' && data.agent_data?.maps_directions_link) {
      actions.push({ label: '🗺️ Get directions', query: 'Get directions to my booth' });
    }
    if (data.agent_used === 'APPLICATION' && data.agent_data?.status === 'rejected') {
      actions.push({ label: '📋 Re-submit form', query: 'Help me re-submit my application' });
    }
    if (data.agent_used === 'GRIEVANCE') {
      actions.push({ label: '📞 Call ECI Helpline', query: 'Give me the ECI helpline number' });
    }
    if (data.agent_used === 'DEADLINE') {
      actions.push({ label: '📅 Add to Calendar', query: 'Add deadline to my Google Calendar' });
    }

    // Always offer these
    actions.push({ label: '📍 My booth', query: 'Where is my polling booth?' });
    actions.push({ label: '⏰ Deadlines', query: 'Show upcoming deadlines' });

    if (data.agent_data?.suggested_actions) {
      data.agent_data.suggested_actions.forEach(sa => {
        actions.push({ label: `${sa.icon} ${sa.label}`, query: sa.label });
      });
    }

    this.renderQuickActions(actions.slice(0, 4));
  },

  renderQuickActions(actions) {
    const container = document.getElementById('quickActions');
    container.innerHTML = actions.map(a =>
      `<button class="quick-btn" data-query="${this.escapeHtml(a.query)}" aria-label="${this.escapeHtml(a.label)}">${a.label}</button>`
    ).join('');

    container.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('chatInput').value = btn.dataset.query;
        this.sendMessage();
      });
    });
  },

  scrollToBottom() {
    const container = document.getElementById('chatMessages');
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
  },

  timeStr() {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};
