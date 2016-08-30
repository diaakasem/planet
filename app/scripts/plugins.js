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

  this.planetPlugins.pings = function(config) {
    var pings = [];
    config = config || {};

    function addPing(lng, lat, options) {
      options = options || {};
      options.color = options.color || config.color || 'white';
      options.angle = options.angle || config.angle || 5;
      options.ttl   = options.ttl   || config.ttl   || 2000;
      var ping = { time: new Date(), options: options };
      if (config.latitudeFirst) {
        ping.lat = lng;
        ping.lng = lat;
      } else {
        ping.lng = lng;
        ping.lat = lat;
      }
      pings.push(ping);
    }

    function drawPings(planet, context, now) {
      var newPings = [];
      for (var i = 0; i < pings.length; i++) {
        var ping = pings[i];
        var alive = now - ping.time;
        if (alive < ping.options.ttl) {
          newPings.push(ping);
          drawPing(planet, context, now, alive, ping);
        }
      }
      pings = newPings;
    }

    function drawPing(planet, context, now, alive, ping) {
      var alpha = 1 - (alive / ping.options.ttl);
      var color = d3.rgb(ping.options.color);
      color = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + alpha + ')';
      context.strokeStyle = color;
      context.lineWidth = 2;
      var circle = d3.geo.circle().origin([ping.lng, ping.lat])
        .angle(alive / ping.options.ttl * ping.options.angle)();
      context.beginPath();
      planet.path.context(context)(circle);
      context.stroke();
    }

    return function (planet) {
      planet.plugins.pings = {
        add: addPing
      };

      planet.onDraw(function() {
        var now = new Date();
        planet.withSavedContext(function(context) {
          drawPings(planet, context, now);
        });
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
