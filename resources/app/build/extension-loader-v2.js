/**
 * ============================================================
 * K4 Blink Extension Loader v2 - .k4ultra 扩展运行时加载器
 * ============================================================
 *
 * 前提: bridge-inject.js 已注入 kitten.js（本文件依赖 window.__k4 API）
 *
 * 功能:
 *   1. 扫描 resources/app/extensions/ 下的 .k4ultra 文件和目录
 *   2. 读取 manifest.json，注册积木/生成器/运行时
 *   3. 每个扩展拥有独立工具栏分类
 *   4. 提供安全沙盒（敏感操作弹窗确认）
 *
 * 支持两种模式:
 *   - 开发模式: 直接把扩展目录放入 extensions/（内含 manifest.json）
 *   - 分发模式: .k4ultra 文件（ZIP 改后缀）
 *
 * ============================================================
 */

(function() {
  'use strict';

  // ─── 等待 Bridge API (init_basic_blocks 在 componentDidMount 中执行) ───
  var K4 = null;
  var extCategories = [];
  var extToolboxXMLs = {};
  function waitForBridge(callback, maxRetries) {
    maxRetries = maxRetries || 100;
    var attempts = 0;
    function check() {
      attempts++;
      var k4 = window.__k4;
      if (k4 && k4.blocks && k4.runtime && k4.toolbar) {
        K4 = k4;
        callback();
      } else if (attempts < maxRetries) {
        setTimeout(check, 200);
      } else {
        console.warn('[K4 Loader] Bridge API not available after ' + attempts + ' attempts');
      }
    }
    check();
  }

  waitForBridge(scanExtensions);

  // ─── 确定扩展目录路径 ───
  var EXTENSION_DIR = (function() {
    try {
      var src = document.currentScript ? document.currentScript.src : '';
      if (!src) src = 'resources/app/build/extension-loader-v2.js';
      try { src = decodeURIComponent(src); } catch(e) {}
      src = src.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
      var base = src.replace(/extension-loader-v2\.js.*$/i, '');
      if (base) {
        base = base.replace(/build\/?$/i, '') + 'extensions';
        return base;
      }
    } catch(e) {}
    return null;
  })();

  // ─── 工具函数 ───
  function fileLog(msg) {
    try { require('fs').appendFileSync('D:\\k4-loader.log', new Date().toISOString() + ' ' + msg + '\n'); } catch(e) {}
  }
  function log(tag, msg) { var s = '[K4 Loader][' + tag + '] ' + msg; console.log(s); fileLog(s); }
  function warn(tag, msg) { var s = '[K4 Loader][' + tag + '] ' + msg; console.warn(s); fileLog(s); }
  function error(tag, msg) { var s = '[K4 Loader][' + tag + '] ' + msg; console.error(s); fileLog(s); }

  // 根据 block JSON 生成带默认 shadow/field 的 toolbox XML
  function buildToolboxXmlForBlock(block) {
    var xml = '<block type="' + block.type + '">';
    var args = block.args || block.args0 || [];
    for (var i = 0; i < args.length; i++) {
      var arg = args[i];
      if (!arg || !arg.name) continue;
      if (arg.type === 'input_value') {
        if (arg.check === 'Number') {
          xml += '<value name="' + arg.name + '"><shadow type="math_number"><field name="NUM">' + (arg.value || 0) + '</field></shadow></value>';
        } else {
          xml += '<value name="' + arg.name + '"><shadow type="text"><field name="TEXT">' + escapeXml(arg.value || '') + '</field></shadow></value>';
        }
      } else if (arg.type === 'input_statement') {
        // 语句槽默认无 shadow
      } else if (arg.type === 'field_input') {
        xml += '<field name="' + arg.name + '">' + escapeXml(arg.text || arg.value || '') + '</field>';
      } else if (arg.type === 'field_number') {
        xml += '<field name="' + arg.name + '">' + (arg.value || 0) + '</field>';
      } else if (arg.type === 'field_dropdown') {
        var firstOpt = '';
        if (Array.isArray(arg.options) && arg.options.length > 0) {
          firstOpt = arg.options[0];
          if (Array.isArray(firstOpt)) firstOpt = firstOpt[0] || '';
        }
        xml += '<field name="' + arg.name + '">' + escapeXml(firstOpt) + '</field>';
      }
    }
    xml += '</block>';
    return xml;
  }

  function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 原生 K4 图标池，未指定图标时随机抽取
  var NATIVE_ICONS = [
    'iconicon_shijian1','iconicon_kongzhi','iconicon_dongzuo','iconicon_waiguan',
    'iconicon_shengyin','iconicon_huabi','iconicon_zhence','iconicon_yunsuan',
    'iconicon_bianliang','iconicon_liebiao','iconicon_hanshu','iconicon_wuli',
    'iconicon_gongju','iconicon_VR','iconicon_shipin','iconicon_ai1',
    'iconicon_yunbianliang','iconicon_yunliebiao','iconicon_haigui1','iconicon_haigui',
    'iconicon_ai','iconicon_shoujishoubing','iconGAMEAI','iconmidi'
  ];

  function pickRandomNativeIcon() {
    return NATIVE_ICONS[Math.floor(Math.random() * NATIVE_ICONS.length)];
  }

  // 读取扩展目录下的图片文件并转为 base64 data URI
  function readImageAsDataUri(sourcePath, isZip, imgPath) {
    try {
      var fs = require('fs');
      var path = require('path');
      var ext = path.extname(imgPath).toLowerCase();
      var mime = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      var fullPath;
      if (isZip) {
        // .k4ultra 内图片：通过 K4.fs.readZipFileBase64 读取
        var b64 = K4.fs.readZipFileBase64(sourcePath, imgPath);
        if (!b64) return null;
        return 'data:' + mime + ';base64,' + b64;
      } else {
        fullPath = path.resolve(sourcePath, imgPath);
        if (!fs.existsSync(fullPath)) return null;
        var data = fs.readFileSync(fullPath);
        return 'data:' + mime + ';base64,' + data.toString('base64');
      }
    } catch(e) { return null; }
  }

  // 解析 manifest.category.icon：支持图片文件 / 原生 iconfont / 随机兜底
  function resolveCategoryIcon(sourcePath, isZip, iconValue) {
    iconValue = (iconValue || '').trim();
    var isImg = /\.(png|jpg|jpeg|gif|svg|ico)$/i.test(iconValue);
    if (isImg) {
      var dataUri = readImageAsDataUri(sourcePath, isZip, iconValue);
      if (dataUri) {
        return '<img src="' + dataUri + '" width="22" height="22" style="object-fit:contain;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.15));" draggable="false" alt="" />';
      }
    }
    var iconName = iconValue || pickRandomNativeIcon();
    // 如果 manifest 指定了 K4 原生 iconfont ID，尝试用 use 引用
    if (iconName.indexOf('iconicon_') === 0 || iconName.indexOf('icon') === 0) {
      return '<svg class="icon" aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" style="fill:currentColor;"><use xlink:href="#' + iconName + '"></use></svg>';
    }
    // 兜底：内联拼图图标
    return '<svg class="icon" aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" style="fill:rgba(255,255,255,0.95);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.2));"><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-2 .9-2 2v3.8h1.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/></svg>';
  }

  // ─── 加载单个扩展 ───
  function loadExtension(sourcePath, isZip) {
    var name = (isZip ? sourcePath.replace(/\.k4ultra$/i, '') : sourcePath).split(/[/\\]/).pop();

    log(name, 'Loading from ' + (isZip ? 'ZIP' : 'dir') + ': ' + sourcePath);

    try {
      var manifestStr = isZip
        ? K4.fs.readZipFile(sourcePath, 'manifest.json')
        : K4.fs.readFile(sourcePath + '/manifest.json');

      if (!manifestStr) {
        error(name, 'manifest.json not found');
        return;
      }

      var manifest = JSON.parse(manifestStr);
      var extName = manifest.name || name;
      var entries = manifest.entries || {};
      var security = manifest.security || {};

      log(extName, 'v' + (manifest.version || '?') + ' by ' + (manifest.author || 'Unknown'));

      function readEntry(entryPath) {
        return isZip ? K4.fs.readZipFile(sourcePath, entryPath) : K4.fs.readFile(sourcePath + '/' + entryPath);
      }

      // ─── 步骤 1: 积木外观 ───
      var types = [];
      if (entries.blocks) {
        var blocksJson = readEntry(entries.blocks);
        if (blocksJson) {
          try {
            var arr = JSON.parse(blocksJson);
            K4.blocks.define(arr);
            for (var bi = 0; bi < arr.length; bi++) {
              if (arr[bi] && arr[bi].type) types.push(arr[bi].type);
            }
            log(extName, arr.length + ' block(s) registered, types: ' + types.join(', '));
          } catch(e) { error(extName, 'Blocks error: ' + e.message); }
        }
      }

      // 为每个 block 生成带默认输入的 toolbox XML，并注册到 K4.blocks_xml
      if (entries.blocks && arr.length > 0) {
        for (var bi = 0; bi < arr.length; bi++) {
          var blockDef = arr[bi];
          if (!blockDef || !blockDef.type) continue;
          var xml = buildToolboxXmlForBlock(blockDef);
          extToolboxXMLs[blockDef.type] = xml;
          try { K4.blocks_xml.add(blockDef.type, xml); } catch(e) {}
        }
      }

      // 收集扩展的独立分类信息
      if (types.length > 0 && manifest.category) {
        var iconValue = manifest.category.icon || '';
        var iconHtml = resolveCategoryIcon(sourcePath, isZip, iconValue);
        extCategories.push({
          id: 'ext_' + (extName.replace(/[^a-zA-Z0-9_]/g, '_')),
          name: manifest.category.name || extName,
          color: manifest.category.color || '#FF6B35',
          icon: iconHtml,
          types: types
        });
      }

      // ─── 步骤 2: 代码生成器 ───
      if (entries.generator) {
        var genCode = readEntry(entries.generator);
        if (genCode) {
          try {
            var gens = new Function('return ' + genCode)();
            K4.generator.registerBatch(gens);
            log(extName, 'Generators registered');
          } catch(e) { error(extName, 'Generator error: ' + e.message); }
        }
      }

      // ─── 步骤 3: Domain Function ───
      if (entries.runtime) {
        var rtCode = readEntry(entries.runtime);
        if (rtCode) {
          try {
            var funcs = new Function('return ' + rtCode)();
            var permissions = security.permissions || [];

            if (permissions.length > 0) {
              var wrapped = {};
              for (var fid in funcs) {
                if (!funcs.hasOwnProperty(fid)) continue;
                var perm = null;
                for (var p = 0; p < permissions.length; p++) {
                  if (permissions[p].block === fid) { perm = permissions[p]; break; }
                }
                wrapped[fid] = perm
                  ? K4.security.wrap(fid, perm.description || '执行 ' + fid, funcs[fid])
                  : funcs[fid];
                if (perm) log(extName, 'Permission wrapped: ' + fid);
              }
              K4.runtime.registerBatch(wrapped);
            } else {
              K4.runtime.registerBatch(funcs);
            }
            log(extName, 'Runtime registered');
          } catch(e) { error(extName, 'Runtime error: ' + e.message); }
        }
      }

      window.__k4._loadedExtensions = window.__k4._loadedExtensions || [];
      window.__k4._loadedExtensions.push({
        id: extName,
        name: manifest.name || extName,
        version: manifest.version,
        description: manifest.description || ''
      });

      log(extName, 'OK Loaded');

    } catch(e) { error(name, 'Failed: ' + e.message); }
  }

  // ─── 扫描扩展目录 ───
  function scanExtensions() {
    if (!K4.fs || !EXTENSION_DIR) {
      warn('Scanner', 'FS API or path not available');
      return;
    }

    var dir = EXTENSION_DIR;
    log('Scanner', 'Scanning: ' + dir);

    try {
      if (!K4.fs.exists(dir)) {
        error('Scanner', 'Directory not found: ' + dir);
        return;
      }

      var items = K4.fs.readdir(dir) || [];
      var loaded = [];
      var loadedBaseNames = {};

      // 默认仅加载 Blink .k4ultra 扩展。如需开发模式加载目录，可在 manifest 中开启 devMode。
      var allowDirMode = false;
      try {
        var cfgPath = dir + '/loader-config.json';
        if (K4.fs.exists(cfgPath)) {
          var cfg = JSON.parse(K4.fs.readFile(cfgPath) || '{}');
          allowDirMode = cfg.devMode === true;
        }
      } catch(e) {}

      items.filter(function(f) { return f.toLowerCase().endsWith('.k4ultra'); })
        .forEach(function(f) {
          loadExtension(dir + '/' + f, true);
          loaded.push(f);
          loadedBaseNames[f.replace(/\.k4ultra$/i, '')] = true;
        });

      if (allowDirMode) {
        items.filter(function(f) {
          try { 
            if (loadedBaseNames[f]) return false;
            return K4.fs.isDirectory(dir + '/' + f) && K4.fs.exists(dir + '/' + f + '/manifest.json'); 
          }
          catch(e) { return false; }
        }).forEach(function(d) {
          loadExtension(dir + '/' + d, false);
          loaded.push(d);
        });
      }

      if (loaded.length > 0 || extCategories.length > 0) {
        log('Scanner', 'Loaded: ' + loaded.join(', '));
        if (extCategories.length > 0) {
          tryRefreshToolbox();
        }
      } else {
        log('Scanner', 'No extensions found');
      }

      // ─── 等待工具栏就绪后添加扩展分类 ───
      function tryRefreshToolbox(retries) {
        retries = retries || 60;
        try {
          if (typeof Blockly !== 'undefined' && Blockly.mainWorkspace) {
            var ws = Blockly.mainWorkspace;
            if (ws && ws.options && ws.options.toolbox_config) {
              var config = ws.options.toolbox_config;
              var catCount = config.querySelectorAll('category').length;
              if (catCount > 1) {
                updateToolboxXml(ws, config);
                return;
              }
            }
          }
        } catch(e) { log('Scanner', 'tryRefresh err: ' + e.message); }
        if (retries > 0) {
          setTimeout(function() { tryRefreshToolbox(retries - 1); }, 500);
        } else {
          log('Scanner', 'Toolbox update timed out');
        }
      }

      function updateToolboxXml(ws, config) {
        try {
          var xmlClone = config.cloneNode(true);
          var added = 0;
          for (var ci = 0; ci < extCategories.length; ci++) {
            var catInfo = extCategories[ci];
            var catEl = document.createElement('category');
            catEl.setAttribute('name', catInfo.id);
            catEl.setAttribute('text', catInfo.name);
            catEl.setAttribute('color', catInfo.color);
            catEl.setAttribute('icon_html', catInfo.icon);
            catEl.setAttribute('custom', '');
            for (var ti = 0; ti < catInfo.types.length; ti++) {
              var blockType = catInfo.types[ti];
              var blockXml = extToolboxXMLs[blockType] || (K4.blocks_xml && K4.blocks_xml[blockType]) || ('<block type="' + blockType + '"></block>');
              var wrapper = document.createElement('div');
              wrapper.innerHTML = blockXml.trim();
              var blockEl = wrapper.firstChild;
              catEl.appendChild(blockEl);
            }
            xmlClone.appendChild(catEl);
            added += catInfo.types.length;
            log('Scanner', 'Category "' + catInfo.name + '" created (' + catInfo.types.length + ' blocks)');
          }
          if (added > 0) {
            ws.update_toolbox(xmlClone);
            log('Scanner', 'Toolbox updated, ' + extCategories.length + ' extension categories added');
          }
        } catch(e) { log('Scanner', 'updateToolboxXml err: ' + e.message); }
      }

    } catch(e) { error('Scanner', 'Error: ' + e.message); }
  }

  log('Init', 'K4 Blink Extension Loader v2');

})();
