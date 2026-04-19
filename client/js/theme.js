// theme.js - Global Theme Manager for CivicCare
const ThemeManager = {
  storageKey: 'civiccare-theme',
  
  init() {
    const savedTheme = localStorage.getItem(this.storageKey);
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = savedTheme || systemTheme;
    
    this.apply(theme);
    
    // Listen for system changes if no preference saved
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem(this.storageKey)) {
        this.apply(e.matches ? 'dark' : 'light');
      }
    });

    document.addEventListener('DOMContentLoaded', () => {
      this.updateToggleButton();
    });
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.storageKey, theme);
    this.updateToggleButton();
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    this.apply(next);
  },

  updateToggleButton() {
    const toggles = document.querySelectorAll('.theme-toggle-btn');
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    
    toggles.forEach(btn => {
      const icon = btn.querySelector('i');
      if (icon) {
        icon.className = current === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
      }
      const text = btn.querySelector('.theme-text');
      if (text) {
        text.textContent = current === 'dark' ? 'Light Mode' : 'Dark Mode';
      }
    });
  }
};

// Initialize immediately to prevent flash
ThemeManager.init();
window.theme = ThemeManager;
