/*globals d3:false, planetaryjs:false, alert:false, moment:false */
'use strict';

(function() {

  var options = {
    cell_height: 80,
    vertical_margin: 10
  };
  $('.grid-stack').gridstack(options);
  var self = this,
      canvas = document.getElementById('planetCanvas'),
      // Create our Planetary.js planet and set some initial values;
      // we use several custom plugins, defined at the bottom of the file
      planet = planetaryjs.planet();

  var paused = false;
  var visualPause = false;
  var isDragged = false;

  planet.loadPlugin(planetaryjs.plugins.earth({
    topojson: { file:   '/data/topo.json' },
    oceans:   { fill:   '#001320' },
    land:     { fill:   '#06304e' },
    borders:  { stroke: '#001320' }
  }));
  planet.loadPlugin(self.planetPlugins.pings());

  var element = d3.select(canvas).node().parentNode;
  var parentNode = d3.select(element).node().parentNode;
  var controls = d3.select(parentNode).select('#controls').node();
  var height = element.offsetHeight - controls.offsetHeight;
  var scale = Math.min(element.offsetWidth, height) / 2;
  planet.loadPlugin(planetaryjs.plugins.zoom({
    scaleExtent: [50, 5000],
    initialScale: scale
  }));

  planet.loadPlugin(self.planetPlugins.autoScaleCenter({extraHeight: -120}));
  function onClick(planet) {
    if (visualPause) {
      planet.plugins.autorotate.resume();
      visualPause = false;
    } else {
      planet.plugins.autorotate.pause();
      visualPause = true;
    }
  }
  planet.loadPlugin(planetaryjs.plugins.drag({
    onDragStart: function() {
      isDragged = false;
      this.plugins.autorotate.pause();
      d3.event.sourceEvent.stopPropagation();
      d3.event.sourceEvent.preventDefault();
    },
    onDrag: function() {
      isDragged = true;
      d3.event.sourceEvent.stopPropagation();
      d3.event.sourceEvent.preventDefault();
    },
    onDragEnd: function() {
      if (isDragged) {
        if (!visualPause) {
          this.plugins.autorotate.resume();
        }
      } else {
        onClick(this);
      }
      d3.event.sourceEvent.stopPropagation();
      d3.event.sourceEvent.preventDefault();
    }
  }));
  planet.loadPlugin(self.planetPlugins.autorotate(5));
  planet.projection.rotate([100, -10, 0]);
  planet.draw(canvas);

  // Load our data and set up the controls.
  // The data consists of an array of objects in the following format:
  // The data is ordered, with the earliest data being the first in the file.
  function load() {
    var selectValue = d3.select('select#data').property('value');
    d3.json(selectValue, onDataLoad);
  }
  load();
  d3.select('select#data').on('change', load);
  $('.grid-stack').on('resizestop', function (event, ui) {
    if ($(event.target).hasClass('globe-container')) {
      self.planetUtils.resize(planet);
    }
  })

  function onDataLoad(err, data) {

    if (err) {
      alert('Problem loading the data.');
      return;
    }
    data = self.planetUtils.modify(data);
    var start = d3.min(data, function(d) { return d.time; });
    var end =  d3.max(data, function(d) {return d.time;});
    var currentTime = start;
    var lastTick = new Date().getTime();
    var colors = d3.scale.linear()
      .domain(d3.extent(data, function(d) { return d.value;}))
      // Range from green to range
      .range(['#32cd32', '#AA0114']);
    // Also create a scale for mapping values to ping angle sizes
    var angles = d3.scale.linear()
      .domain(d3.extent(data, function(d) { return d.value;}))
      // Increase 40 to increase the radius
      .range([0.5, 60]);
    // And finally, a scale for mapping values to ping TTLs
    var ttls = d3.scale.pow()
      .exponent(3)
      .domain(d3.extent(data, function(d) { return d.value;}))
      .range([2000, 5000]);

    function updateDate() {
      d3.select('#date').text(moment(currentTime).utc().format('MMM YYYY'));
    }

    // A scale that maps a percentage of playback to a time
    // from the data; for example, `50` would map to the halfway
    // mark between the first and last items in our data array.
    var percentToDate = d3.scale.linear()
      .domain([0, 100])
      .range([start, end]);

    // A scale that maps real time passage to data playback time.
    // 12 minutes of real time maps to the entirety of the
    // timespan covered by the data.
    var realToData = d3.scale.linear()
      // decrese  to fasten
      // increase to slow down
      .domain([0, 1000 * 90])
      .range([0, end - start]);

    // Pause playback and update the time display
    // while scrubbing using the range input.
    d3.select('#slider')
      .on('change', function() {
        currentTime = percentToDate(d3.event.target.value);
        updateDate();
      })
      .call(d3.behavior.drag()
        .on('dragstart', function() { paused = true; })
        .on('dragend', function() { paused = false; })
      );

    // The main playback loop; for each tick, we'll see how much
    // time passed in our accelerated playback reel and find all
    // the earthquakes that happened in that timespan, adding
    // them to the globe with a color and angle relative to their values.
    d3.timer(function() {
      var now = new Date().getTime();
      if (paused) {
        lastTick = now;
        return;
      }

      var realDelta = now - lastTick;
      // Avoid switching back to the window only to see thousands of pings;
      // if it's been more than 500 milliseconds since we've updated playback,
      // we'll just set the value to 500 milliseconds.
      if (realDelta > 500) {
        realDelta = 500;
      }
      var dataDelta = realToData(realDelta);

      var toPing = data.filter(function(d) {
        return d.time > currentTime && d.time <= currentTime + dataDelta;
      });

      for (var i = 0; i < toPing.length; i++) {
        var ping = toPing[i];
        planet.plugins.pings.add(ping.lng, ping.lat, {
          // Here we use the `angles` and `colors` scales we built earlier
          // to convert magnitudes to appropriate angles and colors.
          angle: angles(ping.value),
          color: colors(ping.value),
          ttl:   ttls(ping.value)
        });
      }

      currentTime += dataDelta;
      if (currentTime > end) {
        currentTime = start;
      }
      updateDate();
      d3.select('#slider').property('value', percentToDate.invert(currentTime));
      lastTick = now;
    });
  }

}).call(window);
