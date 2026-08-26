/**
 * CampusCoin Notification System & Sound Synthesizer
 * Provides scheduled daily reminder prompts and Web Audio API pleasant chimes.
 */

const CampusNotifications = {
  intervalId: null,

  /**
   * Initializes notification scheduler
   */
  init() {
    this.checkPermissionStatus();
    this.startScheduler();
  },

  /**
   * Synthesizes a pleasant audio chime using browser Web Audio API
   */
  playChime(type = 'coin') {
    const settings = CampusState.getSettings();
    if (!settings.soundEnabled) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'coin') {
        // High crystal coin ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
        osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.08); // E6
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'success') {
        // Multi-tone victory chord
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + (i * 0.08));
          gain.gain.setValueAtTime(0.2, ctx.currentTime + (i * 0.08));
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (i * 0.08) + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + (i * 0.08));
          osc.stop(ctx.currentTime + (i * 0.08) + 0.5);
        });
      }
    } catch (e) {
      console.log('Audio Context error or user interaction required:', e);
    }
  },

  /**
   * Checks current Notification permission
   */
  checkPermissionStatus() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  },

  /**
   * Requests permission from user
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      this.showToast('Browser notifications are not supported in this browser.', 'warning');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.showToast('Daily reminders enabled successfully!', 'success');
        this.playChime('coin');
        CampusState.updateSettings({ notificationsEnabled: true });
        return true;
      } else {
        this.showToast('Notification permission was denied or dismissed.', 'warning');
        CampusState.updateSettings({ notificationsEnabled: false });
        return false;
      }
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return false;
    }
  },

  /**
   * Dispatches a browser notification
   */
  sendNotification(title, body) {
    this.playChime('coin');

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: body,
          icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%2300f2fe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>',
          badge: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%2300f2fe"><circle cx="12" cy="12" r="10"/></svg>'
        });
      } catch (e) {
        console.warn('Notification constructor error (likely restricted context):', e);
      }
    }

    // Always trigger visual in-app toast
    this.showToast(body, 'info', title);
  },

  /**
   * Starts background interval checker for daily reminder time
   */
  startScheduler() {
    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      this.checkScheduledReminder();
    }, 30000); // Check every 30 seconds

    this.checkScheduledReminder();
  },

  /**
   * Checks if current time matches reminder time and triggers prompt
   */
  checkScheduledReminder() {
    const settings = CampusState.getSettings();
    if (!settings.notificationsEnabled) return;

    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    const targetTime = settings.reminderTime || '21:00';
    const todayDateStr = now.toISOString().split('T')[0];

    // Trigger if time reached and hasn't notified today
    if (currentTimeStr >= targetTime && settings.lastReminderPromptDate !== todayDateStr) {
      this.sendNotification(
        'CampusCoin Daily Check-in',
        'Time to update your daily spends! Keep your streak and stay within budget.'
      );

      CampusState.updateSettings({ lastReminderPromptDate: todayDateStr });
    }
  },

  /**
   * In-app Toast Banner System
   */
  showToast(message, type = 'info', title = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconHtml = '✨';
    if (type === 'success') iconHtml = '🟢';
    if (type === 'warning') iconHtml = '⚠️';
    if (type === 'error') iconHtml = '🚨';
    if (type === 'info') iconHtml = '🔔';

    toast.innerHTML = `
      <span class="toast-icon">${iconHtml}</span>
      <div class="toast-content">
        ${title ? `<span class="toast-title">${title}</span>` : ''}
        <span class="toast-message">${message}</span>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

window.CampusNotifications = CampusNotifications;
