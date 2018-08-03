var AssetData = require('./asset-data');
var BaseRenderer = require('./base-renderer');
var Cell = require('./components/cell');

var MapRenderer = module.exports = function(map) {
    this.map = map;
}

MapRenderer.prototype = new BaseRenderer();

MapRenderer.prototype.onInit = function(params) {
    this.window = params.window;
    this.html = params.html.board;

    this.view.recenter(this.map.center);
}

MapRenderer.prototype.bindCellEvents = function(cellObject) {
    var self = this;
    cellObject.on('change', 'cell-change', function(data) {
       self.refreshCell(cellObject.coords) 
    })
    cellObject.on('add-item', 'cell-add-item', function(data) {
       self.refreshCell(cellObject.coords) 
    })
}

MapRenderer.prototype.getCell = function(coords) {
    return document.getElementById(Cell.coordsToId(coords));
}

MapRenderer.prototype.render = function(env) {
    this.html.innerHTML = '';

    env = env || this.map.env;
    env.range().forEach((coords) => {
        var cellObject = env.get(coords);
        this.bindCellEvents(cellObject);
        var cell = new Cell(cellObject, this);
        this.html.appendChild(cell.element);
    })
}

// Todo: what is the difference between refresh and render ???
MapRenderer.prototype.refresh = function(env, fullRefresh) {
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
    var cellElement = document.getElementById(Cell.coordsToId(coords));
    cellElement.cell.refresh()
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