(function() {
  var exports = {};

  exports.hello_say = function(args) {
    try {
      var name = args.NAME || "World";
      return "Hello, " + name + "!";
    } catch(e) { return "ERR:" + e.message; }
  };

  exports.hello_time = function(args) {
    try { return Date.now(); } catch(e) { return 0; }
  };

  exports.hello_random_color = function(args) {
    try {
      var hex = "#";
      for (var i = 0; i < 6; i++) {
        hex += "0123456789ABCDEF".charAt(Math.floor(Math.random() * 16));
      }
      return hex;
    } catch(e) { return "#000000"; }
  };

  return exports;
})();
