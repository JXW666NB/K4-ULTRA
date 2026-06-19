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
    refreshBtn.innerHTML = '🔄 刷新扩展列表与积木盒';
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

  function showPersonalize() {
    clearBody();
    body.appendChild(backButton());
    body.insertAdjacentHTML('beforeend', sectionTitle('个性化'));

    var cfg = readLoadingConfig();
    var themes = listThemes();

    var current = document.createElement('div');
    current.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    current.innerHTML = '<div style="color:#888;font-size:12px;margin-bottom:6px;">当前主题</div><div style="font-weight:700;color:#ff6b1a;font-size:16px;">' + escapeHtml(cfg.activeTheme || 'ultra') + '</div>';
    body.appendChild(current);

    var themeWrap = document.createElement('div');
    themeWrap.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    themeWrap.innerHTML = '<div style="font-weight:600;margin-bottom:10px;">选择内置主题</div>';

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

    var customWrap = document.createElement('div');
    customWrap.style.cssText = 'background:#fff;border-radius:12px;padding:14px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,0.03);';
    customWrap.innerHTML = '<div style="font-weight:600;margin-bottom:10px;">加载自定义主题</div>';

    var fileBtn = document.createElement('div');
    fileBtn.style.cssText = [
      'padding:12px;text-align:center;border-radius:10px;cursor:pointer;',
      'border:2px dashed #ff8c42;color:#ff6b1a;font-weight:600;'
    ].join('');
    fileBtn.textContent = '📁 选择主题文件（index.html）';
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

    var hint = document.createElement('div');
    hint.style.cssText = 'text-align:center;color:#aaa;font-size:12px;margin-top:4px;';
    hint.textContent = '更多个性化功能待开发';
    body.appendChild(hint);

    if (cfg.activeTheme && !themes.some(function(t) { return t === cfg.activeTheme; })) {
      previewCustomTheme(cfg.activeTheme);
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
