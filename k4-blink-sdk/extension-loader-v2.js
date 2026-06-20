/**
 * ============================================================
 * K4 Blink Extension Loader v2 - .k4ultra 扩展运行时加载器
 * ============================================================
 *
 * 前提: bridge-inject.js 已注入 kitten.js（只需做一次）
 *
 * 功能:
 *   1. 扫描 resources/app/extensions/ 下的 .k4ultra 文件
 *   2. 解压并解析 manifest.json
 *   3. 通过 window.__k4 Bridge API 注册积木/生成器/运行时
 *   4. 提供安全沙盒（敏感操作弹窗确认）
 *
 * 工作原理:
 *   .k4ultra 本质是 ZIP 文件，每个文件就是一个完整扩展包。
 *   加载器解压到内存，按 manifest 描述逐步注册到 Blink 引擎。
 *
 * ============================================================
 */

(function() {
  'use strict';

  var K4 = window.__k4;
  if (!K4 || !K4.blocks || !K4.runtime) {
    console.warn('[K4 Loader] Bridge API not found. Skipping extension loading.');
    console.warn('[K4 Loader] Please inject bridge-inject.js into kitten.js first.');
    return;
  }

  var FS = null;
  try { FS = require('fs'); } catch(e) {}
  var PATH = null;
  try { PATH = require('path'); } catch(e) {}
  var ADM_ZIP = null;
  try { ADM_ZIP = require('adm-zip'); } catch(e) {}

  var EXTENSION_DIR = null;
  try {
    EXTENSION_DIR = PATH.join(
      PATH.dirname(require('electron').remote.app.getPath('exe')),
      'resources', 'app', 'extensions'
    );
  } catch(e) {
    EXTENSION_DIR = 'extensions';
  }

  var EXTENSION_EXT = '.k4ultra';
  var _loadedExtensions = {};

  // ─── 工具函数 ───

  function log(tag, msg) {
    console.log('[K4 Loader][' + tag + '] ' + msg);
  }

  function warn(tag, msg) {
    console.warn('[K4 Loader][' + tag + '] ' + msg);
  }

  function error(tag, msg) {
    console.error('[K4 Loader][' + tag + '] ' + msg);
  }

  // ─── 核心加载流程 ───

  function loadExtension(filePath) {
    var name = PATH ? PATH.basename(filePath, EXTENSION_EXT) : filePath;

    if (_loadedExtensions[name]) {
      warn(name, 'Already loaded, skipping');
      return;
    }

    log(name, 'Loading extension from: ' + filePath);

    try {
      var zip = new ADM_ZIP(filePath);
      var entries = zip.getEntries();
      var files = {};

      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry.isDirectory) {
          files[entry.entryName] = entry.getData().toString('utf8');
        }
      }

      if (!files['manifest.json']) {
        error(name, 'manifest.json not found in extension package');
        return;
      }

      var manifest;
      try {
        manifest = JSON.parse(files['manifest.json']);
      } catch(e) {
        error(name, 'Invalid manifest.json: ' + e.message);
        return;
      }

      var extName = manifest.name || name;
      log(extName, 'Manifest loaded (v' + (manifest.version || '?') + ')');

      // ─── 步骤 1: 注册积木外观 ───
      if (manifest.entries && manifest.entries.blocks) {
        var blocksPath = manifest.entries.blocks;
        if (files[blocksPath]) {
          try {
            var blocksJson = JSON.parse(files[blocksPath]);
            K4.blocks.define(blocksJson);
            log(extName, 'Defined ' + blocksJson.length + ' blocks');
          } catch(e) {
            error(extName, 'Failed to parse blocks: ' + e.message);
          }
        }
      }

      // ─── 步骤 2: 注册代码生成器 ───
      if (manifest.entries && manifest.entries.generator) {
        var genPath = manifest.entries.generator;
        if (files[genPath]) {
          try {
            var genFactory = new Function('return ' + files[genPath])();
            var generators = genFactory();
            K4.generator.registerBatch(generators);
            log(extName, 'Registered generators');
          } catch(e) {
            error(extName, 'Failed to register generators: ' + e.message);
          }
        }
      }

      // ─── 步骤 3: 注册 Domain Function（运行时）───
      if (manifest.entries && manifest.entries.runtime) {
        var rtPath = manifest.entries.runtime;
        if (files[rtPath]) {
          try {
            var rtFactory = new Function('return ' + files[rtPath])();
            var funcs = rtFactory();

            // 检查是否有安全声明，包装敏感函数
            var security = manifest.security || {};
            var permissions = security.permissions || [];

            if (permissions.length > 0) {
              var wrapped = {};
              for (var fid in funcs) {
                if (funcs.hasOwnProperty(fid)) {
                  var permInfo = permissions.find(function(p) {
                    return p.block === fid;
                  });
                  if (permInfo) {
                    wrapped[fid] = K4.security.wrap(
                      fid,
                      permInfo.description || '执行 ' + fid,
                      funcs[fid]
                    );
                    log(extName, 'Wrapped ' + fid + ' with permission check');
                  } else {
                    wrapped[fid] = funcs[fid];
                  }
                }
              }
              K4.runtime.registerBatch(wrapped);
            } else {
              K4.runtime.registerBatch(funcs);
            }

            log(extName, 'Registered runtime functions');
          } catch(e) {
            error(extName, 'Failed to register runtime: ' + e.message);
          }
        }
      }

      _loadedExtensions[name] = {
        manifest: manifest,
        loadedAt: new Date().toISOString()
      };

      log(extName, '✓ Loaded successfully');

    } catch(e) {
      error(name, 'Failed to load: ' + e.message);
    }
  }

  // ─── ZIP 解压工具（无 adm-zip 时用 PowerShell fallback）───

  function extractZip(zipPath, targetDir) {
    try {
      var shell = require('child_process').execSync;
      var psCmd = [
        'Add-Type -AssemblyName System.IO.Compression.FileSystem;',
        '[System.IO.Compression.ZipFile]::ExtractToDirectory(',
        '"' + zipPath.replace(/\\/g, '\\\\') + '",',
        '"' + targetDir.replace(/\\/g, '\\\\') + '"',
        ')'
      ].join(' ');
      shell('powershell -Command "' + psCmd + '"', { timeout: 10000 });
      return true;
    } catch(e) {
      return false;
    }
  }

  // ─── 扫描扩展目录 ───

  function scanExtensions() {
    log('Scanner', 'Scanning for .k4ultra extensions in: ' + EXTENSION_DIR);

    try {
      if (!FS.existsSync(EXTENSION_DIR)) {
        FS.mkdirSync(EXTENSION_DIR, { recursive: true });
        log('Scanner', 'Created extensions directory');
      }

      var files = FS.readdirSync(EXTENSION_DIR);
      var extFiles = files.filter(function(f) {
        return f.toLowerCase().endsWith(EXTENSION_EXT);
      });

      if (extFiles.length === 0) {
        log('Scanner', 'No .k4ultra extensions found');
        return;
      }

      log('Scanner', 'Found ' + extFiles.length + ' extension(s)');

      for (var i = 0; i < extFiles.length; i++) {
        var fullPath = PATH.join(EXTENSION_DIR, extFiles[i]);
        loadExtension(fullPath);
      }
    } catch(e) {
      error('Scanner', 'Scan failed: ' + e.message);
    }
  }

  // ─── 监听扩展目录变化（热加载）───

  function watchExtensions() {
    if (!FS || !PATH) return;
    try {
      FS.watch(EXTENSION_DIR, function(eventType, filename) {
        if (filename && filename.toLowerCase().endsWith(EXTENSION_EXT)) {
          log('Watcher', 'Detected ' + eventType + ': ' + filename);
          var fullPath = PATH.join(EXTENSION_DIR, filename);
          if (eventType === 'rename' && FS.existsSync(fullPath)) {
            setTimeout(function() {
              loadExtension(fullPath);
            }, 1000);
          }
        }
      });
      log('Watcher', 'Watching for new extensions');
    } catch(e) {
      warn('Watcher', 'File watching not available: ' + e.message);
    }
  }

  // ─── 启动 ───

  function init() {
    log('Init', 'K4 Blink Extension Loader v2 starting...');

    // 等待 Bridge API 就绪
    var maxWait = 30000;
    var start = Date.now();

    function check() {
      if (window.__k4 && window.__k4.blocks && window.__k4.runtime) {
        log('Init', 'Bridge API ready, loading extensions...');
        scanExtensions();
        watchExtensions();
        return;
      }
      if (Date.now() - start < maxWait) {
        setTimeout(check, 1000);
      } else {
        warn('Init', 'Bridge API not ready after ' + maxWait + 'ms');
      }
    }

    check();
  }

  // 等 DOM 就绪
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
