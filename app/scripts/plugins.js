(function() {
  // Window Object
  var self = this;
  this.planetPlugins = {};

  // Plugin to resize the canvas to fill the window and to
  // automatically center the planet when the window size changes
  this.planetPlugins.autoScaleCenter = function (options) {
    options = options || {};
    var needsCentering = false;
    var globe = null;

    return function(planet) {
      globe = planet;
      globe.onInit(function() {
        needsCentering = true;
        d3.select(window).on('resize', function() {
          needsCentering = true;
        });
      });

      globe.onDraw(function() {
        if (needsCentering) {
          self.planetUtils.resize(globe);
          needsCentering = false;
        }
      });
    };
  };

  // Plugin to automatically rotate the globe around its vertical
  // axis a configured number of degrees every second.
  this.planetPlugins.autorotate = function (degPerSec) {
    return function(planet) {
      var lastTick = null;
      var paused = false;
      planet.plugins.autorotate = {
        pause:  function() { paused = true;  },
        resume: function() { paused = false; }
      };
      planet.onDraw(function() {
        if (paused || !lastTick) {
          lastTick = new Date();
        } else {
          var now = new Date();
          var delta = now - lastTick;
          var rotation = planet.projection.rotate();
          rotation[0] += degPerSec * delta / 1000;
          if (rotation[0] >= 180) {
            rotation[0] -= 360;
          }
          planet.projection.rotate(rotation);
          lastTick = now;
        }
      });
    };
  };


}).call(window);
