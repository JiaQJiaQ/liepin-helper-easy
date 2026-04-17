(function () {
  'use strict';

  // ==================== 工具函数 ====================
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function waitForElement(selector, timeout = 10000, context = document) {
    return new Promise((resolve, reject) => {
      const el = context.querySelector(selector);
      if (el) return resolve(el);
      const observer = new MutationObserver(() => {
        const el = context.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(context === document ? document.body : context, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`等待元素超时: ${selector}`));
      }, timeout);
    });
  }

  function waitForElements(selector, timeout = 10000, context = document) {
    return new Promise((resolve, reject) => {
      const els = $$(selector, context);
      if (els.length > 0) return resolve(els);
      const observer = new MutationObserver(() => {
        const els = $$(selector, context);
        if (els.length > 0) {
          observer.disconnect();
          resolve(els);
        }
      });
      observer.observe(context === document ? document.body : context, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve([]);
      }, timeout);
    });
  }

  function parseSalary(text) {
    if (!text) return { min: 0, max: 0, months: 12 };
    // 提取几薪，如 "14薪"、"15薪"、"13薪"
    const monthsMatch = text.match(/(\d+)\s*薪/);
    const months = monthsMatch ? parseInt(monthsMatch[1], 10) : 12;
    // 处理 "15-30k", "15-30k·14薪", "20-40万" 等格式
    const isWan = /万/.test(text);
    const match = text.match(/(\d+(?:\.\d+)?)\s*[-~]\s*(\d+(?:\.\d+)?)/);
    if (match) {
      let min = parseFloat(match[1]);
      let max = parseFloat(match[2]);
      // 如果包含 "万"，需要乘以 10 转为 k
      if (isWan) {
        min *= 10;
        max *= 10;
      }
      return { min, max, months };
    }
    // 单个数字
    const single = text.match(/(\d+(?:\.\d+)?)/);
    if (single) {
      let val = parseFloat(single[1]);
      if (isWan) val *= 10;
      return { min: val, max: val, months };
    }
    return { min: 0, max: 0, months };
  }

  function parseCompanySize(text) {
    if (!text) return { min: 0, max: 0 };
    // 处理 "100-499人", "10000人以上", "少于15人"
    const range = text.match(/(\d+)\s*[-~]\s*(\d+)/);
    if (range) return { min: parseInt(range[1]), max: parseInt(range[2]) };
    const above = text.match(/(\d+)\s*人以上/);
    if (above) return { min: parseInt(above[1]), max: 999999 };
    const below = text.match(/(\d+)\s*人/);
    if (below) return { min: 0, max: parseInt(below[1]) };
    return { min: 0, max: 0 };
  }

  function simulateClick(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window };
    const pointerOpts = { ...opts, pointerType: 'mouse', isPrimary: true };
    el.dispatchEvent(new PointerEvent('pointerdown', pointerOpts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', pointerOpts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.click();
  }

  function dispatchHover(el) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const mouseOpts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, relatedTarget: document.body };
    const pointerOpts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, pointerType: 'mouse', isPrimary: true };
    el.dispatchEvent(new MouseEvent('mouseenter', mouseOpts));
    el.dispatchEvent(new MouseEvent('mouseover', mouseOpts));
    el.dispatchEvent(new PointerEvent('pointerenter', pointerOpts));
    el.dispatchEvent(new PointerEvent('pointerover', pointerOpts));
    el.dispatchEvent(new PointerEvent('pointermove', pointerOpts));
    el.dispatchEvent(new MouseEvent('mousemove', mouseOpts));
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
  }

  async function revealCommunicateBtn(card, selectorStr, avatarSelectorStr) {
    const selectors = selectorStr.split(/,\s*/);
    // 1. 先直接查
    for (const sel of selectors) {
      const btn = card.querySelector(sel.trim());
      if (isVisible(btn)) return btn;
    }
    // 确保卡片在视口内，否则事件可能被忽略
    if (!isInViewport(card)) {
      card.scrollIntoView({ behavior: 'instant', block: 'center' });
      await sleep(400);
    }
    // 2. 对卡片触发 hover，部分网站会在卡片 hover 时显示按钮
    dispatchHover(card);
    await sleep(800);
    for (const sel of selectors) {
      const btn = card.querySelector(sel.trim());
      if (isVisible(btn)) return btn;
    }
    // 3. 尝试对头像/招聘者元素触发 hover
    const avatarSelectors = avatarSelectorStr || '.recruiter-avatar, .boss-avatar, .avatar, .recruiter-info, .recruiter-name, .boss-info, .im-btn, .chat-btn, [data-selector="recruiter-avatar"], img';
    let avatars = $$(avatarSelectors, card);
    // 优先尝试匹配到 recruiter 相关类的元素，再按面积从大到小（真正的头像通常比较大）
    avatars = avatars.sort((a, b) => {
      const aRec = /recruiter|boss|avatar/i.test(a.className || '') ? 1 : 0;
      const bRec = /recruiter|boss|avatar/i.test(b.className || '') ? 1 : 0;
      if (bRec !== aRec) return bRec - aRec;
      const aArea = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
      const bArea = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
      return bArea - aArea;
    });
    for (const avatar of avatars) {
      if (!isInViewport(avatar)) {
        avatar.scrollIntoView({ behavior: 'instant', block: 'center' });
        await sleep(300);
      }
      dispatchHover(avatar);
      await sleep(1200);
      for (const sel of selectors) {
        const btn = card.querySelector(sel.trim());
        if (isVisible(btn)) return btn;
      }
      // 有时按钮会渲染在 body 下的全局弹层里
      for (const sel of selectors) {
        const matched = Array.from(document.querySelectorAll(sel.trim())).filter(isVisible);
        if (matched.length === 1) return matched[0];
        if (matched.length > 1) {
          // 优先文本匹配，其次取最后一个（动态 append 到 body 的弹层通常排在最后）
          const byText = matched.find(b => /聊|沟通|投递/i.test(b.textContent || ''));
          if (byText) return byText;
          return matched[matched.length - 1];
        }
        // 若选择器是后代选择器（含空格），尝试用最后一个 token 全局搜索
        // 例：.job-card-right-box ._40106mtcQm → ._40106mtcQm
        if (/\s/.test(sel.trim())) {
          const simple = sel.trim().split(/\s+/).pop();
          if (simple && simple !== sel.trim()) {
            const simpleMatched = Array.from(document.querySelectorAll(simple)).filter(isVisible);
            if (simpleMatched.length === 1) return simpleMatched[0];
            if (simpleMatched.length > 1) {
              const byText = simpleMatched.find(b => /聊|沟通|投递/i.test(b.textContent || ''));
              if (byText) return byText;
              return simpleMatched[simpleMatched.length - 1];
            }
          }
        }
      }
    }
    // 4. 兜底：如果配置了头像选择器且点头像即可聊天，直接返回可见头像
    for (const avatar of avatars) {
      if (isVisible(avatar)) return avatar;
    }
    // 5. 全局搜索可见的匹配按钮文本的任意元素
    const allCandidates = Array.from(document.querySelectorAll('button, a, span, div, [class*="btn"], [class*="chat"], [class*="im"]'))
      .filter(el => /聊|沟通|投递/i.test(el.textContent || '') && isVisible(el));
    if (allCandidates.length >= 1) {
      // 如果多个，优先选位于视口中心附近的（当前卡片滚动到了中心）
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      allCandidates.sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        const ad = Math.hypot(ar.left + ar.width/2 - cx, ar.top + ar.height/2 - cy);
        const bd = Math.hypot(br.left + br.width/2 - cx, br.top + br.height/2 - cy);
        return ad - bd;
      });
      return allCandidates[0];
    }
    return null;
  }

  function log(level, ...args) {
    console[level](`[猎聘助手]`, ...args);
  }

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
    selectors: {
      jobCard: 'div._40106Nrnc3.job-card-pc-container, .job-card-pc, [data-selector="job-item"], .job-list-item, .job-card-box',
      jobTitle: 'div._40106XZ0ui div.ellipsis-1, .job-title-box .ellipsis-1, .job-title, [data-selector="job-title"]',
      companyName: 'span._40106K6Y1c, .company-name .ellipsis-1, .company-name, [data-selector="company-name"]',
      salary: 'span._40106E8PWS, .job-salary, .salary, [data-selector="job-salary"]',
      location: 'div._40106__9nJ span.ellipsis-1, .job-dq, .job-location, [data-selector="job-city"]',
      companySize: '.company-tags .tags-tag, .company-scale',
      jobLabels: '.job-labels-box .labels-tag, .job-labels .labels-tag',
      communicateBtn: 'btn.ant-btn, .job-card-pc-communication-btn, .btn-communication, [data-selector="job-communication-btn"]',
      recruiterAvatar: 'div.recruiter-info-box > div._40106mtcQm, .recruiter-avatar, .boss-avatar, .avatar, .recruiter-info, .recruiter-name, .boss-info, .im-btn, .chat-btn, [data-selector="recruiter-avatar"], img',
      detailLink: 'a[href*="job"], a[data-selector="job-title"]'
    },
    filters: {
      jobTitleEnable: false, jobTitleKeywords: '', jobTitleInclude: false,
      companyEnable: false, companyKeywords: '', companyInclude: false,
      salaryEnable: false, salaryMin: 0, salaryMax: 100,
      locationEnable: false, locationKeywords: '',
      contentEnable: false, contentKeywords: '', contentInclude: false,
      companySizeEnable: false, companySizeMin: 0, companySizeMax: 10000,
      experienceEnable: false, experienceKeywords: '',
      educationEnable: false, educationKeywords: '',
      excludeHeadhunter: false, excludeContacted: false, aiFilterEnable: false
    },
    autoDeliver: { enable: false, interval: 3, limit: 100, greeting: '', useAiGreeting: false, aiPrompt: '', sendResume: false, resumeName: '' },
    aiFilter: { enable: false, apiKey: '', apiUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-3.5-turbo', prompt: '请评估以下职位与求职者的匹配度，从1-10打分，10分最匹配。只返回JSON格式：{"score": number, "reason": "string"}', minScore: 7 },
    statistics: { date: new Date().toISOString().split('T')[0], total: 0, success: 0, filtered: 0 },
    ui: { theme: 'green', fontSize: 'medium', panelWidth: null, panelHeight: null, filtersExpanded: true, scanConfirm: true },
    contacted: {}
  };

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

  function waitForBody(timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (document.body) return resolve(document.body);
      const observer = new MutationObserver(() => {
        if (document.body) {
          observer.disconnect();
          resolve(document.body);
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        reject(new Error('等待 document.body 超时'));
      }, timeout);
    });
  }

  // ==================== 配置管理 ====================
  class ConfigManager {
    constructor() {
      this.config = null;
    }

    async load() {
      const res = await chrome.storage.sync.get('config');
      let config = mergeDefaults(res.config || {}, DEFAULT_CONFIG);
      // 如果配置版本较旧，强制更新选择器以适配新版猎聘页面
      if (!res.config || (res.config.configVersion || 0) < DEFAULT_CONFIG.configVersion) {
        config.selectors = { ...DEFAULT_CONFIG.selectors };
        config.configVersion = DEFAULT_CONFIG.configVersion;
        await chrome.storage.sync.set({ config });
      }
      this.config = config;
      return this.config;
    }

    async save(updates) {
      this.config = { ...this.config, ...updates };
      await chrome.storage.sync.set({ config: this.config });
    }

    get selectors() {
      return this.config.selectors || {};
    }

    get filters() {
      return this.config.filters || {};
    }

    get autoDeliver() {
      return this.config.autoDeliver || {};
    }

    get aiFilter() {
      return this.config.aiFilter || {};
    }

    get statistics() {
      return this.config.statistics || { date: new Date().toISOString().split('T')[0], total: 0, success: 0, filtered: 0 };
    }

    get contacted() {
      return this.config.contacted || {};
    }

    get ui() {
      return this.config?.ui || {};
    }

    async updateStats(delta) {
      const stats = this.statistics;
      const today = new Date().toISOString().split('T')[0];
      if (stats.date !== today) {
        stats.date = today;
        stats.total = 0;
        stats.success = 0;
        stats.filtered = 0;
      }
      Object.assign(stats, delta);
      await this.save({ statistics: stats });
      return stats;
    }
  }

  // ==================== 职位扫描器 ====================
  class JobScanner {
    constructor(config) {
      this.config = config;
      this.jobs = [];
    }

    async scan(onProgress) {
      const s = this.config.selectors;
      log('log', '开始扫描职位列表...');
      log('log', '当前职位卡片选择器:', s.jobCard || '(默认)');
      const cards = await waitForElements(s.jobCard || '.job-card-pc', 8000);
      if (cards.length === 0) {
        log('warn', '未找到职位卡片，可能选择器已失效，请检查配置页「页面选择器」');
        log('warn', '可尝试在控制台执行: $$(' + "'" + (s.jobCard || '.job-card-pc') + "')" + ' 查看是否能选到元素');
      } else {
        log('log', `找到 ${cards.length} 个职位卡片，开始解析...`);
      }
      const existingIds = new Set(this.jobs.map(j => j.id));
      const previousCount = this.jobs.length;
      for (let i = 0; i < cards.length; i++) {
        const job = await this.parseCard(cards[i], i);
        if (job && !existingIds.has(job.id)) {
          this.jobs.push(job);
        }
        onProgress?.(i + 1, cards.length, this.jobs.length);
      }
      log('log', `扫描到 ${this.jobs.length} 个有效职位（本次新增 ${this.jobs.length - previousCount}）`);
      return this.jobs;
    }

    async parseCard(card, idx) {
      const s = this.config.selectors;
      try {
        const titleEl = card.querySelector(s.jobTitle || '.job-title-box .ellipsis-1, .job-title');
        const companyEl = card.querySelector(s.companyName || '.company-name .ellipsis-1, .comp-name');
        const salaryEl = card.querySelector(s.salary || '.job-salary, .salary');
        const locationEl = card.querySelector(s.location || '.job-dq, .job-labels-box .labels-tag');
        const sizeEl = card.querySelector(s.companySize || '.company-tags .tags-tag');
        let btnEl = card.querySelector(s.communicateBtn || '.job-card-pc-communication-btn, .btn-communication, btn.abt-btn, .abt-btn');
        if (!btnEl) {
          const sel = s.communicateBtn || '.job-card-pc-communication-btn, .btn-communication, btn.abt-btn, .abt-btn, [data-selector="job-communication-btn"]';
          btnEl = await revealCommunicateBtn(card, sel, s.recruiterAvatar);
        }

        const title = titleEl?.textContent?.trim() || '';
        const company = companyEl?.textContent?.trim() || '';
        const salaryText = salaryEl?.textContent?.trim() || '';
        const location = locationEl?.textContent?.trim() || '';
        const sizeText = sizeEl?.textContent?.trim() || '';

        // 解析工作年限、学历（从标签中提取）
        const labels = $$(s.jobLabels || '.job-labels-box .labels-tag, .job-labels .labels-tag', card)
          .map(el => el.textContent?.trim() || '');
        const experienceText = labels.filter(t => /年|经验/.test(t)).join(',');
        const educationText = labels.filter(t => /本科|硕士|大专|博士|中专|高中|初中|学历/.test(t)).join(',');

        if (!title) {
          if (idx === 0) {
            log('warn', '卡片 #0 解析失败：未匹配到职位标题', '选择器=', s.jobTitle || '(默认)');
          }
          return null;
        }

        return {
          id: `job-${idx}-${title}-${company}`,
          element: card,
          title,
          company,
          salary: parseSalary(salaryText),
          salaryText,
          location,
          companySize: parseCompanySize(sizeText),
          companySizeText: sizeText,
          experienceText,
          educationText,
          communicateBtn: btnEl,
          status: 'wait',
          statusText: '等待中',
          filterReason: '',
          autoPassed: null,
          manualOverride: null,
          detail: null
        };
      } catch (e) {
        log('warn', `解析职位卡片 #${idx} 失败`, e);
        return null;
      }
    }

    async fetchDetail(job) {
      // 尝试从卡片上的链接或 data 属性获取详情
      const s = this.config.selectors;
      const linkEl = job.element.querySelector(s.detailLink || 'a[href*="job"]');
      if (!linkEl) return null;
      // 简化处理：返回链接，实际描述可能需要打开新页面获取
      return { url: linkEl.href };
    }
  }

  // ==================== 筛选引擎 ====================
  class FilterEngine {
    constructor(config) {
      this.config = config;
    }

    async filter(job) {
      const f = this.config.filters;
      const checks = [
        () => this.checkJobTitle(job, f),
        () => this.checkCompany(job, f),
        () => this.checkSalary(job, f),
        () => this.checkLocation(job, f),
        () => this.checkCompanySize(job, f),
        () => this.checkExperience(job, f),
        () => this.checkEducation(job, f),
        () => this.checkHeadhunter(job, f),
        () => this.checkContacted(job, f)
      ];

      for (const check of checks) {
        const result = check();
        if (!result.pass) {
          return { pass: false, reason: result.reason, source: 'rule' };
        }
      }

      // AI 筛选
      if (f.aiFilterEnable || this.config.aiFilter.enable) {
        const aiResult = await this.aiFilter(job);
        if (!aiResult.pass) {
          return { pass: false, reason: aiResult.reason, source: 'ai' };
        }
      }

      return { pass: true };
    }

    async evaluate(job) {
      const result = await this.filter(job);
      job.autoPassed = result.pass;
      if (job.manualOverride === null) {
        if (!result.pass) {
          job.status = 'filtered';
          job.statusText = result.source === 'ai' ? 'AI过滤' : '已过滤';
          job.filterReason = result.reason;
        } else {
          job.status = 'wait';
          job.statusText = '等待中';
          job.filterReason = '';
        }
      }
      return job.manualOverride !== null ? job.manualOverride : result.pass;
    }

    checkJobTitle(job, f) {
      if (!f.jobTitleEnable) return { pass: true };
      
      const rawKws = (f.jobTitleKeywords || '');
      const kws = rawKws.split(/[,，;；]/).map(s => s.trim().toLowerCase()).filter(Boolean);
      const text = (job.title || '').toLowerCase();
      const has = kws.some(k => text.includes(k));
      const result = f.jobTitleInclude
        ? (has ? { pass: true } : { pass: false, reason: '岗位名不包含关键词' })
        : (has ? { pass: false, reason: `岗位名包含排除词` } : { pass: true });
      log('log', `岗位筛选: "${job.title}" | 解析后关键词: [${kws.join(', ')}] | 模式: ${f.jobTitleInclude ? '包含' : '排除'} | 结果: ${result.pass ? '通过' : '过滤'}${result.pass ? '' : ' | 原因: ' + result.reason}`);
      return result;
    }

    checkCompany(job, f) {
      if (!f.companyEnable) return { pass: true };
      const kws = (f.companyKeywords || '').split(/[,，;；]/).map(s => s.trim()).filter(Boolean);
      const text = job.company || '';
      const has = kws.some(k => text.includes(k));
      return f.companyInclude
        ? (has ? { pass: true } : { pass: false, reason: '公司名不在白名单' })
        : (has ? { pass: false, reason: `公司名包含排除词` } : { pass: true });
    }

    checkSalary(job, f) {
      if (!f.salaryEnable) return { pass: true };
      // 统一按年薪（万）进行比较
      // 职位月薪单位是 K，年薪（万）= 月薪(K) × 薪数 ÷ 10
      const jobAnnualMin = job.salary.min * (job.salary.months || 12) / 10;
      const jobAnnualMax = job.salary.max * (job.salary.months || 12) / 10;
      const userAnnualMin = f.salaryMin;
      const userAnnualMax = f.salaryMax > 0 ? f.salaryMax : 0;

      if (jobAnnualMax < userAnnualMin) {
        return { pass: false, reason: `年薪低于要求: ${job.salaryText}` };
      }
      if (userAnnualMax > 0 && jobAnnualMin > userAnnualMax) {
        return { pass: false, reason: `年薪高于要求: ${job.salaryText}` };
      }
      return { pass: true };
    }

    checkLocation(job, f) {
      if (!f.locationEnable) return { pass: true };
      const kws = f.locationKeywords.split(/[,，;；]/).map(s => s.trim()).filter(Boolean);
      if (kws.length === 0) return { pass: true };
      const has = kws.some(k => job.location.includes(k));
      return has ? { pass: true } : { pass: false, reason: `地点不匹配: ${job.location}` };
    }

    checkCompanySize(job, f) {
      if (!f.companySizeEnable) return { pass: true };
      if (job.companySize.max < f.companySizeMin) {
        return { pass: false, reason: `公司规模太小: ${job.companySizeText}` };
      }
      if (f.companySizeMax > 0 && job.companySize.min > f.companySizeMax) {
        return { pass: false, reason: `公司规模太大: ${job.companySizeText}` };
      }
      return { pass: true };
    }

    checkExperience(job, f) {
      if (!f.experienceEnable) return { pass: true };
      const kws = f.experienceKeywords.split(/[,，;；]/).map(s => s.trim()).filter(Boolean);
      if (kws.length === 0) return { pass: true };
      const text = job.experienceText || '';
      const has = kws.some(k => text.includes(k));
      return has ? { pass: true } : { pass: false, reason: `工作年限不匹配: ${text || '无'}` };
    }

    checkEducation(job, f) {
      if (!f.educationEnable) return { pass: true };
      const kws = f.educationKeywords.split(/[,，;；]/).map(s => s.trim()).filter(Boolean);
      if (kws.length === 0) return { pass: true };
      const text = job.educationText || '';
      const has = kws.some(k => text.includes(k));
      return has ? { pass: true } : { pass: false, reason: `学历不匹配: ${text || '无'}` };
    }

    checkHeadhunter(job, f) {
      if (!f.excludeHeadhunter) return { pass: true };
      // 猎聘网猎头标识可能包含在标签或公司名中
      const labels = $$(this.config.selectors.jobLabels || '.job-labels-box .labels-tag, .company-tags .tags-tag', job.element)
        .map(el => el.textContent);
      const isHeadhunter = labels.some(t => /猎头|外包|派遣/.test(t));
      return isHeadhunter ? { pass: false, reason: '猎头/外包过滤' } : { pass: true };
    }

    checkContacted(job, f) {
      if (!f.excludeContacted) return { pass: true };
      const contacted = this.config.contacted || {};
      const key = `${(job.company || '').trim()}|${(job.title || '').trim()}`;
      const matched = contacted[key];
      log('log', `已聊检查: "${key}" | 结果: ${matched ? '过滤' : '通过'} | 已记录数: ${Object.keys(contacted).length}`);
      if (matched) {
        return { pass: false, reason: '已沟通过' };
      }
      return { pass: true };
    }

    async aiFilter(job) {
      try {
        const res = await chrome.runtime.sendMessage({
          type: 'AI_REQUEST',
          payload: {
            title: job.title,
            company: job.company,
            salary: job.salaryText,
            location: job.location,
            size: job.companySizeText
          }
        });
        if (res.error) throw new Error(res.error);
        let content = res.content || '';
        // 尝试解析 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            const score = parseFloat(parsed.score) || 0;
            if (score < this.config.aiFilter.minScore) {
              return { pass: false, reason: `AI评分不足: ${score}/10, ${parsed.reason || ''}` };
            }
          } catch (e) {
            log('warn', 'AI 返回 JSON 解析失败', content);
          }
        }
        return { pass: true };
      } catch (e) {
        log('warn', 'AI 筛选失败', e.message);
        // AI 失败时不阻止，避免中断流程
        return { pass: true };
      }
    }
  }

  // ==================== 投递引擎 ====================
  class DeliverEngine {
    constructor(config) {
      this.config = config;
      this.running = false;
      this.paused = false;
    }

    async start(jobs, filterEngine, onUpdate) {
      if (this.running) {
        log('warn', '投递引擎已在运行，忽略重复启动');
        return;
      }
      this.running = true;
      this.paused = false;

      const ad = this.config.autoDeliver;
      const stats = this.config.statistics;
      const f = this.config.filters;
      const today = new Date().toISOString().split('T')[0];
      let todaySuccess = stats.date === today ? stats.success : 0;

      log('log', '开始自动投递/沟通...');
      log('log', '当前筛选配置:', {
        jobTitleEnable: f.jobTitleEnable,
        jobTitleKeywords: f.jobTitleKeywords,
        jobTitleInclude: f.jobTitleInclude,
        companyEnable: f.companyEnable,
        salaryEnable: f.salaryEnable,
        experienceEnable: f.experienceEnable,
        educationEnable: f.educationEnable,
        excludeHeadhunter: f.excludeHeadhunter,
        excludeContacted: f.excludeContacted
      });

      try {
        for (let i = 0; i < jobs.length; i++) {
          if (!this.running) break;
          while (this.paused) {
            await sleep(500);
            if (!this.running) break;
          }

          const job = jobs[i];
          if (job.status !== 'wait') continue;

          job.status = 'running';
          job.statusText = '筛选中...';
          onUpdate?.(job, i);

          // 筛选（优先使用人工覆盖）
          let passed;
          if (job.manualOverride === true) {
            passed = true;
            job.status = 'wait';
            job.statusText = '等待中';
            job.filterReason = '手动放行';
          } else if (job.manualOverride === false) {
            passed = false;
            job.status = 'filtered';
            job.statusText = '已过滤';
            job.filterReason = '手动排除';
          } else {
            const result = await filterEngine.filter(job);
            passed = result.pass;
            if (!passed) {
              job.status = 'filtered';
              job.statusText = result.source === 'ai' ? 'AI过滤' : '已过滤';
              job.filterReason = result.reason;
            }
          }
          if (!passed) {
            await this.config.updateStats({ filtered: this.config.statistics.filtered + 1 });
            onUpdate?.(job, i);
            continue;
          }

          // 检查上限
          if (todaySuccess >= ad.limit) {
            this.notify('今日投递数量已达上限，已自动停止');
            job.statusText = '达上限';
            onUpdate?.(job, i);
            break;
          }

          // 执行沟通
          job.statusText = '沟通中...';
          onUpdate?.(job, i);
          const result = await this.communicate(job);
          if (result.success) {
            job.status = 'success';
            job.statusText = '沟通成功';
            todaySuccess++;
            // 记录已沟通
            const contacted = this.config.contacted || {};
            contacted[`${(job.company || '').trim()}|${(job.title || '').trim()}`] = { date: new Date().toISOString().split('T')[0], title: (job.title || '').trim(), company: (job.company || '').trim() };
            await this.config.save({ contacted });
            await this.config.updateStats({ success: todaySuccess, total: this.config.statistics.total + 1 });
          } else {
            job.status = 'error';
            job.statusText = result.reason || '沟通失败';
            await this.config.updateStats({ total: this.config.statistics.total + 1 });
          }
          onUpdate?.(job, i);

          // 间隔
          await sleep((ad.interval || 3) * 1000);
        }
      } catch (e) {
        log('error', '投递过程中发生异常', e);
      } finally {
        this.running = false;
        log('log', '自动投递/沟通结束');
      }
    }

    async communicate(job) {
      try {
        let btn = job.communicateBtn;
        if (!btn) {
          const sel = this.config.selectors.communicateBtn || '.job-card-pc-communication-btn, .btn-communication, btn.abt-btn, .abt-btn, [data-selector="job-communication-btn"]';
          log('log', `尝试动态激活沟通按钮: ${job.title} - ${job.company}`);
          btn = await revealCommunicateBtn(job.element, sel, this.config.selectors.recruiterAvatar);
          if (!btn) {
            return { success: false, reason: '未找到沟通按钮（动态按钮未显示）' };
          }
          job.communicateBtn = btn;
        }
        // 滚动到视图
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(300);

        // 点击沟通按钮（聊一聊/立即沟通）
        btn.click();
        log('log', `已点击沟通按钮: ${job.title} - ${job.company}`);
        await sleep(1500);

        // 先尝试发送简历（不先发送招呼语）
        if (this.config.autoDeliver.sendResume) {
          const resumeResult = await this.sendResume();
          if (!resumeResult.success) {
            log('warn', `发送简历失败，跳过打招呼语: ${resumeResult.reason}`);
            return { success: false, reason: resumeResult.reason };
          }
          log('log', '简历处理完成，准备发送招呼语');
        }

        // 然后发送打招呼语
        await this.sendGreeting();

        return { success: true };
      } catch (e) {
        log('warn', '沟通失败', e);
        return { success: false, reason: e.message };
      }
    }

    async sendGreeting() {
      const ad = this.config.autoDeliver;
      if (!ad.greeting) return;

      // 猎聘沟通弹窗中通常有 textarea 或 input（兼容左侧聊天栏）
      const inputSelectors = [
        'textarea[placeholder*="输入"]',
        '.im-chat-input textarea',
        '.chat-input textarea',
        '[contenteditable="true"]',
        '.chat-editor textarea',
        '.chat-box textarea',
        '.im-sidebar textarea',
        '.left-sidebar textarea',
        '.conversation-list ~ * textarea',
        '[class*="chat"] textarea',
        '[class*="im"] textarea'
      ];
      const inputs = document.querySelectorAll(inputSelectors.join(', '));
      for (const input of inputs) {
        if (input.offsetParent) {
          input.focus();
          input.value = ad.greeting;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(300);
          // 尝试点击发送按钮（兼容左侧聊天栏）
          const sendBtnSelectors = [
            '.im-chat-send-btn',
            '.send-btn',
            '.chat-send-btn',
            '.chat-submit',
            '[class*="send"]',
            '[class*="submit"]'
          ];
          let sendBtn = null;
          for (const sel of sendBtnSelectors) {
            const btn = input.closest('.chat-input, .im-chat-input, .chat-editor, [class*="chat"]')?.querySelector(sel)
              || document.querySelector(sel);
            if (btn && btn.offsetParent) {
              sendBtn = btn;
              break;
            }
          }
          if (sendBtn) {
            sendBtn.click();
          } else {
            // 回车发送
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }
          return;
        }
      }
    }

    async sendResume() {
      // 等待聊天弹窗/侧边栏完全渲染
      await sleep(800);
      let clicked = false;

      // 优先策略：针对猎聘聊天界面已知的选择器
      const specificBtn = document.querySelector('.im-ui-action-button-title');
      if (specificBtn && isVisible(specificBtn)) {
        simulateClick(specificBtn);
        log('log', '已点击发送简历按钮（.im-ui-action-button-title）');
        clicked = true;
      }

      // 策略 1：在聊天容器内查找文本包含「发送简历」「投简历」「发简历」的按钮/元素
      if (!clicked) {
        const chatContainers = document.querySelectorAll('.im-chat-container, .chat-container, .im-container, [class*="chat"], [class*="im"]');
        for (const container of chatContainers) {
          const resumeBtn = Array.from(container.querySelectorAll('button, a, span, div, [class*="btn"], [class*="resume"]'))
            .find(el => /发送简历|投简历|发简历/i.test(el.textContent || '') && isVisible(el));
          if (resumeBtn) {
            simulateClick(resumeBtn);
            log('log', '已点击发送简历按钮');
            clicked = true;
            break;
          }
        }
      }

      // 策略 2：全局搜索可见的简历按钮
      if (!clicked) {
        const globalBtn = Array.from(document.querySelectorAll('button, a, span, div, [class*="btn"], [class*="resume"]'))
          .find(el => /发送简历|投简历|发简历/i.test(el.textContent || '') && isVisible(el));
        if (globalBtn) {
          simulateClick(globalBtn);
          log('log', '已点击发送简历按钮（全局）');
          clicked = true;
        }
      }

      if (!clicked) {
        log('warn', '未找到发送简历按钮，可能页面结构不同');
        return { success: false, reason: '未找到发送简历按钮' };
      }

      await sleep(1200);
      // 处理附件简历弹窗（若配置了简历名称）
      const resumeName = this.config.autoDeliver?.resumeName;
      if (resumeName) {
        const selected = await this.selectAttachmentResume(resumeName);
        if (!selected) {
          return { success: false, reason: '未检测到附件简历选择弹窗或选择失败' };
        }
        // selectAttachmentResume 内部已处理点击「立即投递」及确认弹窗
      } else {
        // 无附件简历配置时，兜底处理可能的确认弹窗
        await this.confirmResumeDialog();
      }
      return { success: true };
    }

    async selectAttachmentResume(resumeName) {
      // 常见弹窗容器选择器（猎聘使用 ant-im-modal / ant-modal 系列）
      const dialogSelectors = [
        '.ant-im-modal-content',
        '.ant-im-modal-wrap',
        '.ant-modal-content',
        '.ant-modal-wrap',
        '.ant-modal',
        '.modal-content',
        '.dialog-content',
        '.el-dialog',
        '.resume-select-dialog',
        '.im-resume-dialog',
        '.send-resume-dialog',
        '.resume-list',
        '.attachment-list',
        '[class*="modal"]',
        '[class*="dialog"]'
      ];

      let dialog = null;
      for (let attempt = 1; attempt <= 5; attempt++) {
        await sleep(1000);
        for (const sel of dialogSelectors) {
          const els = Array.from(document.querySelectorAll(sel));
          const visibleEl = els.find(el => isVisible(el));
          if (visibleEl) {
            dialog = visibleEl;
            break;
          }
        }
        if (dialog) {
          log('log', `第 ${attempt} 次检测发现附件简历弹窗/容器`);
          break;
        }
        log('log', `第 ${attempt} 次未检测到附件简历弹窗，继续等待...`);
      }

      // 兜底策略 1：通过「立即投递」按钮向上追溯弹窗容器
      if (!dialog) {
        const sendBtn = Array.from(document.querySelectorAll('button, a, span, div, [class*="btn"]'))
          .find(el => /立即投递|确认发送|确定/i.test(el.textContent || '') && isVisible(el));
        if (sendBtn) {
          let ancestor = sendBtn.parentElement;
          while (ancestor && ancestor !== document.body) {
            if (/ant-im-modal|modal-content|dialog-content|ant-modal|resume-list|attachment-list/i.test(ancestor.className || '')) {
              dialog = ancestor;
              log('log', '通过「立即投递」按钮兜底检测到附件简历弹窗');
              break;
            }
            ancestor = ancestor.parentElement;
          }
        }
      }

      // 兜底策略 2：猎聘可能不使用传统弹窗，而是直接在聊天面板内展示简历列表
      if (!dialog) {
        const resumeItems = Array.from(document.querySelectorAll('label, p, span, li, div, tr'))
          .filter(el => el.textContent?.includes(resumeName) && isVisible(el));
        if (resumeItems.length > 0) {
          // 向上追溯到一个合理的容器（包含简历项和投递按钮）
          for (const item of resumeItems) {
            let ancestor = item.parentElement;
            while (ancestor && ancestor !== document.body) {
              const hasSendBtn = Array.from(ancestor.querySelectorAll('button, a, span, div, [class*="btn"]'))
                .some(el => /立即投递|确认发送|确定/i.test(el.textContent || '') && isVisible(el));
              if (hasSendBtn) {
                dialog = ancestor;
                log('log', '通过简历名称直接定位到投递区域（非弹窗模式）');
                break;
              }
              ancestor = ancestor.parentElement;
            }
            if (dialog) break;
          }
        }
      }

      if (!dialog) {
        log('warn', '连续 5 次未检测到附件简历弹窗或相关区域，跳过选择');
        return false;
      }

      // 验证并精确定位包含简历内容的弹窗（避免多个 modal 时取错）
      const allDialogs = Array.from(new Set(
        dialogSelectors.flatMap(sel => Array.from(document.querySelectorAll(sel)).filter(isVisible))
      ));
      if (allDialogs.length > 1) {
        const validDialog = allDialogs.find(d => {
          const hasSendBtn = Array.from(d.querySelectorAll('button, a, span, div, [class*="btn"]'))
            .some(el => /立即投递|确认发送|确定/i.test(el.textContent || '') && isVisible(el));
          const hasResumeText = Array.from(d.querySelectorAll('label, p, span, div, li, tr'))
            .some(el => el.textContent?.includes(resumeName));
          return hasSendBtn || hasResumeText;
        });
        if (validDialog) {
          dialog = validDialog;
          log('log', '从多个可见弹窗中定位到包含简历内容的弹窗');
        }
      }

      // 等待简历列表完全渲染
      await sleep(400);

      // 在弹窗内查找目标简历项（优先 label，再扩展至 p/span/div 等）
      let items = Array.from(dialog.querySelectorAll('label')).filter(el => el.textContent?.includes(resumeName));
      if (items.length === 0) {
        items = Array.from(dialog.querySelectorAll('p, span, li, .resume-item, .list-item, [class*="item"], div, tr'))
          .filter(el => el.textContent?.includes(resumeName));
      }

      if (items.length === 0) {
        log('warn', `附件简历弹窗中未找到名为 "${resumeName}" 的简历`);
        const candidates = Array.from(dialog.querySelectorAll('label, p, span, div, li'))
          .map(el => el.textContent?.trim())
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 20)
          .map(t => t.substring(0, 60));
        log('log', '弹窗内候选文本列表:', candidates);
        return false;
      }

      // 优先选择 label，否则取最短匹配项，并尝试向上追溯到 label
      let targetItem = items.find(el => el.tagName === 'LABEL') || items.sort((a, b) => (a.textContent?.length || 9999) - (b.textContent?.length || 9999))[0];
      if (targetItem.tagName !== 'LABEL') {
        const parentLabel = targetItem.closest('label');
        if (parentLabel) targetItem = parentLabel;
      }

      // 尝试点击 radio/checkbox，否则点击整个项
      const radio = targetItem.querySelector('input[type="radio"], input[type="checkbox"]');
      if (radio) {
        if (!radio.checked) {
          simulateClick(radio);
          await sleep(200);
        }
        if (!radio.checked) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        simulateClick(targetItem);
      }
      log('log', `已选择附件简历: ${resumeName}`);
      await sleep(400);

      // 查找并点击「立即投递」按钮（优先真正的 button/a 标签，排除 disabled）
      const btnCandidates = Array.from(dialog.querySelectorAll('button, a, span, div, [class*="btn"], [class*="confirm"]'))
        .filter(el => /立即投递|确认发送|确定|发送|是的/i.test(el.textContent || '') && isVisible(el) && !el.disabled);
      // 优先 button 标签
      const sendBtn = btnCandidates.find(el => el.tagName === 'BUTTON') || btnCandidates.find(el => el.tagName === 'A') || btnCandidates[0];
      if (sendBtn) {
        simulateClick(sendBtn);
        log('log', `已点击立即投递/确认发送按钮: ${sendBtn.tagName}`);
        await sleep(800);
        // 在弹窗范围内处理可能的确认弹窗
        await this.confirmResumeDialog(dialog);
        return true;
      } else {
        log('warn', '已选择简历，但未找到「立即投递」按钮');
        return false;
      }
    }

    async confirmResumeDialog(dialogScope = document) {
      // 处理确认弹窗：在指定范围内查找包含「确定」「确认」「发送」的可见按钮
      const confirmTexts = /确定|确认|发送|是的/i;
      const dialogBtns = Array.from(dialogScope.querySelectorAll('button, a, span, div, [class*="btn"], [class*="confirm"]'))
        .filter(el => confirmTexts.test(el.textContent || '') && isVisible(el) && !el.disabled);
      if (dialogBtns.length > 0) {
        // 优先找明确是主按钮的（如 class 含 primary/confirm/sure），其次优先 button 标签
        const primary = dialogBtns.find(el => /primary|confirm|sure|ok/i.test(el.className || ''));
        const target = primary || dialogBtns.find(el => el.tagName === 'BUTTON') || dialogBtns[0];
        simulateClick(target);
        log('log', '已确认发送简历');
        await sleep(400);
      }
    }

    stop() {
      this.running = false;
      this.paused = false;
    }

    pause() {
      this.paused = true;
    }

    resume() {
      this.paused = false;
    }

    notify(msg) {
      chrome.runtime.sendMessage({ type: 'NOTIFY', title: '猎聘助手', message: msg });
    }
  }

  // ==================== UI 管理器 ====================
  class UIManager {
    constructor(helper) {
      this.helper = helper;
      this.panel = null;
      this.jobListEl = null;
      this.logs = [];
      this.jobFilterStatus = 'all';
      this.resizeState = { resizing: false, dir: null, startX: 0, startY: 0, startW: 0, startH: 0, startLeft: 0, startTop: 0 };
      this.uiPrefs = { theme: 'green', fontSize: 'medium', panelWidth: null, panelHeight: null };
    }

    async init() {
      await this.injectPanel();
      this.loadPanelState();
      this.bindEvents();
    }

    async injectPanel() {
      if (document.getElementById('liepin-helper-panel')) return;
      try {
        await waitForBody();
      } catch (e) {
        log('warn', '注入面板失败：document.body 不存在', e);
        return;
      }

      const container = document.createElement('div');
      container.id = 'liepin-helper-panel';
      container.dataset.build = '250415';
      container.innerHTML = `
        <div class="lph-header">
          <div class="lph-header-left">
            <span class="lph-title">猎聘助手小白版</span>
            <span class="lph-version">v2.0</span>
            <span class="lph-author">jiaQ</span>
          </div>
          <div class="lph-header-controls">
            <select id="lph-theme" title="主题">
              <option value="green">绿</option>
              <option value="red">红</option>
              <option value="yellow">黄</option>
              <option value="blue">蓝</option>
              <option value="white">白</option>
              <option value="dark">夜间</option>
            </select>
            <select id="lph-fontsize" title="字号">
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
            </select>
            <button id="lph-btn-options" class="lph-header-btn" title="打开配置">设置</button>
            <button class="lph-close">×</button>
          </div>
        </div>
        <div class="lph-body">
          <div class="lph-stats">
            <div>今日投递: <b id="lph-stat-success">0</b> / <span id="lph-stat-limit">100</span></div>
            <div>扫描: <b id="lph-stat-scanned">0</b></div>
            <div>过滤: <b id="lph-stat-filtered">0</b></div>
          </div>
          <div class="lph-actions-grid">
            <button id="lph-btn-wizard" class="lph-btn info" style="grid-column: 1 / -1;" title="不会配选择器？点我自动识别页面元素">开始配置向导</button>
            <button id="lph-btn-scan" class="lph-btn primary">扫描职位</button>
            <button id="lph-btn-start" class="lph-btn success" disabled>开始投递</button>
            <div class="lph-confirm-row">
              <label class="lph-confirm-label" title="开启后，扫描完成将暂停并等待手动点击「开始投递」">
                <input type="checkbox" id="lph-opt-scan-confirm" checked> 人工确认
              </label>
            </div>
            <div class="lph-confirm-row">
              <label class="lph-confirm-label" title="开启后，沟通时会自动点击「发送简历」按钮">
                <input type="checkbox" id="lph-opt-send-resume"> 自动发简历
              </label>
            </div>
          </div>
          <div class="lph-btns lph-runtime-btns" style="display:none;">
            <button id="lph-btn-pause" class="lph-btn warn" style="display:none">暂停</button>
            <button id="lph-btn-stop" class="lph-btn danger" style="display:none">停止</button>
          </div>
          <div class="lph-progress" id="lph-progress" style="display:none">
            <div class="lph-progress-bar"><div class="lph-progress-fill" id="lph-progress-fill"></div></div>
            <div class="lph-progress-text" id="lph-progress-text">扫描中 0/0...</div>
          </div>
          <div class="lph-filters-section">
            <div class="lph-filters-header" id="lph-filters-toggle" title="点击展开/收起">
              <span class="lph-filters-title">条件筛选</span>
              <span class="lph-filters-arrow" id="lph-filters-arrow"></span>
            </div>
            <div class="lph-filters-content" id="lph-filters-content">
              <div class="lph-options">
                <label><input type="checkbox" id="lph-opt-filter-title"> 岗位筛选</label>
                <label><input type="checkbox" id="lph-opt-filter-company"> 公司筛选</label>
                <label><input type="checkbox" id="lph-opt-filter-salary"> 薪资筛选</label>
                <label><input type="checkbox" id="lph-opt-filter-location"> 地点筛选</label>
                <label><input type="checkbox" id="lph-opt-filter-size"> 公司规模</label>
                <label><input type="checkbox" id="lph-opt-filter-experience"> 工作年限</label>
                <label><input type="checkbox" id="lph-opt-filter-education"> 学历筛选</label>
                <label><input type="checkbox" id="lph-opt-filter-headhunter"> 过滤猎头</label>
                <label><input type="checkbox" id="lph-opt-filter-contacted"> 过滤已聊</label>
                <label><input type="checkbox" id="lph-opt-ai"> AI筛选</label>
              </div>
            </div>
          </div>
          <div class="lph-jobs-section">
            <div class="lph-jobs-header">
              <span class="lph-jobs-title">职位列表 (<b id="lph-jobs-count">0</b>)</span>
              <select id="lph-jobs-filter" class="lph-jobs-filter">
                <option value="all">全部</option>
                <option value="wait">等待中</option>
                <option value="running">进行中</option>
                <option value="success">沟通成功</option>
                <option value="error">沟通失败</option>
                <option value="filtered">已过滤</option>
              </select>
            </div>
            <div class="lph-jobs-list" id="lph-jobs-list"></div>
          </div>
          <div class="lph-logs" id="lph-logs"></div>
        </div>
        <div class="lph-resize-handle lph-resize-n" data-dir="n" title="上下拖动调整高度"></div>
        <div class="lph-resize-handle lph-resize-s" data-dir="s" title="上下拖动调整高度"></div>
        <div class="lph-resize-handle lph-resize-e" data-dir="e" title="左右拖动调整宽度"></div>
        <div class="lph-resize-handle lph-resize-w" data-dir="w" title="左右拖动调整宽度"></div>
        <div class="lph-resize-handle lph-resize-ne" data-dir="ne" title="拖动调整大小"></div>
        <div class="lph-resize-handle lph-resize-nw" data-dir="nw" title="拖动调整大小"></div>
        <div class="lph-resize-handle lph-resize-se" data-dir="se" title="拖动调整大小"></div>
        <div class="lph-resize-handle lph-resize-sw" data-dir="sw" title="拖动调整大小"></div>
      `;

      // 插入到页面右上角
      document.body.appendChild(container);
      this.panel = container;
      log('log', '筛选面板已注入');

      // 可拖拽
      const header = container.querySelector('.lph-header');
      let isDragging = false, startX, startY, initLeft, initTop;
      header.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = container.getBoundingClientRect();
        initLeft = rect.left;
        initTop = rect.top;
        container.style.transition = 'none';
      });
      // 面板大小拖拽缩放（八向）
      container.querySelectorAll('.lph-resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = container.getBoundingClientRect();
          this.resizeState.resizing = true;
          this.resizeState.dir = handle.dataset.dir;
          this.resizeState.startX = e.clientX;
          this.resizeState.startY = e.clientY;
          this.resizeState.startW = rect.width;
          this.resizeState.startH = rect.height;
          this.resizeState.startLeft = rect.left;
          this.resizeState.startTop = rect.top;
          container.style.transition = 'none';
          // 固定使用 left/top 定位，避免 right/bottom 干扰
          container.style.left = `${rect.left}px`;
          container.style.top = `${rect.top}px`;
          container.style.right = 'auto';
          container.style.bottom = 'auto';
        });
      });

      window.addEventListener('mousemove', (e) => {
        if (isDragging) {
          container.style.left = `${initLeft + e.clientX - startX}px`;
          container.style.top = `${initTop + e.clientY - startY}px`;
          container.style.right = 'auto';
          container.style.bottom = 'auto';
        }
        if (this.resizeState.resizing) {
          const dx = e.clientX - this.resizeState.startX;
          const dy = e.clientY - this.resizeState.startY;
          const dir = this.resizeState.dir;
          const minW = 240;
          const minH = 320;
          let newW = this.resizeState.startW;
          let newH = this.resizeState.startH;
          let newLeft = this.resizeState.startLeft;
          let newTop = this.resizeState.startTop;

          if (dir.includes('e')) newW = Math.max(minW, this.resizeState.startW + dx);
          if (dir.includes('w')) {
            newW = Math.max(minW, this.resizeState.startW - dx);
            newLeft = this.resizeState.startLeft + (this.resizeState.startW - newW);
          }
          if (dir.includes('s')) newH = Math.max(minH, this.resizeState.startH + dy);
          if (dir.includes('n')) {
            newH = Math.max(minH, this.resizeState.startH - dy);
            newTop = this.resizeState.startTop + (this.resizeState.startH - newH);
          }

          container.style.width = `${newW}px`;
          container.style.height = `${newH}px`;
          container.style.left = `${newLeft}px`;
          container.style.top = `${newTop}px`;
        }
      });
      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          container.style.transition = '';
        }
        if (this.resizeState.resizing) {
          this.resizeState.resizing = false;
          this.resizeState.dir = null;
          container.style.transition = '';
          this.saveUiPrefs();
        }
      });
    }

    loadPanelState() {
      const panel = this.panel;
      if (!panel) return;
      const f = this.helper.config.filters;
      const ai = this.helper.config.aiFilter;

      const titleCb = panel.querySelector('#lph-opt-filter-title');
      if (titleCb) titleCb.checked = f.jobTitleEnable || false;

      const companyCb = panel.querySelector('#lph-opt-filter-company');
      if (companyCb) companyCb.checked = f.companyEnable || false;

      const salaryCb = panel.querySelector('#lph-opt-filter-salary');
      if (salaryCb) salaryCb.checked = f.salaryEnable || false;

      const locationCb = panel.querySelector('#lph-opt-filter-location');
      if (locationCb) locationCb.checked = f.locationEnable || false;

      const sizeCb = panel.querySelector('#lph-opt-filter-size');
      if (sizeCb) sizeCb.checked = f.companySizeEnable || false;

      const experienceCb = panel.querySelector('#lph-opt-filter-experience');
      if (experienceCb) experienceCb.checked = f.experienceEnable || false;

      const educationCb = panel.querySelector('#lph-opt-filter-education');
      if (educationCb) educationCb.checked = f.educationEnable || false;

      const headhunterCb = panel.querySelector('#lph-opt-filter-headhunter');
      if (headhunterCb) headhunterCb.checked = f.excludeHeadhunter || false;

      const contactedCb = panel.querySelector('#lph-opt-filter-contacted');
      if (contactedCb) contactedCb.checked = f.excludeContacted || false;

      const aiCb = panel.querySelector('#lph-opt-ai');
      if (aiCb) aiCb.checked = f.aiFilterEnable || false;

      const filterSel = panel.querySelector('#lph-jobs-filter');
      if (filterSel) filterSel.value = this.jobFilterStatus || 'all';

      const scanConfirmCb = panel.querySelector('#lph-opt-scan-confirm');
      if (scanConfirmCb) scanConfirmCb.checked = this.helper.config.ui.scanConfirm !== false;

      const sendResumeCb = panel.querySelector('#lph-opt-send-resume');
      if (sendResumeCb) sendResumeCb.checked = this.helper.config.autoDeliver.sendResume || false;

      // 恢复 UI 个性化设置
      const configUi = this.helper.config.ui || {};
      this.uiPrefs = {
        theme: configUi.theme || 'green',
        fontSize: configUi.fontSize || 'medium',
        panelWidth: configUi.panelWidth || null,
        panelHeight: configUi.panelHeight || null,
        filtersExpanded: configUi.filtersExpanded !== false
      };

      // 恢复折叠状态
      const filtersExpanded = this.uiPrefs.filtersExpanded;
      const filtersContent = panel.querySelector('#lph-filters-content');
      const filtersArrow = panel.querySelector('#lph-filters-arrow');
      if (filtersContent) {
        filtersContent.classList.toggle('collapsed', !filtersExpanded);
      }
      if (filtersArrow) {
        filtersArrow.style.transform = filtersExpanded ? 'rotate(45deg)' : 'rotate(-45deg)';
      }
      const themeSel = panel.querySelector('#lph-theme');
      if (themeSel) themeSel.value = this.uiPrefs.theme;
      const fontSel = panel.querySelector('#lph-fontsize');
      if (fontSel) fontSel.value = this.uiPrefs.fontSize;
      this.applyTheme(this.uiPrefs.theme);
      this.applyFontSize(this.uiPrefs.fontSize);
      this.applySize(this.uiPrefs.panelWidth, this.uiPrefs.panelHeight);
    }

    bindEvents() {
      const panel = this.panel;
      panel.querySelector('.lph-close').addEventListener('click', () => {
        panel.style.display = 'none';
      });

      panel.querySelector('#lph-btn-scan').addEventListener('click', () => {
        this.helper.scan();
      });

      panel.querySelector('#lph-btn-start').addEventListener('click', () => {
        this.helper.startDeliver();
      });

      panel.querySelector('#lph-btn-pause').addEventListener('click', () => {
        this.helper.pauseDeliver();
      });

      panel.querySelector('#lph-btn-stop').addEventListener('click', () => {
        this.helper.stopDeliver();
      });

      panel.querySelector('#lph-btn-options').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' });
      });

      panel.querySelector('#lph-btn-wizard')?.addEventListener('click', () => {
        this.startSelectorWizard();
      });

      // 选项变更同步到配置
      ['filter-title', 'filter-company', 'filter-salary', 'filter-location', 'filter-size', 'filter-experience', 'filter-education', 'filter-headhunter', 'filter-contacted', 'ai'].forEach(id => {
        const el = panel.querySelector(`#lph-opt-${id}`);
        if (el) {
          el.addEventListener('change', () => this.syncOptions());
        }
      });

      const filterSel = panel.querySelector('#lph-jobs-filter');
      if (filterSel) {
        filterSel.addEventListener('change', () => {
          this.jobFilterStatus = filterSel.value;
          this.renderJobList();
        });
      }

      // 人工确认开关
      const scanConfirmCb = panel.querySelector('#lph-opt-scan-confirm');
      if (scanConfirmCb) {
        scanConfirmCb.addEventListener('change', () => {
          const ui = { ...this.helper.config.ui, scanConfirm: scanConfirmCb.checked };
          this.helper.config.save({ ui });
        });
      }

      // 自动发简历开关
      const sendResumeCb = panel.querySelector('#lph-opt-send-resume');
      if (sendResumeCb) {
        sendResumeCb.addEventListener('change', () => {
          const autoDeliver = { ...this.helper.config.autoDeliver, sendResume: sendResumeCb.checked };
          this.helper.config.save({ autoDeliver });
        });
      }

      // 主题与字号切换
      const themeSel = panel.querySelector('#lph-theme');
      if (themeSel) {
        themeSel.addEventListener('change', () => {
          this.applyTheme(themeSel.value);
          this.saveUiPrefs();
        });
      }

      const fontSel = panel.querySelector('#lph-fontsize');
      if (fontSel) {
        fontSel.addEventListener('change', () => {
          this.applyFontSize(fontSel.value);
          this.saveUiPrefs();
        });
      }

      // 折叠面板
      const filtersToggle = panel.querySelector('#lph-filters-toggle');
      if (filtersToggle) {
        filtersToggle.addEventListener('click', () => {
          const filtersContent = panel.querySelector('#lph-filters-content');
          const filtersArrow = panel.querySelector('#lph-filters-arrow');
          const isCollapsed = filtersContent?.classList.contains('collapsed');
          if (isCollapsed) {
            filtersContent?.classList.remove('collapsed');
            if (filtersArrow) filtersArrow.style.transform = 'rotate(45deg)';
            this.uiPrefs.filtersExpanded = true;
          } else {
            filtersContent?.classList.add('collapsed');
            if (filtersArrow) filtersArrow.style.transform = 'rotate(-45deg)';
            this.uiPrefs.filtersExpanded = false;
          }
          this.saveUiPrefs();
        });
      }

      // 面板大小拖拽缩放（resize 事件已统一在 injectPanel 中处理）
    }

    syncOptions() {
      const panel = this.panel;
      const filters = this.helper.config.filters;
      filters.jobTitleEnable = panel.querySelector('#lph-opt-filter-title')?.checked || false;
      filters.companyEnable = panel.querySelector('#lph-opt-filter-company')?.checked || false;
      filters.salaryEnable = panel.querySelector('#lph-opt-filter-salary')?.checked || false;
      filters.locationEnable = panel.querySelector('#lph-opt-filter-location')?.checked || false;
      filters.companySizeEnable = panel.querySelector('#lph-opt-filter-size')?.checked || false;
      filters.experienceEnable = panel.querySelector('#lph-opt-filter-experience')?.checked || false;
      filters.educationEnable = panel.querySelector('#lph-opt-filter-education')?.checked || false;
      filters.excludeHeadhunter = panel.querySelector('#lph-opt-filter-headhunter')?.checked || false;
      filters.excludeContacted = panel.querySelector('#lph-opt-filter-contacted')?.checked || false;
      filters.aiFilterEnable = panel.querySelector('#lph-opt-ai')?.checked || false;
      this.helper.config.aiFilter.enable = filters.aiFilterEnable;
      this.helper.config.save({ filters, aiFilter: this.helper.config.aiFilter });
    }

    applyTheme(theme) {
      const panel = this.panel;
      if (!panel) return;
      panel.classList.remove('lph-theme-red', 'lph-theme-yellow', 'lph-theme-blue', 'lph-theme-green', 'lph-theme-white', 'lph-theme-dark');
      if (theme) panel.classList.add(`lph-theme-${theme}`);
    }

    applyFontSize(size) {
      const panel = this.panel;
      if (!panel) return;
      panel.classList.remove('lph-font-small', 'lph-font-medium', 'lph-font-large');
      if (size) panel.classList.add(`lph-font-${size}`);
    }

    applySize(width, height) {
      const panel = this.panel;
      if (!panel) return;
      if (width) panel.style.width = `${width}px`;
      if (height) panel.style.height = `${height}px`;
    }

    async saveUiPrefs() {
      const panel = this.panel;
      if (!panel) return;
      const prefs = {
        ...this.helper.config.ui,
        theme: panel.querySelector('#lph-theme')?.value || 'green',
        fontSize: panel.querySelector('#lph-fontsize')?.value || 'medium',
        panelWidth: parseInt(panel.style.width, 10) || null,
        panelHeight: parseInt(panel.style.height, 10) || null,
        filtersExpanded: this.uiPrefs.filtersExpanded
      };
      this.uiPrefs = prefs;
      await this.helper.config.save({ ui: prefs });
    }

    updateStats(stats) {
      const panel = this.panel;
      if (!panel) return;
      panel.querySelector('#lph-stat-success').textContent = stats.success || 0;
      panel.querySelector('#lph-stat-limit').textContent = this.helper.config.autoDeliver.limit || 100;
      panel.querySelector('#lph-stat-scanned').textContent = this.helper.scanner.jobs.length || 0;
      panel.querySelector('#lph-stat-filtered').textContent = stats.filtered || 0;
    }

    showScanProgress(current, total, valid) {
      const panel = this.panel;
      if (!panel) return;
      const progressEl = panel.querySelector('#lph-progress');
      const fillEl = panel.querySelector('#lph-progress-fill');
      const textEl = panel.querySelector('#lph-progress-text');
      if (progressEl) progressEl.style.display = '';
      if (fillEl) fillEl.style.width = total > 0 ? `${(current / total) * 100}%` : '0%';
      if (textEl) textEl.textContent = `扫描中 ${current}/${total}（已解析 ${valid} 个有效职位）...`;
    }

    hideScanProgress() {
      const panel = this.panel;
      if (!panel) return;
      const progressEl = panel.querySelector('#lph-progress');
      if (progressEl) progressEl.style.display = 'none';
    }

    setScanning(isScanning) {
      const panel = this.panel;
      if (!panel) return;
      const scanBtn = panel.querySelector('#lph-btn-scan');
      if (scanBtn) {
        scanBtn.disabled = isScanning;
        scanBtn.textContent = isScanning ? '扫描中...' : '扫描职位';
      }
    }

    setScanned(count) {
      const el = this.panel?.querySelector('#lph-stat-scanned');
      if (el) el.textContent = count;
      this.renderJobList();
    }

    // ==================== 选择器配置向导（小白版） ====================
    async startSelectorWizard() {
      const steps = [
        { key: 'jobCard', label: '职位卡片（整个职位项）', candidates: ['div._40106Nrnc3.job-card-pc-container', '.job-card-pc', '[data-selector="job-item"]', '.job-list-item', '.job-card-box'] },
        { key: 'jobTitle', label: '职位名称', candidates: ['div._40106XZ0ui div.ellipsis-1', '.job-title-box .ellipsis-1', '.job-title', '[data-selector="job-title"]'] },
        { key: 'companyName', label: '公司名称', candidates: ['span._40106K6Y1c', '.company-name .ellipsis-1', '.company-name', '[data-selector="company-name"]'] },
        { key: 'salary', label: '薪资', candidates: ['span._40106E8PWS', '.job-salary', '.salary', '[data-selector="job-salary"]'] },
        { key: 'location', label: '地点', candidates: ['div._40106__9nJ span.ellipsis-1', '.job-dq', '.job-location', '[data-selector="job-city"]'] },
        { key: 'communicateBtn', label: '沟通按钮（聊一聊/立即沟通）', candidates: ['btn.ant-btn', '.job-card-pc-communication-btn', '.btn-communication', '[data-selector="job-communication-btn"]'] },
        { key: 'recruiterAvatar', label: '招聘者头像（用于触发动态按钮）', candidates: ['div.recruiter-info-box > div._40106mtcQm', '.recruiter-avatar', '.boss-avatar', '.avatar', '.recruiter-info', '[data-selector="recruiter-avatar"]'] }
      ];

      this.addLog('启动配置向导，请跟随页面高亮提示进行操作');
      const updatedSelectors = { ...this.helper.config.selectors };

      for (const step of steps) {
        const result = await this.wizardRunStep(step);
        if (result && result.selector) {
          updatedSelectors[step.key] = result.selector;
          this.addLog(`[向导] 已确认 ${step.label}: ${result.selector}`);
        } else {
          this.addLog(`[向导] 已跳过 ${step.label}，使用默认选择器`);
        }
      }

      await this.helper.config.save({ selectors: updatedSelectors, selectorsCustomized: true });
      this.wizardClearHighlight();
      this.addLog('配置向导完成，选择器已自动保存');
      alert('配置向导完成！选择器已自动保存，您可以直接点击「扫描职位」测试效果。');
    }

    wizardRunStep(step) {
      return new Promise((resolve) => {
        let candidateIndex = 0;

        const tryNext = () => {
          if (candidateIndex >= step.candidates.length) {
            this.wizardClearHighlight();
            resolve(null);
            return;
          }
          const selector = step.candidates[candidateIndex];
          const el = document.querySelector(selector);
          if (el && isVisible(el)) {
            this.wizardHighlight(el);
            this.wizardShowDialog(step.label, selector, () => {
              this.wizardClearHighlight();
              resolve({ selector });
            }, () => {
              candidateIndex++;
              tryNext();
            }, () => {
              this.wizardClearHighlight();
              resolve(null);
            });
          } else {
            candidateIndex++;
            tryNext();
          }
        };

        tryNext();
      });
    }

    wizardHighlight(el) {
      this.wizardClearHighlight();
      // 先滚动到视口（无动画，避免错位），再获取坐标创建高亮框
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      const rect = el.getBoundingClientRect();
      const highlight = document.createElement('div');
      highlight.id = 'lph-wizard-highlight';
      highlight.style.cssText = `
        position: fixed;
        top: ${rect.top}px;
        left: ${rect.left}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 3px dashed #ff4d4f;
        background: rgba(255, 77, 79, 0.12);
        z-index: 9999999;
        pointer-events: none;
        box-sizing: border-box;
        transition: all 0.2s ease;
      `;
      document.body.appendChild(highlight);
    }

    wizardClearHighlight() {
      const old = document.getElementById('lph-wizard-highlight');
      if (old) old.remove();
      this.wizardCloseDialog();
    }

    wizardShowDialog(label, selector, onYes, onNo, onSkip) {
      this.wizardCloseDialog();
      const dialog = document.createElement('div');
      dialog.id = 'lph-wizard-dialog';
      dialog.innerHTML = `
        <div class="lph-wizard-drag-handle" title="拖动"></div>
        <div class="lph-wizard-title">选择器配置向导</div>
        <div class="lph-wizard-body">当前高亮的元素是否是 <b>${label}</b> ？</div>
        <div class="lph-wizard-selector">${selector}</div>
        <div class="lph-wizard-btns">
          <button class="lph-wizard-yes">是，就是这个</button>
          <button class="lph-wizard-no">不是，换下一个</button>
          <button class="lph-wizard-skip">跳过</button>
        </div>
      `;
      document.body.appendChild(dialog);
      dialog.querySelector('.lph-wizard-yes').onclick = onYes;
      dialog.querySelector('.lph-wizard-no').onclick = onNo;
      dialog.querySelector('.lph-wizard-skip').onclick = onSkip;
      this.wizardBindDialogDrag(dialog);
    }

    wizardBindDialogDrag(dialog) {
      const handle = dialog.querySelector('.lph-wizard-drag-handle');
      if (!handle) return;
      let isDragging = false, startX, startY, initLeft, initTop;
      handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = dialog.getBoundingClientRect();
        initLeft = rect.left;
        initTop = rect.top;
        dialog.style.transition = 'none';
      });
      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        dialog.style.left = `${initLeft + e.clientX - startX}px`;
        dialog.style.top = `${initTop + e.clientY - startY}px`;
        dialog.style.right = 'auto';
        dialog.style.transform = 'none';
      });
      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          dialog.style.transition = '';
        }
      });
    }

    wizardCloseDialog() {
      const old = document.getElementById('lph-wizard-dialog');
      if (old) old.remove();
    }

    renderJobList() {
      const list = this.panel?.querySelector('#lph-jobs-list');
      const countEl = this.panel?.querySelector('#lph-jobs-count');
      if (!list) return;
      const jobs = this.helper.scanner.jobs || [];
      const filter = this.jobFilterStatus || 'all';
      const filteredJobs = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);
      if (countEl) countEl.textContent = jobs.length;
      if (jobs.length === 0) {
        list.innerHTML = '<div class="lph-job-empty">暂无职位，请先点击「扫描职位」</div>';
        return;
      }
      list.innerHTML = filteredJobs.map((job, idx) => {
        const originalIndex = jobs.indexOf(job);
        const statusClass = `lph-job-status ${job.status}`;
        const statusMap = {
          wait: '等待中',
          running: '进行中',
          success: '沟通成功',
          error: '沟通失败',
          filtered: '已过滤'
        };
        const salaryInfo = [];
        if (job.salaryText) salaryInfo.push(this.escapeHtml(job.salaryText));
        const months = job.salary?.months || 12;
        if (months !== 12 && job.salary && (job.salary.min > 0 || job.salary.max > 0)) {
          const annualMin = Math.round(job.salary.min * months / 10);
          const annualMax = Math.round(job.salary.max * months / 10);
          if (annualMin === annualMax) {
            salaryInfo.push(`(${annualMin}万/年)`);
          } else {
            salaryInfo.push(`(${annualMin}-${annualMax}万/年)`);
          }
        }
        const salaryLine = salaryInfo.length ? ` · ${salaryInfo.join(' ')}` : '';
        let toggleClass = '';
        let toggleText = '·';
        if (job.manualOverride === true) {
          toggleClass = 'pass';
          toggleText = '✓';
        } else if (job.manualOverride === false) {
          toggleClass = 'block';
          toggleText = '✗';
        } else if (job.autoPassed === false) {
          toggleClass = 'auto-block';
          toggleText = '!';
        }
        return `
          <div class="lph-job-item" data-idx="${originalIndex}" title="${job.filterReason || ''}">
            <div class="lph-job-info">
              <div class="lph-job-title">${this.escapeHtml(job.title)}</div>
              <div class="lph-job-company">${this.escapeHtml(job.company)}${salaryLine}</div>
            </div>
            <div class="lph-job-actions">
              <button class="lph-job-toggle ${toggleClass}" data-idx="${originalIndex}" title="切换筛选状态：自动 -> 放行 -> 排除">${toggleText}</button>
              <span class="${statusClass}">${statusMap[job.status] || job.statusText}</span>
            </div>
          </div>
        `;
      }).join('');
      // 点击职位项滚动到对应卡片
      list.querySelectorAll('.lph-job-item').forEach(item => {
        item.addEventListener('click', () => {
          const idx = parseInt(item.dataset.idx, 10);
          const job = jobs[idx];
          if (job && job.element) {
            job.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      });
      // 点击切换按钮修改职位状态
      list.querySelectorAll('.lph-job-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx, 10);
          const job = jobs[idx];
          this.toggleJobManualOverride(job);
        });
      });
    }

    toggleJobManualOverride(job) {
      if (!job) return;
      if (job.manualOverride === null) {
        job.manualOverride = true;
      } else if (job.manualOverride === true) {
        job.manualOverride = false;
      } else {
        job.manualOverride = null;
      }
      if (job.manualOverride === null) {
        if (job.autoPassed === false) {
          job.status = 'filtered';
          job.statusText = '已过滤';
        } else {
          job.status = 'wait';
          job.statusText = '等待中';
          job.filterReason = '';
        }
      } else if (job.manualOverride === true) {
        job.status = 'wait';
        job.statusText = '等待中';
        job.filterReason = '手动放行';
      } else {
        job.status = 'filtered';
        job.statusText = '已过滤';
        job.filterReason = '手动排除';
      }
      this.updateCardToggle(job);
      this.updateJobCard(job);
      this.renderJobList();
    }

    updateCardToggle(job) {
      if (!job.element) return;
      const toggle = job.element.querySelector('.lph-job-manual-toggle');
      if (!toggle) return;
      if (job.manualOverride === true) {
        toggle.textContent = '✓';
        toggle.className = 'lph-job-manual-toggle override-pass';
        toggle.title = '手动放行 (点击切换)';
      } else if (job.manualOverride === false) {
        toggle.textContent = '✗';
        toggle.className = 'lph-job-manual-toggle override-block';
        toggle.title = '手动排除 (点击切换)';
      } else {
        toggle.textContent = job.autoPassed === false ? '!' : '·';
        toggle.className = `lph-job-manual-toggle auto-${job.autoPassed === false ? 'block' : 'pass'}`;
        toggle.title = job.autoPassed === false ? `自动过滤: ${job.filterReason || ''} (点击切换)` : '自动通过 (点击切换)';
      }
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    setButtons(state) {
      const panel = this.panel;
      const start = panel.querySelector('#lph-btn-start');
      const pause = panel.querySelector('#lph-btn-pause');
      const stop = panel.querySelector('#lph-btn-stop');
      const runtimeBtns = panel.querySelector('.lph-runtime-btns');

      if (state === 'idle') {
        start.style.display = '';
        start.textContent = '开始投递';
        start.disabled = this.helper.scanner.jobs.length === 0;
        pause.style.display = 'none';
        stop.style.display = 'none';
        if (runtimeBtns) runtimeBtns.style.display = 'none';
      } else if (state === 'running') {
        start.style.display = '';
        start.textContent = '投递中...';
        start.disabled = true;
        pause.style.display = '';
        stop.style.display = '';
        if (runtimeBtns) runtimeBtns.style.display = '';
      } else if (state === 'paused') {
        start.style.display = '';
        start.textContent = '继续';
        start.disabled = false;
        pause.style.display = 'none';
        stop.style.display = '';
        if (runtimeBtns) runtimeBtns.style.display = '';
      }
    }

    addLog(msg, type = 'info') {
      this.logs.unshift({ msg, type, time: new Date().toLocaleTimeString() });
      if (this.logs.length > 50) this.logs.pop();
      this.renderLogs();
    }

    renderLogs() {
      const box = this.panel?.querySelector('#lph-logs');
      if (!box) return;
      box.innerHTML = this.logs.map(l => `<div class="lph-log ${l.type}">[${l.time}] ${l.msg}</div>`).join('');
    }

    updateJobCard(job) {
      // 在职位卡片上添加状态标记
      if (!job.element) return;
      let badge = job.element.querySelector('.lph-job-badge');
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'lph-job-badge';
        job.element.style.position = 'relative';
        job.element.appendChild(badge);
      }
      badge.textContent = job.statusText;
      badge.className = `lph-job-badge ${job.status}`;
      this.renderJobList();
    }

    addManualToggle(job, onChange) {
      if (!job.element) return;
      let toggle = job.element.querySelector('.lph-job-manual-toggle');
      if (!toggle) {
        toggle = document.createElement('button');
        toggle.className = 'lph-job-manual-toggle';
        toggle.title = '点击切换筛选状态：自动 -> 符合 -> 不符合 -> 自动';
        job.element.style.position = 'relative';
        job.element.appendChild(toggle);
      }
      const updateToggle = () => {
        if (job.manualOverride === true) {
          toggle.textContent = '✓';
          toggle.className = 'lph-job-manual-toggle override-pass';
          toggle.title = '手动放行 (点击切换)';
        } else if (job.manualOverride === false) {
          toggle.textContent = '✗';
          toggle.className = 'lph-job-manual-toggle override-block';
          toggle.title = '手动排除 (点击切换)';
        } else {
          toggle.textContent = job.autoPassed === false ? '!' : '·';
          toggle.className = `lph-job-manual-toggle auto-${job.autoPassed === false ? 'block' : 'pass'}`;
          toggle.title = job.autoPassed === false ? `自动过滤: ${job.filterReason || ''} (点击切换)` : '自动通过 (点击切换)';
        }
      };
      updateToggle();
      toggle.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (job.manualOverride === null) {
          job.manualOverride = true;
        } else if (job.manualOverride === true) {
          job.manualOverride = false;
        } else {
          job.manualOverride = null;
        }
        // 重新评估
        if (job.manualOverride === null) {
          // 恢复自动评估结果到状态
          if (job.autoPassed === false) {
            job.status = 'filtered';
            job.statusText = '已过滤';
          } else {
            job.status = 'wait';
            job.statusText = '等待中';
            job.filterReason = '';
          }
        } else if (job.manualOverride === true) {
          job.status = 'wait';
          job.statusText = '等待中';
          job.filterReason = '手动放行';
        } else {
          job.status = 'filtered';
          job.statusText = '已过滤';
          job.filterReason = '手动排除';
        }
        updateToggle();
        onChange?.(job);
      };
    }
  }

  // ==================== 主控制器 ====================
  class LiepinHelper {
    constructor() {
      this.config = new ConfigManager();
      this.scanner = new JobScanner(this.config);
      this.filter = new FilterEngine(this.config);
      this.deliver = new DeliverEngine(this.config);
      this.ui = new UIManager(this);
      this.autoRunning = false;
    }

    async init() {
      await this.config.load();
      await this.ui.init();
      this.ui.updateStats(this.config.statistics);
      this.ui.setButtons('idle');
      this.ui.addLog('猎聘助手已加载，点击"扫描职位"开始');
      log('log', '猎聘助手初始化完成');
    }

    async scan() {
      this.ui.addLog('开始扫描职位...');
      // 扫描前重新加载最新配置（避免用户修改配置后未刷新页面）
      await this.config.load();
      const f = this.config.filters;
      log('log', '当前筛选配置快照:', {
        jobTitleEnable: f.jobTitleEnable,
        jobTitleKeywords: f.jobTitleKeywords,
        jobTitleInclude: f.jobTitleInclude,
        companyEnable: f.companyEnable,
        salaryEnable: f.salaryEnable,
        locationEnable: f.locationEnable,
        companySizeEnable: f.companySizeEnable,
        experienceEnable: f.experienceEnable,
        educationEnable: f.educationEnable,
        excludeHeadhunter: f.excludeHeadhunter,
        excludeContacted: f.excludeContacted
      });
      if (f.jobTitleEnable && !(f.jobTitleKeywords || '').trim()) {
        log('warn', '岗位筛选已开启，但关键词为空，将不会过滤任何职位。请到配置页填写关键词。');
      }
      this.ui.setScanning(true);
      try {
        await this.scanner.scan((current, total, valid) => {
          this.ui.showScanProgress(current, total, valid);
        });
        // 扫描后立即预筛选并在卡片上标记
        for (let i = 0; i < this.scanner.jobs.length; i++) {
          const job = this.scanner.jobs[i];
          if (job.status === 'wait' && job.autoPassed === null) {
            await this.filter.evaluate(job);
            this.ui.updateJobCard(job);
            this.ui.addManualToggle(job, (j) => {
              this.ui.updateJobCard(j);
              this.ui.renderJobList();
            });
          }
        }
        this.ui.setScanned(this.scanner.jobs.length);
        this.ui.addLog(`扫描完成，共 ${this.scanner.jobs.length} 个职位`);
        this.ui.renderJobList();
      } catch (e) {
        log('error', '扫描过程发生异常', e);
        this.ui.addLog('扫描失败，请查看控制台日志', 'error');
      } finally {
        this.ui.setScanning(false);
        this.ui.hideScanProgress();
      }

      // 自动模式：无需人工确认即自动投递
      if (!this.config.ui.scanConfirm) {
        if (!this.config.autoDeliver.enable) {
          this.config.autoDeliver.enable = true;
          await this.config.save({ autoDeliver: this.config.autoDeliver });
          this.ui.addLog('已自动开启自动投递');
        }
        this.autoRunning = true;
        this.ui.addLog('自动模式：扫描完成，即将开始投递');
        await this.runAutoLoop();
      } else {
        this.ui.setButtons('idle');
      }
    }

    async startDeliver() {
      if (this.deliver.paused) {
        await this.config.load();
        this.deliver.resume();
        this.ui.setButtons('running');
        this.ui.addLog('继续投递');
        return;
      }
      if (this.scanner.jobs.length === 0) {
        this.ui.addLog('请先扫描职位', 'warn');
        return;
      }
      // 投递前重新加载最新配置（避免用户在 options 修改配置后未刷新页面）
      await this.config.load();
      if (this.deliver.running) {
        log('warn', '检测到投递引擎状态异常(running=true)，强制重置');
        this.deliver.running = false;
      }
      this.ui.setButtons('running');
      this.ui.addLog('开始自动投递/沟通');
      await this.deliver.start(this.scanner.jobs, this.filter, (job, idx) => {
        this.ui.updateJobCard(job);
        if (job.status === 'success') {
          this.ui.addLog(`[${idx + 1}] ✓ ${job.title} - ${job.company}`, 'success');
        } else if (job.status === 'error' || job.status === 'filtered') {
          this.ui.addLog(`[${idx + 1}] ✗ ${job.title} - ${job.filterReason || job.statusText}`, 'warn');
        }
        this.ui.updateStats(this.config.statistics);
      });
      this.ui.setButtons('idle');
      this.ui.addLog('投递流程结束');
    }

    pauseDeliver() {
      this.deliver.pause();
      this.ui.setButtons('paused');
      this.ui.addLog('已暂停');
    }

    stopDeliver() {
      this.autoRunning = false;
      this.deliver.stop();
      this.ui.setButtons('idle');
      this.ui.addLog('已停止');
    }

    async loadMoreJobs() {
      const s = this.config.selectors;
      const selector = s.jobCard || '.job-card-pc';
      let previousCount = $$(selector).length;
      let attempts = 0;
      while (attempts < 3) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        await sleep(2500);
        const currentCount = $$(selector).length;
        if (currentCount > previousCount) {
          return true;
        }
        previousCount = currentCount;
        attempts++;
      }
      return false;
    }

    async runAutoLoop() {
      while (this.autoRunning) {
        // 检查今日上限
        const today = new Date().toISOString().split('T')[0];
        const stats = this.config.statistics;
        const todaySuccess = stats.date === today ? stats.success : 0;
        if (todaySuccess >= this.config.autoDeliver.limit) {
          this.ui.addLog('今日投递已达上限，自动停止');
          this.autoRunning = false;
          break;
        }

        // 投递当前批次中的待投递职位
        const hasWait = this.scanner.jobs.some(j => j.status === 'wait');
        if (hasWait) {
          this.ui.setButtons('running');
          this.ui.addLog('开始自动投递/沟通');
          await this.deliver.start(this.scanner.jobs, this.filter, (job, idx) => {
            this.ui.updateJobCard(job);
            if (job.status === 'success') {
              this.ui.addLog(`[${idx + 1}] ✓ ${job.title} - ${job.company}`, 'success');
            } else if (job.status === 'error' || job.status === 'filtered') {
              this.ui.addLog(`[${idx + 1}] ✗ ${job.title} - ${job.filterReason || job.statusText}`, 'warn');
            }
            this.ui.updateStats(this.config.statistics);
          });
        }

        if (!this.autoRunning) break;

        // 加载下一页
        this.ui.addLog('准备加载下一批职位...');
        const hasMore = await this.loadMoreJobs();
        if (!hasMore) {
          this.ui.addLog('没有更多职位了，自动循环结束');
          this.autoRunning = false;
          break;
        }

        // 扫描新职位
        this.ui.setScanning(true);
        try {
          await this.scanner.scan((current, total, valid) => {
            this.ui.showScanProgress(current, total, valid);
          });
          let newCount = 0;
          for (let i = 0; i < this.scanner.jobs.length; i++) {
            const job = this.scanner.jobs[i];
            if (job.status === 'wait' && job.autoPassed === null) {
              await this.filter.evaluate(job);
              this.ui.updateJobCard(job);
              this.ui.addManualToggle(job, (j) => {
                this.ui.updateJobCard(j);
                this.ui.renderJobList();
              });
              newCount++;
            }
          }
          this.ui.setScanned(this.scanner.jobs.length);
          this.ui.addLog(`本轮新增 ${newCount} 个职位`);
          this.ui.renderJobList();
          if (newCount === 0) {
            this.ui.addLog('无新增职位，继续加载...');
          }
        } catch (e) {
          log('error', '扫描过程发生异常', e);
          this.ui.addLog('扫描失败，自动循环结束', 'error');
          this.autoRunning = false;
        } finally {
          this.ui.setScanning(false);
          this.ui.hideScanProgress();
        }
      }
      this.ui.setButtons('idle');
      this.ui.addLog('自动循环结束');
    }
  }

  // ==================== 从猎聘投递记录同步已沟通 ====================
  async function syncDeliverHistory() {
    log('log', '开始同步猎聘投递记录...');

    // 常见列表项选择器（按优先级尝试）
    const itemSelectors = [
      '.deliver-item',
      '.apply-item',
      '.record-item',
      '.deliver-list > li',
      '.apply-list > li',
      '.job-list > li',
      '[data-selector="deliver-item"]',
      '.list-item'
    ];

    let items = [];
    for (const sel of itemSelectors) {
      const els = $$(sel);
      if (els.length > 0) {
        items = els;
        log('log', `同步投递记录：使用选择器 ${sel} 找到 ${els.length} 条记录`);
        break;
      }
    }

    if (items.length === 0) {
      log('warn', '未在投递记录页面找到可识别的列表项');
      return;
    }

    const records = [];
    for (const item of items) {
      const titleEl = item.querySelector('.job-title, .job-name, .position-name, .title, [data-selector="job-title"], .ellipsis-1');
      const companyEl = item.querySelector('.company-name, .comp-name, .enterprise-name, .company, [data-selector="company-name"]');
      const title = titleEl?.textContent?.trim() || '';
      const company = companyEl?.textContent?.trim() || '';
      if (title && company) {
        records.push({ company, title });
      }
    }

    if (records.length === 0) {
      log('warn', '找到列表项但未能解析出职位和公司信息');
      return;
    }

    // 写入 contacted
    const { config } = await chrome.storage.sync.get('config');
    const contacted = config?.contacted || {};
    let added = 0;
    for (const r of records) {
      const key = `${r.company}|${r.title}`;
      if (!contacted[key]) added++;
      contacted[key] = { date: new Date().toISOString().split('T')[0], title: r.title, company: r.company };
    }
    await chrome.storage.sync.set({ config: { ...config, contacted } });
    log('log', `已从投递记录同步 ${records.length} 条记录（新增 ${added} 条）到已沟通列表`);
  }

  // ==================== SPA 路由监听 ====================
  let appInstance = null;
  function startApp() {
    // 在「我的投递」页面自动同步记录，不注入主面板
    if (/liepin\.(com|cn)\/.*deliver/.test(location.href)) {
      syncDeliverHistory().catch(e => log('warn', '同步投递记录失败', e));
      return;
    }

    if (!appInstance) {
      appInstance = new LiepinHelper();
      appInstance.init().catch(e => log('error', '初始化失败', e));
    } else {
      // SPA 路由切换后，如果面板被页面移除则重新注入
      if (!document.getElementById('liepin-helper-panel')) {
        appInstance.ui.injectPanel().then(() => {
          appInstance.ui.loadPanelState();
          appInstance.ui.bindEvents();
          appInstance.ui.updateStats(appInstance.config.statistics);
          appInstance.ui.setButtons('idle');
          appInstance.ui.addLog('猎聘助手已重新加载（SPA 路由切换）');
        }).catch(e => log('warn', '重新注入面板失败', e));
      }
    }
  }

  function listenSpaNavigation() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      setTimeout(startApp, 500);
    };
    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      setTimeout(startApp, 500);
    };
    window.addEventListener('popstate', () => {
      setTimeout(startApp, 500);
    });
  }

  // ==================== 启动 ====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startApp();
      listenSpaNavigation();
    });
  } else {
    startApp();
    listenSpaNavigation();
  }
})();
