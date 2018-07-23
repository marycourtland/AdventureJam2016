var AssetData = require('../asset-data');
var Cell = module.exports = {};

// Settings
const cellClass = 'cell'
const cellIdDelimiter = '_'
const cellIdPrefix = cellClass + cellIdDelimiter;

var Cell = module.exports = function(cellObject, renderer, options) {
    this.renderer = renderer;
    this.object = cellObject;
    this.options = options || {};
    this.create();
    this.refresh();
}

Cell.prototype = {};

Cell.prototype.create = function() {
    this.element = document.createElement('div');
    this.element.setAttribute('class', cellClass);
    this.element.cell = this;
}

Cell.prototype.refresh = function() {
    // styling
    var assetData = AssetData[this.object.species.id];
    this.element.style.width = this.renderer.dims.x + 'px';
    this.element.style.height = this.renderer.dims.y + 'px';
    this.element.style.lineHeight = this.renderer.dims.y + 'px';
    this.element.style.backgroundColor = assetData.color; 
    this.element.innerHTML = assetData.symbol;

    // highlight ruts
    if (Object.keys(this.object.ruts).length > 0) {
        this.element.style.border = '1px solid red';
        this.element.style.width = (this.renderer.dims.x - 2) + 'px';
        this.element.style.height = (this.renderer.dims.y - 2) + 'px';

        var rut_string = '';
        for (var r in this.object.getActiveRuts()) {
            rut_string += r[0].toUpperCase(); 
        }

        this.element.innerHTML = rut_string;
        this.element.style.color = 'red'
    }

    // items
    if (this.object.items.length > 0) {
        // TODO: rendering multiple items?
        var url = "./images/items/" + this.object.items[0].type_id + '.png'
        var img = document.createElement('img');
        img.setAttribute('src', url);
        this.element.appendChild(img);
    }
    else if (this.element.children.length > 0) {
        for (var i = 0; i < this.element.children.length; i++) {
            this.element.children[i].remove(); 
        }
    }

    // positioning
    this.element.setAttribute('id', Cell.coordsToId(this.object.coords));
    if (!this.options.noPositioning) {
        var position = this.renderer.view.getPixelsFromCoords(this.object.coords);
        this.element.style.left = position.x + 'px';
        this.element.style.top = position.y + 'px';
    }
    else {
        // ugh
        this.element.style.position = 'initial';
        this.element.style.margin = '1rem auto';
    }
}

Cell.coordsToId = function(coords) {
    return cellIdPrefix + coords.x + cellIdDelimiter + coords.y
}

Cell.idToCoords = function(id) {
    var coordArray = id.slice(cellIdPrefix.length).split(cellIdDelimiter);
    return {x: coordArray[0], y: coordArray[1] }
}
