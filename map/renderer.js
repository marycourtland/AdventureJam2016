module.exports = Renderer = function(html, dims, center) {
    // Direct references. So the parent should not overwrite them.
    this.html = html;
    this.dims = dims;
    this.centerCoords = center;
    this.bbox = html.getBoundingClientRect();
    this.centerPx = {
        x: this.bbox.width / 2,
        y: this.bbox.height / 2
    }
    this.viewsize = {
        x: this.bbox.width / this.dims.x,
        y: this.bbox.height / this.dims.y
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

    self.rescale();

    self.html.innerHTML = '';

    env.range().forEach(function(coords) {
        var cellElement = self.createCell(env.get(coords));
        self.positionCell(cellElement, coords);
        self.html.appendChild(cellElement);
    })
}

Renderer.prototype.refresh = function(env, fullRefresh) {
    var self = this;

    self.rescale();

    var coordsToRefresh = env.range();

    if (!fullRefresh) coordsToRefresh = coordsToRefresh.filter(function(crd) { return self.isInView(crd); });
 
    coordsToRefresh.forEach(function(coords) {
        var cellObject = env.get(coords);
        var cellElement = document.getElementById(self.coordsToId(coords));
        self.refreshCell(cellElement, cellObject)
        self.positionCell(cellElement, coords)
    })
}

Renderer.prototype.rescale = function() {
    // argh
    this.viewSize = {
        x: this.bbox.width / this.dims.x,
        y: this.bbox.height / this.dims.y
    };
    return this;
}

// Returns the number of pixels between the html's NW corner and the map's NW corner (at 0,0) 
Renderer.prototype.getPixelOffset = function() {
    return {
        x: this.centerPx.x + -this.centerCoords.x * this.dims.x,
        y: this.centerPx.y + -this.centerCoords.y * this.dims.y
    }
}

// Returns cell coords, not pixels
Renderer.prototype.getViewBbox = function() {
    return {
        x1: this.centerCoords.x - this.viewSize.x/2,
        x2: this.centerCoords.x + this.viewSize.x/2,
        y1: this.centerCoords.y - this.viewSize.y/2,
        y2: this.centerCoords.y + this.viewSize.y/2,
    }
}

// Returns whether a cell coords is in view or not
Renderer.prototype.isInView = function(coords) {
    var bbox = this.getViewBbox();
    return coords.x > bbox.x1
        && coords.x < bbox.x2
        && coords.y > bbox.y1
        && coords.y < bbox.y2;
}
