// A cell (location on the grid) can have multiple species living in it.
// But one of them is dominant (which will be displayed)
//
// ^ that might change :)
// like if, instead of having a dominant species, we had a function to take
// all the species and compute which one is dominant

var SpeciesBattle = require('./species-battle')
var Utils = require('../utils')

module.exports = Cell = function(blank, coords) {
    this.species = null;
    this.coords = coords;

    // species register contains:
    //  species
    //  age
    //  sprite obj
    this.register = {}; // indexed by id

    // Ruts
    this.ruts = {}; // indexed by rut id

    this.set(blank || '');

    this.items = [];

    // the 'next' slot is just a holding pattern until the current iteration is finalized
    // use cell.next(species), then cell.flush() to set it
    this.nextSpecies = null;

    this.iterationTime = Settings.mapIterationTimeout; // this will be overwritten after setting a species

    // register callbacks when stuff happens
    this.callbacks = {
        change: {}
    }

    this.forcedIterationTime = -1;
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
    
    if (!!this.species && !!species) {
        if (this.species.id !== species.id) {
            this.emit('change', {species: species})
        }
        else {
            return; // no need to re-render the same species
        }
    }

    this.hideAllExcept(species);

    if (!!species) {
        this.species = species;
        this.add(species); // just in case it's not already set

        this.register[species.id].visible = true;
        if (this.register[species.id].sprite) {
            this.showSprite(species.id);
            //this.register[species.id].sprite.visible = true;
        }
    }


    // Make sure only this one is visible
    // TODO: later there may be multiple sprites per cell visible...

    return this;
}

Cell.prototype.showSprite = function(id) {
    var sprite = this.register[id].sprite;
    if (sprite.alpha > 0) return;

    // todo: stuff this in the species data
    if (this.register[id].species.sprite.fade) {
        window.game.add.tween(sprite).to(
            { alpha: 1 },
            200,
            Phaser.Easing.Linear.None,
            true, // autostart
            0,    // delay
            0     // loop 
        );
    }
    else {
        sprite.alpha = 1;
    }
}

Cell.prototype.hide = function(id) {
    var reg = this.register[id];
    if (!reg) return;

    reg.visible = false;

    if (reg.sprite && reg.sprite.alpha > 0) {
        if (reg.species.sprite.fade) {
            window.game.add.tween(reg.sprite).to(
                { alpha: 0 },
                200,
                Phaser.Easing.Linear.None,
                true, // autostart
                0,    // delay
                0     // loop 
            );
        }
        else {
            reg.sprite.alpha = 0;
        }
    }
}


Cell.prototype.hideAllExcept = function(species) {
    for (var id in this.register) {
        if (!!species && species.id === id) continue;
        this.hide(id);
    }
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

    if (!(species.id in this.register)) {
        this.register[species.id] = {
            species: species,
            age: 0,
            visible: false,
            sprite: null
        }
        //this.createSpriteFor(species.id);
    }

    // make sure there's a dominant species
    if (Object.keys(this.register).length === 1 || !this.species) {
        this.species = species;
        this.register[species.id].visible = true;
    }

    // Sprite must be initialized, later
    // TODO: check if sprites have already been initialized
    // (this is for when we want to optimize for not front-loading the sprite-adding)

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


// SPRITES =======

// This has to be done separately
Cell.prototype.createSprites = function() {
    // This will have to be turned off and on as needed
    for (var species_id in this.register) {
        this.createSpriteFor(species_id);
    }
}

Cell.prototype.createSpriteFor = function(id) {
    var reg = this.register[id];
    var sprite_id = reg.species.sprite.id;
    if (Utils.isArray(sprite_id)) {
        sprite_id = Utils.randomChoice(sprite_id)
    }

    // TODO: access game elsehow
    reg.sprite = window.game.addMapSprite(this.coords, sprite_id);
    
    reg.sprite.alpha = reg.visible ? 1 : 0

    return reg.sprite;
}

// RUTS =======

Cell.prototype.rut = function(rut_id, intensity) {
    if (typeof intensity === 'undefined') intensity = 1;
    this.ruts[rut_id] = intensity; 
}

// EVENTS =======

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

// ITEMS =======

Cell.prototype.addItem = function(coords, item) {
    this.items.push(item);
}
