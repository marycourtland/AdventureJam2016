var RuleSet = require('./ruleset');
var SpeciesMask = require('./species-mask');

module.exports = Species = function(params) {
    this.id = params.id || 'species' + Math.floor(Math.random()*1e8);
    this.symbol = params.symbol || '';
    this.color = params.color || 'black';

    // behavior
    this.passable = params.passable || true;

    this.ruleSet = new RuleSet(params.rules);

    // This is a function to decide whether a cell hosts this species or not
    this.mask = SpeciesMask(this);
}

Species.prototype = {};

Species.prototype.getSymbol = function() { return this.symbol; }
Species.prototype.getColor = function() { return this.color; }

// Returns 1 or 0, depending on whether the next iteration should include this species
Species.prototype.nextState = function(cell, neighbors) {
    // turn these things into arrays of 1s and 0s (or whatever)
    var self = this;
    var maskedCell = this.mask(cell);
    var maskedNeighbors = neighbors.map(function(coordmap) {
        // return another coordmap
        return {coords: coordmap.coords, value: self.mask(coordmap.value)};
    });

    return this.ruleSet.transform(maskedCell, maskedNeighbors);
}


