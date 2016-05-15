module.exports = Renderer = function(dims) {
    this.dims = dims;
}


// Settings
cellClass = 'cell'
cellIdDelimiter = '_'
cellIdPrefix = Renderer.cellClass + Renderer.cellIdDelimiter;


// Methods

Renderer.prototype = {};

Renderer.prototype.coordsToId = function(coords) {
    return cellIdPrefix + coords.x + cellIdDelimiter + coords.y
}
Renderer.prototype.idToCoords = function(id) {
    var coordArray = id.slice(cellIdPrefix.length).split(cellIdDelimiter);
    return {x: coordArray[0], y: coordArray[1] }
}

Renderer.prototype.createCell = function(cellObject) {
    var cellElement = document.createElement('div');
    cellElement.setAttribute('class', cellClass);
    this.refreshCell(cellElement, cellObject);
    return cellElement;
}

Renderer.prototype.refreshCell = function(cellElement, cellObject) {
    cellElement.style.width = this.dims.x + 'px';
    cellElement.style.height = this.dims.y + 'px';
    cellElement.style.lineHeight = this.dims.y + 'px';
    cellElement.style.backgroundColor = cellObject.species.getColor();
    cellElement.innerHTML = cellObject.species.getSymbol();
}

Renderer.prototype.positionCell = function(cellElement, coords) {
    cellElement.setAttribute('id',  this.coordsToId(coords));
    cellElement.style.left = (coords.x * this.dims.x) + 'px';
    cellElement.style.top = (coords.y * this.dims.y) + 'px';
    return cellElement;
}

Renderer.prototype.render = function(env, html) {
    var self = this;

    html.innerHTML = '';

    env.range().forEach(function(coords) {
        var cellElement = self.createCell(env.get(coords));
        self.positionCell(cellElement, coords);
        html.appendChild(cellElement);
    })
}

Renderer.prototype.refresh = function(env) {
    var self = this;
 
    env.range().forEach(function(coords) {
        var cellObject = env.get(coords);
        var cellElement = document.getElementById(self.coordsToId(coords));
        self.refreshCell(cellElement, cellObject)
        self.positionCell(cellElement, coords)
    })
}



