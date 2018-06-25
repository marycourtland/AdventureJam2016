var AssetData = require('./asset-data');
var BaseRenderer = require('./base-renderer');

module.exports = MapRenderer = function(map) {
    this.map = map;
}

MapRenderer.prototype = new BaseRenderer();

MapRenderer.prototype.onInit = function(params) {
    this.window = params.window;
    this.html = params.html.board;
    this.dims = params.dims;
    this.centerCoords = this.map.center;
    this.bbox = this.html.getBoundingClientRect();
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

MapRenderer.prototype.coordsToId = function(coords) {
    return cellIdPrefix + coords.x + cellIdDelimiter + coords.y
}
MapRenderer.prototype.idToCoords = function(id) {
    var coordArray = id.slice(cellIdPrefix.length).split(cellIdDelimiter);
    return {x: coordArray[0], y: coordArray[1] }
}


MapRenderer.prototype.createCell = function(cellObject) {
    var cellElement = document.createElement('div');
    cellElement.setAttribute('class', cellClass);
    this.styleCell(cellElement, cellObject);
    this.bindCellEvents(cellObject);
    return cellElement;
}

MapRenderer.prototype.styleCell = function(cellElement, cellObject) {
    var assetData = AssetData[cellObject.species.id];
    cellElement.style.width = this.dims.x + 'px';
    cellElement.style.height = this.dims.y + 'px';
    cellElement.style.lineHeight = this.dims.y + 'px';
    cellElement.style.backgroundColor = assetData.color; 
    cellElement.innerHTML = assetData.symbol;

    // highlight ruts
    if (Object.keys(cellObject.ruts).length > 0) {
        cellElement.style.border = '1px solid red';
        cellElement.style.width = (this.dims.x - 2) + 'px';
        cellElement.style.height = (this.dims.y - 2) + 'px';

        var rut_string = '';
        for (var r in cellObject.getActiveRuts()) {
           rut_string += r[0].toUpperCase(); 
        }

        cellElement.innerHTML = rut_string;
        cellElement.style.color = 'red'
    }
}

MapRenderer.prototype.positionCell = function(cellElement, coords) {
    cellElement.setAttribute('id',  this.coordsToId(coords));

    var position = {
        x: this.centerPx.x + (-this.centerCoords.x + coords.x) * this.dims.x,
        y: this.centerPx.y + (-this.centerCoords.y + coords.y) * this.dims.y
    }

    cellElement.style.left = position.x + 'px';
    cellElement.style.top = position.y + 'px';
    return cellElement;
}

MapRenderer.prototype.bindCellEvents = function(cellObject) {
    var self = this;
    cellObject.on('change', 'refresh', function(data) {
       self.refreshCell(cellObject.coords) 
    })
}

MapRenderer.prototype.getCell = function(coords) {
    return document.getElementById(this.coordsToId(coords));
}

MapRenderer.prototype.render = function(env) {
    var self = this;

    self.rescale();

    self.html.innerHTML = '';

    env.range().forEach(function(coords) {
        var cellElement = self.createCell(env.get(coords));
        self.positionCell(cellElement, coords);
        self.html.appendChild(cellElement);
    })
}

MapRenderer.prototype.refresh = function(env, fullRefresh) {
    var self = this;
    env = env || this.map.env;

    self.rescale();

    var coordsToRefresh = env.range();

    // TODO: this is super buggy with cells that used to be in view but aren't anymore
    if (!fullRefresh) coordsToRefresh = coordsToRefresh.filter(function(crd) { return self.isInView(crd); });
 
    coordsToRefresh.forEach(function(coords) { self.refreshCoords(env, coords); })
    return this;
}

MapRenderer.prototype.refreshCoords = function(env, coords) {
    var cellObject = env.get(coords);
    var cellElement = document.getElementById(this.coordsToId(coords));
    this.styleCell(cellElement, cellObject)
    this.positionCell(cellElement, coords);
    return this;
}

MapRenderer.prototype.rescale = function() {
    // argh
    this.viewSize = {
        x: this.bbox.width / this.dims.x,
        y: this.bbox.height / this.dims.y
    };
    return this;
}

// Returns the number of pixels between the html's NW corner and the map's NW corner (at 0,0) 
MapRenderer.prototype.getPixelOffset = function() {
    return {
        x: this.centerPx.x + -this.centerCoords.x * this.dims.x,
        y: this.centerPx.y + -this.centerCoords.y * this.dims.y
    }
}

// Returns cell coords, not pixels
MapRenderer.prototype.getViewBbox = function() {
    return {
        x1: this.centerCoords.x - this.viewSize.x/2,
        x2: this.centerCoords.x + this.viewSize.x/2,
        y1: this.centerCoords.y - this.viewSize.y/2,
        y2: this.centerCoords.y + this.viewSize.y/2,
    }
}

// Returns whether a cell coords is in view or not
MapRenderer.prototype.isInView = function(coords) {
    var bbox = this.getViewBbox();
    return coords.x > bbox.x1
        && coords.x < bbox.x2
        && coords.y > bbox.y1
        && coords.y < bbox.y2;
}


MapRenderer.prototype.isInWindow = function(coords) {
    var distance = Math.max(
            Math.abs(coords.x - this.map.center.x),
            Math.abs(coords.y - this.map.center.y)
        )   
    return distance < this.window;

}

MapRenderer.prototype.refreshCell = function(coords, forceRefresh) {
    if (!forceRefresh && !this.isInView(coords)) return this;
    this.refreshCoords(this.map.env, coords);
}

MapRenderer.prototype.zoomOut = function() {
    this.dims.x /= this.zoomFactor;
    this.dims.y /= this.zoomFactor;
    //this.window *= this.zoomFactor;
    this.refresh()
    return this;
}

MapRenderer.prototype.zoomIn = function() {
    this.dims.x *= this.zoomFactor;
    this.dims.y *= this.zoomFactor;
    //this.window /= this.zoomFactor;
    this.refresh()
    return this;
}

MapRenderer.prototype.recenter = function(coords) {
    this.centerCoords.x = coords.x;
    this.centerCoords.y = coords.y;
    this.refresh();
    return this;
}

MapRenderer.prototype.shiftView = function(dCoords) {
    this.recenter({
        x: this.centerCoords.x + dCoords.x,
        y: this.centerCoords.y + dCoords.y
    })
    return this;
}
