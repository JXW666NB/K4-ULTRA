// ============================================================
// extension-loader.js - K4 Ultra 扩展加载器 v6.0
// 功能：系统API代码生成器 + 导入第三方库按钮
// 积木定义已移至kitten.js（与原生积木一起注册）
// ============================================================
(function() {
    'use strict';

    // ========== 文件系统适配器 ==========
    var FS = window.FS;
    if (!FS) {
        try {
            var nodeFs = require('fs');
            FS = {
                readFile: function(p, enc) { return nodeFs.readFileSync(p, enc || 'utf8'); },
                writeFile: function(p, data, enc) { return nodeFs.writeFileSync(p, data, enc || 'utf8'); },
                readdir: function(p) { return nodeFs.readdirSync(p); },
                mkdir: function(p, opts) { return nodeFs.mkdirSync(p, opts || { recursive: true }); },
                stat: function(p) {
                    var s = nodeFs.statSync(p);
                    return { size: s.size, mtime: s.mtime.toISOString(), isDirectory: s.isDirectory(), isFile: s.isFile() };
                },
                exists: function(p) { return nodeFs.existsSync(p); },
                unlink: function(p) { return nodeFs.unlinkSync(p); }
            };
        } catch(e) {}
    }

    // ========== 代码生成器注册 ==========
    function registerSystemAPIGenerators() {
        var B = window.Blockly;
        if (!B || !B.JavaScript) {
            setTimeout(registerSystemAPIGenerators, 500);
            return;
        }

        var JS = B.JavaScript;

        var generators = {
            'sysapi_file_exists': function(block) {
                var path = JS.valueToCode(block, 'PATH', JS.ORDER_ATOMIC) || '""';
                var code = '(window.FS ? window.FS.exists(' + path + ') : false)';
                return [code, JS.ORDER_FUNCTION_CALL];
            },
            'sysapi_read_file': function(block) {
                var path = JS.valueToCode(block, 'PATH', JS.ORDER_ATOMIC) || '""';
                var code = '(window.FS ? window.FS.readFile(' + path + ', "utf8") : "")';
                return [code, JS.ORDER_FUNCTION_CALL];
            },
            'sysapi_write_file': function(block) {
                var path = JS.valueToCode(block, 'PATH', JS.ORDER_ATOMIC) || '""';
                var content = JS.valueToCode(block, 'CONTENT', JS.ORDER_ATOMIC) || '""';
                return 'if(window.FS) window.FS.writeFile(' + path + ', ' + content + ');\n';
            },
            'sysapi_delete_file': function(block) {
                var path = JS.valueToCode(block, 'PATH', JS.ORDER_ATOMIC) || '""';
                return 'if(window.FS) window.FS.unlink(' + path + ');\n';
            },
            'sysapi_create_dir': function(block) {
                var path = JS.valueToCode(block, 'PATH', JS.ORDER_ATOMIC) || '""';
                return 'if(window.FS) window.FS.mkdir(' + path + ', {recursive:true});\n';
            },
            'sysapi_list_dir': function(block) {
                var path = JS.valueToCode(block, 'PATH', JS.ORDER_ATOMIC) || '""';
                var code = '(window.FS ? window.FS.readdir(' + path + ') : [])';
                return [code, JS.ORDER_FUNCTION_CALL];
            },
            'sysapi_file_info': function(block) {
                var path = JS.valueToCode(block, 'PATH', JS.ORDER_ATOMIC) || '""';
                var prop = block.getFieldValue('PROP');
                var code = '(window.FS ? window.FS.stat(' + path + ').' + prop + ' : null)';
                return [code, JS.ORDER_FUNCTION_CALL];
            },
            'sysapi_copy_file': function(block) {
                var src = JS.valueToCode(block, 'SRC', JS.ORDER_ATOMIC) || '""';
                var dest = JS.valueToCode(block, 'DEST', JS.ORDER_ATOMIC) || '""';
                return 'if(window.FS) window.FS.copyFile(' + src + ', ' + dest + ');\n';
            },
            'sysapi_get_os': function(block) {
                var prop = block.getFieldValue('PROP');
                var code = '(window.System ? window.System.getOS().' + prop + ' : "")';
                return [code, JS.ORDER_FUNCTION_CALL];
            },
            'sysapi_open_url': function(block) {
                var url = JS.valueToCode(block, 'URL', JS.ORDER_ATOMIC) || '""';
                return 'if(window.System) window.System.openExternal(' + url + ');\n';
            },
            'sysapi_get_clipboard': function() {
                var code = '(window.System ? window.System.getClipboardText() : "")';
                return [code, JS.ORDER_FUNCTION_CALL];
            },
            'sysapi_set_clipboard': function(block) {
                var text = JS.valueToCode(block, 'TEXT', JS.ORDER_ATOMIC) || '""';
                return 'if(window.System) window.System.setClipboardText(' + text + ');\n';
            },
            'sysapi_open_file_dialog': function(block) {
                var mode = block.getFieldValue('MODE');
                var code = '(function(){try{var r=require("electron").remote||require("@electron/remote");var d=r.dialog;var result=' +
                    (mode === 'save' ? 'd.showSaveDialogSync({})' : 'd.showOpenDialogSync({properties:["openFile"]})') +
                    ';return result||""}catch(e){return ""}})()';
                return [code, JS.ORDER_FUNCTION_CALL];
            }
        };

        Object.keys(generators).forEach(function(type) {
            if (JS.forBlock) {
                JS.forBlock[type] = generators[type];
            } else {
                JS[type] = generators[type];
            }
        });

        console.log('[K4 Ultra] System API generators registered');
    }

    // ========== 导入第三方库按钮（注入到header右侧） ==========
    function injectImportButton() {
        var headerRight = document.querySelector('[class*="header_right"]');
        if (!headerRight) {
            setTimeout(injectImportButton, 1000);
            return;
        }
        if (document.getElementById('k4u-import-btn')) return;

        var btn = document.createElement('div');
        btn.id = 'k4u-import-btn';
        btn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:4px 10px;margin:0 6px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;font-family:-apple-system,PingFang SC,Microsoft YaHei,sans-serif;transition:all 0.2s;box-shadow:0 2px 6px rgba(102,126,234,0.3);height:28px;vertical-align:middle;';
        btn.innerHTML = '<span style="font-size:13px;">📦</span> 导入库';
        btn.onmouseenter = function() { this.style.opacity = '0.85'; };
        btn.onmouseleave = function() { this.style.opacity = '1'; };

        btn.onclick = function() {
            try {
                var dialog = null;
                try { dialog = require("electron").remote.dialog; } catch(e1) {}
                if (!dialog) { try { dialog = require("@electron/remote").dialog; } catch(e2) {} }
                if (!dialog) {
                    alert("请将JS库文件放入 resources/app/extensions/ 目录，重启后自动加载");
                    return;
                }
                var result = dialog.showOpenDialogSync({
                    title: "选择第三方库文件",
                    filters: [{ name: "JavaScript文件", extensions: ["js"] }, { name: "所有文件", extensions: ["*"] }],
                    properties: ["openFile", "multiSelections"]
                });
                if (result && result.length > 0) {
                    var loaded = [], errors = [];
                    result.forEach(function(filePath) {
                        try {
                            var code = FS.readFile(filePath, 'utf8');
                            new Function(code)();
                            loaded.push(filePath.split('\\').pop());
                        } catch(e) { errors.push(filePath.split('\\').pop() + ': ' + e.message); }
                    });
                    var msg = '';
                    if (loaded.length > 0) msg += '成功导入 ' + loaded.length + ' 个库:\n' + loaded.join('\n');
                    if (errors.length > 0) msg += '\n\n导入失败:\n' + errors.join('\n');
                    if (msg) alert(msg);
                }
            } catch(e) {
                console.error('[K4 Ultra] Import error:', e);
                alert('导入功能暂不可用: ' + e.message);
            }
        };

        headerRight.insertBefore(btn, headerRight.firstChild);
        console.log('[K4 Ultra] Import button injected into header');
    }

    // ========== 初始化 ==========
    console.log('[K4 Ultra] Extension loader v6.0 starting...');
    registerSystemAPIGenerators();

    function waitForEditor(callback, maxWait) {
        maxWait = maxWait || 60000;
        var start = Date.now();
        function check() {
            var hasHeader = document.querySelector('[class*="header_right"]');
            if (hasHeader) { callback(); }
            else if (Date.now() - start < maxWait) { setTimeout(check, 1000); }
        }
        check();
    }

    waitForEditor(function() {
        injectImportButton();
        console.log('[K4 Ultra] Ready.');
    });

})();
