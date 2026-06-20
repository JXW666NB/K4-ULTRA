(function() {
  var generators = {};

  generators.system_read_file = function(block) {
    var path = block.value_to_code("PATH", 0) || '""';
    return ["system_read_file({PATH:" + path + "})", 0];
  };

  generators.system_write_file = function(block) {
    var path = block.value_to_code("PATH", 0) || '""';
    var content = block.value_to_code("CONTENT", 0) || '""';
    return "system_write_file({PATH:" + path + ", CONTENT:" + content + "});\n";
  };

  generators.system_file_exists = function(block) {
    var path = block.value_to_code("PATH", 0) || '""';
    return ["system_file_exists({PATH:" + path + "})", 0];
  };

  generators.system_create_dir = function(block) {
    var path = block.value_to_code("PATH", 0) || '""';
    return "system_create_dir({PATH:" + path + "});\n";
  };

  generators.system_list_dir = function(block) {
    var path = block.value_to_code("PATH", 0) || '""';
    return ["system_list_dir({PATH:" + path + "})", 0];
  };

  generators.system_get_os = function(block) {
    return ["system_get_os({})", 0];
  };

  generators.system_open_url = function(block) {
    var url = block.value_to_code("URL", 0) || '""';
    return "system_open_url({URL:" + url + "});\n";
  };

  generators.system_get_clipboard = function(block) {
    return ["system_get_clipboard({})", 0];
  };

  generators.system_set_clipboard = function(block) {
    var text = block.value_to_code("TEXT", 0) || '""';
    return "system_set_clipboard({TEXT:" + text + "});\n";
  };

  return generators;
})();
