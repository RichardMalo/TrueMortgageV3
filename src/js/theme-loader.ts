(function () {
  try {
    const settingsStr = localStorage.getItem('mtg_calculator_settings');
    const settings = settingsStr ? JSON.parse(settingsStr) : null;
    const isDark = settings
      ? settings.isDark
      : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  } catch (e) {
    // Silent catch
  }
})();
