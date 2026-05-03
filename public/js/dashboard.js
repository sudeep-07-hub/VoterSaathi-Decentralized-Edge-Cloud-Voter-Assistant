/**
 * Dashboard UI v2 — Minimal step tracker, alert stripe design, voter card population.
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

    // Hero
    document.getElementById('heroName').textContent = d.user.name || 'Voter';
    document.getElementById('heroMeta').textContent =
      `${d.user.constituency} AC · ${d.user.state} · 2026`;

    const statusEl = document.getElementById('heroStatus');
    if (d.profile.completion_pct === 100) {
      statusEl.textContent = '✓ Registered';
    } else {
      statusEl.textContent = '⏳ Incomplete';
      statusEl.style.background = 'rgba(232,132,26,0.25)';
      statusEl.style.borderColor = 'rgba(232,132,26,0.4)';
      statusEl.style.color = '#f5a623';
    }

    // EPIC card
    document.getElementById('epicValue').textContent = d.user.epic_masked;
    if (d.profile.flags && d.profile.flags.length > 0) {
      document.getElementById('epicSub').textContent = '⚠ Attention needed';
      document.getElementById('epicSub').style.color = '#e8841a';
    }

    // Booth card
    document.getElementById('boothValue').textContent = d.user.constituency + ' Booth';
    document.getElementById('boothSub').textContent = 'Part No. ' + (d.profile.roll_part || '—');

    // Roll card
    document.getElementById('rollValue').textContent =
      `Part ${d.profile.roll_part || '—'} / ${d.profile.roll_serial || '—'}`;

    // Progress (D2: step tracker)
    const pct = d.profile.completion_pct || 0;
    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('progressFill').style.width = pct + '%';
    this.renderStepTracker(d.profile);

    // Alerts
    this.renderAlerts(d.proactive_alerts);

    // Deadline badge
    const badge = document.getElementById('deadlineBadge');
    const count = (d.proactive_alerts || []).length;
    badge.textContent = count;
    if (count === 0) badge.style.display = 'none';

    // Populate voter card modal data
    this.populateVoterCard(d.user, d.profile);
  },

  renderStepTracker(profile) {
    const stepsEl = document.getElementById('progressSteps');
    const steps = [
      { key: 'full_name',       label: 'Basic info' },
      { key: 'aadhaar_linkage', label: 'Aadhaar' },
      { key: 'address_proof',   label: 'Address' },
      { key: 'photograph',      label: 'Photo' },
      { key: 'mobile_verified', label: 'Mobile' },
    ];

    const missing = (profile.missing_fields || []).map(f => f.toLowerCase());

    let foundActive = false;
    stepsEl.innerHTML = steps.map((s, i) => {
      const isDone = !missing.some(m => m.includes(s.label.toLowerCase().split(' ')[0]));
      let cls = 'pstep';
      if (isDone) {
        cls += ' done';
      } else if (!foundActive) {
        cls += ' active';
        foundActive = true;
      }
      const dotContent = isDone ? '✓' : (i + 1);
      return `<div class="${cls}">
        <div class="pstep-dot">${dotContent}</div>
        <div class="pstep-label">${s.label}</div>
      </div>`;
    }).join('');
  },

  renderAlerts(alerts) {
    const list = document.getElementById('alertsList');
    const items = [];

    if (alerts && alerts.length > 0) {
      alerts.forEach(a => {
        const level = a.urgency === 'high' ? 'high' : a.urgency === 'medium' ? 'med' : 'low';
        items.push({
          level,
          title: a.label,
          desc: `${a.days_left} day${a.days_left !== 1 ? 's' : ''} remaining. ${a.description || ''}`,
          time: `${a.days_left}d left`,
        });
      });
    }

    // Add profile flags
    if (this.data?.profile?.flags) {
      this.data.profile.flags.forEach(flag => {
        if (flag === 'address_mismatch') {
          items.push({ level: 'high', title: 'Address mismatch detected',
            desc: 'Your registered address differs from Aadhaar. Submit Form 8.', time: 'Action needed' });
        }
        if (flag === 'photo_pending') {
          items.push({ level: 'med', title: 'Photo upload pending',
            desc: 'Upload a passport-size photograph to complete your profile.', time: 'Pending' });
        }
      });
    }

    if (items.length === 0) {
      list.innerHTML = `<div class="alert-row">
        <div class="alert-stripe low"></div>
        <div class="alert-body"><div class="alert-title">All clear</div>
        <div class="alert-desc">No urgent alerts. Your voter profile is in good shape.</div></div>
      </div>`;
      return;
    }

    list.innerHTML = items.map(a => `
      <div class="alert-row" tabindex="0">
        <div class="alert-stripe ${a.level}"></div>
        <div class="alert-body">
          <div class="alert-title">${a.title}</div>
          <div class="alert-desc">${a.desc}</div>
        </div>
        <div class="alert-time">${a.time}</div>
      </div>`).join('');
  },

  populateVoterCard(user, profile) {
    document.getElementById('vc-name').textContent = user.name || '—';
    document.getElementById('vc-epic').textContent = user.epic_masked || '—';
    document.getElementById('vc-dob').textContent = user.dob
      ? new Date(user.dob + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';
    document.getElementById('vc-gender').textContent = user.gender || '—';
    document.getElementById('vc-constituency').textContent = user.constituency || '—';
    document.getElementById('vc-assembly').textContent = user.assembly_segment || '—';
    document.getElementById('vc-part').textContent = profile.roll_part || '—';
    document.getElementById('vc-serial').textContent = profile.roll_serial || '—';
    document.getElementById('vc-address').textContent = user.address || '—';
    document.getElementById('vc-footer-state').textContent = `${user.state || '—'} · 2026 Roll`;
  },

  renderFallback() {
    document.getElementById('heroName').textContent = 'Arjun Mehta';
    document.getElementById('heroMeta').textContent = 'Hosur AC · Tamil Nadu · 2026';
    document.getElementById('epicValue').textContent = 'TN/24/004●●●';
    document.getElementById('rollValue').textContent = 'Part 42 / 187';
    document.getElementById('progressPct').textContent = '75%';
    document.getElementById('progressFill').style.width = '75%';
  },

  showMap(embedUrl) {
    const container = document.getElementById('mapContainer');
    document.getElementById('mapFrame').src = embedUrl;
    container.classList.add('visible');
    container.scrollIntoView({ behavior: 'smooth' });
  },
};
