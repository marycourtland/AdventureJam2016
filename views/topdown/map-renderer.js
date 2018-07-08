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

    this.view.recenter(this.map.center);
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

    var position = this.view.getPixelsFromCoords(coords);
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

    self.html.innerHTML = '';

    env = env || this.map.env;
    env.range().forEach(function(coords) {
        var cellElement = self.createCell(env.get(coords));
        self.positionCell(cellElement, coords);
        self.html.appendChild(cellElement);
    })
}

// Todo: what is the difference between refresh and render ???
MapRenderer.prototype.refresh = function(env, fullRefresh) {
    console.log('refreshing')
    var self = this;
    env = env || this.map.env;

    var coordsToRefresh = env.range();

    // TODO: this is super buggy with cells that used to be in view but aren't anymore
    //if (!fullRefresh) coordsToRefresh = coordsToRefresh.filter(function(crd) { return self.view.isInView(crd); });
 
    coordsToRefresh.forEach(function(coords) { self.refreshCoords(env, coords); })
    return this;
}

MapRenderer.prototype.refreshCoords = function(env, coords) {
    env = env || this.map.env;
    var cellObject = env.get(coords);
    var cellElement = document.getElementById(this.coordsToId(coords));
    this.styleCell(cellElement, cellObject)
    this.positionCell(cellElement, coords);
    return this;
}

MapRenderer.prototype.refreshCell = function(coords, forceRefresh) {
    if (!forceRefresh && !this.view.isInView(coords)) return this;
    this.refreshCoords(this.map.env, coords);
}


MapRenderer.prototype.isInWindow = function(coords) {
    var distance = Math.max(
        Math.abs(coords.x - this.map.center.x),
        Math.abs(coords.y - this.map.center.y)
    )
    console.log('is in window?', coords, distance < this.window, distance, this.window)
    return distance < this.window;

}