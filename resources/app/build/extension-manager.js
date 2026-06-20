// ============================================================
// K4 Ultra Settings Panel - 现代化设置面板
// 入口：右下角悬浮按钮 "K4 Ultra 设置"
// ============================================================
(function() {
  'use strict';

  var FS, PATH;
  try { FS = require('fs'); } catch(e) { FS = null; }
  try { PATH = require('path'); } catch(e) { PATH = null; }

  var APP_DIR = '';
  var EXT_DIR = '';
  var LOADING_DIR = '';
  var LOADING_CONFIG = '';

  try {
    var electron = require('electron');
    APP_DIR = PATH.join(PATH.dirname(electron.remote.app.getPath('exe')), 'resources', 'app');
  } catch(e) {
    APP_DIR = PATH.join(__dirname, '..');
  }
  EXT_DIR = PATH.join(APP_DIR, 'extensions');
  LOADING_DIR = PATH.join(APP_DIR, 'loading-themes');
  LOADING_CONFIG = PATH.join(APP_DIR, 'loading-config.json');

  var disabledPath = PATH.join(EXT_DIR, '.disabled.json');
  var POS_KEY = 'k4ultra_settings_pos';

  function readDisabled() {
    try {
      if (!FS || !FS.existsSync(disabledPath)) return [];
      var list = JSON.parse(FS.readFileSync(disabledPath, 'utf8'));
      return Array.isArray(list) ? list : [];
    } catch(e) { return []; }
  }

  function writeDisabled(list) {
    try {
      if (!FS) return;
      FS.writeFileSync(disabledPath, JSON.stringify(list, null, 2), 'utf8');
    } catch(e) { console.error('[K4UltraSettings] write disabled error:', e.message); }
  }

  function readLoadingConfig() {
    try {
      if (!FS || !FS.existsSync(LOADING_CONFIG)) return { activeTheme: 'ultra', themes: ['ultra'] };
      return JSON.parse(FS.readFileSync(LOADING_CONFIG, 'utf8'));
    } catch(e) { return { activeTheme: 'ultra', themes: ['ultra'] }; }
  }

  function writeLoadingConfig(cfg) {
    try {
      if (!FS) return;
      FS.writeFileSync(LOADING_CONFIG, JSON.stringify(cfg, null, 2), 'utf8');
    } catch(e) { console.error('[K4UltraSettings] write loading config error:', e.message); }
  }

  function listThemes() {
    try {
      if (!FS || !FS.existsSync(LOADING_DIR)) return [];
      return FS.readdirSync(LOADING_DIR).filter(function(f) {
        return FS.statSync(PATH.join(LOADING_DIR, f)).isDirectory();
      });
    } catch(e) { return []; }
  }

  function savePos(left, top) {
    try { localStorage.setItem(POS_KEY, JSON.stringify({left:left,top:top})); } catch(e) {}
  }

  function loadPos() {
    try {
      var s = localStorage.getItem(POS_KEY);
      return s ? JSON.parse(s) : null;
    } catch(e) { return null; }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var panel = null;
  var body = null;

  function createPanel() {
    if (document.getElementById('k4-ultra-settings')) return;

    panel = document.createElement('div');
    panel.id = 'k4-ultra-settings';
    panel.style.cssText = [
      'position:fixed;top:60px;right:20px;width:420px;max-height:80vh;',
      'background:#fff;border-radius:18px;',
      'box-shadow:0 12px 40px rgba(0,0,0,0.22);',
      'font-family:\'Microsoft YaHei\',PingFangSC,sans-serif;font-size:13px;color:#333;',
      'overflow:hidden;z-index:2147483647;display:none;',
      'border:1px solid rgba(0,0,0,0.05);'
    ].join('');

    var header = document.createElement('div');
    header.id = 'k4-ultra-settings-header';
    header.style.cssText = [
      'display:flex;align-items:center;justify-content:space-between;',
      'padding:16px 18px;background:linear-gradient(135deg,#ff8c42 0%,#ff6b1a 100%);',
      'color:#fff;cursor:move;user-select:none;'
    ].join('');
    header.innerHTML = '<div style="display:flex;align-items:center;gap:10px;font-weight:700;font-size:16px;letter-spacing:1px;"><span style="font-size:20px;">⚙️</span>K4 Ultra 设置</div>';

    var controls = document.createElement('div');
    controls.style.cssText = 'display:flex;gap:10px;';

    var closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'cursor:pointer;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:background .2s;font-size:20px;';
    closeBtn.onmouseenter = function() { this.style.background = 'rgba(255,255,255,0.25)'; };
    closeBtn.onmouseleave = function() { this.style.background = 'transparent'; };
    closeBtn.onclick = function() { panel.style.display = 'none'; };

    controls.appendChild(closeBtn);
    header.appendChild(controls);

    body = document.createElement('div');
    body.id = 'k4-ultra-settings-body';
    body.style.cssText = 'padding:18px;max-height:calc(80vh - 60px);overflow-y:auto;background:#f5f6f8;';

    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);

    makeDraggable(panel, header);
    showHome();
  }

  function clearBody() {
    if (!body) return;
    body.innerHTML = '';
  }

  function backButton() {
    var btn = document.createElement('div');
    btn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;color:#ff6b1a;cursor:pointer;font-weight:600;margin-bottom:14px;font-size:14px;';
    btn.innerHTML = '← 返回';
    btn.onclick = showHome;
    return btn;
  }

  function sectionTitle(text) {
    return '<div style="font-size:18px;font-weight:700;color:#222;margin-bottom:14px;">' + escapeHtml(text) + '</div>';
  }

  function card(title, icon, desc, onClick) {
    var el = document.createElement('div');
    el.style.cssText = [
      'background:#fff;border-radius:14px;padding:18px;margin-bottom:14px;',
      'cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.04);',
      'transition:transform .15s,box-shadow .15s;display:flex;align-items:center;gap:14px;'
    ].join('');
    el.innerHTML = [
      '<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#ff8c42 0%,#ff6b1a 100%);',
      'display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0;">' + icon + '</div>',
      '<div style="flex:1;">',
      '<div style="font-weight:700;font-size:15px;color:#222;">' + escapeHtml(title) + '</div>',
      '<div style="font-size:12px;color:#888;margin-top:4px;line-height:1.4;">' + escapeHtml(desc) + '</div>',
      '</div>',
      '<div style="color:#ccc;font-size:18px;">›</div>'
    ].join('');
    el.onmouseenter = function() { this.style.transform = 'translateY(-2px)'; this.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; };
    el.onmouseleave = function() { this.style.transform = 'translateY(0)'; this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; };
    el.onclick = onClick;
    return el;
  }

  function showHome() {
    clearBody();
    body.appendChild(card('插件管理', '🧩', '查看、启用或禁用 Blink 扩展，刷新积木盒', showPlugins));
    body.appendChild(card('个性化', '🎨', '更换启动页加载动画，预览不同主题', showPersonalize));
    body.appendChild(card('关于', 'ℹ️', 'K4 Ultra 版本、开发者和联系方式', showAbout));
  }

  function showPlugins() {
    clearBody();
    body.appendChild(backButton());
    body.insertAdjacentHTML('beforeend', sectionTitle('插件管理'));

    var info = document.createElement('div');
    info.style.cssText = 'color:#888;font-size:12px;margin-bottom:12px;';
    info.textContent = '取消勾选后禁用，刷新后重新加载生效';
    body.appendChild(info);

    var listWrap = document.createElement('div');
    listWrap.id = 'k4ultra-plugin-list';
    body.appendChild(listWrap);

    var refreshBtn = document.createElement('div');
    refreshBtn.style.cssText = [
      'margin-top:14px;padding:12px;text-align:center;border-radius:10px;',
      'background:linear-gradient(135deg,#ff8c42 0%,#ff6b1a 100%);color:#fff;',
      'font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(255,107,26,0.3);'
    ].join('');
    refreshBtn.innerHTML = '刷新扩展列表与积木盒';
    refreshBtn.onclick = function() {
      refreshBtn.textContent = '刷新中...';
      setTimeout(function() {
        renderPluginList();
        if (typeof K4Ext !== 'undefined' && K4Ext.reloadExtensions) {
          K4Ext.reloadExtensions();
        } else {
          location.reload();
        }
      }, 200);
    };
    body.appendChild(refreshBtn);

    renderPluginList();
  }

  function renderPluginList() {
    var wrap = document.getElementById('k4ultra-plugin-list');
    if (!wrap) return;

    var K4 = (typeof window !== 'undefined' && window.__k4) ? window.__k4 : null;
    var exts = (K4 && K4._loadedExtensions) ? K4._loadedExtensions : [];
    var disabled = readDisabled();

    if (exts.length === 0) {
      wrap.innerHTML = '<div style="text-align:center;color:#999;padding:30px 0;background:#fff;border-radius:12px;">暂无已加载的扩展</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < exts.length; i++) {
      var ext = exts[i];
      var isDisabled = disabled.indexOf(ext.id) !== -1;
      html += '<div style="display:flex;align-items:flex-start;gap:10px;padding:12px;border-radius:12px;background:#fff;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,0.03);">';
      html += '<input type="checkbox" data-ext-id="' + escapeHtml(ext.id) + '" ' + (isDisabled ? '' : 'checked') + ' style="margin-top:3px;width:16px;height:16px;accent-color:#ff6b1a;cursor:pointer;">';
      html += '<div style="flex:1;">';
      html += '<div style="font-weight:600;color:#222;">' + escapeHtml(ext.name || ext.id) + ' <span style="color:#999;font-weight:400;font-size:12px;">v' + (ext.version || '?') + '</span></div>';
      if (ext.description) html += '<div style="color:#777;font-size:12px;margin-top:3px;line-height:1.4;">' + escapeHtml(ext.description) + '</div>';
      html += '</div></div>';
    }
    wrap.innerHTML = html;

    var checkboxes = wrap.querySelectorAll('input[type="checkbox"]');
    for (var j = 0; j < checkboxes.length; j++) {
      checkboxes[j].onchange = function() {
        var id = this.getAttribute('data-ext-id');
        var list = readDisabled();
        var idx = list.indexOf(id);
        if (this.checked) {
          if (idx !== -1) list.splice(idx, 1);
        } else {
          if (idx === -1) list.push(id);
        }
        writeDisabled(list);
      };
    }
  }

  // ── 进度条配置读写 ──
  var PROGRESS_CONFIG_KEY = 'k4ultra_progress_config';
  var SKIN_CONFIG_KEY = 'k4ultra_skin_config';
  var PROGRESS_SKIN_KEY = 'k4ultra_progress_skin';

  function readProgressConfig() {
    try {
      var s = localStorage.getItem(PROGRESS_CONFIG_KEY);
      if (s) return JSON.parse(s);
    } catch(e) {}
    return { position: 'center', style: 'default', hidden: false, color: '#00d4ff', shape: 'bar' };
  }

  function writeProgressConfig(cfg) {
    try { localStorage.setItem(PROGRESS_CONFIG_KEY, JSON.stringify(cfg)); } catch(e) {}
    applyProgressConfig(cfg);
  }

  function applyProgressConfig(cfg) {
    var styleId = 'k4ultra-progress-style';
    var existing = document.getElementById(styleId);
    if (existing) existing.remove();

    if (cfg.hidden) {
      var hideStyle = document.createElement('style');
      hideStyle.id = styleId;
      hideStyle.textContent = '#loader, [class*="tc-loader-wrap"] { display: none !important; }';
      document.head.appendChild(hideStyle);
      return;
    }

    var css = '';
    var color = cfg.color || '#00d4ff';

    // 通用：隐藏加载较慢提示和取消按钮，去掉外框
    css += '[class*="loader-negative-tips"], [class*="cancel-wrap"], [class*="loader-btn"] { display: none !important; }';
    css += '[class*="tc-loader-wrap"] { border: none !important; box-shadow: none !important; outline: none !important; }';
    css += '[class*="loader-container"] { border: none !important; box-shadow: none !important; background: transparent !important; }';

    // 位置样式
    if (cfg.position === 'bottom') {
      css += '#loader, [class*="tc-loader-wrap"] { top: auto !important; bottom: 0 !important; height: auto !important; align-items: flex-end !important; }';
      css += '[class*="loader-container"] { flex-direction: column-reverse !important; }';
      css += '[class*="loader-placeholder"] { display: none !important; }';
    } else if (cfg.position === 'top-bar') {
      css += '#loader, [class*="tc-loader-wrap"] { top: 0 !important; bottom: auto !important; height: 6px !important; min-height: 6px !important; background: transparent !important; align-items: flex-start !important; }';
      css += '[class*="loader-container"] { height: 100% !important; padding: 0 !important; margin: 0 !important; }';
      css += '[class*="loader-placeholder"], [class*="hint-area"], [class*="progress-text"] { display: none !important; }';
      css += '[class*="progress-bar-area"] { width: 100% !important; height: 6px !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; position: absolute !important; top: 0 !important; left: 0 !important; }';
      css += '[class*="progress-bar"] { height: 6px !important; border-radius: 0 !important; }';
      css += '[class*="progress-btns-inbox"] { height: 6px !important; border-radius: 0 !important; transition: width 0.3s ease !important; }';
    } else if (cfg.position === 'bottom-bar') {
      css += '#loader, [class*="tc-loader-wrap"] { top: auto !important; bottom: 0 !important; height: 6px !important; min-height: 6px !important; background: transparent !important; align-items: flex-end !important; }';
      css += '[class*="loader-container"] { height: 100% !important; padding: 0 !important; margin: 0 !important; }';
      css += '[class*="loader-placeholder"], [class*="hint-area"], [class*="progress-text"] { display: none !important; }';
      css += '[class*="progress-bar-area"] { width: 100% !important; height: 6px !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; position: absolute !important; bottom: 0 !important; left: 0 !important; }';
      css += '[class*="progress-bar"] { height: 6px !important; border-radius: 0 !important; }';
      css += '[class*="progress-btns-inbox"] { height: 6px !important; border-radius: 0 !important; transition: width 0.3s ease !important; }';
    }

    // 图形轮廓
    if (cfg.shape === 'rounded') {
      css += '[class*="progress-bar-area"] { border-radius: 20px !important; overflow: hidden !important; }';
      css += '[class*="progress-bar"] { border-radius: 20px !important; }';
      css += '[class*="progress-btns-inbox"] { border-radius: 20px !important; }';
    } else if (cfg.shape === 'pill') {
      css += '[class*="progress-bar-area"] { border-radius: 50px !important; height: 20px !important; overflow: hidden !important; }';
      css += '[class*="progress-bar"] { border-radius: 50px !important; }';
      css += '[class*="progress-btns-inbox"] { border-radius: 50px !important; }';
    } else if (cfg.shape === 'square') {
      css += '[class*="progress-bar-area"] { border-radius: 0 !important; }';
      css += '[class*="progress-bar"] { border-radius: 0 !important; }';
      css += '[class*="progress-btns-inbox"] { border-radius: 0 !important; }';
    } else if (cfg.shape === 'diamond') {
      css += '[class*="progress-bar-area"] { border-radius: 4px !important; transform: skewX(-10deg) !important; overflow: hidden !important; }';
      css += '[class*="progress-btns-inbox"] { transform: skewX(10deg) !important; }';
    }

    // 风格变体
    if (cfg.style === 'neon') {
      css += '[class*="progress-btns-inbox"] { background: ' + color + ' !important; box-shadow: 0 0 8px ' + color + ', 0 0 16px ' + color + ', 0 0 32px ' + color + '80 !important; }';
      css += '[class*="progress-bar"] { background: rgba(255,255,255,0.08) !important; box-shadow: inset 0 1px 3px rgba(0,0,0,0.3) !important; }';
      css += '[class*="tc-loader-wrap"] { background: rgba(0,0,0,0.6) !important; }';
    } else if (cfg.style === 'gradient') {
      css += '[class*="progress-btns-inbox"] { background: linear-gradient(90deg, ' + color + ', #ff6b1a, ' + color + ') !important; background-size: 200% 100% !important; animation: k4-gradient-shift 2s linear infinite !important; }';
      css += '@keyframes k4-gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }';
      css += '[class*="progress-bar"] { background: rgba(0,0,0,0.1) !important; }';
    } else if (cfg.style === 'glass') {
      css += '[class*="tc-loader-wrap"] { background: rgba(255,255,255,0.1) !important; backdrop-filter: blur(20px) saturate(180%) !important; -webkit-backdrop-filter: blur(20px) saturate(180%) !important; }';
      css += '[class*="progress-btns-inbox"] { background: linear-gradient(135deg, ' + color + 'cc, ' + color + '88) !important; }';
      css += '[class*="progress-bar"] { background: rgba(255,255,255,0.15) !important; }';
      css += '[class*="loader-container"] { background: transparent !important; border-radius: 16px !important; padding: 20px 30px !important; }';
    } else if (cfg.style === 'pulse') {
      css += '[class*="progress-btns-inbox"] { background: ' + color + ' !important; animation: k4-pulse 1.5s ease-in-out infinite !important; }';
      css += '@keyframes k4-pulse { 0%,100%{opacity:1;box-shadow:0 0 0 0 ' + color + '80} 50%{opacity:0.85;box-shadow:0 0 0 10px ' + color + '00} }';
    } else if (cfg.style === 'striped') {
      css += '[class*="progress-btns-inbox"] { background: repeating-linear-gradient(45deg, ' + color + ', ' + color + ' 10px, ' + color + '88 10px, ' + color + '88 20px) !important; background-size: 28px 28px !important; animation: k4-stripes 0.8s linear infinite !important; }';
      css += '@keyframes k4-stripes { 0%{background-position:0 0} 100%{background-position:28px 0} }';
      css += '[class*="progress-bar"] { background: rgba(0,0,0,0.1) !important; }';
    } else if (cfg.style === 'fire') {
      css += '[class*="progress-btns-inbox"] { background: linear-gradient(90deg, #ff4500, #ff6b1a, #ffd700) !important; box-shadow: 0 0 10px #ff450080, 0 -2px 8px #ffd70060 !important; }';
      css += '[class*="progress-bar"] { background: rgba(0,0,0,0.15) !important; }';
    } else if (cfg.style === 'ocean') {
      css += '[class*="progress-btns-inbox"] { background: linear-gradient(90deg, #0077b6, #00b4d8, #90e0ef) !important; }';
      css += '[class*="progress-bar"] { background: linear-gradient(180deg, #caf0f8, #ade8f4) !important; }';
    } else {
      // default
      css += '[class*="progress-btns-inbox"] { background: ' + color + ' !important; }';
    }

    // 自定义颜色覆盖（除了特殊风格）
    if (cfg.color && !['neon','fire','ocean'].includes(cfg.style)) {
      // 颜色已在各风格中处理
    }

    // 加载自定义进度条皮肤
    var progressSkin = readProgressSkin();
    if (progressSkin) {
      css += '\n' + progressSkin;
    }

    if (css) {
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  // ── 进度条皮肤读写 ──
  function readProgressSkin() {
    try { return localStorage.getItem(PROGRESS_SKIN_KEY) || ''; } catch(e) { return ''; }
  }

  function writeProgressSkin(css) {
    try { localStorage.setItem(PROGRESS_SKIN_KEY, css); } catch(e) {}
  }

  // ── 皮肤包配置读写 ──
  function readSkinConfig() {
    try {
      var s = localStorage.getItem(SKIN_CONFIG_KEY);
      if (s) return JSON.parse(s);
    } catch(e) {}
    return { activeSkin: null, customCSS: '' };
  }

  function writeSkinConfig(cfg) {
    try { localStorage.setItem(SKIN_CONFIG_KEY, JSON.stringify(cfg)); } catch(e) {}
    applySkinConfig(cfg);
  }

  function applySkinConfig(cfg) {
    var styleId = 'k4ultra-skin-style';
    var existing = document.getElementById(styleId);
    if (existing) existing.remove();

    var css = '';

    // 主自定义CSS
    if (cfg.customCSS) css += cfg.customCSS + '\n';

    // 积木编辑区背景
    if (cfg.blocklyBg) css += cfg.blocklyBg + '\n';

    // 积木编辑区背景图片
    if (cfg.blocklyBgImg) {
      css += '.blocklyMainBackground { fill: url(#blocklyBgPattern) !important; }\n';
      // 需要创建SVG pattern
      setTimeout(function() {
        var svg = document.querySelector('.blocklySvg');
        if (svg) {
          var defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'defs'), svg.firstChild);
          var existingPattern = document.getElementById('blocklyBgPattern');
          if (existingPattern) existingPattern.remove();
          var pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
          pattern.setAttribute('id', 'blocklyBgPattern');
          pattern.setAttribute('patternUnits', 'userSpaceOnUse');
          pattern.setAttribute('width', '100%');
          pattern.setAttribute('height', '100%');
          var image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', cfg.blocklyBgImg);
          image.setAttribute('width', '100%');
          image.setAttribute('height', '100%');
          image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
          pattern.appendChild(image);
          defs.appendChild(pattern);
        }
      }, 1000);
    }

    // 工具栏样式
    if (cfg.toolbar) css += cfg.toolbar + '\n';

    // 对话框样式
    if (cfg.dialog) css += cfg.dialog + '\n';

    // 按钮样式
    if (cfg.buttons) css += cfg.buttons + '\n';

    // 字体样式
    if (cfg.fonts) css += cfg.fonts + '\n';

    if (css) {
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  function showPersonalize() {
    clearBody();
    body.appendChild(backButton());
    body.insertAdjacentHTML('beforeend', sectionTitle('个性化'));

    var cfg = readLoadingConfig();
    var themes = listThemes();
    var progressCfg = readProgressConfig();
    var skinCfg = readSkinConfig();

    // ── 启动页主题 ──
    var current = document.createElement('div');
    current.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    current.innerHTML = '<div style="color:#888;font-size:12px;margin-bottom:6px;">当前启动页主题</div><div style="font-weight:700;color:#ff6b1a;font-size:16px;">' + escapeHtml(cfg.activeTheme || 'ultra') + '</div>';
    body.appendChild(current);

    var themeWrap = document.createElement('div');
    themeWrap.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    themeWrap.innerHTML = '<div style="font-weight:600;margin-bottom:10px;">选择启动页主题</div>';

    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:10px;';
    for (var i = 0; i < themes.length; i++) {
      (function(themeName) {
        var btn = document.createElement('div');
        btn.style.cssText = [
          'padding:12px;text-align:center;border-radius:10px;cursor:pointer;',
          'border:2px solid ' + (cfg.activeTheme === themeName ? '#ff6b1a' : '#eee') + ';',
          'background:' + (cfg.activeTheme === themeName ? '#fff5f0' : '#fafafa') + ';',
          'color:' + (cfg.activeTheme === themeName ? '#ff6b1a' : '#555') + ';font-weight:600;'
        ].join('');
        btn.textContent = themeName;
        btn.onclick = function() {
          cfg.activeTheme = themeName;
          if (cfg.themes.indexOf(themeName) === -1) cfg.themes.push(themeName);
          writeLoadingConfig(cfg);
          showPersonalize();
        };
        grid.appendChild(btn);
      })(themes[i]);
    }
    themeWrap.appendChild(grid);
    body.appendChild(themeWrap);

    // ── 加载自定义启动页主题 ──
    var customWrap = document.createElement('div');
    customWrap.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    customWrap.innerHTML = '<div style="font-weight:600;margin-bottom:10px;">加载自定义启动页</div>';

    var fileBtn = document.createElement('div');
    fileBtn.style.cssText = [
      'padding:12px;text-align:center;border-radius:10px;cursor:pointer;',
      'border:2px dashed #ff8c42;color:#ff6b1a;font-weight:600;'
    ].join('');
    fileBtn.textContent = '选择主题文件（index.html）';
    fileBtn.onclick = function() {
      try {
        var electron = require('electron');
        var remote = electron.remote || require('@electron/remote');
        var files = remote.dialog.showOpenDialogSync(remote.getCurrentWindow(), {
          properties: ['openFile'],
          filters: [{ name: 'HTML Theme', extensions: ['html', 'htm'] }]
        });
        if (files && files[0]) installCustomTheme(files[0]);
      } catch(err) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html,.htm';
        input.onchange = function() {
          if (input.files && input.files[0]) installCustomTheme(input.files[0].path);
        };
        input.click();
      }
    };
    customWrap.appendChild(fileBtn);

    var previewWrap = document.createElement('div');
    previewWrap.id = 'k4ultra-theme-preview';
    previewWrap.style.cssText = 'margin-top:12px;border-radius:10px;overflow:hidden;border:1px solid #eee;background:#fff;display:none;';
    customWrap.appendChild(previewWrap);
    body.appendChild(customWrap);

    if (cfg.activeTheme && !themes.some(function(t) { return t === cfg.activeTheme; })) {
      previewCustomTheme(cfg.activeTheme);
    }

    // ── 进度条自定义 ──
    var progressSection = document.createElement('div');
    progressSection.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    progressSection.innerHTML = '<div style="font-weight:600;margin-bottom:12px;">进度条样式</div>';
    body.appendChild(progressSection);

    // 隐藏进度条开关
    var hideRow = document.createElement('div');
    hideRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:8px;background:#f8f8f8;border-radius:8px;';
    hideRow.innerHTML = '<span style="font-size:13px;color:#555;">隐藏进度条</span>';
    var hideToggle = document.createElement('input');
    hideToggle.type = 'checkbox';
    hideToggle.checked = progressCfg.hidden;
    hideToggle.style.cssText = 'width:18px;height:18px;accent-color:#ff6b1a;cursor:pointer;';
    hideToggle.onchange = function() {
      progressCfg.hidden = this.checked;
      writeProgressConfig(progressCfg);
      showPersonalize();
    };
    hideRow.appendChild(hideToggle);
    progressSection.appendChild(hideRow);

    if (!progressCfg.hidden) {
      // 位置选择
      var posLabel = document.createElement('div');
      posLabel.style.cssText = 'font-size:13px;color:#666;margin-bottom:8px;font-weight:500;';
      posLabel.textContent = '位置';
      progressSection.appendChild(posLabel);

      var posOptions = [
        { value: 'center', label: '居中' },
        { value: 'bottom', label: '底部' },
        { value: 'top-bar', label: '顶部细条' },
        { value: 'bottom-bar', label: '底部细条' }
      ];
      var posGrid = document.createElement('div');
      posGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;';
      for (var pi = 0; pi < posOptions.length; pi++) {
        (function(opt) {
          var btn = document.createElement('div');
          btn.style.cssText = [
            'padding:8px 4px;text-align:center;border-radius:8px;cursor:pointer;font-size:11px;',
            'border:2px solid ' + (progressCfg.position === opt.value ? '#ff6b1a' : '#eee') + ';',
            'background:' + (progressCfg.position === opt.value ? '#fff5f0' : '#fafafa') + ';',
            'color:' + (progressCfg.position === opt.value ? '#ff6b1a' : '#666') + ';font-weight:500;'
          ].join('');
          btn.textContent = opt.label;
          btn.onclick = function() {
            progressCfg.position = opt.value;
            writeProgressConfig(progressCfg);
            showPersonalize();
          };
          posGrid.appendChild(btn);
        })(posOptions[pi]);
      }
      progressSection.appendChild(posGrid);

      // 风格选择
      var styleLabel = document.createElement('div');
      styleLabel.style.cssText = 'font-size:13px;color:#666;margin-bottom:8px;font-weight:500;';
      styleLabel.textContent = '风格';
      progressSection.appendChild(styleLabel);

      var styleOptions = [
        { value: 'default', label: '默认' },
        { value: 'neon', label: '霓虹' },
        { value: 'gradient', label: '渐变' },
        { value: 'glass', label: '毛玻璃' },
        { value: 'pulse', label: '脉冲' },
        { value: 'striped', label: '条纹' },
        { value: 'fire', label: '火焰' },
        { value: 'ocean', label: '海洋' }
      ];
      var styleGrid = document.createElement('div');
      styleGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;';
      for (var si = 0; si < styleOptions.length; si++) {
        (function(opt) {
          var btn = document.createElement('div');
          btn.style.cssText = [
            'padding:8px 4px;text-align:center;border-radius:8px;cursor:pointer;font-size:11px;',
            'border:2px solid ' + (progressCfg.style === opt.value ? '#ff6b1a' : '#eee') + ';',
            'background:' + (progressCfg.style === opt.value ? '#fff5f0' : '#fafafa') + ';',
            'color:' + (progressCfg.style === opt.value ? '#ff6b1a' : '#666') + ';font-weight:500;'
          ].join('');
          btn.textContent = opt.label;
          btn.onclick = function() {
            progressCfg.style = opt.value;
            writeProgressConfig(progressCfg);
            showPersonalize();
          };
          styleGrid.appendChild(btn);
        })(styleOptions[si]);
      }
      progressSection.appendChild(styleGrid);

      // 图形轮廓
      var shapeLabel = document.createElement('div');
      shapeLabel.style.cssText = 'font-size:13px;color:#666;margin-bottom:8px;font-weight:500;';
      shapeLabel.textContent = '形状';
      progressSection.appendChild(shapeLabel);

      var shapeOptions = [
        { value: 'bar', label: '长条' },
        { value: 'rounded', label: '圆角' },
        { value: 'pill', label: '胶囊' },
        { value: 'square', label: '方形' },
        { value: 'diamond', label: '菱形' }
      ];
      var shapeGrid = document.createElement('div');
      shapeGrid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:12px;';
      for (var shi = 0; shi < shapeOptions.length; shi++) {
        (function(opt) {
          var btn = document.createElement('div');
          btn.style.cssText = [
            'padding:6px 4px;text-align:center;border-radius:6px;cursor:pointer;font-size:11px;',
            'border:2px solid ' + (progressCfg.shape === opt.value ? '#ff6b1a' : '#eee') + ';',
            'background:' + (progressCfg.shape === opt.value ? '#fff5f0' : '#fafafa') + ';',
            'color:' + (progressCfg.shape === opt.value ? '#ff6b1a' : '#666') + ';font-weight:500;'
          ].join('');
          btn.textContent = opt.label;
          btn.onclick = function() {
            progressCfg.shape = opt.value;
            writeProgressConfig(progressCfg);
            showPersonalize();
          };
          shapeGrid.appendChild(btn);
        })(shapeOptions[shi]);
      }
      progressSection.appendChild(shapeGrid);

      // 颜色选择
      var colorLabel = document.createElement('div');
      colorLabel.style.cssText = 'font-size:13px;color:#666;margin-bottom:8px;font-weight:500;';
      colorLabel.textContent = '颜色';
      progressSection.appendChild(colorLabel);

      var colorRow = document.createElement('div');
      colorRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;';
      var colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = progressCfg.color || '#00d4ff';
      colorInput.style.cssText = 'width:40px;height:32px;border:none;cursor:pointer;border-radius:6px;';
      colorInput.onchange = function() {
        progressCfg.color = this.value;
        writeProgressConfig(progressCfg);
      };
      var colorText = document.createElement('span');
      colorText.style.cssText = 'font-size:12px;color:#888;font-family:monospace;';
      colorText.textContent = progressCfg.color || '#00d4ff';
      colorInput.oninput = function() { colorText.textContent = this.value; };
      colorRow.appendChild(colorInput);
      colorRow.appendChild(colorText);

      var presetColors = ['#00d4ff', '#ff6b1a', '#00ff88', '#ff4488', '#aa66ff', '#ffcc00', '#ff4500', '#1e90ff'];
      var presetRow = document.createElement('div');
      presetRow.style.cssText = 'display:flex;gap:6px;';
      for (var ci = 0; ci < presetColors.length; ci++) {
        (function(c) {
          var dot = document.createElement('div');
          dot.style.cssText = 'width:24px;height:24px;border-radius:50%;cursor:pointer;border:2px solid ' + (progressCfg.color === c ? '#333' : '#ddd') + ';background:' + c + ';transition:transform 0.15s;';
          dot.onmouseenter = function() { this.style.transform = 'scale(1.2)'; };
          dot.onmouseleave = function() { this.style.transform = 'scale(1)'; };
          dot.onclick = function() {
            progressCfg.color = c;
            colorInput.value = c;
            colorText.textContent = c;
            writeProgressConfig(progressCfg);
            showPersonalize();
          };
          presetRow.appendChild(dot);
        })(presetColors[ci]);
      }
      colorRow.appendChild(presetRow);
      progressSection.appendChild(colorRow);

      // 进度条皮肤导入
      var skinImportLabel = document.createElement('div');
      skinImportLabel.style.cssText = 'font-size:13px;color:#666;margin-bottom:8px;font-weight:500;';
      skinImportLabel.textContent = '自定义进度条皮肤';
      progressSection.appendChild(skinImportLabel);

      var progressSkinBtn = document.createElement('div');
      progressSkinBtn.style.cssText = 'padding:10px;text-align:center;border-radius:8px;cursor:pointer;border:2px dashed #00d4ff;color:#00d4ff;font-weight:600;font-size:12px;margin-bottom:8px;';
      progressSkinBtn.textContent = '导入进度条CSS皮肤';
      progressSkinBtn.onclick = function() {
        try {
          var electron = require('electron');
          var remote = electron.remote || require('@electron/remote');
          var files = remote.dialog.showOpenDialogSync(remote.getCurrentWindow(), {
            properties: ['openFile'],
            filters: [{ name: 'CSS', extensions: ['css'] }]
          });
          if (files && files[0]) {
            var css = FS.readFileSync(files[0], 'utf8');
            writeProgressSkin(css);
            writeProgressConfig(progressCfg);
            showPersonalize();
          }
        } catch(err) {
          var input = document.createElement('input');
          input.type = 'file';
          input.accept = '.css';
          input.onchange = function() {
            if (input.files && input.files[0]) {
              var reader = new FileReader();
              reader.onload = function(e) {
                writeProgressSkin(e.target.result);
                writeProgressConfig(progressCfg);
                showPersonalize();
              };
              reader.readAsText(input.files[0]);
            }
          };
          input.click();
        }
      };
      progressSection.appendChild(progressSkinBtn);

      var currentProgressSkin = readProgressSkin();
      if (currentProgressSkin) {
        var removeSkinBtn = document.createElement('div');
        removeSkinBtn.style.cssText = 'text-align:center;font-size:11px;color:#e74c3c;cursor:pointer;';
        removeSkinBtn.textContent = '移除自定义进度条皮肤';
        removeSkinBtn.onclick = function() {
          writeProgressSkin('');
          writeProgressConfig(progressCfg);
          showPersonalize();
        };
        progressSection.appendChild(removeSkinBtn);
      }
    }

    // ── 编辑器UI皮肤 ──
    var skinSection = document.createElement('div');
    skinSection.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    skinSection.innerHTML = '<div style="font-weight:600;margin-bottom:10px;">编辑器皮肤包</div>';
    body.appendChild(skinSection);

    // 内置编辑器主题
    var editorThemeLabel = document.createElement('div');
    editorThemeLabel.style.cssText = 'font-size:13px;color:#666;margin-bottom:8px;';
    editorThemeLabel.textContent = '编辑器主题色';
    skinSection.appendChild(editorThemeLabel);

    var editorThemes = [
      { id: 'theme/orange', name: '橙色（默认）', color: '#ff7829' },
      { id: 'theme/blue', name: '蓝色', color: '#297eff' },
      { id: 'theme/green', name: '绿色', color: '#1eb86c' },
      { id: 'theme/violet', name: '紫色', color: '#9429ff' },
      { id: 'theme/pink', name: '粉色', color: '#ff2970' },
      { id: 'theme/yellow', name: '黄色', color: '#ffdb29' }
    ];
    var currentTheme = document.body.getAttribute('data-theme') || '';
    try {
      if (!currentTheme) {
        var saved = localStorage.getItem(EDITOR_THEME_KEY) || localStorage.getItem('kitten_theme_id');
        if (saved) currentTheme = saved;
      }
    } catch(e) {}

    var themeRow = document.createElement('div');
    themeRow.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;';
    for (var ti = 0; ti < editorThemes.length; ti++) {
      (function(et) {
        var dot = document.createElement('div');
        dot.style.cssText = [
          'width:36px;height:36px;border-radius:50%;cursor:pointer;',
          'border:3px solid ' + (currentTheme === et.id ? '#333' : '#eee') + ';',
          'background:' + et.color + ';transition:transform 0.15s;',
          'position:relative;'
        ].join('');
        dot.title = et.name;
        dot.onmouseenter = function() { this.style.transform = 'scale(1.15)'; };
        dot.onmouseleave = function() { this.style.transform = 'scale(1)'; };
        dot.onclick = function() {
          applyEditorTheme(et.id);
        };
        themeRow.appendChild(dot);
      })(editorThemes[ti]);
    }
    skinSection.appendChild(themeRow);

    // 自定义CSS导入
    var cssLabel = document.createElement('div');
    cssLabel.style.cssText = 'font-size:13px;color:#666;margin-bottom:8px;';
    cssLabel.textContent = '自定义CSS皮肤';
    skinSection.appendChild(cssLabel);

    var cssImportBtn = document.createElement('div');
    cssImportBtn.style.cssText = [
      'padding:10px;text-align:center;border-radius:8px;cursor:pointer;margin-bottom:10px;',
      'border:2px dashed #ff8c42;color:#ff6b1a;font-weight:600;font-size:13px;'
    ].join('');
    cssImportBtn.textContent = '导入CSS皮肤文件';
    cssImportBtn.onclick = function() {
      try {
        var electron = require('electron');
        var remote = electron.remote || require('@electron/remote');
        var files = remote.dialog.showOpenDialogSync(remote.getCurrentWindow(), {
          properties: ['openFile'],
          filters: [{ name: 'CSS Skin', extensions: ['css'] }]
        });
        if (files && files[0]) importCSSSkin(files[0]);
      } catch(err) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.css';
        input.onchange = function() {
          if (input.files && input.files[0]) importCSSSkin(input.files[0].path);
        };
        input.click();
      }
    };
    skinSection.appendChild(cssImportBtn);

    // 皮肤包导入（ZIP）
    var skinImportBtn = document.createElement('div');
    skinImportBtn.style.cssText = [
      'padding:10px;text-align:center;border-radius:8px;cursor:pointer;margin-bottom:10px;',
      'border:2px dashed #9B59B6;color:#9B59B6;font-weight:600;font-size:13px;'
    ].join('');
    skinImportBtn.textContent = '导入皮肤包（.k4skin ZIP）';
    skinImportBtn.onclick = function() {
      try {
        var electron = require('electron');
        var remote = electron.remote || require('@electron/remote');
        var files = remote.dialog.showOpenDialogSync(remote.getCurrentWindow(), {
          properties: ['openFile'],
          filters: [{ name: 'K4 Skin Pack', extensions: ['k4skin', 'zip'] }]
        });
        if (files && files[0]) importSkinPack(files[0]);
      } catch(err) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.k4skin,.zip';
        input.onchange = function() {
          if (input.files && input.files[0]) importSkinPack(input.files[0].path);
        };
        input.click();
      }
    };
    skinSection.appendChild(skinImportBtn);

    // 当前皮肤状态
    if (skinCfg.customCSS) {
      var skinStatus = document.createElement('div');
      skinStatus.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px;background:#f0fff0;border-radius:8px;margin-bottom:8px;';
      skinStatus.innerHTML = '<span style="font-size:12px;color:#27ae60;">✓ 已加载自定义皮肤</span>';
      var removeBtn = document.createElement('span');
      removeBtn.textContent = '移除';
      removeBtn.style.cssText = 'font-size:12px;color:#e74c3c;cursor:pointer;text-decoration:underline;';
      removeBtn.onclick = function() {
        writeSkinConfig({ activeSkin: null, customCSS: '' });
        showPersonalize();
      };
      skinStatus.appendChild(removeBtn);
      skinSection.appendChild(skinStatus);
    }

    // 快速皮肤预设
    var presetLabel = document.createElement('div');
    presetLabel.style.cssText = 'font-size:13px;color:#666;margin:12px 0 8px;font-weight:500;';
    presetLabel.textContent = '快速皮肤预设';
    skinSection.appendChild(presetLabel);

    var presets = [
      {
        name: '深色编辑器',
        desc: '编辑器界面变暗，不包括舞台',
        css: [
          'body, .kitten-editor, [class*="editor-"], [class*="workspace"] { background: #1e1e2e !important; }',
          '[class*="tc-loader-wrap"], [class*="loader-container"] { background: rgba(30,30,46,0.95) !important; }',
          '[class*="sidebar"], [class*="panel"], [class*="menu"] { background: #252536 !important; color: #cdd6f4 !important; }',
          '[class*="th1-bg-7"], [class*="th1-bg-8"], [class*="th1-bg-9"] { background: #313244 !important; }',
          '[class*="th1-bg-6"] { background: #45475a !important; }',
          '[class*="th1-text-t"], [class*="th1-text-t7"] { color: #cdd6f4 !important; }',
          '.blocklyMainBackground { fill: #1e1e2e !important; }',
          '.blocklyToolboxDiv, .blocklyFlyout { background: #252536 !important; }',
          '.blocklyTreeRow:hover, .blocklyTreeSelected { background: #45475a !important; }',
          '[class*="category-menu"] { background: #252536 !important; }',
          '[class*="category-menu"] * { color: #cdd6f4 !important; }',
          '#stage-wrapper, #stage, .stage-wrapper, [class*="stage"] { background: inherit !important; }'
        ].join('\n')
      },
      {
        name: '护眼模式',
        desc: '柔和绿色调，减少眼疲劳',
        css: [
          'body { background: #f0f7f0 !important; }',
          '[class*="th1-bg-7"] { background: #e8f5e9 !important; }',
          '[class*="th1-bg-8"] { background: #f1f8f2 !important; }',
          '[class*="th1-bg-9"] { background: #f8fcf8 !important; }',
          '[class*="th1-bg-6"] { background: #dcedc8 !important; }',
          '.blocklyMainBackground { fill: #f0f7f0 !important; }',
          '[class*="workspace"] { background: #f0f7f0 !important; }',
          '[class*="sidebar"], [class*="panel"] { background: #f5faf5 !important; }',
          '[class*="category-menu"] { background: #e8f5e9 !important; }'
        ].join('\n')
      },
      {
        name: '赛博朋克',
        desc: '霓虹风格，炫酷暗色调',
        css: [
          'body { background: #0a0a1a !important; }',
          '[class*="th1-bg-7"], [class*="th1-bg-8"], [class*="th1-bg-9"] { background: #1a1a2e !important; }',
          '[class*="th1-bg-6"] { background: #16213e !important; }',
          '[class*="th1-bg-n1"] { background: #e94560 !important; }',
          '[class*="th1-text-0"] { color: #0ff0fc !important; }',
          '[class*="th1-border-0"] { border-color: #0ff0fc !important; }',
          '.blocklyMainBackground { fill: #0a0a1a !important; }',
          '.blocklyToolboxDiv { background: #1a1a2e !important; }',
          '[class*="sidebar"], [class*="panel"] { background: #1a1a2e !important; color: #e0e0ff !important; }',
          '[class*="category-menu"] { background: #1a1a2e !important; }',
          '[class*="category-menu"] * { color: #e0e0ff !important; }',
          'button, [class*="btn"] { box-shadow: 0 0 8px #0ff0fc40 !important; }'
        ].join('\n')
      },
      {
        name: '粉色少女',
        desc: '柔和粉色系主题',
        css: [
          'body { background: #fff0f5 !important; }',
          '[class*="th1-bg-7"] { background: #ffe4ec !important; }',
          '[class*="th1-bg-8"] { background: #fff0f5 !important; }',
          '[class*="th1-bg-9"] { background: #fff8fa !important; }',
          '[class*="th1-bg-6"] { background: #ffd6e0 !important; }',
          '[class*="th1-bg-n1"] { background: #ff69b4 !important; }',
          '[class*="th1-text-0"] { color: #ff69b4 !important; }',
          '.blocklyMainBackground { fill: #fff0f5 !important; }',
          '[class*="sidebar"], [class*="panel"] { background: #fff5f8 !important; }',
          '[class*="category-menu"] { background: #ffe4ec !important; }',
          '[class*="category-menu"] * { color: #d63384 !important; }'
        ].join('\n')
      },
      {
        name: '暗紫星空',
        desc: '深紫色调星空主题',
        css: [
          'body { background: #1a0a2e !important; }',
          '[class*="th1-bg-7"] { background: #2d1b4e !important; }',
          '[class*="th1-bg-8"] { background: #3d2b5e !important; }',
          '[class*="th1-bg-9"] { background: #4d3b6e !important; }',
          '[class*="th1-bg-6"] { background: #5d4b7e !important; }',
          '[class*="th1-bg-n1"] { background: #9b59b6 !important; }',
          '[class*="th1-text-0"] { color: #bb86fc !important; }',
          '.blocklyMainBackground { fill: #1a0a2e !important; }',
          '.blocklyToolboxDiv { background: #2d1b4e !important; }',
          '[class*="sidebar"], [class*="panel"] { background: #2d1b4e !important; color: #e0d0ff !important; }',
          '[class*="category-menu"] { background: #2d1b4e !important; }',
          '[class*="category-menu"] * { color: #e0d0ff !important; }'
        ].join('\n')
      },
      {
        name: '极简白',
        desc: '纯白极简风格',
        css: [
          'body { background: #ffffff !important; }',
          '[class*="th1-bg-7"] { background: #f8f9fa !important; }',
          '[class*="th1-bg-8"] { background: #f1f3f5 !important; }',
          '[class*="th1-bg-9"] { background: #ffffff !important; }',
          '[class*="th1-bg-6"] { background: #e9ecef !important; }',
          '[class*="th1-bg-0"] { background: #212529 !important; }',
          '[class*="th1-bg-n1"] { background: #343a40 !important; }',
          '.blocklyMainBackground { fill: #ffffff !important; }',
          '[class*="sidebar"], [class*="panel"] { background: #ffffff !important; border: 1px solid #dee2e6 !important; }'
        ].join('\n')
      }
    ];
    var presetGrid = document.createElement('div');
    presetGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;';
    for (var pri = 0; pri < presets.length; pri++) {
      (function(preset) {
        var btn = document.createElement('div');
        btn.style.cssText = 'padding:10px 8px;text-align:center;border-radius:10px;cursor:pointer;font-size:12px;background:#f8f8f8;border:1px solid #eee;color:#555;font-weight:500;';
        btn.innerHTML = '<div>' + preset.name + '</div><div style="font-size:10px;color:#999;margin-top:2px;">' + preset.desc + '</div>';
        btn.onmouseenter = function() { this.style.borderColor = '#ff6b1a'; this.style.background = '#fff5f0'; };
        btn.onmouseleave = function() { this.style.borderColor = '#eee'; this.style.background = '#f8f8f8'; };
        btn.onclick = function() {
          writeSkinConfig({ activeSkin: preset.name, customCSS: preset.css });
          showPersonalize();
        };
        presetGrid.appendChild(btn);
      })(presets[pri]);
    }
    skinSection.appendChild(presetGrid);

    // ── 积木编辑区背景 ──
    var blocklySection = document.createElement('div');
    blocklySection.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    blocklySection.innerHTML = '<div style="font-weight:600;margin-bottom:10px;">积木编辑区背景</div>';
    body.appendChild(blocklySection);

    var blocklyPresets = [
      { name: '默认', css: '.blocklyMainBackground{fill:#f0f0f0!important}', desc: '标准灰色背景' },
      { name: '纯白', css: '.blocklyMainBackground{fill:#ffffff!important}', desc: '纯白色背景' },
      { name: '深灰', css: '.blocklyMainBackground{fill:#2d2d2d!important}.blocklyToolboxDiv{background:#252525!important}', desc: '深色主题背景' },
      { name: '护眼绿', css: '.blocklyMainBackground{fill:#e8f5e9!important}', desc: '柔和绿色背景' },
      { name: '淡蓝', css: '.blocklyMainBackground{fill:#e3f2fd!important}', desc: '柔和蓝色背景' },
      { name: '网格点', css: '.blocklyMainBackground{fill:url(#blocklyGridPattern)!important}', desc: '点状网格背景' }
    ];
    var blocklyGrid = document.createElement('div');
    blocklyGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px;';
    for (var bi = 0; bi < blocklyPresets.length; bi++) {
      (function(preset) {
        var btn = document.createElement('div');
        btn.style.cssText = 'padding:8px;text-align:center;border-radius:8px;cursor:pointer;font-size:11px;background:#f8f8f8;border:1px solid #eee;color:#555;';
        btn.innerHTML = '<div style="font-weight:500;">' + preset.name + '</div>';
        btn.onclick = function() {
          var cfg = readSkinConfig();
          cfg.blocklyBg = preset.css;
          writeSkinConfig(cfg);
          showPersonalize();
        };
        blocklyGrid.appendChild(btn);
      })(blocklyPresets[bi]);
    }
    blocklySection.appendChild(blocklyGrid);

    // 自定义积木区背景图片
    var blocklyImgBtn = document.createElement('div');
    blocklyImgBtn.style.cssText = 'padding:10px;text-align:center;border-radius:8px;cursor:pointer;border:2px dashed #ff6b1a;color:#ff6b1a;font-weight:600;font-size:12px;margin-bottom:8px;';
    blocklyImgBtn.textContent = '导入背景图片（PNG/JPG）';
    blocklyImgBtn.onclick = function() {
      try {
        var electron = require('electron');
        var remote = electron.remote || require('@electron/remote');
        var files = remote.dialog.showOpenDialogSync(remote.getCurrentWindow(), {
          properties: ['openFile'],
          filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
        });
        if (files && files[0]) importBlocklyBackground(files[0]);
      } catch(err) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.png,.jpg,.jpeg,.gif,.webp';
        input.onchange = function() {
          if (input.files && input.files[0]) {
            var reader = new FileReader();
            reader.onload = function(e) {
              var cfg = readSkinConfig();
              cfg.blocklyBgImg = e.target.result;
              writeSkinConfig(cfg);
              showPersonalize();
            };
            reader.readAsDataURL(input.files[0]);
          }
        };
        input.click();
      }
    };
    blocklySection.appendChild(blocklyImgBtn);

    // 积木区背景颜色选择
    var blocklyColorRow = document.createElement('div');
    blocklyColorRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
    blocklyColorRow.innerHTML = '<span style="font-size:12px;color:#666;">自定义颜色：</span>';
    var blocklyColorInput = document.createElement('input');
    blocklyColorInput.type = 'color';
    blocklyColorInput.value = '#f0f0f0';
    blocklyColorInput.style.cssText = 'width:36px;height:28px;border:none;cursor:pointer;border-radius:4px;';
    blocklyColorInput.onchange = function() {
      var cfg = readSkinConfig();
      cfg.blocklyBg = '.blocklyMainBackground{fill:' + this.value + '!important}';
      writeSkinConfig(cfg);
      showPersonalize();
    };
    blocklyColorRow.appendChild(blocklyColorInput);
    blocklySection.appendChild(blocklyColorRow);

    // ── 工具栏样式 ──
    var toolbarSection = document.createElement('div');
    toolbarSection.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    toolbarSection.innerHTML = '<div style="font-weight:600;margin-bottom:10px;">工具栏样式</div>';
    body.appendChild(toolbarSection);

    var toolbarPresets = [
      { name: '默认', css: '', desc: '标准工具栏' },
      { name: '透明', css: '[class*="toolbar"],[class*="header"]{background:rgba(255,255,255,0.8)!important;backdrop-filter:blur(10px)!important}', desc: '毛玻璃效果' },
      { name: '暗色', css: '[class*="toolbar"],[class*="header"]{background:#1e1e2e!important;color:#cdd6f4!important}', desc: '深色工具栏' },
      { name: '紧凑', css: '[class*="toolbar"],[class*="header"]{height:40px!important;min-height:40px!important;padding:4px 8px!important}', desc: '更紧凑的工具栏' }
    ];
    var toolbarGrid = document.createElement('div');
    toolbarGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;';
    for (var ti = 0; ti < toolbarPresets.length; ti++) {
      (function(preset) {
        var btn = document.createElement('div');
        btn.style.cssText = 'padding:8px 4px;text-align:center;border-radius:8px;cursor:pointer;font-size:11px;background:#f8f8f8;border:1px solid #eee;color:#555;';
        btn.textContent = preset.name;
        btn.onclick = function() {
          var cfg = readSkinConfig();
          cfg.toolbar = preset.css;
          writeSkinConfig(cfg);
          showPersonalize();
        };
        toolbarGrid.appendChild(btn);
      })(toolbarPresets[ti]);
    }
    toolbarSection.appendChild(toolbarGrid);

    // 导入工具栏CSS
    var toolbarImportBtn = document.createElement('div');
    toolbarImportBtn.style.cssText = 'padding:8px;text-align:center;border-radius:8px;cursor:pointer;border:2px dashed #999;color:#666;font-weight:500;font-size:11px;margin-top:8px;';
    toolbarImportBtn.textContent = '导入自定义工具栏CSS';
    toolbarImportBtn.onclick = function() { importCSSFor('toolbar'); };
    toolbarSection.appendChild(toolbarImportBtn);

    // ── 对话框外观 ──
    var dialogSection = document.createElement('div');
    dialogSection.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    dialogSection.innerHTML = '<div style="font-weight:600;margin-bottom:10px;">对话框外观</div>';
    body.appendChild(dialogSection);

    var dialogPresets = [
      { name: '默认', css: '', desc: '标准对话框' },
      { name: '圆角', css: '.CUI-dialog-content,[class*="dialog"]{border-radius:16px!important;overflow:hidden!important}', desc: '更大圆角' },
      { name: '暗色', css: '.CUI-dialog-content,[class*="dialog-content"]{background:#1e1e2e!important;color:#cdd6f4!important}.CUI-dialog-mask{background:rgba(0,0,0,0.7)!important}', desc: '深色对话框' },
      { name: '毛玻璃', css: '.CUI-dialog-content,[class*="dialog-content"]{background:rgba(255,255,255,0.9)!important;backdrop-filter:blur(20px)!important}.CUI-dialog-mask{background:rgba(0,0,0,0.3)!important;backdrop-filter:blur(5px)!important}', desc: '毛玻璃效果' }
    ];
    var dialogGrid = document.createElement('div');
    dialogGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;';
    for (var di = 0; di < dialogPresets.length; di++) {
      (function(preset) {
        var btn = document.createElement('div');
        btn.style.cssText = 'padding:8px 4px;text-align:center;border-radius:8px;cursor:pointer;font-size:11px;background:#f8f8f8;border:1px solid #eee;color:#555;';
        btn.textContent = preset.name;
        btn.onclick = function() {
          var cfg = readSkinConfig();
          cfg.dialog = preset.css;
          writeSkinConfig(cfg);
          showPersonalize();
        };
        dialogGrid.appendChild(btn);
      })(dialogPresets[di]);
    }
    dialogSection.appendChild(dialogGrid);

    // 导入对话框CSS
    var dialogImportBtn = document.createElement('div');
    dialogImportBtn.style.cssText = 'padding:8px;text-align:center;border-radius:8px;cursor:pointer;border:2px dashed #999;color:#666;font-weight:500;font-size:11px;margin-top:8px;';
    dialogImportBtn.textContent = '导入自定义对话框CSS';
    dialogImportBtn.onclick = function() { importCSSFor('dialog'); };
    dialogSection.appendChild(dialogImportBtn);

    // ── 按钮样式 ──
    var btnSection = document.createElement('div');
    btnSection.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    btnSection.innerHTML = '<div style="font-weight:600;margin-bottom:10px;">按钮样式</div>';
    body.appendChild(btnSection);

    var btnPresets = [
      { name: '默认', css: '', desc: '标准按钮' },
      { name: '圆角', css: 'button,[class*="btn"]{border-radius:20px!important}', desc: '圆角按钮' },
      { name: '方形', css: 'button,[class*="btn"]{border-radius:4px!important}', desc: '方形按钮' },
      { name: '渐变', css: '.btn--1id4R.positive--3el2D,button[class*="positive"]{background:linear-gradient(135deg,#ff6b1a,#ff8c42)!important}', desc: '渐变确认按钮' }
    ];
    var btnGrid = document.createElement('div');
    btnGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;';
    for (var bmi = 0; bmi < btnPresets.length; bmi++) {
      (function(preset) {
        var btn = document.createElement('div');
        btn.style.cssText = 'padding:8px 4px;text-align:center;border-radius:8px;cursor:pointer;font-size:11px;background:#f8f8f8;border:1px solid #eee;color:#555;';
        btn.textContent = preset.name;
        btn.onclick = function() {
          var cfg = readSkinConfig();
          cfg.buttons = preset.css;
          writeSkinConfig(cfg);
          showPersonalize();
        };
        btnGrid.appendChild(btn);
      })(btnPresets[bmi]);
    }
    btnSection.appendChild(btnGrid);

    // 导入按钮CSS
    var btnImportBtn = document.createElement('div');
    btnImportBtn.style.cssText = 'padding:8px;text-align:center;border-radius:8px;cursor:pointer;border:2px dashed #999;color:#666;font-weight:500;font-size:11px;margin-top:8px;';
    btnImportBtn.textContent = '导入自定义按钮CSS';
    btnImportBtn.onclick = function() { importCSSFor('buttons'); };
    btnSection.appendChild(btnImportBtn);

    // ── 字体样式 ──
    var fontSection = document.createElement('div');
    fontSection.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    fontSection.innerHTML = '<div style="font-weight:600;margin-bottom:10px;">字体样式</div>';
    body.appendChild(fontSection);

    var fontPresets = [
      { name: '默认', css: '', desc: '系统默认字体' },
      { name: '等宽', css: '*{font-family:"Cascadia Code","Fira Code","Consolas",monospace!important}', desc: '等宽字体' },
      { name: '圆体', css: '*{font-family:"HarmonyOS Sans SC","PingFang SC","Microsoft YaHei",sans-serif!important}', desc: '圆润字体' },
      { name: '宋体', css: '*{font-family:"SimSun","Songti SC",serif!important}', desc: '衬线字体' },
      { name: '楷体', css: '*{font-family:"KaiTi","STKaiti",serif!important}', desc: '楷书字体' }
    ];
    var fontGrid = document.createElement('div');
    fontGrid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:6px;';
    for (var fi = 0; fi < fontPresets.length; fi++) {
      (function(preset) {
        var btn = document.createElement('div');
        btn.style.cssText = 'padding:8px 4px;text-align:center;border-radius:8px;cursor:pointer;font-size:11px;background:#f8f8f8;border:1px solid #eee;color:#555;';
        btn.textContent = preset.name;
        btn.onclick = function() {
          var cfg = readSkinConfig();
          cfg.fonts = preset.css;
          writeSkinConfig(cfg);
          showPersonalize();
        };
        fontGrid.appendChild(btn);
      })(fontPresets[fi]);
    }
    fontSection.appendChild(fontGrid);

    // 导入字体CSS
    var fontImportBtn = document.createElement('div');
    fontImportBtn.style.cssText = 'padding:8px;text-align:center;border-radius:8px;cursor:pointer;border:2px dashed #999;color:#666;font-weight:500;font-size:11px;margin-top:8px;';
    fontImportBtn.textContent = '导入自定义字体CSS';
    fontImportBtn.onclick = function() { importCSSFor('fonts'); };
    fontSection.appendChild(fontImportBtn);

    // ── 舞台尺寸自定义 ──
    var stageSection = document.createElement('div');
    stageSection.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    stageSection.innerHTML = '<div style="font-weight:600;margin-bottom:10px;">舞台尺寸</div>';
    body.appendChild(stageSection);

    var stagePresets = [
      { name: '480×360', w: 480, h: 360, desc: '经典4:3' },
      { name: '640×480', w: 640, h: 480, desc: '标准4:3' },
      { name: '960×720', w: 960, h: 720, desc: '高清4:3' },
      { name: '1280×720', w: 1280, h: 720, desc: '720P 16:9' },
      { name: '1920×1080', w: 1920, h: 1080, desc: '1080P 16:9' },
      { name: '1024×2048', w: 1024, h: 2048, desc: '竖版大舞台' },
      { name: '620×900', w: 620, h: 900, desc: '默认竖版' }
    ];
    var stageGrid = document.createElement('div');
    stageGrid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;';
    for (var sti = 0; sti < stagePresets.length; sti++) {
      (function(preset) {
        var btn = document.createElement('div');
        btn.style.cssText = 'padding:8px 4px;text-align:center;border-radius:8px;cursor:pointer;font-size:11px;background:#f8f8f8;border:1px solid #eee;color:#555;';
        btn.innerHTML = '<div style="font-weight:500;">' + preset.name + '</div><div style="font-size:9px;color:#999;">' + preset.desc + '</div>';
        btn.onclick = function() {
          setStageSize(preset.w, preset.h);
        };
        stageGrid.appendChild(btn);
      })(stagePresets[sti]);
    }
    stageSection.appendChild(stageGrid);

    // 自定义舞台尺寸
    var customStageRow = document.createElement('div');
    customStageRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
    var stageWInput = document.createElement('input');
    stageWInput.type = 'number';
    stageWInput.placeholder = '宽';
    stageWInput.value = '480';
    stageWInput.style.cssText = 'width:70px;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:12px;';
    var stageXLabel = document.createElement('span');
    stageXLabel.textContent = '×';
    stageXLabel.style.cssText = 'color:#999;';
    var stageHInput = document.createElement('input');
    stageHInput.type = 'number';
    stageHInput.placeholder = '高';
    stageHInput.value = '360';
    stageHInput.style.cssText = 'width:70px;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:12px;';
    var stageApplyBtn = document.createElement('div');
    stageApplyBtn.textContent = '应用';
    stageApplyBtn.style.cssText = 'padding:6px 16px;background:#ff6b1a;color:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;';
    stageApplyBtn.onclick = function() {
      var w = parseInt(stageWInput.value) || 480;
      var h = parseInt(stageHInput.value) || 360;
      setStageSize(w, h);
    };
    customStageRow.appendChild(stageWInput);
    customStageRow.appendChild(stageXLabel);
    customStageRow.appendChild(stageHInput);
    customStageRow.appendChild(stageApplyBtn);
    stageSection.appendChild(customStageRow);
  }

  // ── 编辑器主题切换辅助 ──
  var EDITOR_THEME_KEY = 'k4ultra_editor_theme';

  function getEditorTheme(themeId) {
    var themes = {
      'theme/orange': { name: '橙色', colors: {'theme-color-0':'255,179,131','theme-color-1':'255,194,157','theme-color-2':'255,209,183','theme-color-3':'255,224,209','theme-color-5':'255,242,236','theme-color-6':'255,245,241','theme-color-7':'255,248,245','theme-color-8':'255,250,248','theme-color-9':'255,252,251','theme-color-10':'255,255,255','theme-color-n1':'230,100,44','theme-color-n2':'204,85,26','theme-color-t':'58,40,27','theme-color-t1':'223,192,157','theme-color-t7':'128,91,56'} },
      'theme/blue': { name: '蓝色', colors: {'theme-color-0':'131,179,255','theme-color-1':'157,194,255','theme-color-2':'183,209,255','theme-color-3':'209,224,255','theme-color-5':'236,242,255','theme-color-6':'241,245,255','theme-color-7':'245,248,255','theme-color-8':'248,250,255','theme-color-9':'251,252,255','theme-color-10':'255,255,255','theme-color-n1':'44,100,230','theme-color-n2':'26,85,204','theme-color-t':'27,40,58','theme-color-t1':'157,192,223','theme-color-t7':'56,91,128'} },
      'theme/green': { name: '绿色', colors: {'theme-color-0':'144,238,144','theme-color-1':'163,243,163','theme-color-2':'182,247,182','theme-color-3':'201,251,201','theme-color-5':'230,255,230','theme-color-6':'238,255,238','theme-color-7':'243,255,243','theme-color-8':'247,255,247','theme-color-9':'251,255,251','theme-color-10':'255,255,255','theme-color-n1':'34,139,34','theme-color-n2':'0,128,0','theme-color-t':'0,50,0','theme-color-t1':'144,200,144','theme-color-t7':'0,100,0'} },
      'theme/purple': { name: '紫色', colors: {'theme-color-0':'200,162,255','theme-color-1':'210,180,255','theme-color-2':'220,198,255','theme-color-3':'230,216,255','theme-color-5':'242,236,255','theme-color-6':'245,241,255','theme-color-7':'248,245,255','theme-color-8':'250,248,255','theme-color-9':'252,251,255','theme-color-10':'255,255,255','theme-color-n1':'128,0,255','theme-color-n2':'100,0,200','theme-color-t':'40,0,80','theme-color-t1':'200,180,220','theme-color-t7':'80,0,160'} },
      'theme/red': { name: '红色', colors: {'theme-color-0':'255,160,160','theme-color-1':'255,175,175','theme-color-2':'255,190,190','theme-color-3':'255,210,210','theme-color-5':'255,235,235','theme-color-6':'255,240,240','theme-color-7':'255,243,243','theme-color-8':'255,247,247','theme-color-9':'255,250,250','theme-color-10':'255,255,255','theme-color-n1':'220,20,20','theme-color-n2':'180,0,0','theme-color-t':'80,0,0','theme-color-t1':'220,180,180','theme-color-t7':'150,0,0'} },
      'theme/yellow': { name: '黄色', colors: {'theme-color-0':'255,240,150','theme-color-1':'255,243,170','theme-color-2':'255,246,190','theme-color-3':'255,249,210','theme-color-5':'255,252,235','theme-color-6':'255,253,240','theme-color-7':'255,253,243','theme-color-8':'255,254,247','theme-color-9':'255,254,250','theme-color-10':'255,255,255','theme-color-n1':'220,180,0','theme-color-n2':'180,140,0','theme-color-t':'80,60,0','theme-color-t1':'220,210,150','theme-color-t7':'140,110,0'} }
    };
    return themes[themeId] || null;
  }

  function applyEditorTheme(themeId) {
    // 设置 data-theme 属性，让 CSS 自动应用主题色
    document.body.setAttribute('data-theme', themeId);

    // 同时尝试调用编辑器内置的主题切换
    try {
      if (window.__k4 && window.__k4.dispatch) {
        window.__k4.dispatch({ type: 'kitten/common/set_theme', payload: themeId });
      }
    } catch(e) {}

    try { localStorage.setItem(EDITOR_THEME_KEY, themeId); } catch(e) {}
    try { localStorage.setItem('kitten_theme_id', themeId); } catch(e) {}
  }

  function loadSavedEditorTheme() {
    try {
      var saved = localStorage.getItem(EDITOR_THEME_KEY) || localStorage.getItem('kitten_theme_id');
      if (saved) {
        // 延迟应用，确保DOM已加载
        setTimeout(function() {
          document.body.setAttribute('data-theme', saved);
        }, 500);
      }
    } catch(e) {}
  }

  function importCSSSkin(filePath) {
    try {
      if (!FS) return;
      var css = FS.readFileSync(filePath, 'utf8');
      writeSkinConfig({ activeSkin: PATH.basename(filePath), customCSS: css });
      showPersonalize();
    } catch(err) {
      alert('导入CSS皮肤失败：' + err.message);
    }
  }

  function importCSSFor(configKey) {
    try {
      var electron = require('electron');
      var remote = electron.remote || require('@electron/remote');
      var files = remote.dialog.showOpenDialogSync(remote.getCurrentWindow(), {
        properties: ['openFile'],
        filters: [{ name: 'CSS', extensions: ['css'] }]
      });
      if (files && files[0]) {
        var css = FS.readFileSync(files[0], 'utf8');
        var cfg = readSkinConfig();
        cfg[configKey] = css;
        writeSkinConfig(cfg);
        showPersonalize();
      }
    } catch(err) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.css';
      input.onchange = function() {
        if (input.files && input.files[0]) {
          var reader = new FileReader();
          reader.onload = function(e) {
            var cfg = readSkinConfig();
            cfg[configKey] = e.target.result;
            writeSkinConfig(cfg);
            showPersonalize();
          };
          reader.readAsText(input.files[0]);
        }
      };
      input.click();
    }
  }

  function importBlocklyBackground(filePath) {
    try {
      if (!FS) return;
      var data = FS.readFileSync(filePath);
      var ext = PATH.extname(filePath).toLowerCase();
      var mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      var base64 = 'data:' + mime + ';base64,' + data.toString('base64');
      var cfg = readSkinConfig();
      cfg.blocklyBgImg = base64;
      writeSkinConfig(cfg);
      showPersonalize();
    } catch(err) {
      alert('导入背景图片失败：' + err.message);
    }
  }

  function setStageSize(width, height) {
    try {
      // 保存到配置
      var cfg = readSkinConfig();
      cfg.stageWidth = width;
      cfg.stageHeight = height;
      writeSkinConfig(cfg);

      // 方法1：直接修改 canvas 尺寸
      var canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
      }

      // 方法2：尝试通过 Redux dispatch
      try {
        if (window.__k4 && window.__k4.dispatch) {
          window.__k4.dispatch({
            type: 'kitten/common/set_stage_proportion_state',
            payload: { width: width, height: height }
          });
        }
      } catch(e) {}

      // 方法3：尝试查找编辑器实例并调用 resize
      try {
        var stageContainer = document.querySelector('[class*="stage"]') || document.querySelector('#stage');
        if (stageContainer) {
          stageContainer.style.width = width + 'px';
          stageContainer.style.height = height + 'px';
        }
      } catch(e) {}

      // 方法4：注入样式强制修改舞台容器
      var styleId = 'k4ultra-stage-size';
      var existing = document.getElementById(styleId);
      if (existing) existing.remove();
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = [
        'canvas, [class*="stage-canvas"], [class*="renderer"] {',
        '  width: ' + width + 'px !important;',
        '  height: ' + height + 'px !important;',
        '}',
        '[class*="stage-wrapper"], [class*="theatre"], [class*="content_stage"] {',
        '  min-width: ' + width + 'px !important;',
        '  min-height: ' + height + 'px !important;',
        '}'
      ].join('\n');
      document.head.appendChild(style);

      alert('舞台尺寸已设置为 ' + width + '×' + height + '。\n请在编辑器中切换一下舞台比例（如从横版切到竖版再切回来）以完全生效。');
    } catch(err) {
      console.error('[K4UltraSettings] setStageSize error:', err);
      alert('设置舞台尺寸失败：' + err.message);
    }
  }

  function importSkinPack(filePath) {
    try {
      var ADM_ZIP = require('adm-zip');
      var zip = new ADM_ZIP(filePath);
      var entries = zip.getEntries();
      var files = {};

      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry.isDirectory) {
          files[entry.entryName] = entry.getData().toString('utf8');
        }
      }

      // 皮肤包必须包含 skin.json
      if (!files['skin.json']) {
        alert('无效的皮肤包：缺少 skin.json');
        return;
      }

      var manifest = JSON.parse(files['skin.json']);
      var combinedCSS = '';

      // 读取所有CSS文件
      for (var fname in files) {
        if (fname.endsWith('.css')) {
          combinedCSS += '/* ' + fname + ' */\n' + files[fname] + '\n';
        }
      }

      if (combinedCSS) {
        writeSkinConfig({ activeSkin: manifest.name || 'custom', customCSS: combinedCSS });
      }

      alert('皮肤包 "' + (manifest.name || 'custom') + '" 导入成功！');
      showPersonalize();
    } catch(err) {
      alert('导入皮肤包失败：' + err.message);
    }
  }

  function installCustomTheme(filePath) {
    try {
      if (!FS) return;
      var themeName = 'custom_' + Date.now();
      var themeDir = PATH.join(LOADING_DIR, themeName);
      if (!FS.existsSync(themeDir)) FS.mkdirSync(themeDir, { recursive: true });
      FS.copyFileSync(filePath, PATH.join(themeDir, 'index.html'));

      var cfg = readLoadingConfig();
      cfg.activeTheme = themeName;
      if (cfg.themes.indexOf(themeName) === -1) cfg.themes.push(themeName);
      writeLoadingConfig(cfg);

      previewCustomTheme(themeName);
      showPersonalize();
    } catch(err) {
      alert('安装自定义主题失败：' + err.message);
    }
  }

  function previewCustomTheme(themeName) {
    var wrap = document.getElementById('k4ultra-theme-preview');
    if (!wrap) return;
    try {
      var themePath = PATH.join(LOADING_DIR, themeName, 'index.html');
      if (!FS.existsSync(themePath)) { wrap.style.display = 'none'; return; }
      var html = FS.readFileSync(themePath, 'utf8');
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, 'text/html');
      var bodyHtml = '';
      var children = doc.body.childNodes;
      for (var i = 0; i < children.length; i++) {
        var n = children[i];
        if (n.nodeType === 1) bodyHtml += n.outerHTML;
        else if (n.nodeType === 3) bodyHtml += n.textContent;
      }
      wrap.style.display = 'block';
      wrap.innerHTML = '<div style="padding:8px;background:#f0f0f0;color:#666;font-size:12px;">预览：' + escapeHtml(themeName) + '</div>' +
        '<div style="height:180px;position:relative;overflow:hidden;">' + bodyHtml + '</div>';
    } catch(err) {
      wrap.style.display = 'none';
    }
  }

  function showAbout() {
    clearBody();
    body.appendChild(backButton());
    body.insertAdjacentHTML('beforeend', sectionTitle('关于'));

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:14px;padding:24px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04);';
    box.innerHTML = [
      '<div style="font-size:42px;font-weight:900;background:linear-gradient(135deg,#ff8c42 0%,#ff6b1a 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;">K4 ULTRA</div>',
      '<div style="font-size:14px;color:#888;margin-bottom:20px;">版本 V0.2</div>',
      '<div style="text-align:left;color:#555;font-size:13px;line-height:1.8;">',
      '<div><b>开发者：</b>JXW 和 K4ULTRA 群的各位还有作者的 AI 宝可梦们！</div>',
      '<div><b>联系我们：</b></div>',
      '<div style="padding-left:14px;">作者 QQ：2123300961</div>',
      '<div style="padding-left:14px;">K4ULTRA 交流群：967426331</div>',
      '</div>'
    ].join('');
    body.appendChild(box);
  }

  function createToolbarButton() {
    if (document.getElementById('k4-ultra-settings-btn')) return;

    var btn = document.createElement('div');
    btn.id = 'k4-ultra-settings-btn';
    btn.style.cssText = [
      'position:fixed;bottom:20px;right:20px;z-index:2147483647;',
      'display:flex;align-items:center;gap:6px;padding:10px 16px;',
      'background:linear-gradient(135deg,#ff8c42 0%,#ff6b1a 100%);',
      'color:#fff;border-radius:24px;cursor:pointer;font-size:13px;',
      'font-weight:700;box-shadow:0 4px 16px rgba(255,107,26,0.4);',
      'transition:transform .15s,box-shadow .15s;'
    ].join('');
    btn.innerHTML = '<span style="font-size:16px;">⚙️</span><span>K4 Ultra 设置</span>';
    btn.onmouseenter = function() { this.style.transform = 'translateY(-2px)'; this.style.boxShadow = '0 6px 20px rgba(255,107,26,0.5)'; };
    btn.onmouseleave = function() { this.style.transform = 'translateY(0)'; this.style.boxShadow = '0 4px 16px rgba(255,107,26,0.4)'; };
    btn.onclick = function() {
      createPanel();
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      if (panel.style.display === 'block') showHome();
    };

    document.body.appendChild(btn);

    var pos = loadPos();
    if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
      btn.style.left = pos.left + 'px';
      btn.style.top = pos.top + 'px';
      btn.style.bottom = 'auto';
      btn.style.right = 'auto';
    }

    makeDraggable(btn, btn);
  }

  function makeDraggable(el, handle) {
    if (!handle) return;
    var isDragging = false;
    var hasMoved = false;
    var startX = 0, startY = 0;
    var initialLeft = 0, initialTop = 0;

    handle.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      hasMoved = false;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      var rect = el.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      el.style.transition = 'none';
    });

    function onMouseMove(e) {
      if (!isDragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasMoved = true;
      var nx = initialLeft + dx;
      var ny = initialTop + dy;
      var vw = window.innerWidth, vh = window.innerHeight;
      nx = Math.max(0, Math.min(vw - el.offsetWidth, nx));
      ny = Math.max(0, Math.min(vh - el.offsetHeight, ny));
      el.style.left = nx + 'px';
      el.style.top = ny + 'px';
      el.style.bottom = 'auto';
      el.style.right = 'auto';
    }

    function onMouseUp() {
      if (!isDragging) return;
      isDragging = false;
      el.style.transition = '';
      if (hasMoved) {
        var rect = el.getBoundingClientRect();
        savePos(rect.left, rect.top);
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    el.addEventListener('click', function(e) {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        hasMoved = false;
      }
    }, true);
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // 启动时自动应用保存的配置
    try {
      var progressCfg = readProgressConfig();
      if (progressCfg) applyProgressConfig(progressCfg);
    } catch(e) {}
    try {
      var skinCfg = readSkinConfig();
      if (skinCfg) applySkinConfig(skinCfg);
    } catch(e) {}
    try {
      loadSavedEditorTheme();
    } catch(e) {}

    var tries = 0;
    function waitForMainUI() {
      if (document.getElementById('root') && document.getElementById('root').children.length > 0) {
        createToolbarButton();
        return;
      }
      if (++tries < 30) setTimeout(waitForMainUI, 300);
      else createToolbarButton();
    }
    waitForMainUI();
  }

  if (typeof window !== 'undefined') {
    init();
  }
})();
