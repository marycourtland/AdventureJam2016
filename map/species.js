var Utils = window.Utils;
var RuleSet = require('./ruleset');
var SpeciesMask = require('./species-mask');
var Catalogue = require('./catalogue');

var Species = module.exports = function(params) {
    this.id = params.id || 'species' + Math.floor(Math.random()*1e8);
    this.description = params.description || "unknown species" 

    // behavior
    // TODO: fix passable for phaser
    this.passable = params.hasOwnProperty('passable') ? params.passable : true;

    if (params.hasOwnProperty('speed')) {
        this.speed = params.speed;
    }

    if (params.hasOwnProperty('timeToIteration')) {
        this.timeToIteration = params.timeToIteration;
    }

    if (params.hasOwnProperty('forceNeighborIteration')) {
        this.forceNeighborIteration = params.forceNeighborIteration;
    }

    this.initRules(params.rules);

    // This is a function to decide whether a cell hosts this species or not
    this.mask = SpeciesMask(this.id);

    Catalogue.add('species', this);
}

Species.prototype = {};

// this is sort of messy; it populates stuff in the rules object
Species.prototype.initRules = function(rules) {
    this.rules = rules || {};

    // The default rules govern how the species spreads based on its own presence
    this.rules.default = new RuleSet(this.rules.default)

    // Ruts are like conditionals, but semantically different
    this.rules.ruts = this.rules.ruts || [];
    this.rules.ruts.forEach(function(rut) {
        rut.rules = new RuleSet(rut.rules);
    })

    // Conditional rules are based on other species
    this.rules.conditional = this.rules.conditional || [];

    this.rules.conditional.forEach(function(condition) {
        condition.mask = SpeciesMask(condition.species_id);
        condition.rules = new RuleSet(condition.rules);
    })
}

Species.prototype.getSymbol = function() { return this.symbol; }
Species.prototype.getColor = function() { return this.color; }

// Returns 1 or 0, depending on whether the next iteration should include this species
Species.prototype.nextState = function(cell, neighbors) {
    // turn these things into arrays of 1s and 0s (or whatever)
    var self = this;

    // these are the rules to use.
    var ruleset = this.decideRuleset(cell, neighbors)
    
    // these are masked by THIS species, not a foreign species returned by decideRuleset
    var maskedCell = this.mask(cell);
    var maskedNeighbors = mapCoordmap(neighbors, self.mask);


    var nextState = ruleset.transform(maskedCell, maskedNeighbors,
        Math.round(cell.forcedIterationTime)/1000
        + ' ' + 
        Math.round(cell.t_temp)/1000
            + ' ' + cell.coords.x + ',' + cell.coords.y + ' ' + this.id    
    );

    // propagate age (this will only be used if nextState is 1)
    var age = nextState == 1 ? (cell.register[this.id].age + 1) : 0;

    var strength = this.decideStrengthFromNeighbors(neighbors);

    var iterationTime = Settings.mapIterationTimeout;
    if (ruleset.hasOwnProperty('iterationTime')) {
        iterationTime = ruleset.iterationTime;
    }
    
    return {state: nextState, age: age, strength: strength, iterationTime: iterationTime};
}


Species.prototype.decideRuleset = function(cell, neighbors) {
    var winningRuleset = this.rules.default;

    if (this.rules.conditional.length + this.rules.ruts.length === 0)
        return winningRuleset;

    // RUTS
    // If a rut is present, it can override other stuff
    // - should be sorted from HIGHEST priority to lowest.
    for (var i = 0; i < this.rules.ruts.length; i++) {
        // The probability that this rut ends up affecting the cell
        // is proportional to its intensity (0 to 1)
        // TODO: this needs testing
        var rut = this.rules.ruts[i];
        var intensity = (rut.rut_id in cell.ruts) ? cell.ruts[rut.rut_id].intensity : 0;
        if (!intensity || Math.random() > intensity) continue;

        winningRuleset = rut.rules;
        return winningRuleset;
    }

    // CONDITIONAL RULES
    // - should be sorted from lowest priority to highest.

    this.rules.conditional.forEach(function(condition) {
        var maskedNeighbors = mapCoordmap(neighbors, condition.mask);
        var count = coordmapSum(maskedNeighbors);

        // the number of neighbors has to meet the neighbor threshhold
        if (condition.min_neighbors && count < condition.min_neighbors) return;

        // the cell age has to meet the age threshhold
        if (condition.min_age && cell.getAge() < condition.min_age) return;

        winningRuleset = condition.rules;
    })


    return winningRuleset;
}

Species.prototype.decideStrengthFromNeighbors = function(neighbors) {
    var speciesNeighbors = filterCoordmap(neighbors, (cell) => !!cell && this.id in cell.register);
    var neighborStrength = mapCoordmap(speciesNeighbors, (cell) => {
        return cell.register[this.id].strength;
    })
    var avgStrength = coordmapAvg(neighborStrength);
    
    return avgStrength;
}

Species.prototype.getIterationTime = function(ruts) {
    // Of all possible iteration times, pick the shortest.
    var possibleTimes = [];
    possibleTimes.push(this.timeToIteration || Settings.mapIterationTimeout);
    
    // for iteration times, ignore rut intensity. We're just looking for any possibility
    // of a shorter iteration time.
    ruts = ruts || {};
    for (var rut_id in ruts) {
        var rut = this.getRut(rut_id);
        if (rut && rut.hasOwnProperty('timeToIteration')) possibleTimes.push(rut.timeToIteration);
    }

    return Utils.arrayMin(possibleTimes);
}

Species.prototype.getRut = function(rut_id) {
    for (var i = 0; i < this.rules.ruts.length; i++) {
        if (this.rules.ruts[i].rut_id === rut_id) return this.rules.ruts[i];
    }
    return null;
}

// meh, data structure juggling
Species.prototype.getIndexedRuts = function() {
    var ruts = {};
    for (var i = 0; i < this.rules.ruts.length; i++) {
        var rut_id = this.rules.ruts[i].rut_id;
        ruts[rut_id] = this.rules.ruts[i];
    }
    return ruts;
}

// TODO make a coordmap object type...
function mapCoordmap(coordmap, mapFunction) {
    return coordmap.map(function(coordmapItem) {
        return {coords: coordmapItem.coords, value: mapFunction(coordmapItem.value)};
    })
}

function filterCoordmap(coordmap, filterFunction) {
    return coordmap.filter(function(coordmapItem) {
        return filterFunction(coordmapItem.value);
    })
}

function coordmapSum(coordmap) {
    var sum = 0
    coordmap.forEach(function(coordmapItem) {
        sum += coordmapItem.value;
    })
    return sum;
}

function coordmapAvg(coordmap) {
    return coordmapSum(coordmap) / coordmap.length;
}
