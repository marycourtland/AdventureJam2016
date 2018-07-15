var BaseRenderer = require('./base-renderer');
var Cell = require('./components/cell');
var doT = require('dot');
var fs = require('fs');

var template = doT.compile(fs.readFileSync('./views/topdown/templates/cell-inspector.html', 'utf8'));

var CellInspectorRenderer = module.exports = function() {
}

CellInspectorRenderer.prototype = new BaseRenderer();

CellInspectorRenderer.prototype.onInit = function(params) {
    this.html = params.html;

    // ugh, bad code
    this.view.loadCell = (cell) => {
        this.view.recenter(cell.coords);

        var cellHtml = new Cell(cell, this, {noPositioning: true});

        if (this.html.cell.firstChild) {
            this.html.cell.removeChild(this.html.cell.firstChild);
        }
        this.html.cell.appendChild(cellHtml.element);

        this.html.text.innerHTML = template({cell: cell, register: cell.getRegister() });
    }

    // more bad code
    this.view.getPixelsFromCoords = function() { return XY(0, 0); }
}

CellInspectorRenderer.prototype.refresh = function() {
}

CellInspectorRenderer.prototype.render = function() {
}