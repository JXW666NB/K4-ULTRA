(function() {
  'use strict';
  var _exports = {};

  _exports.hello_world = function(args) {
    try {
      return 'Hello World! 来自 K4 Blink 扩展';
    } catch(e) {
      return '[Error] ' + e.message;
    }
  };

  _exports.hello_greet = function(args) {
    try {
      var name = args.NAME || '世界';
      return '你好, ' + name + '!';
    } catch(e) {
      return '[Error] ' + e.message;
    }
  };

  _exports.hello_alert = function(args) {
    try {
      var text = args.TEXT || '空消息';
      alert('[K4扩展] ' + text);
    } catch(e) {
      console.error('[HelloWorld] alert error:', e.message);
    }
  };

  // 安全沙盒演示积木：会触发弹窗询问
  _exports.hello_delete = function(args) {
    try {
      var path = args.PATH || '未指定路径';
      return '[演示] 已授权删除: ' + path;
    } catch(e) {
      return '[Error] ' + e.message;
    }
  };

  return _exports;
})();
