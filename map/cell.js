// A cell (location on the grid) can have multiple species living in it.
// But one of them is dominant (which will be displayed)
//
// ^ that might change :)
// like if, instead of having a dominant species, we had a function to take
// all the species and compute which one is dominant

var SpeciesBattle = require('./species-battle')

module.exports = Cell = function(blank) {
    this.species = null;
    this.register = {}; // indexed by id
    this.set(blank || '');

    this.items = [];

    // the 'next' slot is just a holding pattern until the current iteration is finalized
    // use cell.next(species), then cell.flush() to set it
    this.nextSpecies = null;

    // register callbacks when stuff happens
    this.callbacks = {
        change: {}
    }
};

Cell.prototype = {};

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
    if (!!this.species && !!species && this.species.id !== species.id) {
        this.emit('change', {species: species})
    }

    this.species = species;
    this.add(species); // just in case it's not already set

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

    // Update age
    if (this.nextSpecies)
    this.register[this.nextSpecies.id].age = nextStates[this.nextSpecies.id].age;
    
}

Cell.prototype.flush = function() {
    // increment age?
    var previousSpeciesId = this.species ? this.species.id : null;

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

    if (!(species.id in this.register)) {
        this.register[species.id] = {
            species: species,
            age: 0
        }
    }

    // make sure there's a dominant species
    if (Object.keys(this.register).length === 1 || !this.species) {
        this.species = species;
    }
    return this;
}

Cell.prototype.on = function(event, callback_id, callback) {
    this.callbacks[event][callback_id] = callback; 
}

Cell.prototype.off = function(event, callback_id) {
    delete this.callbacks[event][callback_id];
}

Cell.prototype.emit = function(event, data) {
    if (event in this.callbacks && Object.keys(this.callbacks[event]).length > 0) {
        for (var cb in this.callbacks[event]) {
            this.callbacks[event][cb](data);
        }
    }
}

// ITEMS

Cell.prototype.addItem = function(coords, item) {
    this.items.push(item);
}
