/**
 * Dashboard UI — Populates the main content area with profile, alerts, and progress data.
 */

const Dashboard = {
  data: null,

  async load() {
    try {
      const res = await fetch('/api/dashboard/USR-TN-001');
      this.data = await res.json();
      this.render();
    } catch (err) {
      console.error('Dashboard load failed:', err);
      this.renderFallback();
    }
  },

  render() {
    const d = this.data;
    if (!d) return;

    // Hero Card
    document.getElementById('heroName').textContent = d.user.name || 'Voter';
    document.getElementById('heroConstituency').textContent = `${d.user.constituency} AC`;
    document.getElementById('heroState').textContent = `· ${d.user.state}`;

    const statusEl = document.getElementById('heroStatus');
    if (d.profile.completion_pct === 100) {
      statusEl.className = 'status-badge verified';
      statusEl.innerHTML = '<span>✓</span> Registered';
    } else {
      statusEl.className = 'status-badge pending';
      statusEl.innerHTML = '<span>⏳</span> Incomplete';
    }

    // EPIC Card
    document.getElementById('epicValue').textContent = d.user.epic_masked;
    const epicBadge = document.getElementById('epicBadge');
    if (d.profile.flags && d.profile.flags.length > 0) {
      epicBadge.className = 'card-badge distance';
      epicBadge.textContent = '⚠ Attention needed';
    }

    // Booth Card
    if (d.profile.agent_data || true) {
      document.getElementById('boothValue').textContent = d.user.constituency + ' Booth';
      document.getElementById('boothSub').textContent = 'Part No. ' + (d.profile.roll_part || '—');
      document.getElementById('boothBadge').textContent = '📍 Tap for map';
    }

    // Roll Card
    document.getElementById('rollValue').textContent =
      `Part ${d.profile.roll_part || '—'} / Serial ${d.profile.roll_serial || '—'}`;

    // Progress
    const pct = d.profile.completion_pct || 0;
    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('progressFill').style.width = pct + '%';
    this.renderSteps(d.profile);

    // Alerts
    this.renderAlerts(d.proactive_alerts, d.deadlines);

    // Deadline badge in sidebar
    const badge = document.getElementById('deadlineBadge');
    const urgentCount = (d.proactive_alerts || []).filter(a => a.urgency === 'high').length;
    badge.textContent = urgentCount || d.proactive_alerts?.length || 0;
    if (urgentCount > 0) badge.style.background = 'var(--urgent-red)';
  },

  renderSteps(profile) {
    const stepsEl = document.getElementById('progressSteps');
    const fields = [
      { key: 'full_name', label: 'Basic Info', icon: '👤' },
      { key: 'aadhaar_linkage', label: 'Aadhaar Link', icon: '🔗' },
      { key: 'address_proof', label: 'Address Proof', icon: '🏠' },
      { key: 'photograph', label: 'Photo', icon: '📷' },
      { key: 'mobile_verified', label: 'Mobile', icon: '📱' },
    ];

    const missing = profile.missing_fields || [];

    stepsEl.innerHTML = fields.map(f => {
      const isDone = !missing.some(m => m.toLowerCase().includes(f.label.toLowerCase().split(' ')[0]));
      return `<div class="progress-step ${isDone ? 'done' : 'pending'}">
        <span class="step-icon">${isDone ? '✅' : '⬜'}</span> ${f.label}
      </div>`;
    }).join('');
  },

  renderAlerts(alerts, deadlineData) {
    const list = document.getElementById('alertsList');
    const allAlerts = [];

    // From proactive alerts
    if (alerts && alerts.length > 0) {
      alerts.forEach(a => {
        allAlerts.push({
          level: a.urgency || 'medium',
          icon: a.urgency === 'high' ? '🔴' : a.urgency === 'medium' ? '🟡' : '🟢',
          title: a.label,
          desc: `${a.days_left} day${a.days_left !== 1 ? 's' : ''} remaining. ${a.description || ''}`,
          time: `${a.days_left}d left`,
          action: a.form ? `Fill ${a.form}` : 'View',
          calendarLink: a.calendar_link,
        });
      });
    }

    // Add booth change alert if applicable
    if (this.data && this.data.profile && this.data.profile.flags) {
      this.data.profile.flags.forEach(flag => {
        if (flag === 'address_mismatch') {
          allAlerts.push({
            level: 'high', icon: '🔴',
            title: 'Address mismatch detected',
            desc: 'Your registered address differs from Aadhaar. Submit Form 8.',
            time: 'Action needed', action: 'Fix now',
          });
        }
        if (flag === 'photo_pending') {
          allAlerts.push({
            level: 'medium', icon: '🟡',
            title: 'Photo upload pending',
            desc: 'Upload a passport-size photograph to complete your profile.',
            time: 'Pending', action: 'Upload',
          });
        }
      });
    }

    if (allAlerts.length === 0) {
      list.innerHTML = '<div class="alert-card low"><div class="alert-icon">🟢</div><div class="alert-content"><div class="alert-title">All clear!</div><div class="alert-desc">No urgent alerts. Your voter profile is in good shape.</div></div></div>';
      return;
    }

    list.innerHTML = allAlerts.map(a => `
      <div class="alert-card ${a.level}" tabindex="0" role="button"
           ${a.calendarLink ? `data-calendar="${a.calendarLink}"` : ''}>
        <div class="alert-icon">${a.icon}</div>
        <div class="alert-content">
          <div class="alert-title">${a.title}</div>
          <div class="alert-desc">${a.desc}</div>
        </div>
        <div class="alert-time">${a.time}</div>
        <button class="alert-action" aria-label="${a.action}">${a.action}</button>
      </div>
    `).join('');

    // Calendar link click handlers
    list.querySelectorAll('[data-calendar]').forEach(el => {
      el.querySelector('.alert-action')?.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open(el.dataset.calendar, '_blank');
      });
    });
  },

  renderFallback() {
    document.getElementById('heroName').textContent = 'Arjun Mehta';
    document.getElementById('heroConstituency').textContent = 'Hosur AC';
    document.getElementById('heroState').textContent = '· Tamil Nadu';
    document.getElementById('epicValue').textContent = 'TN/24/004●●●';
    document.getElementById('rollValue').textContent = 'Part 42 / Serial 187';
    document.getElementById('progressPct').textContent = '75%';
    document.getElementById('progressFill').style.width = '75%';
  },

  showMap(embedUrl) {
    const container = document.getElementById('mapContainer');
    const frame = document.getElementById('mapFrame');
    frame.src = embedUrl;
    container.classList.add('visible');
    container.scrollIntoView({ behavior: 'smooth' });
  },

  hideMap() {
    document.getElementById('mapContainer').classList.remove('visible');
  },
};
