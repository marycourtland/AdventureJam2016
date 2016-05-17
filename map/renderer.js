module.exports = Renderer = function(html, dims, center) {
    // Direct references. So the parent should not overwrite them.
    this.html = html;
    this.dims = dims;
    this.centerCoords = center;
    this.centerPx = {
        x: html.getBoundingClientRect().width / 2,
        y: html.getBoundingClientRect().height / 2
    }
}


// Settings
cellClass = 'cell'
cellIdDelimiter = '_'
cellIdPrefix = cellClass + cellIdDelimiter;


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

    var position = {
        x: this.centerPx.x + (-this.centerCoords.x + coords.x) * this.dims.x,
        y: this.centerPx.y + (-this.centerCoords.y + coords.y) * this.dims.y
    }

    cellElement.style.left = position.x + 'px';
    cellElement.style.top = position.y + 'px';
    return cellElement;
}

Renderer.prototype.render = function(env) {
    var self = this;

    self.html.innerHTML = '';

    env.range().forEach(function(coords) {
        var cellElement = self.createCell(env.get(coords));
        self.positionCell(cellElement, coords);
        self.html.appendChild(cellElement);
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

// Returns the number of pixels between the html's NW corner and the map's NW corner (at 0,0) 
Renderer.prototype.getPixelOffset = function() {
    return {
        x: this.centerPx.x + -this.centerCoords.x * this.dims.x,
        y: this.centerPx.y + -this.centerCoords.y * this.dims.y
    }
}

