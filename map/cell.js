// A cell (location on the grid) can have multiple species living in it.
// But one of them is dominant (which will be displayed)
//
// ^ that might change :)
// like if, instead of having a dominant species, we had a function to take
// all the species and compute which one is dominant

var SpeciesBattle = require('./species-battle')
var Events = window.Events;
var Utils = window.Utils;

var Cell = module.exports = function(blank, coords) {
    this.species = null;
    this.coords = coords;
    this.neighbors = [];
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

Cell.prototype.setNeighbors = function(neighbors) {
    this.neighbors = neighbors || [];
}

Cell.prototype.forEachNeighbor = function(callback) {
    this.neighbors.forEach(function(n) {
        if (n.value) callback(n.value);
    })
} 



// convenience, to get the species object
Cell.prototype.get = function(species_id) {
    if (!(species_id in this.register)) return null;

    return this.register[species_id].species;
}

// get properties for the dominant species
Cell.prototype.getAge = function() {
    if (!this.species) return null;
    
    return this.register[this.species.id].age;
}

Cell.prototype.getStrength = function() {
    if (!this.species) return null;
    
    return this.register[this.species.id].strength;
}

// sets the dominant species
Cell.prototype.set = function(species) {

    if (!!this.species && !!species && this.species.id === species.id) {
        return; // no need to re-set the same species
    }
    
    if (!!species) {
        this.species = species;
        this.add(species); // just in case it's not already set
        this.register[species.id].age = Math.max(this.register[species.id].age, 1)
        this.register[species.id].strength = Math.max(this.register[species.id].strength, 1)
        this.emit('change', {species: species})

        // propagate rut activation
        var ruts = species.getIndexedRuts();
        for (var rut_id in ruts) {
            this.forEachNeighbor(function(cell) {
                cell.activateRut(rut_id);
            })
        }
    }

    return this;
}

// decide which species to be next
// ** each registered species does its own computation
Cell.prototype.next = function() {
    this.refreshActiveRuts();

    var nextStates = {};
    for (var species_id in this.register) {
        nextStates[species_id] = this.get(species_id).nextState(this, this.neighbors);
    }

    // Which species are contenders for dominance in this cell?
    var contenders = Object.keys(nextStates).filter(function(species_id) {
        return nextStates[species_id].state === 1;
    }).map((species_id) => this.register[species_id])

    // update strength prior to the species battle
    for (var species_id in this.register) {
        this.register[species_id].strength = nextStates[species_id].strength;
    }

    // THE SPECIES BATTLE IT OUT...
    this.nextSpecies = SpeciesBattle.decide(contenders).species;

    // Update age and strength for all species in the register
    for (var species_id in this.register) {
        this.register[species_id].age = nextStates[species_id].age;
    }

    if (this.nextSpecies) {
        var nextState = nextStates[this.nextSpecies.id];
        this.iterationTime = nextState.iterationTime;
        if (this.nextSpecies.forceNeighborIteration) {
            this.forceNeighborIteration();
        }
    }
}

Cell.prototype.flush = function() {
    var previousSpeciesId = this.species ? this.species.id : null;

    if (!this.nextSpecies)
        this.nextSpecies = this.register.blank.species;

    // The following block was from when the species age was only incremented
    // if it was the dominant species (cell.species).

    // if (!!this.nextSpecies) { 
    //     // if the species is incumbent, increment its age.
    //     if (previousSpeciesId === this.nextSpecies.id) {
    //         this.register[this.nextSpecies.id].age += 1;
    //     }
    //     else if (!!previousSpeciesId) {
    //         // reset of the age of the newly-dead species to 0
    //         this.register[previousSpeciesId].age = 0;
    //     }
    // }



    this.set(this.nextSpecies);

}

Cell.prototype.add = function(species, age, strength) {
    age = age || 0;
    strength = strength || species.initial_strength || 1; //Math.floor(Math.random()*10);

    if (!species) {
        // this happens when a species dies
        species = this.get('blank'); // this SHOULD be one of the registered species
    }

    if (species.id in this.register) return; // It's already added. No need to re-add it.

    this.register[species.id] = {
        species: species,
        age: age,
        strength: strength
    }

    // make sure there's a dominant species
    if (Object.keys(this.register).length === 1 || !this.species) {
        this.species = species;
    }

    this.emit('add', {species: species})

    return this;
}

Cell.prototype.getRegister = function() {
    // only return species who are present. (Age > 0)
    var register = Object.keys(this.register).map((species_id) => this.register[species_id]);
    register.sort((a, b) => b.strength - a.strength);
    register = register.filter((reg) => reg.age > 0 && reg.species.id != 'blank')
    register = register.map((reg) => {reg.is_dominant = reg.species.id == this.species.id; return reg; })
    return register;
}

// ITERATION STUFF


// This is for when a cell gets manually set, and we have to pull various properties about it
// e.g. the magic iteration time
Cell.prototype.refreshTimeout = function() {
    this.scheduleIteration();
};

Cell.prototype.scheduleIteration = function() {
    clearTimeout(this.iterationTimeout);
    this._timeout = this.getIterationTime();
    this._t = new Date() + this._timeout; // the time at which the cell will iterate again

    var self = this;
    this.iterationTimeout = setTimeout(function() {
        self.iterate();
    }, self._timeout);

    //reset the forced iteration
    this.forcedIterationTime = -1;
}

Cell.prototype.timeUntilIteration = function() {
    if (!this._t) return Settings.mapIterationTimeout; // meh, default
    return this._t - new Date();
}


Cell.prototype.getIterationTime = function() {
    // we'll use the shortest possible time
    var possibleTimes = [];

    possibleTimes.push(this.timeUntilIteration());
    possibleTimes.push(Settings.mapIterationTimeout); // this should be fairly long

    // Sometimes, neighboring cells will want to force a faster iteration at their boundaries
    if (this.forcedIterationTime > 0)
        possibleTimes.push(this.forcedIterationTime);

    // get the shortest iteration time for ALL possible species
    for (var species_id in this.register) {
        possibleTimes.push(this.get(species_id).getIterationTime(this.getActiveRuts()));
    }

    possibleTimes = possibleTimes.filter(function(t) { return t >= 0; });

    var scale = 1 + 0.5 * (Math.random() * 2 - 1);
    return Utils.arrayMin(possibleTimes) * scale;;
}


Cell.prototype.iterate = function() {
    if (Settings.mapIterationTimeout <= 0) return;

    this.advance();

    // schedule another iteration
    this.scheduleIteration();
}

// Single-cell replacement for Advancerator
Cell.prototype.advance = function() {
    this.next();

    // Note: when the whole array of cells was being updated all at the same time,
    // flush() was delayed. But now each cell updates itself independently, so
    // we don't have to wait for the rest of the cells before calling flush().
    this.flush();
}

// Neighboring cells use this method to try to speed up the iteration
Cell.prototype.forceIterationTime = function(time) {
    this.refreshActiveRuts();
    if (this.forcedIterationTime > 0) return; // experimental
    if (time > this.getIterationTime()) return;
    if (time > this.forcedIterationTime && this.forcedIterationTime > 0) return;

    this.forcedIterationTime = time;
}

// *This* cell might try to force *its* neighbors to iterate
Cell.prototype.forceNeighborIteration = function() {
    var time = this.getIterationTime();
    this.forEachNeighbor(function(cell) {
        cell.forceIterationTime(time);
    })
}

// RUTS =======

Cell.prototype.rut = function(rut_id, intensity) {
    if (typeof intensity === 'undefined') intensity = 1;
    this.ruts[rut_id] = {
        active: false,
        intensity: intensity
    } 
}

// ruts should only be active if any of the cells in the neighborhood
// has the rut's species as dominant
Cell.prototype.refreshActiveRuts = function() {
    var activeRutIds = [];
    this.forEachNeighbor(function(cell) {
        if (!cell.species) return;

        for (var rut_id in cell.species.getIndexedRuts()) {
            activeRutIds.push(rut_id);
        }
    })

    for (var rut_id in this.ruts) {
        this.ruts[rut_id].active = !!(activeRutIds.indexOf(rut_id) !== -1);
    }
}

Cell.prototype.getActiveRuts = function() {
    this.refreshActiveRuts();

    var activeRuts = {};

    for (var rut_id in this.ruts) {
        if (this.ruts[rut_id].active && this.ruts[rut_id].intensity > 0)
            activeRuts[rut_id] = this.ruts[rut_id];
    }

    return activeRuts;
}

Cell.prototype.activateRut = function(rut_id) {
    if (rut_id in this.ruts) {
        this.ruts[rut_id].active = true;
        this.refreshTimeout();
    }
}


// ITEMS =======

Cell.prototype.addItem = function(coords, item) {
    this.items.push(item);
}
