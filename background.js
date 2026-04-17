// background.js - Service Worker

const LEGACY_SELECTORS = {
  jobListContainer: '.job-list-box',
  jobCard: 'div._40106Nrnc3.job-card-pc-container',
  jobTitle: 'div._40106XZ0ui div.ellipsis-1',
  companyName: 'span._40106K6Y1c',
  salary: 'span._40106E8PWS',
  location: 'div._40106__9nJ span.ellipsis-1',
  companySize: '.company-tags .tags-tag',
  jobLabels: '.job-labels-box .labels-tag',
  communicateBtn: 'btn.ant-btn',
  jobDesc: '.job-description',
  detailLink: 'a[data-selector="job-title"]'
};

function isLegacySelectors(currentSelectors) {
  if (!currentSelectors) return true;
  return Object.keys(LEGACY_SELECTORS).every(key => currentSelectors[key] === LEGACY_SELECTORS[key]);
}

const DEFAULT_CONFIG = {
  configVersion: 3,
  // 页面选择器配置
  selectors: {
    jobListContainer: '.job-list-box, .job-list-container',
    jobCard: 'div._40106Nrnc3.job-card-pc-container, .job-card-pc, [data-selector="job-item"], .job-list-item, .job-card-box',
    jobTitle: 'div._40106XZ0ui div.ellipsis-1, .job-title-box .ellipsis-1, .job-title, [data-selector="job-title"]',
    companyName: 'span._40106K6Y1c, .company-name .ellipsis-1, .company-name, [data-selector="company-name"]',
    salary: 'span._40106E8PWS, .job-salary, .salary, [data-selector="job-salary"]',
    location: 'div._40106__9nJ span.ellipsis-1, .job-dq, .job-location, [data-selector="job-city"]',
    companySize: '.company-tags .tags-tag, .company-scale',
    jobLabels: '.job-labels-box .labels-tag, .job-labels .labels-tag',
    communicateBtn: 'btn.ant-btn, .job-card-pc-communication-btn, .btn-communication, [data-selector="job-communication-btn"]',
    recruiterAvatar: 'div.recruiter-info-box > div._40106mtcQm, .recruiter-avatar, .boss-avatar, .avatar, .recruiter-info, .recruiter-name, .boss-info, .im-btn, .chat-btn, [data-selector="recruiter-avatar"], img',
    jobDesc: '.job-description',
    detailLink: 'a[href*="job"], a[data-selector="job-title"]'
  },
  // 筛选配置
  filters: {
    jobTitleEnable: false,
    jobTitleKeywords: '',
    jobTitleInclude: false, // false=排除, true=包含

    companyEnable: false,
    companyKeywords: '',
    companyInclude: false,

    salaryEnable: false,
    salaryMin: 0,
    salaryMax: 100,

    locationEnable: false,
    locationKeywords: '',

    contentEnable: false,
    contentKeywords: '',
    contentInclude: false,

    companySizeEnable: false,
    companySizeMin: 0,
    companySizeMax: 10000,

    experienceEnable: false,
    experienceKeywords: '',

    educationEnable: false,
    educationKeywords: '',

    excludeHeadhunter: false,
    excludeContacted: false
  },
  // 自动沟通配置
  autoDeliver: {
    enable: false,
    interval: 3,
    limit: 100,
    greeting: '您好，我对这个职位很感兴趣，希望能有机会进一步沟通。',
    useAiGreeting: false,
    aiPrompt: '请根据职位信息生成一段简短的求职招呼语，表达兴趣和匹配度。',
    sendResume: false,
    resumeName: ''
  },
  // AI 筛选配置
  aiFilter: {
    enable: false,
    apiKey: '',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    prompt: '请评估以下职位与求职者的匹配度，从1-10打分，10分最匹配。只返回JSON格式：{"score": number, "reason": "string"}',
    minScore: 7
  },
  // 统计数据
  statistics: {
    date: new Date().toISOString().split('T')[0],
    total: 0,
    success: 0,
    filtered: 0
  },
  // 界面个性化
  ui: {
    theme: 'green',
    fontSize: 'medium',
    panelWidth: null,
    panelHeight: null
  },
  // 已沟通记录
  contacted: {}
};

/**
 * 深度合并对象，用 source 填充 target 中缺失的字段，不覆盖已有值
 */
function mergeDefaults(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (result[key] == null) {
        result[key] = source[key];
      } else if (typeof source[key] === 'object' && !Array.isArray(source[key]) && typeof result[key] === 'object') {
        result[key] = mergeDefaults(result[key], source[key]);
      }
    }
  }
  return result;
}

chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.sync.get('config', async (res) => {
    // 只要有旧配置就自动备份（覆盖安装/升级/开发者重新加载均触发，只保留最新一次）
    if (res.config) {
      try {
        await chrome.storage.sync.set({
          config_backup_last: {
            date: new Date().toISOString(),
            version: res.config.configVersion || 1,
            config: JSON.parse(JSON.stringify(res.config))
          }
        });
        console.log('[猎聘助手] 配置已自动备份');
      } catch (e) {
        console.error('[猎聘助手] 备份配置失败', e);
      }
    }

    const merged = mergeDefaults(res.config || {}, DEFAULT_CONFIG);
    // 升级时：只有从未自定义过选择器且仍使用旧版默认值的，才自动升级选择器
    if (!res.config || (res.config.configVersion || 0) < DEFAULT_CONFIG.configVersion) {
      if (!res.config || (!res.config.selectorsCustomized && isLegacySelectors(res.config.selectors))) {
        merged.selectors = { ...DEFAULT_CONFIG.selectors };
      }
      merged.configVersion = DEFAULT_CONFIG.configVersion;
    }
    chrome.storage.sync.set({ config: merged });
  });
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'NOTIFY') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: request.title || '猎聘助手',
      message: request.message
    });
    sendResponse({ ok: true });
  } else if (request.type === 'AI_REQUEST') {
    handleAIRequest(request.payload).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true; // 保持通道开放
  } else if (request.type === 'OPEN_OPTIONS_PAGE') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
  }
  return true;
});

async function handleAIRequest(payload) {
  const { config } = await chrome.storage.sync.get('config');
  const ai = config.aiFilter;
  if (!ai.apiKey) throw new Error('未配置 AI API Key');

  const res = await fetch(ai.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ai.apiKey}`
    },
    body: JSON.stringify({
      model: ai.model,
      messages: [
        { role: 'system', content: ai.prompt },
        { role: 'user', content: JSON.stringify(payload) }
      ],
      temperature: 0.3
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI 请求失败: ${res.status} ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  return { content };
}
