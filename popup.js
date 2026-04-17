document.addEventListener('DOMContentLoaded', async () => {
  const els = {
    success: document.getElementById('popup-success'),
    filtered: document.getElementById('popup-filtered'),
    limit: document.getElementById('popup-limit'),
    autoDeliver: document.getElementById('popup-autodeliver'),
    aiFilter: document.getElementById('popup-aifilter'),
    optionsBtn: document.getElementById('popup-options')
  };

  const { config } = await chrome.storage.sync.get('config');
  const stats = config.statistics || {};
  const today = new Date().toISOString().split('T')[0];

  els.success.textContent = stats.date === today ? (stats.success || 0) : 0;
  els.filtered.textContent = stats.date === today ? (stats.filtered || 0) : 0;
  els.limit.textContent = config.autoDeliver?.limit ?? 100;
  els.autoDeliver.checked = config.autoDeliver?.enable ?? false;
  els.aiFilter.checked = config.aiFilter?.enable ?? false;

  els.autoDeliver.addEventListener('change', async () => {
    config.autoDeliver.enable = els.autoDeliver.checked;
    await chrome.storage.sync.set({ config });
  });

  els.aiFilter.addEventListener('change', async () => {
    config.aiFilter.enable = els.aiFilter.checked;
    await chrome.storage.sync.set({ config });
  });

  els.optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
});
