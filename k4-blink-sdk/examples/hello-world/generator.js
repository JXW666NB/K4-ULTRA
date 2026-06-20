(function() {
  'use strict';
  var _generators = {};

  _generators.hello_world = function(block) {
    return 'alert("Hello World! 来自 K4 Blink 扩展");\n';
  };

  _generators.hello_greet = function(block) {
    var name = block.value_to_code('NAME', 0) || '"世界"';
    return ['("你好, " + ' + name + ' + "!")', 0];
  };

  _generators.hello_alert = function(block) {
    var text = block.value_to_code('TEXT', 0) || '""';
    return 'alert("[K4扩展] " + ' + text + ');\n';
  };

  _generators.hello_delete = function(block) {
    var path = block.value_to_code('PATH', 0) || '""';
    return 'console.log("[K4扩展] 删除文件: " + ' + path + ');\n';
  };

  return _generators;
})();
