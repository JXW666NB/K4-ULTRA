  // Set data-theme on body for current theme
  function applyThemeToBody(theme) {
    if (!theme || !document.body) return;
    document.body.setAttribute('data-theme', 'theme/' + theme);
  }
/**
 * K4 Ultra Settings Runtime Bridge
 * Reads k4-settings.json and applies to DOM/CSS/Bridge in real-time.
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

  var styleEl = null;
  function ensureStyleEl() { if (!styleEl) { styleEl = document.getElementById('k4-runtime-style'); if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'k4-runtime-style'; document.head.appendChild(styleEl); } } return styleEl; }
  function injectCSS(css) { ensureStyleEl().textContent = css; }
  function setProp(name, value) { document.documentElement.style.setProperty(name, value); if (document.body) document.body.style.setProperty(name, value); }

  function applyAppearance(a) {
    a = a || {};
    if (a.primaryColor) {
      setProp('--k4-primary', a.primaryColor);
      var rgb = hexToRgbString(a.primaryColor);
      setProp('--k4-primary-rgb', rgb); setProp('--theme-color-0', rgb); setProp('--theme-color-s1-0', rgb); setProp('--theme-color-s1-1', rgb);
      var c = hexToRgb(a.primaryColor);
      setProp('--theme-color-n1', Math.max(0,c.r-40)+','+Math.max(0,c.g-40)+','+Math.max(0,c.b-40));
      setProp('--theme-color-n2', Math.max(0,c.r-80)+','+Math.max(0,c.g-80)+','+Math.max(0,c.b-80));
    }
    if (a.secondaryColor) setProp('--k4-secondary', a.secondaryColor);
    if (a.bgColor) { setProp('--k4-bg', a.bgColor); setProp('--k4-bg-rgb', hexToRgbString(a.bgColor)); }
    if (a.textColor) setProp('--k4-text', a.textColor);

    var p = a.primaryColor || '#583cdc', s = a.secondaryColor || '#00b4ff', bg = a.bgColor || '#050508';
    var css = 'body,#root,html{background-color:'+bg+'!important;}';
    if (a.textColor) css += 'body,.k4-scope{color:'+a.textColor+';}';
    if (a.glassMorphism) { var gBlur = a.glassBlur||12, gOpacity = a.glassOpacity||0.15, bgRgb = a.bgColor?hexToRgbString(a.bgColor):'5,5,8'; css += '.k4-scope [class*="modal"],.k4-scope [class*="dialog"],[class*="sidebar"],[class*="panel"]{backdrop-filter:blur('+gBlur+'px);-webkit-backdrop-filter:blur('+gBlur+'px);background:rgba('+bgRgb+','+gOpacity+')!important;}'; }
    if (a.accentGlow && a.primaryColor) css += '.kitten-loader-logo{text-shadow:0 0 20px '+rgba(p,0.6)+',0 0 60px '+rgba(p,0.3)+',0 0 120px '+rgba(p,0.15)+'!important;}';
    css += '.k4-fab{background:'+p+'!important;color:#fff!important;box-shadow:0 4px 20px '+rgba(p,0.35)+'!important;}';
    css += '.k4-fab:hover{box-shadow:0 6px 28px '+rgba(p,0.5)+'!important;}';
    css += '*:focus-visible{outline-color:'+p+'!important;}';
    css += '.k4-scope [class*="btn"][class*="primary"],.k4-scope [class*="btn"][class*="positive"],.k4-scope button[class*="confirm"]{background:linear-gradient(135deg,'+p+','+rgba(p,0.7)+')!important;box-shadow:0 4px 14px '+rgba(p,0.3)+'!important;color:#fff!important;}';
    css += '.k4-scope input:focus,.k4-scope textarea:focus,.k4-scope select:focus{border-color:'+p+'!important;box-shadow:0 0 0 3px '+rgba(p,0.1)+'!important;}';
    css += '[class*="spinner"],[class*="loading"]{border-top-color:'+p+'!important;}';
    css += '.k4-scope input,.k4-scope textarea,.k4-scope [contenteditable]{caret-color:'+p+'!important;}';
    injectCSS(css);
    console.log('[K4] Appearance applied:', JSON.stringify({p:p,bg:bg}));
  }

  function applyGeneral(g) { g = g || {}; var bus = window.__k4bus; if (bus && g.autoSave !== undefined) bus.emit('redux-dispatch', {type:'SETTINGS_UPDATE',payload:{autoSave:g.autoSave}}); if (bus && g.smoothZoom !== undefined) bus.emit('redux-dispatch', {type:'SETTINGS_UPDATE',payload:{smoothZoom:g.smoothZoom}}); if (bus && g.theme) bus.emit('redux-dispatch', {type:'THEME_CHANGE',payload:{theme:g.theme}}); if (g.showFps !== undefined) toggleFPS(g.showFps); syncToNative(g); applyThemeToBody(g.theme); }

  function toggleFPS(show) { var ex = document.getElementById('k4-fps-counter'); if (show) { if (ex) { ex.style.display='block'; return; } if (!document.body) return; var f = document.createElement('div'); f.id='k4-fps-counter'; f.style.cssText='position:fixed;top:4px;right:8px;z-index:99999;background:rgba(0,0,0,0.7);color:#0f0;font:12px monospace;padding:2px 6px;border-radius:3px;pointer-events:none;'; document.body.appendChild(f); var fr=0,lt=performance.now(); function tick(){fr++;var now=performance.now();if(now-lt>=1000){f.textContent='FPS: '+fr;fr=0;lt=now;}requestAnimationFrame(tick);} requestAnimationFrame(tick); } else if (ex) { ex.style.display='none'; } }

  function applyEditor(e) { e = e || {}; var bus = window.__k4bus; if (e.fontSize !== undefined) { document.documentElement.style.setProperty('--k4-font-size', e.fontSize+'px'); document.documentElement.style.fontSize = e.fontSize+'px'; } if (bus) { var pl={}; if (e.fontSize!==undefined) pl.fontSize=e.fontSize; if (e.snapToGrid!==undefined) pl.snapToGrid=e.snapToGrid; if (e.showCategoryIcons!==undefined) pl.showCategoryIcons=e.showCategoryIcons; if (e.compactMode!==undefined) pl.compactMode=e.compactMode; if (e.lineNumbers!==undefined) pl.lineNumbers=e.lineNumbers; if (e.autoComplete!==undefined) pl.autoComplete=e.autoComplete; if (Object.keys(pl).length>0) bus.emit('redux-dispatch',{type:'SETTINGS_UPDATE',payload:pl}); } else { window.__k4_deferredEditorSettings = e; } }

  function applyDebug(d) { d = d || {}; window.__k4_debug = window.__k4_debug || {}; if (d.verboseLogging !== undefined) window.__k4_debug.verbose = d.verboseLogging; if (d.perfMonitor !== undefined) window.__k4_debug.perf = d.perfMonitor; if (d.showBlockIds !== undefined) { var bus = window.__k4bus; if (bus) bus.emit('redux-dispatch', {type:'SETTINGS_UPDATE',payload:{showBlockIds:d.showBlockIds}}); } }

  function applyAll() { var s = readJSON(SETTINGS_PATH, {}); if (!s || Object.keys(s).length===0) return; if (s.appearance) applyAppearance(s.appearance); if (s.general) applyGeneral(s.general); if (s.editor) applyEditor(s.editor); if (s.debug) applyDebug(s.debug); }

  function waitForBridge(cb) { var a=0; function chk(){a++;if(window.__k4bus&&window.__k4bus.emit){cb();return;}if(a<150)setTimeout(chk,200);} setTimeout(chk,500); }

  // Bridge localStorage.editor_settings (native format) with k4-settings.json
  function syncToNative(g) { try { var n={}; try{n=JSON.parse(localStorage.getItem('editor_settings')||'{}');}catch(_){} if(g.autoSave!==undefined)n.autoSave=g.autoSave; if(g.theme!==undefined)n.theme=g.theme; localStorage.setItem('editor_settings',JSON.stringify(n)); } catch(_){} }
  function loadFromNative() { try { var n=JSON.parse(localStorage.getItem('editor_settings')||'{}'); if(Object.keys(n).length===0)return null; var s=readJSON(SETTINGS_PATH,{}),ch=false; if(!s.general){s.general={};ch=true;} if(n.autoSave!==undefined&&s.general.autoSave===undefined){s.general.autoSave=n.autoSave;ch=true;} if(n.theme!==undefined&&!s.general.theme){s.general.theme=n.theme;ch=true;} if(ch){writeJSON(SETTINGS_PATH,s);console.log('[K4] Imported native settings:',n);} return s; } catch(_){return null;} }

  // Hook native #header-setting-btn -> open K4 Ultra Settings
  function integrateNativeHeader() {
    var ha=0;
    function hk(){ var btn=document.getElementById('header-setting-btn'); if(btn&&!btn.__k4_hooked){btn.__k4_hooked=true;btn.addEventListener('dblclick',function(e){e.preventDefault();e.stopPropagation();if(window.__k4bus)window.__k4bus.emit('open-settings');});console.log('[K4] Native #header-setting-btn: dblclick=K4Ultra');} if(!document.getElementById('header-setting-btn')&&ha<100){ha++;setTimeout(hk,300);} }
    setTimeout(hk,2000);
  }

  window.K4Settings = { read: function(){return readJSON(SETTINGS_PATH,{});}, write: function(d){writeJSON(SETTINGS_PATH,d);}, apply: applyAll, applyAppearance: applyAppearance, applyGeneral: applyGeneral, applyEditor: applyEditor, applyDebug: applyDebug };

  loadFromNative();
  try { var s = readJSON(SETTINGS_PATH, {}); if (s.appearance) applyAppearance(s.appearance); if (s.general && s.general.theme) applyThemeToBody(s.general.theme); } catch (e) {}
  waitForBridge(function () { var s = readJSON(SETTINGS_PATH, {}); if (s.editor) applyEditor(s.editor); if (s.general) applyGeneral(s.general); if (s.debug) applyDebug(s.debug); integrateNativeHeader(); });
  console.log('[K4 Settings] Runtime bridge initialized');
})();