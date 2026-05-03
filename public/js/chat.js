/**
 * Chat Panel v2 — Collapsible, agent-labelled messages, typing indicator.
 */
const Chat = {
  isTyping: false,

  init() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');

    sendBtn.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
    });

    this.addBotMessage(
      'Namaste! 🙏 I\'m your VoterSaathi assistant. Ask me anything about your voter profile, polling booth, deadlines, or applications — in any language.',
      'Orchestrator'
    );

    this.renderQuickActions([
      { label: '📍 My booth on map', query: 'Show my polling booth on map' },
      { label: '⏰ Deadlines', query: 'What are my upcoming deadlines?' },
      { label: '📋 Form 8 status', query: 'Check my Form 8 application status' },
      { label: '🕐 Booth timings', query: 'What time does my booth open and close?' },
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

      // 900ms typing delay for natural feel
      await new Promise(r => setTimeout(r, 900));
      this.showTyping(false);

      const agentLabel = data.agent_used || 'Saathi';
      this.addBotMessage(data.response_text, agentLabel, data);
      this.handleUIAction(data);
      this.updateQuickActions(data);
    } catch (err) {
      this.showTyping(false);
      this.addBotMessage(
        'I couldn\'t connect right now. Your data is safe offline. Please try again.',
        'Fallback'
      );
    }
  },

  addUserMessage(text) {
    const container = document.getElementById('chatMessages');
    const typing = document.getElementById('typingMsg');
    const el = document.createElement('div');
    el.className = 'msg msg-user';
    el.innerHTML = `<div class="msg-wrap">
      <div class="msg-bubble">${this.esc(text)}</div>
      <div class="msg-time" style="text-align:right">${this.time()}</div>
    </div>`;
    container.insertBefore(el, typing);
    this.scrollBottom();
  },

  addBotMessage(text, agent, data) {
    const container = document.getElementById('chatMessages');
    const typing = document.getElementById('typingMsg');
    const el = document.createElement('div');
    el.className = 'msg msg-bot';

    el.innerHTML = `<div class="msg-wrap">
      <div class="msg-agent">Saathi · ${agent} Agent</div>
      <div class="msg-bubble">${this.esc(text)}</div>
      <div class="msg-time">${this.time()}</div>
    </div>`;
    container.insertBefore(el, typing);
    this.scrollBottom();
  },

  showTyping(show) {
    this.isTyping = show;
    document.getElementById('typingMsg').classList.toggle('visible', show);
    document.getElementById('chatSendBtn').disabled = show;
    if (show) this.scrollBottom();
  },

  handleUIAction(data) {
    if (!data?.ui_action) return;
    if (data.ui_action === 'open_map') {
      const url = data.ui_payload?.maps_embed_url || data.agent_data?.maps_embed_url;
      if (url) Dashboard.showMap(url);
    }
    if (data.ui_action === 'show_deadline') {
      document.querySelector('.alerts-block')?.scrollIntoView({ behavior: 'smooth' });
    }
    if (data.ui_action === 'open_voter_card_modal') {
      if (data.agent_data?.voter_card_data) {
        populateVoterCardFromAgent(data.agent_data.voter_card_data);
      }
      openVoterCard();
    }
  },

  updateQuickActions(data) {
    const actions = [];
    const agent = data.agent_used;

    if (agent === 'BOOTH') {
      actions.push({ label: '🗺️ Directions', query: 'Get directions to my booth' });
      actions.push({ label: '🕐 Booth timing', query: 'What time does my booth open?' });
    }
    if (agent === 'DEADLINE') {
      actions.push({ label: '📅 Add to Calendar', query: 'Add deadline to Calendar' });
    }
    if (agent === 'GRIEVANCE') {
      actions.push({ label: '📞 ECI Helpline', query: 'ECI helpline number' });
    }
    actions.push({ label: '📍 My booth', query: 'Where is my polling booth?' });
    actions.push({ label: '⏰ Deadlines', query: 'Show upcoming deadlines' });

    this.renderQuickActions(actions.slice(0, 4));
  },

  renderQuickActions(actions) {
    const container = document.getElementById('quickActions');
    container.innerHTML = actions.map(a =>
      `<button class="quick-btn" data-query="${this.esc(a.query)}">${a.label}</button>`
    ).join('');
    container.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('chatInput').value = btn.dataset.query;
        this.sendMessage();
      });
    });
  },

  scrollBottom() {
    const c = document.getElementById('chatMessages');
    requestAnimationFrame(() => { c.scrollTop = c.scrollHeight; });
  },

  time() { return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); },

  esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; },
};
