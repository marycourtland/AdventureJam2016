var BaseRenderer = require('./base-renderer');
var Cell = require('./components/cell');
var doT = require('dot');
var fs = require('fs');
var Catalogue = require('../../map/catalogue');

var speciesTemplate = doT.compile(fs.readFileSync('./views/topdown/templates/species-inspector.html', 'utf8'));
var cellTemplate = doT.compile(fs.readFileSync('./views/topdown/templates/cell-inspector.html', 'utf8'));

var InspectorRenderer = module.exports = function() {
}

InspectorRenderer.prototype = new BaseRenderer();

InspectorRenderer.prototype.onInit = function(params) {
    this.html = params.html;

    // ugh, bad code
    this.view.loadCell = (cell) => {
        if (!cell) return;

        this.view.recenter(cell.coords);

        var cellHtml = new Cell(cell, this, {noPositioning: true});

        if (this.html.cell.firstChild) {
            this.html.cell.removeChild(this.html.cell.firstChild);
        }
        this.html.cell.appendChild(cellHtml.element);

        this.html.text.innerHTML = cellTemplate({
            cell: cell,
            register: cell.getRegister(),
            ruts: cell.getRuts(),
            catalogue: Catalogue
        });
    }

    this.view.loadSpecies = (species_id) => {
        // TODO: create fake cell with the species
        // var cellHtml = new Cell(cell, this, {noPositioning: true});

        // if (this.html.cell.firstChild) {
        //     this.html.cell.removeChild(this.html.cell.firstChild);
        // }
        // this.html.cell.appendChild(cellHtml.element);

        this.html.text.innerHTML = speciesTemplate({species: catalogue.species[species_id], catalogue: Catalogue});
    }

    // more bad code
    this.view.getPixelsFromCoords = function() { return XY(0, 0); }
}

InspectorRenderer.prototype.refresh = function() {
}

InspectorRenderer.prototype.render = function() {
}