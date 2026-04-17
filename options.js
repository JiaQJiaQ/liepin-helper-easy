document.addEventListener('DOMContentLoaded', async () => {
  let { config } = await chrome.storage.sync.get('config');
  if (!config) config = {};
  const ad = config.autoDeliver || {};
  const f = config.filters || {};
  const ai = config.aiFilter || {};
  const s = config.selectors || {};
  const stats = config.statistics || {};

  // 自动沟通
  document.getElementById('ad-enable').checked = ad.enable ?? false;
  document.getElementById('ad-interval').value = ad.interval ?? 3;
  document.getElementById('ad-limit').value = ad.limit ?? 100;
  document.getElementById('ad-greeting').value = ad.greeting ?? '';
  document.getElementById('ad-send-resume').checked = ad.sendResume ?? false;
  document.getElementById('ad-resume-name').value = ad.resumeName ?? '';

  // 筛选
  document.getElementById('f-title-enable').checked = f.jobTitleEnable ?? false;
  document.getElementById('f-title-mode').value = f.jobTitleInclude ? 'include' : 'exclude';
  document.getElementById('f-title-kws').value = f.jobTitleKeywords ?? '';

  document.getElementById('f-company-enable').checked = f.companyEnable ?? false;
  document.getElementById('f-company-mode').value = f.companyInclude ? 'include' : 'exclude';
  document.getElementById('f-company-kws').value = f.companyKeywords ?? '';

  document.getElementById('f-salary-enable').checked = f.salaryEnable ?? false;
  document.getElementById('f-salary-min').value = f.salaryMin ?? '';
  document.getElementById('f-salary-max').value = f.salaryMax ?? '';

  document.getElementById('f-location-enable').checked = f.locationEnable ?? false;
  document.getElementById('f-location-kws').value = f.locationKeywords ?? '';

  document.getElementById('f-size-enable').checked = f.companySizeEnable ?? false;
  document.getElementById('f-size-min').value = f.companySizeMin ?? '';
  document.getElementById('f-size-max').value = f.companySizeMax ?? '';

  document.getElementById('f-experience-enable').checked = f.experienceEnable ?? false;
  document.getElementById('f-experience-kws').value = f.experienceKeywords ?? '';

  document.getElementById('f-education-enable').checked = f.educationEnable ?? false;
  document.getElementById('f-education-kws').value = f.educationKeywords ?? '';

  document.getElementById('f-headhunter').checked = f.excludeHeadhunter ?? false;
  document.getElementById('f-contacted').checked = f.excludeContacted ?? false;

  // AI
  document.getElementById('ai-enable').checked = ai.enable ?? false;
  document.getElementById('ai-key').value = ai.apiKey ?? '';
  document.getElementById('ai-url').value = ai.apiUrl ?? '';
  document.getElementById('ai-model').value = ai.model ?? '';
  document.getElementById('ai-score').value = ai.minScore ?? 7;
  document.getElementById('ai-prompt').value = ai.prompt ?? '';

  // 选择器
  document.getElementById('sel-card').value = s.jobCard ?? 'div._40106Nrnc3.job-card-pc-container, .job-card-pc, [data-selector="job-item"], .job-list-item, .job-card-box';
  document.getElementById('sel-title').value = s.jobTitle ?? 'div._40106XZ0ui div.ellipsis-1, .job-title-box .ellipsis-1, .job-title, [data-selector="job-title"]';
  document.getElementById('sel-company').value = s.companyName ?? 'span._40106K6Y1c, .company-name .ellipsis-1, .company-name, [data-selector="company-name"]';
  document.getElementById('sel-salary').value = s.salary ?? 'span._40106E8PWS, .job-salary, .salary, [data-selector="job-salary"]';
  document.getElementById('sel-location').value = s.location ?? 'div._40106__9nJ span.ellipsis-1, .job-dq, .job-location, [data-selector="job-city"]';
  document.getElementById('sel-btn').value = s.communicateBtn ?? 'btn.ant-btn, .job-card-pc-communication-btn, .btn-communication, [data-selector="job-communication-btn"]';
  document.getElementById('sel-avatar').value = s.recruiterAvatar ?? 'div.recruiter-info-box > div._40106mtcQm, .recruiter-avatar, .boss-avatar, .avatar, .recruiter-info, .recruiter-name, .boss-info, .im-btn, .chat-btn, [data-selector="recruiter-avatar"], img';

  // 统计
  document.getElementById('stat-success').textContent = stats.success || 0;
  document.getElementById('stat-filtered').textContent = stats.filtered || 0;
  document.getElementById('stat-total').textContent = stats.total || 0;

  // 恢复默认选择器
  document.getElementById('btn-reset-selectors').addEventListener('click', async () => {
    document.getElementById('sel-card').value = 'div._40106Nrnc3.job-card-pc-container, .job-card-pc, [data-selector="job-item"], .job-list-item, .job-card-box';
    document.getElementById('sel-title').value = 'div._40106XZ0ui div.ellipsis-1, .job-title-box .ellipsis-1, .job-title, [data-selector="job-title"]';
    document.getElementById('sel-company').value = 'span._40106K6Y1c, .company-name .ellipsis-1, .company-name, [data-selector="company-name"]';
    document.getElementById('sel-salary').value = 'span._40106E8PWS, .job-salary, .salary, [data-selector="job-salary"]';
    document.getElementById('sel-location').value = 'div._40106__9nJ span.ellipsis-1, .job-dq, .job-location, [data-selector="job-city"]';
    document.getElementById('sel-btn').value = 'btn.ant-btn, .job-card-pc-communication-btn, .btn-communication, [data-selector="job-communication-btn"]';
    document.getElementById('sel-avatar').value = 'div.recruiter-info-box > div._40106mtcQm, .recruiter-avatar, .boss-avatar, .avatar, .recruiter-info, .recruiter-name, .boss-info, .im-btn, .chat-btn, [data-selector="recruiter-avatar"], img';
    const msg = document.getElementById('save-msg');
    msg.textContent = '已恢复默认值，记得点击「保存配置」！';
    setTimeout(() => msg.textContent = '', 3000);
  });

  // 保存
  document.getElementById('btn-save').addEventListener('click', async () => {
    const newConfig = {
      configVersion: config.configVersion || 2,
      selectorsCustomized: true,
      autoDeliver: {
        enable: document.getElementById('ad-enable').checked,
        interval: parseInt(document.getElementById('ad-interval').value) || 3,
        limit: parseInt(document.getElementById('ad-limit').value) || 100,
        greeting: document.getElementById('ad-greeting').value.trim(),
        sendResume: document.getElementById('ad-send-resume').checked,
        resumeName: document.getElementById('ad-resume-name').value.trim()
      },
      filters: {
        jobTitleEnable: document.getElementById('f-title-enable').checked,
        jobTitleInclude: document.getElementById('f-title-mode').value === 'include',
        jobTitleKeywords: document.getElementById('f-title-kws').value.trim(),

        companyEnable: document.getElementById('f-company-enable').checked,
        companyInclude: document.getElementById('f-company-mode').value === 'include',
        companyKeywords: document.getElementById('f-company-kws').value.trim(),

        salaryEnable: document.getElementById('f-salary-enable').checked,
        salaryMin: parseFloat(document.getElementById('f-salary-min').value) || 0,
        salaryMax: parseFloat(document.getElementById('f-salary-max').value) || 0,

        locationEnable: document.getElementById('f-location-enable').checked,
        locationKeywords: document.getElementById('f-location-kws').value.trim(),

        companySizeEnable: document.getElementById('f-size-enable').checked,
        companySizeMin: parseInt(document.getElementById('f-size-min').value) || 0,
        companySizeMax: parseInt(document.getElementById('f-size-max').value) || 0,

        experienceEnable: document.getElementById('f-experience-enable').checked,
        experienceKeywords: document.getElementById('f-experience-kws').value.trim(),

        educationEnable: document.getElementById('f-education-enable').checked,
        educationKeywords: document.getElementById('f-education-kws').value.trim(),

        excludeHeadhunter: document.getElementById('f-headhunter').checked,
        excludeContacted: document.getElementById('f-contacted').checked,

        aiFilterEnable: document.getElementById('ai-enable').checked
      },
      aiFilter: {
        enable: document.getElementById('ai-enable').checked,
        apiKey: document.getElementById('ai-key').value.trim(),
        apiUrl: document.getElementById('ai-url').value.trim() || 'https://api.openai.com/v1/chat/completions',
        model: document.getElementById('ai-model').value.trim() || 'gpt-3.5-turbo',
        minScore: parseInt(document.getElementById('ai-score').value) || 7,
        prompt: document.getElementById('ai-prompt').value.trim() || '请评估以下职位与求职者的匹配度，从1-10打分，10分最匹配。只返回JSON格式：{"score": number, "reason": "string"}'
      },
      selectors: {
        jobCard: document.getElementById('sel-card').value.trim(),
        jobTitle: document.getElementById('sel-title').value.trim(),
        companyName: document.getElementById('sel-company').value.trim(),
        salary: document.getElementById('sel-salary').value.trim(),
        location: document.getElementById('sel-location').value.trim(),
        companySize: (config.selectors && config.selectors.companySize) || '.company-tags .tags-tag, .company-scale',
        jobLabels: (config.selectors && config.selectors.jobLabels) || '.job-labels-box .labels-tag, .job-labels .labels-tag',
        communicateBtn: document.getElementById('sel-btn').value.trim(),
        recruiterAvatar: document.getElementById('sel-avatar').value.trim()
      },
      statistics: config.statistics || { date: new Date().toISOString().split('T')[0], total: 0, success: 0, filtered: 0 },
      ui: config.ui || { theme: 'green', fontSize: 'medium', panelWidth: null, panelHeight: null },
      contacted: config.contacted || {}
    };

    await chrome.storage.sync.set({ config: newConfig });
    const msg = document.getElementById('save-msg');
    msg.textContent = '保存成功！';
    setTimeout(() => msg.textContent = '', 2000);
  });

  // 重置统计
  document.getElementById('btn-reset').addEventListener('click', async () => {
    const newStats = { date: new Date().toISOString().split('T')[0], total: 0, success: 0, filtered: 0 };
    config.statistics = newStats;
    await chrome.storage.sync.set({ config });
    document.getElementById('stat-success').textContent = 0;
    document.getElementById('stat-filtered').textContent = 0;
    document.getElementById('stat-total').textContent = 0;
    const msg = document.getElementById('save-msg');
    msg.textContent = '统计已重置';
    setTimeout(() => msg.textContent = '', 2000);
  });

  // 渲染配置备份
  async function renderBackup() {
    const list = document.getElementById('backup-list');
    if (!list) return;
    const { config_backup_last } = await chrome.storage.sync.get('config_backup_last');
    if (!config_backup_last) {
      list.innerHTML = '<div class="empty-backup">暂无备份</div>';
      return;
    }
    list.innerHTML = `
      <div class="backup-item">
        <div class="backup-info">
          <div class="backup-date">${new Date(config_backup_last.date).toLocaleString()}</div>
          <div class="backup-version">版本: ${config_backup_last.version || '旧版'}</div>
        </div>
        <button class="btn secondary btn-restore" id="btn-restore">恢复</button>
      </div>
    `;

    document.getElementById('btn-restore').addEventListener('click', async () => {
      if (!confirm('确定要恢复到该备份版本吗？当前配置将被覆盖。')) return;
      const restored = JSON.parse(JSON.stringify(config_backup_last.config));
      restored.configVersion = config.configVersion || 2;
      restored.selectorsCustomized = true;
      await chrome.storage.sync.set({ config: restored });
      location.reload();
    });
  }

  renderBackup();

  // 初始化 section 折叠状态
  initSections();
});

function initSections() {
  const headers = document.querySelectorAll('.section-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      if (!content) return;
      const isCollapsed = content.classList.contains('collapsed');
      if (isCollapsed) {
        content.classList.remove('collapsed');
        header.classList.remove('collapsed');
      } else {
        content.classList.add('collapsed');
        header.classList.add('collapsed');
      }
    });
  });
}
