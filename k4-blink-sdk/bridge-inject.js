/**
 * ============================================================
 * K4 Blink Bridge API - 注入到 kitten.js 的桥梁代码
 * ============================================================
 *
 * 作用: 将 Blink 引擎内部的 Registry/Generator/BlockDef 暴露到
 *      window.__k4，使扩展可以在运行时动态注册。
 *
 * 注入位置: 2 处，分别对应"积木层"和"运行时层"
 *
 * 【使用方式】
 *   1. 用文本编辑器打开 kitten.822d814413fb10654fde.js
 *   2. 搜索下方标注的【锚点】，将对应片段粘贴到锚点之后
 *   3. 保存，重启 exe（只需做一次，后续扩展无需再改）
 *
 * ============================================================
 */



// ============================================================
// 【第一处注入】积木层 Bridge - 在 init_basic_blocks 末尾
// ============================================================
//
// 锚点: 搜索 "// 【K4 Ultra】系统API积木定义"
//       在 define_blocks_with_json_array 调用完成后注入
//
// 此位置的 e 是 Blockly/Blink 实例，拥有:
//   - e.define_blocks_with_json_array
//   - e.js_generator.register
//
// ============================================================

;(function() {
  // ── 初始化全局桥接对象 ──
  window.__k4 = window.__k4 || {};

  // ── 1. Blocks API: 注册积木外观 ──
  window.__k4.blocks = {
    define: function(jsonArray) {
      try {
        e.define_blocks_with_json_array(jsonArray);
        console.log('[K4 Bridge] Defined ' + jsonArray.length + ' blocks');
      } catch(err) {
        console.error('[K4 Bridge] blocks.define error:', err.message);
      }
    }
  };

  // ── 2. Generator API: 注册代码生成器 ──
  window.__k4.generator = {
    register: function(type, fn) {
      try {
        if (e && e.js_generator && e.js_generator.register) {
          e.js_generator.register(type, fn);
        } else {
          console.warn('[K4 Bridge] js_generator not available, retrying...');
          setTimeout(function() {
            if (e && e.js_generator && e.js_generator.register) {
              e.js_generator.register(type, fn);
            }
          }, 2000);
        }
      } catch(err) {
        console.error('[K4 Bridge] generator.register error:', err.message);
      }
    },
    registerBatch: function(generators) {
      for (var type in generators) {
        if (generators.hasOwnProperty(type)) {
          window.__k4.generator.register(type, generators[type]);
        }
      }
    }
  };

  console.log('[K4 Bridge] Blocks & Generator API ready');
})();



// ============================================================
// 【第二处注入】运行时 Bridge - 在 Heart IIFE 中注入
// ============================================================
//
// 锚点: 搜索 "_reg.register({"
//       在 Heart IIFE 中，_reg 变量可用时注入
//
// 此位置的 _reg 是 RegistryImpl 单例，拥有:
//   - _reg.register({namespace, id, domain_function})
//
// ============================================================

;(function() {
  window.__k4 = window.__k4 || {};

  // ── 3. Runtime API: 注册 Domain Function ──
  window.__k4.runtime = {
    register: function(id, fn) {
      try {
        if (_reg && _reg.register) {
          _reg.register({
            namespace: '',
            id: id,
            domain_function: fn
          });
        } else {
          console.warn('[K4 Bridge] registry not available');
        }
      } catch(err) {
        console.error('[K4 Bridge] runtime.register error:', err.message);
      }
    },
    registerBatch: function(funcs) {
      var count = 0;
      for (var id in funcs) {
        if (funcs.hasOwnProperty(id)) {
          window.__k4.runtime.register(id, funcs[id]);
          count++;
        }
      }
      console.log('[K4 Bridge] Registered ' + count + ' domain functions');
    }
  };

  // ── 4. 安全沙盒: 权限检查接口 ──
  window.__k4.security = window.__k4.security || {};
  window.__k4.security._cache = {};
  window.__k4.security._prompts = {};

  // 注册需要用户确认的敏感操作
  window.__k4.security.registerSensitiveOp = function(opId, description) {
    window.__k4.security._prompts[opId] = description;
  };

  // 检查权限（弹窗询问用户）
  window.__k4.security.checkPermission = function(opId) {
    var cache = window.__k4.security._cache;

    // 已缓存的决定
    if (cache[opId] === 'granted') return true;
    if (cache[opId] === 'denied') return false;

    // 首次询问
    var desc = window.__k4.security._prompts[opId] || '执行系统操作';
    var result = confirm(
      '[K4 安全沙盒]\n\n' +
      '扩展请求执行以下操作:\n' +
      desc + '\n\n' +
      '是否允许?'
    );

    cache[opId] = result ? 'granted' : 'denied';
    return result;
  };

  // 包装函数: 自动添加权限检查
  window.__k4.security.wrap = function(opId, description, fn, defaultReturn) {
    window.__k4.security.registerSensitiveOp(opId, description);
    return function(args) {
      if (window.__k4.security.checkPermission(opId)) {
        return fn(args);
      }
      return typeof defaultReturn !== 'undefined' ? defaultReturn : null;
    };
  };

  console.log('[K4 Bridge] Runtime & Security API ready');
})();
