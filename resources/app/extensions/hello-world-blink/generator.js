(function() {
  var generators = {};

  generators.hello_say = function(block) {
    var name = block.value_to_code("NAME", 0) || '"World"';
    return ['("Hello, " + ' + name + ' + "!")', 0];
  };

  generators.hello_time = function(block) {
    return ["Date.now()", 0];
  };

  generators.hello_random_color = function(block) {
    return ["(function(){ var hex='#'; for(var i=0;i<6;i++){ hex+='0123456789ABCDEF'.charAt(Math.floor(Math.random()*16)); } return hex; })()", 0];
  };

  return generators;
})();
