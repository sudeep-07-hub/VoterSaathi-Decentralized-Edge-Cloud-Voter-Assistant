/**
 * App Entry Point — Initializes dashboard and chat on DOM ready.
 */
document.addEventListener('DOMContentLoaded', () => {
  Dashboard.load();
  Chat.init();

  // Sidebar nav click handlers
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      const page = item.dataset.page;

      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      if (action === 'deadlines') {
        document.getElementById('chatInput').value = 'Show upcoming deadlines';
        Chat.sendMessage();
      } else if (action === 'checkroll') {
        document.getElementById('chatInput').value = 'Check my voter roll status';
        Chat.sendMessage();
      } else if (action === 'trackapp') {
        document.getElementById('chatInput').value = 'Check my application status';
        Chat.sendMessage();
      } else if (action === 'update') {
        document.getElementById('chatInput').value = 'I want to update my details';
        Chat.sendMessage();
      } else if (page === 'booth') {
        document.getElementById('chatInput').value = 'Show my polling booth on map';
        Chat.sendMessage();
      } else if (page === 'votercard') {
        document.getElementById('chatInput').value = 'Show my voter ID details';
        Chat.sendMessage();
      }
    });

    // Keyboard accessibility
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
    });
  });

  // Glance card click handlers
  document.getElementById('cardEpic')?.addEventListener('click', () => {
    document.getElementById('chatInput').value = 'Show my EPIC number and voter details';
    Chat.sendMessage();
  });

  document.getElementById('cardBooth')?.addEventListener('click', () => {
    document.getElementById('chatInput').value = 'Show my polling booth on map';
    Chat.sendMessage();
  });

  document.getElementById('cardRoll')?.addEventListener('click', () => {
    document.getElementById('chatInput').value = 'Check my voter roll status';
    Chat.sendMessage();
  });

  // Idle proactive trigger (30 seconds)
  let idleTimer;
  const resetIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (document.querySelectorAll('.chat-msg.user').length === 0) {
        Chat.addBotMessage(
          'By the way, I noticed some upcoming deadlines that might affect you. Would you like me to show you the details?',
          'FALLBACK'
        );
      }
    }, 30000);
  };

  document.addEventListener('mousemove', resetIdle);
  document.addEventListener('keydown', resetIdle);
  resetIdle();
});
