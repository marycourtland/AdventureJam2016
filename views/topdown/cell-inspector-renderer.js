var BaseRenderer = require('./base-renderer');
var Cell = require('./components/cell');

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

        this.html.text.innerText = [
            'Coords: (' + cell.coords.x + ', ' + cell.coords.y + ')',
            '',
            'Species:',
            '',
            cell.getRegister().map((reg) => {
                var is_dominant = reg.species.id == cell.species.id;
                return [
                    reg.species.id.toUpperCase() + (is_dominant ? " (Dominant)" : ""),
                    "-- age: " + reg.age,
                    ""
                ].join('\n')
            }).join('\n')
        ].join('\n')
    }

    // more bad code
    this.view.getPixelsFromCoords = function() { return XY(0, 0); }
}

CellInspectorRenderer.prototype.refresh = function() {
}

CellInspectorRenderer.prototype.render = function() {
}