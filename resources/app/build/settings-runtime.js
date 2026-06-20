/**
 * K4 Ultra Settings Runtime Bridge
 * Reads k4-settings.json and applies to DOM/CSS in real-time.
 * v2: Removed dead Redux bridge, all settings now persist via localStorage.editor_settings.
 */
(function () {
  'use strict';
  var APP_DIR = (function () {
    try { var s = document.currentScript ? document.currentScript.src : 'resources/app/build/settings-runtime.js'; try { s = decodeURIComponent(s); } catch (e) {} s = s.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '').replace(/\\/g, '/'); var idx = s.lastIndexOf('/build/'); return idx > -1 ? s.substring(0, idx) : s.substring(0, s.lastIndexOf('/')); } catch (e) { return ''; }
  })();
  var SETTINGS_PATH = APP_DIR ? APP_DIR + '/k4-settings.json' : '';

  function readJSON(path, fallback) { try { if (typeof require !== 'undefined') { var fs = require('fs'); var p = require('path'); var full = p.resolve(path); if (fs.existsSync(full)) return JSON.parse(fs.readFileSync(full, 'utf8')); } } catch (e) {} return fallback || {}; }
  function writeJSON(path, data) { try { if (typeof require !== 'undefined') { var fs = require('fs'); fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8'); } } catch (e) { console.warn('[K4 Settings] write failed:', path, e.message); } }

  function hexToRgb(hex) { hex = hex.replace('#', ''); if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2]; return { r: parseInt(hex.substring(0,2),16), g: parseInt(hex.substring(2,4),16), b: parseInt(hex.substring(4,6),16) }; }
  function hexToRgbString(hex) { var c = hexToRgb(hex); return c.r+','+c.g+','+c.b; }
  function rgba(hex, alpha) { var c = hexToRgb(hex); return 'rgba('+c.r+','+c.g+','+c.b+','+alpha+')'; }

  function ensureStyleEl(id) {
    var el = document.getElementById(id);
    if (!el) { el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
    return el;
  }

  // ═══ HSL helpers ════════════════════════════════════
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  function hslToRgbString(h, s, l) {
    s /= 100; l /= 100;
    var a = s * Math.min(l, 1 - l);
    var f = function(n) {
      var k = (n + h / 30) % 12;
      return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    };
    return Math.round(f(0) * 255) + ',' + Math.round(f(8) * 255) + ',' + Math.round(f(4) * 255);
  }

  // ═══ Full palette generation (47 CSS vars) ══════════════════
  function generateFullPaletteCSS(primaryHex, isDark) {
    var pc = hexToRgb(primaryHex);
    var hsl = rgbToHsl(pc.r, pc.g, pc.b);
    var h = hsl.h, s = hsl.s, l = hsl.l;
    var css = '';

    var shadeDefs = [
      { key: '--theme-color-0',  dl: 20 },{ key: '--theme-color-1',  dl: 16 },
      { key: '--theme-color-2',  dl: 12 },{ key: '--theme-color-3',  dl: 8 },
      { key: '--theme-color-4',  dl: 4 }, { key: '--theme-color-5',  dl: 0 },
      { key: '--theme-color-6',  dl: -4 },{ key: '--theme-color-7',  dl: -8 },
      { key: '--theme-color-8',  dl: -12 },{ key: '--theme-color-9',  dl: -16 },
      { key: '--theme-color-10', dl: -20 },{ key: '--theme-color-n1', dl: -30 },
      { key: '--theme-color-n2', dl: -45 },
    ];
    for (var i = 0; i < shadeDefs.length; i++) {
      var sd = shadeDefs[i];
      css += sd.key + ':' + hslToRgbString(h, s, Math.max(0, Math.min(100, l + sd.dl))) + ';';
    }
    css += '--theme-color-s1-0:' + hslToRgbString(h, s, Math.min(100, l + 10)) + ';';
    css += '--theme-color-s1-1:' + hslToRgbString(h, s, l) + ';';
    css += '--theme-color-s1-2:' + hslToRgbString(h, s, Math.max(0, l - 15)) + ';';
    var gh = (h + 120) % 360;
    css += '--theme-color-s2-0:' + hslToRgbString(gh, Math.min(100, s + 10), Math.min(100, l + 8)) + ';';
    css += '--theme-color-s2-1:' + hslToRgbString(gh, s, l) + ';';
    css += '--theme-color-s2-2:' + hslToRgbString(gh, s, Math.max(0, l - 12)) + ';';
    var ah = (h + 180 + 30) % 360;
    css += '--theme-color-c:'  + hslToRgbString(ah, Math.min(100, s + 20), Math.min(100, l + 5)) + ';';
    css += '--theme-color-c1:' + hslToRgbString(ah, s, l) + ';';
    css += '--theme-color-c2:' + hslToRgbString(ah, s, Math.max(0, l - 10)) + ';';
    if (isDark) {
      css += '--theme-color-t:255,255,255;--theme-color-t1:200,204,210;--theme-color-t3:155,160,170;--theme-color-t5:110,115,125;--theme-color-t7:73,78,92;';
    } else {
      css += '--theme-color-t:30,30,35;--theme-color-t1:60,60,70;--theme-color-t3:90,90,100;--theme-color-t5:120,120,130;--theme-color-t7:150,150,160;';
    }
    if (isDark) {
      css += '--theme-color-grey-0:255,255,255;--theme-color-grey-10:235,235,240;--theme-color-grey-20:210,210,218;--theme-color-grey-30:185,185,192;--theme-color-grey-40:160,160,168;--theme-color-grey-50:135,135,143;--theme-color-grey-60:110,110,118;--theme-color-grey-70:85,85,93;--theme-color-grey-80:60,60,68;--theme-color-grey-90:40,40,48;--theme-color-grey-100:25,25,33;';
    } else {
      css += '--theme-color-grey-0:25,25,33;--theme-color-grey-10:55,55,65;--theme-color-grey-20:85,85,95;--theme-color-grey-30:115,115,125;--theme-color-grey-40:145,145,155;--theme-color-grey-50:175,175,182;--theme-color-grey-60:195,195,200;--theme-color-grey-70:215,215,218;--theme-color-grey-80:235,235,238;--theme-color-grey-90:245,245,247;--theme-color-grey-100:255,255,255;';
    }
    css += '--theme-color-ys1:' + (isDark ? '255,255,255' : '25,25,33') + ';';
    css += '--theme-color-ys2:' + hslToRgbString(h, s, Math.min(100, l + 15)) + ';';
    css += '--theme-color-yt3:' + (isDark ? '200,204,210' : '90,90,100') + ';';
    css += '--theme-color-yt5:' + (isDark ? '110,115,125' : '120,120,130') + ';';
    css += '--theme-color-y6:' + hslToRgbString(h, s, Math.min(100, l + 8)) + ';';
    css += '--theme-color-y10:255,255,255;';
    css += '--theme-color-a1:' + (isDark ? '220,220,225' : '60,60,70') + ';';
    css += '--theme-color-grey-y20:' + (isDark ? '200,200,205' : '90,90,100') + ';';
    return css;
  }

  function applyPaletteToStyle(css) {
    var pairs = css.split(';');
    var root = document.documentElement.style;
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i].trim();
      if (!p) continue;
      var colon = p.indexOf(':');
      if (colon < 1) continue;
      root.setProperty(p.substring(0, colon).trim(), p.substring(colon + 1).trim());
    }
  }

  function clearInlinePalette() {
    var root = document.documentElement.style;
    var themeProps = [];
    for (var i = 0; i < root.length; i++) {
      if (root[i].indexOf('--theme-color') === 0) themeProps.push(root[i]);
    }
    for (var j = 0; j < themeProps.length; j++) { root.removeProperty(themeProps[j]); }
    var pel = document.getElementById('k4-theme-palette');
    if (pel) pel.textContent = '';
    console.log('[K4] Cleared ' + themeProps.length + ' inline theme-color overrides');
  }

  function applyThemeToBody(theme) {
    if (!theme || !document.body) return;
    document.body.setAttribute('data-theme', 'theme/' + theme);
  }
  function setBodyDataTheme(dataTheme) {
    if (!dataTheme || !document.body) return;
    document.body.setAttribute('data-theme', dataTheme);
  }

  // ═══ Native settings bridge (localStorage.editor_settings) ═══
  function readNativeSettings() {
    try { return JSON.parse(localStorage.getItem('editor_settings') || '{}'); } catch(_) { return {}; }
  }
  function writeNativeSettings(updates) {
    try {
      var n = readNativeSettings();
      for (var k in updates) { if (updates.hasOwnProperty(k)) n[k] = updates[k]; }
      localStorage.setItem('editor_settings', JSON.stringify(n));
    } catch(_) {}
  }

  function applyAppearance(a) {
    a = a || {};
    var p = a.primaryColor || '#583cdc';
    var s = a.secondaryColor || '#00b4ff';
    var bg = a.bgColor || '#050508';

    var root = document.documentElement.style;
    root.setProperty('--k4-primary', p);
    root.setProperty('--k4-primary-rgb', hexToRgbString(p));
    if (a.secondaryColor) root.setProperty('--k4-secondary', a.secondaryColor);
    if (a.bgColor) { root.setProperty('--k4-bg', a.bgColor); root.setProperty('--k4-bg-rgb', hexToRgbString(a.bgColor)); }
    if (a.textColor) root.setProperty('--k4-text', a.textColor);

    var dt = a.dataTheme || (document.body ? document.body.getAttribute('data-theme') : '');
    var isNative = dt && dt !== 'theme/ultra' && dt.startsWith('theme/');

    if (!isNative && a.primaryColor) {
      var bgRgb = hexToRgb(a.bgColor || '#050508');
      var brightness = (bgRgb.r * 299 + bgRgb.g * 587 + bgRgb.b * 114) / 1000;
      var paletteCSS = generateFullPaletteCSS(p, brightness <= 128);
      applyPaletteToStyle(paletteCSS);
      console.log('[K4] Dynamic palette generated (' + (brightness <= 128 ? 'dark' : 'light') + ' mode)');
    } else if (isNative) {
      clearInlinePalette();
      console.log('[K4] Native preset active - palette delegated to kitten.css');
    }

    var css = 'body,#root,html{background-color:' + bg + '!important;}';
    if (a.textColor) css += 'body,.k4-scope{color:' + a.textColor + ';}';
    if (a.glassMorphism) {
      var gBlur = a.glassBlur || 12, gOpacity = a.glassOpacity || 0.15;
      var bgRgbStr = a.bgColor ? hexToRgbString(a.bgColor) : '5,5,8';
      css += '.k4-scope [class*="modal"],.k4-scope [class*="dialog"],[class*="sidebar"],[class*="panel"]{backdrop-filter:blur(' + gBlur + 'px);-webkit-backdrop-filter:blur(' + gBlur + 'px);background:rgba(' + bgRgbStr + ',' + gOpacity + ')!important;}';
    }
    if (a.accentGlow && a.primaryColor) {
      css += '.kitten-loader-logo{text-shadow:0 0 20px ' + rgba(p, 0.6) + ',0 0 60px ' + rgba(p, 0.3) + ',0 0 120px ' + rgba(p, 0.15) + '!important;}';
    }
    css += '.k4-fab{background:' + p + '!important;color:#fff!important;box-shadow:0 4px 20px ' + rgba(p, 0.35) + '!important;}';
    css += '.k4-fab:hover{box-shadow:0 6px 28px ' + rgba(p, 0.5) + '!important;}';
    css += '*:focus-visible{outline-color:' + p + '!important;}';
    css += '.k4-scope [class*="btn"][class*="primary"],.k4-scope [class*="btn"][class*="positive"],.k4-scope button[class*="confirm"]{background:linear-gradient(135deg,' + p + ',' + rgba(p, 0.7) + ')!important;box-shadow:0 4px 14px ' + rgba(p, 0.3) + '!important;color:#fff!important;}';
    css += '.k4-scope [class*="btn"][class*="secondary"]{background:' + s + '!important;color:#fff!important;}';
    css += 'progress::-webkit-progress-value,[class*="progress"]::-webkit-progress-value{background:linear-gradient(90deg,' + p + ',' + s + ')!important;}';
    css += '.k4-scope a,.k4-scope [class*="link"]{color:' + s + ';}';
    css += '.k4-scope input:focus,.k4-scope textarea:focus,.k4-scope select:focus{border-color:' + p + '!important;box-shadow:0 0 0 3px ' + rgba(p, 0.1) + '!important;}';
    css += '[class*="spinner"],[class*="loading"]{border-top-color:' + p + '!important;}';
    css += '.k4-scope input,.k4-scope textarea,.k4-scope [contenteditable]{caret-color:' + p + '!important;}';
    css += '[class*="header"],[class*="Header"],[class*="menubar"],[class*="menu-bar"],[class*="nav"][class*="bar"],[id*="header"]{background-color:' + bg + '!important;}';

    if (a.bgImage) {
      var ov = document.getElementById('k4-bg-image-overlay');
      if (!ov) {
        ov = document.createElement('div');
        ov.id = 'k4-bg-image-overlay';
        ov.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;';
        document.body.appendChild(ov);
      }
      ov.style.backgroundImage = 'url(' + a.bgImage + ')';
      ov.style.backgroundSize = 'cover';
      ov.style.backgroundPosition = 'center';
    }

    ensureStyleEl('k4-appearance-css').textContent = css;

    var bgRgb2 = hexToRgb(a.bgColor || '#050508');
    var brightness2 = (bgRgb2.r * 299 + bgRgb2.g * 587 + bgRgb2.b * 114) / 1000;
    if (document.body) {
      document.body.classList.remove('k4-dark', 'k4-light');
      document.body.classList.add(brightness2 > 128 ? 'k4-light' : 'k4-dark');
    }

    if (a.dataTheme) {
      setBodyDataTheme(a.dataTheme);
    } else if (!isNative && a.primaryColor) {
      setBodyDataTheme('theme/ultra');
    }

    setTimeout(function() { applyBlocklyTheme(); }, 1000);
    console.log('[K4] Appearance applied:', JSON.stringify({ p: p, bg: bg, native: isNative, dataTheme: a.dataTheme || 'dynamic' }));
  }

  function applyGeneral(g) {
    g = g || {};
    // Write to native editor_settings for persistence across restart
    var n = {};
    if (g.autoSave !== undefined) n.autoSave = g.autoSave;
    if (g.smoothZoom !== undefined) n.smoothZoom = g.smoothZoom;
    if (g.theme !== undefined) n.theme = g.theme;
    writeNativeSettings(n);
    if (g.showFps !== undefined) toggleFPS(g.showFps);
    // body[data-theme] is controlled by applyAppearance, NOT here
  }

  function toggleFPS(show) {
    var ex = document.getElementById('k4-fps-counter');
    if (show) {
      if (ex) { ex.style.display='block'; return; }
      if (!document.body) return;
      var f = document.createElement('div'); f.id='k4-fps-counter';
      f.style.cssText='position:fixed;top:4px;right:8px;z-index:99999;background:rgba(0,0,0,0.7);color:#0f0;font:12px monospace;padding:2px 6px;border-radius:3px;pointer-events:none;';
      document.body.appendChild(f);
      var fr=0,lt=performance.now();
      function tick(){fr++;var now=performance.now();if(now-lt>=1000){f.textContent='FPS: '+fr;fr=0;lt=now;}requestAnimationFrame(tick);}
      requestAnimationFrame(tick);
    } else if (ex) { ex.style.display='none'; }
  }

  function applyEditor(e) {
    e = e || {};
    if (e.fontSize !== undefined) {
      document.documentElement.style.setProperty('--k4-font-size', e.fontSize+'px');
      document.documentElement.style.fontSize = e.fontSize+'px';
    }
    // Persist to native format (applied on next load)
    var n = {};
    if (e.fontSize !== undefined) n.fontSize = e.fontSize;
    if (e.snapToGrid !== undefined) n.snapToGrid = e.snapToGrid;
    if (e.showCategoryIcons !== undefined) n.showCategoryIcons = e.showCategoryIcons;
    if (e.compactMode !== undefined) n.compactMode = e.compactMode;
    if (e.lineNumbers !== undefined) n.lineNumbers = e.lineNumbers;
    if (e.autoComplete !== undefined) n.autoComplete = e.autoComplete;
    writeNativeSettings(n);
  }

  function applyDebug(d) {
    d = d || {};
    window.__k4_debug = window.__k4_debug || {};
    if (d.verboseLogging !== undefined) window.__k4_debug.verbose = d.verboseLogging;
    if (d.perfMonitor !== undefined) window.__k4_debug.perf = d.perfMonitor;
    if (d.showBlockIds !== undefined) {
      writeNativeSettings({ showBlockIds: d.showBlockIds });
    }
  }

  function applyAll() {
    var s = readJSON(SETTINGS_PATH, {});
    if (!s || Object.keys(s).length === 0) return;
    if (s.appearance) applyAppearance(s.appearance);
    if (s.general) applyGeneral(s.general);
    if (s.editor) applyEditor(s.editor);
    if (s.debug) applyDebug(s.debug);
  }

  function waitForBridge(cb) {
    var a=0;
    function chk(){a++;if(window.__k4bus&&window.__k4bus.emit){cb();return;}if(a<150)setTimeout(chk,200);}
    setTimeout(chk,500);
  }

  function integrateNativeHeader() {
    var ha=0;
    function hk(){
      var btn=document.getElementById('header-setting-btn');
      if(btn&&!btn.__k4_hooked){
        btn.__k4_hooked=true;
        btn.addEventListener('click',function(e){
          e.preventDefault();e.stopPropagation();
          if(window.__k4bus)window.__k4bus.emit('open-settings');
        });
        console.log('[K4] Native #header-setting-btn hooked');
      }
      if(!document.getElementById('header-setting-btn')&&ha<100){ha++;setTimeout(hk,300);}
    }
    setTimeout(hk,2000);
  }

  window.K4Settings = {
    read: function(){return readJSON(SETTINGS_PATH,{});},
    write: function(d){writeJSON(SETTINGS_PATH,d);},
    apply: applyAll,
    applyAppearance: applyAppearance,
    applyGeneral: applyGeneral,
    applyEditor: applyEditor,
    applyDebug: applyDebug
  };

  // ─── Startup ───
  // Import from native localStorage -> k4-settings.json
  try {
    var ns = readNativeSettings();
    if (Object.keys(ns).length > 0) {
      var s = readJSON(SETTINGS_PATH, {});
      var ch = false;
      if (!s.general) { s.general = {}; ch = true; }
      if (ns.autoSave !== undefined && s.general.autoSave === undefined) { s.general.autoSave = ns.autoSave; ch = true; }
      if (ns.theme !== undefined && !s.general.theme) { s.general.theme = ns.theme; ch = true; }
      if (!s.editor) { s.editor = {}; ch = true; }
      if (ns.fontSize !== undefined && s.editor.fontSize === undefined) { s.editor.fontSize = ns.fontSize; ch = true; }
      if (ch) { writeJSON(SETTINGS_PATH, s); console.log('[K4] Imported native settings:', ns); }
    }
  } catch(e) {}

  // Apply saved settings
  try {
    var s = readJSON(SETTINGS_PATH, {});
    if (s.appearance) applyAppearance(s.appearance);
    if (s.general) applyGeneral(s.general);
    if (s.editor) applyEditor(s.editor);
  } catch(e) {}

  waitForBridge(function () {
    var s = readJSON(SETTINGS_PATH, {});
    if (s.debug) applyDebug(s.debug);
    integrateNativeHeader();
  });

  // Blockly grid theming
  function applyBlocklyTheme() {
    try {
      var bw = window.Blockly;
      if (!bw || !bw.mainWorkspace) return;
      var ws = bw.mainWorkspace;
      var grid = ws.getGrid ? ws.getGrid() : null;
      if (!grid) return;
      var style = getComputedStyle(document.body);
      var c9 = style.getPropertyValue('--theme-color-9').trim() || '255,240,232';
      var c5 = style.getPropertyValue('--theme-color-5').trim() || '255,216,194';
      grid.set_color && grid.set_color('rgba(' + c9 + ',1)', 'rgba(' + c5 + ',1)');
      console.log('[K4] Blockly grid themed');
    } catch(e) {}
  }

  console.log('[K4 Settings] Runtime bridge v2 initialized');
})();
