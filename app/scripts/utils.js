(function() {
  var self = this;
  this.planetUtils = {};

  /**
   * Modifies the json data
   * @param data the loaded data from .json file
   * @return data with the structure
   * {
   *   value:  value,
   *   lng:  longitude_coordinates,
   *   lat:  latitude_coordinates,
   *   time: timestamp
   * }
   */
  this.planetUtils.modify = function (data) {
    data = data.map(function(obj) {
      obj.time = parseInt(obj.time) * 1000;
      return obj;
    }).filter(function(obj) {
      if (obj.lng === 'N/A' || obj.lat === 'N/A') {
        return false;
      }
      return obj.value > 0;
    });
    return data;
  };

  /**
   * Gets the width and height of the parent node of the element passed
   */
  this.planetUtils.getWidthHeight = function (planet) {
    var element = planet.canvas;
    var parentNode = d3.select(element).node().parentNode;
    return {
      width: parentNode.offsetWidth,
      height: parentNode.offsetHeight
    };
  };

  /**
   * Resizes the globe
   * @param globe The globe to be resized
   */
  this.planetUtils.resize = function (globe) {
    var wh  = self.planetUtils.getWidthHeight(globe);
    globe.canvas.width = wh.width;
    globe.canvas.height = wh.height;
    var scale = Math.min(wh.width, wh.height) / 2;
    globe.projection.scale(scale);
    globe.projection.translate([wh.width / 2, wh.height / 2]);
  };


}).call(window);
