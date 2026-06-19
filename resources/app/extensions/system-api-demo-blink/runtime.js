(function() {
  var exports = {};
  var _fs, _electron;
  try { _fs = require('fs'); } catch(e) { _fs = null; }
  try { _electron = require('electron'); } catch(e) { _electron = null; }

  function fsWrap(fn) {
    if (!_fs) return function() { return "ERR: fs unavailable"; };
    return fn;
  }

  exports.system_read_file = function(args) {
    try { return _fs.readFileSync(String(args.PATH || ""), "utf8"); }
    catch(e) { return "ERR:" + e.message; }
  };

  exports.system_write_file = function(args) {
    try { _fs.writeFileSync(String(args.PATH || ""), String(args.CONTENT || ""), "utf8"); }
    catch(e) {}
  };

  exports.system_file_exists = function(args) {
    try { return _fs.existsSync(String(args.PATH || "")); }
    catch(e) { return false; }
  };

  exports.system_create_dir = function(args) {
    try { _fs.mkdirSync(String(args.PATH || ""), { recursive: true }); }
    catch(e) {}
  };

  exports.system_list_dir = function(args) {
    try { return JSON.stringify(_fs.readdirSync(String(args.PATH || ""))); }
    catch(e) { return "[]"; }
  };

  exports.system_get_os = function(args) {
    try {
      var os = require('os');
      return JSON.stringify({ platform: os.platform(), arch: os.arch(), version: os.release() });
    } catch(e) { return "{}"; }
  };

  exports.system_open_url = function(args) {
    try {
      if (_electron && _electron.shell) _electron.shell.openExternal(String(args.URL || ""));
    } catch(e) {}
  };

  exports.system_get_clipboard = function(args) {
    try {
      if (_electron && _electron.clipboard) return _electron.clipboard.readText();
    } catch(e) {}
    return "";
  };

  exports.system_set_clipboard = function(args) {
    try {
      if (_electron && _electron.clipboard) _electron.clipboard.writeText(String(args.TEXT || ""));
    } catch(e) {}
  };

  return exports;
})();
