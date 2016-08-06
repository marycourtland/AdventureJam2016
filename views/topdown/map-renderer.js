var AssetData = require('./asset-data');

module.exports = MapRenderer = {};

MapRenderer.init = function(map, params) {
    this.map = map;
    this.window = params.window;

    // Direct references. So the parent should not overwrite them.
    this.html = params.html;
    this.dims = params.dims;
    this.centerCoords = this.map.center;
    this.bbox = params.html.getBoundingClientRect();
    this.centerPx = {
        x: this.bbox.width / 2,
        y: this.bbox.height / 2
    }
    this.viewSize = {
        x: this.bbox.width / this.dims.x,
        y: this.bbox.height / this.dims.y
    }
    this.zoomFactor = 2; // /shrug
}

// Settings
cellClass = 'cell'
cellIdDelimiter = '_'
cellIdPrefix = cellClass + cellIdDelimiter;


// Methods

MapRenderer.coordsToId = function(coords) {
    return cellIdPrefix + coords.x + cellIdDelimiter + coords.y
}
MapRenderer.idToCoords = function(id) {
    var coordArray = id.slice(cellIdPrefix.length).split(cellIdDelimiter);
    return {x: coordArray[0], y: coordArray[1] }
}

// more ugh. Pixels should be relative to the top left corner of the map itself, not the html element
 MapRenderer.getCoordsFromPixels = function(pixels) {
    return {
        x: Math.floor(pixels.x / this.dims.x),
        y: Math.floor(pixels.y / this.dims.y),
    }
}

MapRenderer.createCell = function(cellObject) {
    var cellElement = document.createElement('div');
    cellElement.setAttribute('class', cellClass);
    this.styleCell(cellElement, cellObject);
    this.bindCellEvents(cellObject);
    return cellElement;
}

MapRenderer.styleCell = function(cellElement, cellObject) {
    var assetData = AssetData[cellObject.species.id];
    cellElement.style.width = this.dims.x + 'px';
    cellElement.style.height = this.dims.y + 'px';
    cellElement.style.lineHeight = this.dims.y + 'px';
    cellElement.style.backgroundColor = assetData.color; 
    cellElement.innerHTML = assetData.symbol;
}

MapRenderer.positionCell = function(cellElement, coords) {
    cellElement.setAttribute('id',  this.coordsToId(coords));

    var position = {
        x: this.centerPx.x + (-this.centerCoords.x + coords.x) * this.dims.x,
        y: this.centerPx.y + (-this.centerCoords.y + coords.y) * this.dims.y
    }

    cellElement.style.left = position.x + 'px';
    cellElement.style.top = position.y + 'px';
    return cellElement;
}

MapRenderer.bindCellEvents = function(cellObject) {
    var self = this;
    cellObject.on('change', 'refresh', function(data) {
       self.refreshCell(cellObject.coords) 
    })
}

MapRenderer.getCell = function(coords) {
    return document.getElementById(this.coordsToId(coords));
}

MapRenderer.render = function(env) {
    var self = this;

    self.rescale();

    self.html.innerHTML = '';

    env.range().forEach(function(coords) {
        var cellElement = self.createCell(env.get(coords));
        self.positionCell(cellElement, coords);
        self.html.appendChild(cellElement);
    })
}

MapRenderer.refresh = function(env, fullRefresh) {
    var self = this;
    env = env || this.map.env;

    self.rescale();

    var coordsToRefresh = env.range();

    // TODO: this is super buggy with cells that used to be in view but aren't anymore
    if (!fullRefresh) coordsToRefresh = coordsToRefresh.filter(function(crd) { return self.isInView(crd); });
 
    coordsToRefresh.forEach(function(coords) { self.refreshCoords(env, coords); })
    return this;
}

MapRenderer.refreshCoords = function(env, coords) {
    var cellObject = env.get(coords);
    var cellElement = document.getElementById(this.coordsToId(coords));
    this.styleCell(cellElement, cellObject)
    this.positionCell(cellElement, coords);
    return this;
}

MapRenderer.rescale = function() {
    // argh
    this.viewSize = {
        x: this.bbox.width / this.dims.x,
        y: this.bbox.height / this.dims.y
    };
    return this;
}

// Returns the number of pixels between the html's NW corner and the map's NW corner (at 0,0) 
MapRenderer.getPixelOffset = function() {
    return {
        x: this.centerPx.x + -this.centerCoords.x * this.dims.x,
        y: this.centerPx.y + -this.centerCoords.y * this.dims.y
    }
}

// Returns cell coords, not pixels
MapRenderer.getViewBbox = function() {
    return {
        x1: this.centerCoords.x - this.viewSize.x/2,
        x2: this.centerCoords.x + this.viewSize.x/2,
        y1: this.centerCoords.y - this.viewSize.y/2,
        y2: this.centerCoords.y + this.viewSize.y/2,
    }
}

// Returns whether a cell coords is in view or not
MapRenderer.isInView = function(coords) {
    var bbox = this.getViewBbox();
    return coords.x > bbox.x1
        && coords.x < bbox.x2
        && coords.y > bbox.y1
        && coords.y < bbox.y2;
}


MapRenderer.isInWindow = function(coords) {
    var distance = Math.max(
            Math.abs(coords.x - this.map.center.x),
            Math.abs(coords.y - this.map.center.y)
        )   
    return distance < this.window;

}

MapRenderer.refreshCell = function(coords, forceRefresh) {
    if (!forceRefresh && !this.isInView(coords)) return this;
    this.refreshCoords(this.map.env, coords);
}

MapRenderer.zoomOut = function() {
    this.dims.x /= this.zoomFactor;
    this.dims.y /= this.zoomFactor;
    //this.window *= this.zoomFactor;
    this.refresh()
    return this;
}

MapRenderer.zoomIn = function() {
    this.dims.x *= this.zoomFactor;
    this.dims.y *= this.zoomFactor;
    //this.window /= this.zoomFactor;
    this.refresh()
    return this;
}
