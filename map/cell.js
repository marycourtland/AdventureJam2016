// A cell (location on the grid) can have multiple species living in it.
// But one of them is dominant (which will be displayed)
//
// ^ that might change :)
// like if, instead of having a dominant species, we had a function to take
// all the species and compute which one is dominant

var SpeciesBattle = require('./species-battle')
var Events = window.Events;
var Utils = window.Utils;

module.exports = Cell = function(blank, coords) {
    this.species = null;
    this.coords = coords;
    this.items = [];

    // species register contains:
    //  species
    //  age
    this.register = {}; // indexed by id

    // Ruts
    this.ruts = {}; // indexed by rut id

    // the 'next' slot is just a holding pattern until the current iteration is finalized
    // use cell.next(species), then cell.flush() to set it
    this.nextSpecies = null;

    this.iterationTime = Settings.mapIterationTimeout; // this will be overwritten after setting a species

    this.forcedIterationTime = -1;

//    this.callbacks = {add:{}, change:{}}

    this.set(blank || '');
};

Cell.prototype = {};

Events.init(Cell.prototype);

// convenience, to get the species object
Cell.prototype.get = function(species_id) {
    if (!(species_id in this.register)) return null;

    return this.register[species_id].species;
}

// get the age of the current dominant species
Cell.prototype.getAge = function() {
    if (!this.species) return null;
    
    return this.register[this.species.id].age;
}

// sets the dominant species
Cell.prototype.set = function(species) {

    if (!!this.species && !!species && this.species.id === species.id) {
        return; // no need to re-set the same species
    }
    
    if (!!species) {
        this.species = species;
        this.add(species); // just in case it's not already set
        this.emit('change', {species: species})
    }

    return this;
}

// decide which species to be next
// ** each registered species does its own computation
Cell.prototype.next = function(neighbors) {
    var nextStates = {};
    for (var id in this.register) {
        nextStates[id] = this.get(id).nextState(this, neighbors);
    }

    // Which species are contenders for dominance in this cell?
    var contenders = Object.keys(nextStates).filter(function(id) { return nextStates[id].state === 1; }) 

    // THE SPECIES BATTLE IT OUT...
    this.nextSpecies = this.get(SpeciesBattle.decide(contenders));

    // Update age etc
    if (this.nextSpecies) {
        var nextState = nextStates[this.nextSpecies.id];
        this.register[this.nextSpecies.id].age = nextState.age;
        this.iterationTime = nextState.iterationTime;
        if (this.nextSpecies.forceNeighborIteration) {
            this.forceNeighborIteration();
        }
    }
}

Cell.prototype.flush = function() {
    // increment age?
    var previousSpeciesId = this.species ? this.species.id : null;

    if (!this.nextSpecies)
        this.nextSpecies = this.register.blank.species;

    if (!!this.nextSpecies) { 
        // if the species is incumbent, increment its age.
        if (previousSpeciesId === this.nextSpecies.id) {
            this.register[this.nextSpecies.id].age += 1;
        }
        else if (!!previousSpeciesId) {
            // reset of the age of the newly-dead species to 0
            this.register[previousSpeciesId].age = 0;
        }
    }

    this.set(this.nextSpecies);

}

Cell.prototype.add = function(species) {
    if (!species) {
        // this happens when a species dies
        species = this.get('blank'); // this SHOULD be one of the registered species
    }

    if (species.id in this.register) return; // It's already added. No need to re-add it.

    this.register[species.id] = {
        species: species,
        age: 0
    }

    // make sure there's a dominant species
    if (Object.keys(this.register).length === 1 || !this.species) {
        this.species = species;
    }

    this.emit('add', {species: species})

    return this;
}

// ITERATION STUFF


// This is for when a cell gets manually set, and we have to pull various properties about it
// e.g. the magic iteration time
Cell.prototype.refreshTimeout = function() {
    this.scheduleIteration();
};

Cell.prototype.scheduleIteration = function() {
    clearTimeout(this.iterationTimeout);
    var self = this;
    this.iterationTimeout = setTimeout(function() {
        self.iterate();
    }, this.getIterationTime());

    //reset the forced iteration
    this.forcedIterationTime = -1;
}


Cell.prototype.getIterationTime = function() {
    // Sometimes, neighboring cells will want to force a faster iteration at their boundaries
    if (this.forcedIterationTime > 0) { return this.forcedIterationTime; }

    var scale = 1 + 0.5 * (Math.random() * 2 - 1);
    if (!this.species) return Settings.mapIterationTimeout * scale;
    return this.species.getIterationTime() * scale;
}


Cell.prototype.iterate = function() {
    if (Settings.mapIterationTimeout <= 0) return;

    this.advance();

    // schedule another iteration
    this.scheduleIteration();
}

// Single-cell replacement for Advancerator
Cell.prototype.advance = function() {
    var neighbors = Map.env.neighbors(this.coords);
    this.next(neighbors);

    // Note: when the whole array of cells was being updated all at the same time,
    // flush() was delayed. But now each cell updates itself independently, so
    // we don't have to wait for the rest of the cells before calling flush().
    this.flush();
}

// Neighboring cells use this method to try to speed up the iteration
Cell.prototype.forceIterationTime = function(time) {
    if (this.forcedIterationTime > 0) return; // experimental
    if (time > this.getIterationTime()) return;
    if (time > this.forcedIterationTime && this.forcedIterationTime > 0) return;

    this.forcedIterationTime = time;
}

// *This* cell might try to force *its* neighbors to iterate
Cell.prototype.forceNeighborIteration = function() {
    var time = this.getIterationTime();
    var neighbors = Map.env.neighbors(this.coords);
    neighbors.forEach(function(n) {
        var cell = n.value;
        if (!!cell) cell.forceIterationTime(time);
    })
}

// RUTS =======

Cell.prototype.rut = function(rut_id, intensity) {
    if (typeof intensity === 'undefined') intensity = 1;
    this.ruts[rut_id] = intensity; 
}

// ITEMS =======

Cell.prototype.addItem = function(coords, item) {
    this.items.push(item);
}
