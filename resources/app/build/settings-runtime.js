/**
 * ============================================================
 * K4 Ultra Settings Runtime Bridge
 * ============================================================
 *
 * 职责：读取 k4-settings.json，将用户设置实际应用到 DOM、
 *      CSS 变量、Blockly 编辑器、扩展加载器等运行时组件。
 *
 * 加载时机：index.html 中，在 kitten.js 之前加载（DOM 层）
 *           kitten.js 就绪后通过 __k4bus 应用编辑器层设置。
 *
 * API：
 *   K4Settings.apply()           — 一次性应用所有设置
 *   K4Settings.applyAppearance() — 仅应用外观设置（实时预览）
 *   K4Settings.applyEditor()     — 应用编辑器设置（需 Bridge）
 *   K4Settings.applyExtensions() — 应用扩展配置
 *   K4Settings.applyDebug()      — 应用调试配置
 *   K4Settings.read()            — 读取 k4-settings.json
 * ============================================================
 */

(function () {
  'use strict';

  var APP_DIR = (function () {
    try {
      var s = document.currentScript ? document.currentScript.src : '';
      if (!s) s = 'resources/app/build/settings-runtime.js';
      try { s = decodeURIComponent(s); } catch (e) { }
      s = s.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
      s = s.replace(/\\/g, '/');
      var idx = s.lastIndexOf('/build/');
      return idx > -1 ? s.substring(0, idx) : s.substring(0, s.lastIndexOf('/'));
    } catch (e) { return ''; }
  })();

  var SETTINGS_PATH = APP_DIR ? APP_DIR + '/k4-settings.json' : '';

  function readJSON(path, fallback) {
    try {
      if (typeof require !== 'undefined') {
        var fs = require('fs');
        var p = require('path');
        var full = p.resolve(path);
        if (fs.existsSync(full)) return JSON.parse(fs.readFileSync(full, 'utf8'));
      }
    } catch (e) { }
    return fallback || {};
  }

  function writeJSON(path, data) {
    try {
      if (typeof require !== 'undefined') {
        var fs = require('fs');
        fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
      }
    } catch (e) {
      console.warn('[K4 Settings] write failed:', path, e.message);
    }
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0] + hex[1]+hex[1] + hex[2]+hex[2];
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16)
    };
  }

  function hexToRgbString(hex) {
    var c = hexToRgb(hex);
    return c.r + ',' + c.g + ',' + c.b;
  }

  function rgba(hex, alpha) {
    var c = hexToRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
  }

  var styleEl = null;
  function ensureStyleEl() {
    if (!styleEl) {
      styleEl = document.getElementById('k4-runtime-style');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'k4-runtime-style';
        document.head.appendChild(styleEl);
      }
    }
    return styleEl;
  }

  function injectCSS(css) {
    var el = ensureStyleEl();
    el.textContent = css;
  }

  // Helper: set CSS custom property on both :root and body
  // (body override needed to beat body[data-theme] specificity)
  function setProp(name, value) {
    document.documentElement.style.setProperty(name, value);
    if (document.body) document.body.style.setProperty(name, value);
  }

  function applyAppearance(appearance) {
    var a = appearance || {};

    // ── CSS custom properties (on both :root and body) ──
    if (a.primaryColor) {
      setProp('--k4-primary', a.primaryColor);
      var rgb = hexToRgbString(a.primaryColor);
      setProp('--k4-primary-rgb', rgb);
      setProp('--theme-color-0', rgb);
      setProp('--theme-color-s1-0', rgb);
      setProp('--theme-color-s1-1', rgb);
      var c = hexToRgb(a.primaryColor);
      setProp('--theme-color-n1', Math.max(0,c.r-40)+','+Math.max(0,c.g-40)+','+Math.max(0,c.b-40));
      setProp('--theme-color-n2', Math.max(0,c.r-80)+','+Math.max(0,c.g-80)+','+Math.max(0,c.b-80));
    }
    if (a.secondaryColor) {
      setProp('--k4-secondary', a.secondaryColor);
    }
    if (a.bgColor) {
      setProp('--k4-bg', a.bgColor);
      setProp('--k4-bg-rgb', hexToRgbString(a.bgColor));
    }
    if (a.textColor) {
      setProp('--k4-text', a.textColor);
    }

    // ── Dynamic injected CSS ──
    var css = '';
    var p = a.primaryColor || '#583cdc';
    var pRgb = a.primaryColor ? hexToRgbString(a.primaryColor) : '88,60,220';
    var s = a.secondaryColor || '#00b4ff';
    var bg = a.bgColor || '#050508';

    // Background color
    css += 'body, #root, html { background-color: ' + bg + ' !important; }\n';

    // Background image overlay
    if (a.bgImage) {
      css += '#k4-bg-image-overlay::before { background-image: url("' + a.bgImage + '"); }\n';
      if (a.glassMorphism) {
        css += '#k4-bg-image-overlay::before { filter: blur(' + (a.glassBlur||12) + 'px); opacity:0.3; }\n';
      }
    }

    // Glass morphism
    if (a.glassMorphism) {
      var gBlur = a.glassBlur || 12;
      var gOpacity = a.glassOpacity || 0.15;
      var bgRgb = a.bgColor ? hexToRgbString(a.bgColor) : '5,5,8';
      css += '.k4-scope [class*="modal"], .k4-scope [class*="dialog"], [class*="sidebar"], [class*="panel"] {\n';
      css += '  backdrop-filter: blur(' + gBlur + 'px);\n';
      css += '  -webkit-backdrop-filter: blur(' + gBlur + 'px);\n';
      css += '  background: rgba(' + bgRgb + ', ' + gOpacity + ') !important;\n';
      css += '}\n';
    }

    // Accent glow on loading logo
    if (a.accentGlow && a.primaryColor) {
      css += '.kitten-loader-logo { text-shadow: 0 0 20px ' + rgba(p,0.6) + ', 0 0 60px ' + rgba(p,0.3) + ', 0 0 120px ' + rgba(p,0.15) + ' !important; }\n';
    }

    // FAB button
    css += '.k4-fab { background: ' + p + ' !important; color: #fff !important; box-shadow: 0 4px 20px ' + rgba(p,0.35) + ' !important; }\n';
    css += '.k4-fab:hover { box-shadow: 0 6px 28px ' + rgba(p,0.5) + ' !important; }\n';

    // Focus ring
    css += '*:focus-visible { outline-color: ' + p + ' !important; }\n';

    // Primary/confirm buttons
    css += '.k4-scope [class*="btn"][class*="primary"], .k4-scope [class*="btn"][class*="positive"], .k4-scope button[class*="confirm"] {\n';
    css += '  background: linear-gradient(135deg, ' + p + ', ' + rgba(p,0.7) + ') !important;\n';
    css += '  box-shadow: 0 4px 14px ' + rgba(p,0.3) + ' !important;\n';
    css += '  color: #fff !important;\n';
    css += '}\n';

    // Input focus
    css += '.k4-scope input:focus, .k4-scope textarea:focus, .k4-scope select:focus { border-color: ' + p + ' !important; box-shadow: 0 0 0 3px ' + rgba(p,0.1) + ' !important; }\n';

    // Spinner
    css += '[class*="spinner"], [class*="loading"] { border-top-color: ' + p + ' !important; }\n';

    // Caret
    css += '.k4-scope input, .k4-scope textarea, .k4-scope [contenteditable] { caret-color: ' + p + ' !important; }\n';

    // Toggle/switch checked state
    css += '[class*="toggle"] input:checked + *, [class*="switch"] input:checked + * { background: ' + p + ' !important; }\n';
    css += '.k4-ext-toggle input:checked + .k4-ext-toggle-knob { background: ' + p + ' !important; }\n';

    // Progress bar
    css += '[class*="progress"]::-webkit-progress-value, progress::-webkit-progress-value { background: ' + p + ' !important; }\n';

    injectCSS(css);
    console.log('[K4 Settings] Appearance applied:', { primary: p, secondary: s, bg: bg });
  }

  function applyGeneral(general) {
    var g = general || {};
    var bus = window.__k4bus;
    if (bus && g.autoSave !== undefined) bus.emit('redux-dispatch', { type: 'SETTINGS_UPDATE', payload: { autoSave: g.autoSave } });
    if (bus && g.smoothZoom !== undefined) bus.emit('redux-dispatch', { type: 'SETTINGS_UPDATE', payload: { smoothZoom: g.smoothZoom } });
    if (bus && g.theme) bus.emit('redux-dispatch', { type: 'THEME_CHANGE', payload: { theme: g.theme } });
    if (g.showFps !== undefined) toggleFPS(g.showFps);
    console.log('[K4 Settings] General applied');
  }

  function toggleFPS(show) {
    var existing = document.getElementById('k4-fps-counter');
    if (show) {
      if (existing) { existing.style.display = 'block'; if (!document.body) return; return; }
      var fps = document.createElement('div');
      fps.id = 'k4-fps-counter';
      fps.style.cssText = 'position:fixed;top:4px;right:8px;z-index:99999;background:rgba(0,0,0,0.7);color:#0f0;font:12px monospace;padding:2px 6px;border-radius:3px;pointer-events:none;';
      document.body.appendChild(fps);
      var frames = 0, lastTime = performance.now();
      function tick() {
        frames++;
        var now = performance.now();
        if (now - lastTime >= 1000) { fps.textContent = 'FPS: ' + frames; frames = 0; lastTime = now; }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    } else if (existing) {
      existing.style.display = 'none';
    }
  }

  function applyEditor(editor) {
    var e = editor || {};
    var bus = window.__k4bus;

    if (e.fontSize !== undefined) {
      document.documentElement.style.setProperty('--k4-font-size', e.fontSize + 'px');
      document.documentElement.style.fontSize = e.fontSize + 'px';
    }

    if (bus) {
      var payload = {};
      if (e.fontSize !== undefined) payload.fontSize = e.fontSize;
      if (e.snapToGrid !== undefined) payload.snapToGrid = e.snapToGrid;
      if (e.showCategoryIcons !== undefined) payload.showCategoryIcons = e.showCategoryIcons;
      if (e.compactMode !== undefined) payload.compactMode = e.compactMode;
      if (e.lineNumbers !== undefined) payload.lineNumbers = e.lineNumbers;
      if (e.autoComplete !== undefined) payload.autoComplete = e.autoComplete;
      if (Object.keys(payload).length > 0) bus.emit('redux-dispatch', { type: 'SETTINGS_UPDATE', payload: payload });
    } else {
      window.__k4_deferredEditorSettings = editor;
    }
    console.log('[K4 Settings] Editor settings applied');
  }

  function applyDebug(debug) {
    var d = debug || {};
    window.__k4_debug = window.__k4_debug || {};
    if (d.verboseLogging !== undefined) window.__k4_debug.verbose = d.verboseLogging;
    if (d.perfMonitor !== undefined) window.__k4_debug.perf = d.perfMonitor;
    if (d.showBlockIds !== undefined) {
      var bus = window.__k4bus;
      if (bus) bus.emit('redux-dispatch', { type: 'SETTINGS_UPDATE', payload: { showBlockIds: d.showBlockIds } });
    }
    console.log('[K4 Settings] Debug config applied');
  }

  function applyAll() {
    var settings = readJSON(SETTINGS_PATH, {});
    if (!settings || Object.keys(settings).length === 0) return;
    if (settings.appearance) applyAppearance(settings.appearance);
    if (settings.general) applyGeneral(settings.general);
    if (settings.editor) applyEditor(settings.editor);
    if (settings.debug) applyDebug(settings.debug);
  }

  function waitForBridge(callback) {
    var attempts = 0;
    function check() {
      attempts++;
      if (window.__k4bus && window.__k4bus.emit) { callback(); return; }
      if (attempts < 150) setTimeout(check, 200);
    }
    setTimeout(check, 500);
  }

  window.K4Settings = {
    read: function () { return readJSON(SETTINGS_PATH, {}); },
    write: function (data) { writeJSON(SETTINGS_PATH, data); },
    apply: applyAll,
    applyAppearance: applyAppearance,
    applyGeneral: applyGeneral,
    applyEditor: applyEditor,
    applyDebug: applyDebug
  };

  // Phase 1: apply appearance immediately
  try {
    var settings = readJSON(SETTINGS_PATH, {});
    if (settings.appearance) applyAppearance(settings.appearance);
  } catch (e) {}

  // Phase 2: wait for bridge, then apply editor/general/debug
  waitForBridge(function () {
    console.log('[K4 Settings] Bridge ready, applying deferred settings');
    var s = readJSON(SETTINGS_PATH, {});
    if (s.editor) applyEditor(s.editor);
    if (s.general) applyGeneral(s.general);
    if (s.debug) applyDebug(s.debug);
  });

  console.log('[K4 Settings] Runtime bridge initialized');
})();