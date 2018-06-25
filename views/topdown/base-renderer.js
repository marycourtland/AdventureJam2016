var BaseRenderer = module.exports = function() {
};

BaseRenderer.prototype = {};

BaseRenderer.prototype.init = function(params) {
    this.viewParams = params;
    this.onInit(params);
}

BaseRenderer.prototype.onInit = function(params) {};


// more ugh. Pixels should be relative to the top left corner of the map itself, not the html element
BaseRenderer.prototype.getCoordsFromPixels = function(pixels) {
    return {
        x: Math.floor(pixels.x / this.viewParams.dims.x),
        y: Math.floor(pixels.y / this.viewParams.dims.y)
    }
}

BaseRenderer.prototype.getPixelsFromCoords = function(coords, cellAnchor) {
    var pixels = {
        x: coords.x * this.viewParams.dims.x,
        y: coords.y * this.viewParams.dims.y
    }

    switch(cellAnchor) {
        case 'middle':
            pixels.x += this.viewParams.dims.x / 2;
            pixels.y += this.viewParams.dims.y / 2;
            break;
        default:
            break;
    }

    return pixels;
};