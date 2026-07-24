export const initTheme = (): void => {
  try {
    const settingsStr = localStorage.getItem('mtg_calculator_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : null;
    const isDark = settings
      ? settings.isDark
      : typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    const modeClass = isDark ? 'dark-mode' : 'light-mode';
    const removeClass = isDark ? 'light-mode' : 'dark-mode';
    document.documentElement.classList.add(modeClass);
    document.documentElement.classList.remove(removeClass);
    if (document.body) {
      document.body.classList.add(modeClass);
      document.body.classList.remove(removeClass);
    }
  } catch {
    document.documentElement.classList.add('light-mode');
    document.documentElement.classList.remove('dark-mode');
    if (document.body) {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  }
};

// Immediately initialize theme on load
initTheme();
