// A cell (location on the grid) can have multiple species living in it.
// But one of them is dominant (which will be displayed)
//
// ^ that might change :)
// like if, instead of having a dominant species, we had a function to take
// all the species and compute which one is dominant

var SpeciesBattle = require('./species-battle')

module.exports = Cell = function(blank) {
    this.species = null;
    this.allSpecies = {}; // indexed by id
    this.set(blank || '');

    // the 'next' slot is just a holding pattern until the current iteration is finalized
    // use cell.next(species), then cell.flush() to set it
    this.nextSpecies = null;
};

Cell.prototype = {};

// sets the dominant species
Cell.prototype.set = function(species) {
    this.species = species;
    this.add(species); // just in case it's not already set
    return this;
}

// decide which species to be next
// ** each registered species does its own computation
Cell.prototype.next = function(neighbors) {
    var nextStates = {};
    for (var id in this.allSpecies) {
        nextStates[id] = this.allSpecies[id].nextState(this, neighbors);
    }

    // Which species are contenders for dominance in this cell?
    var contenders = Object.keys(nextStates).filter(function(id) { return nextStates[id] === 1; }) 
    //console.log('  ' + Object.keys(nextStates).join(','))
    //console.log('  ' + Object.keys(nextStates).map(function(id) { return id + '_' + nextStates[id]; }).join(','))

    // THE SPECIES BATTLE IT OUT...
    this.nextSpecies = this.allSpecies[SpeciesBattle.decide(contenders)];
}

Cell.prototype.flush = function() {
    this.set(this.nextSpecies);
}

Cell.prototype.add = function(species) {
    if (!(species.id in this.allSpecies)) {
        this.allSpecies[species.id] = species;
    }

    // make sure there's a dominant species
    if (Object.keys(this.allSpecies).length === 1 || !this.species) {
        this.species = species;
    }
    return this;
}


