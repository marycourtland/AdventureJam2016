(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Events = window.Events;
var Utils = window.Utils;
var Inventory = require('./inventory');

var CHAR_SPECIES_LISTENER_PREFIX = 'character-species-listener-';

module.exports = Character = function(params) {
    params.id = params.id || '';

    this.map = params.map;
    this.id = params.id;
    this.coords = {x:0, y:0};

    this.inventory = new Inventory(this);
    this.health = Settings.maxHealth;

    Events.init(this);

    // Responses to species. These specify what happens when the char either walks onto a new species, or the current cell changes.
    this.speciesResponses = params.speciesResponses || {};
    // sanity check
    for (var species_id in this.speciesResponses) {
        console.assert(typeof this.speciesResponses[species_id] === 'function');
    }

    // Speed while walking through the map
    // This will change depending on where you are (e.g. in forest)
    // TODO: put this default 
    this.defaultSpeed = Settings.defaultSpeed;
    this.speed = this.defaultSpeed;

    this.trailingRuts = params.trailingRuts || {};
}

Character.prototype = {};

// ============= MOVEMENT / RENDERING

Character.prototype.canBeAt = function(coords) {
    var cell = this.map.getCell(coords);
    return !!cell && cell.species.passable;
}

Character.prototype.moveTo = function(coords) {
    // make sure we're allowed to move to this spot
    if (!this.canBeAt(coords)) return this;

    var oldCell = this.map.getCell(this.coords);

    this.coords.x = coords.x;
    this.coords.y = coords.y;

    // Respond appropriately to whatever species is underfoot
    // ** For now, doesn't pass anything to the response function 
    var newCell = this.map.getCell(this.coords);
    this.respondToSpecies(newCell.species);

    var self = this;
    oldCell.off('change', CHAR_SPECIES_LISTENER_PREFIX + this.id);
    newCell.on('change', CHAR_SPECIES_LISTENER_PREFIX + this.id, function(data) {
        self.respondToSpecies(data.species)
    })
    
    // trail ruts underfoot, like footsteps or whatnot
    for (var rut_id in this.trailingRuts) {
        newCell.rut(rut_id, this.trailingRuts[rut_id]);
    }

    return this;
}

Character.prototype.move = function(diff) {
    console.assert(Math.abs(diff.x) + Math.abs(diff.y) === 1, 'character should only move 1 step at a time')

    this.moveTo({x: this.coords.x + diff.x, y: this.coords.y + diff.y});
    //this.faceDirection(diff);
    return this;
}

Character.prototype.isAt = function(coords) {
    return coords.x === this.coords.x && coords.y === this.coords.y;
}

Character.prototype.respondToSpecies = function(species) {
    if (species.id in this.speciesResponses) {
        this.speciesResponses[species.id]();
    }

    // SET WALKING SPEED
    // TODO: not working yet
    if (typeof species.speed === 'number') {
        this.speed = species.speed;
    }
    else {
        this.speed = this.defaultSpeed;
    }
}

Character.prototype.getSpeed = function() {
    return this.speed;
}


// not sure if this is needed anymore
Character.prototype.refresh = function() {
    this.moveTo(this.coords);
}

// ============================== HEALTH ETC

Character.prototype.ouch = function() {
    if (this.health === 0) return; // can't go negative health

    this.health -= 1;

    // ugh
    document.getElementById('player-health').textContent = this.health;

    console.log('Ouch', this.health);
    if (this.health === 0) this.die();
}

Character.prototype.die = function() {
    console.log('Oops, dead.')
}


// ============================== ITEMS / INVENTORY

Character.prototype.gets = function(item) {
    this.inventory.addItem(item);
}

Character.prototype.use = function(item, coords) {
    if (!this.inventory.has(item.id)) return;
    if (Utils.distance(coords, this.coords) > item.usageRadius) return;

    this.inventory.removeItem(item);
    item.useAt(coords);
}

},{"./inventory":2}],2:[function(require,module,exports){
module.exports = Inventory = function(char) {
    this.char = char;
    this.items = {};
    this.numSlots = 20;
}

Inventory.prototype = {};

Inventory.prototype.has = function(itemId) {
    return itemId in this.items;
}

Inventory.prototype.addItem = function(item) {
    this.items[item.id] = item;
    item.refresh();
}

Inventory.prototype.removeItem = function(item) {
    delete this.items[item.id];
    
    // This will put all the rest of the items in different places.
    // TODO: maintain a static slot > item mapping
    this.assignItemsToSlots();
    this.refresh();
}

// RENDERING
// TODO: this could be its own renderer

// Rendering initializer
Inventory.prototype.rendersTo = function(html) {
    this.html = html;
    this.assignItemsToSlots();
    this.refresh();
}

Inventory.prototype.assignItemsToSlots = function() {
    var slotHtmls = this.html.getElementsByClassName('slot');

    var nextSlot = 0;
    for (var itemId in this.items) {
        // Put it in the next slot
        this.items[itemId].rendersTo(slotHtmls[nextSlot]);
        nextSlot += 1;
    }
    
    if (nextSlot < this.numSlots) {
        for (var i = nextSlot; i < this.numSlots; i++) {
            clearSlot(slotHtmls[i]);
        }
    }
}

// UGH. TODO: this needs to go elsewhere
function clearSlot(slotHtml) {
    delete slotHtml.dataset.itemId;
    delete slotHtml.dataset.itemType;
}

Inventory.prototype.refresh = function() {
    if (!this.html) return;

    for (var itemId in this.items) {
        this.items[itemId].refresh();
    }
}

},{}],3:[function(require,module,exports){
module.exports = Walker = function(char, getNextDir, onStep) {
    this.char = char;
    this.timeout = null;
    this.walking = false;
    this.getNextDir = getNextDir;
    this.onStep = typeof onStep === 'function' ? onStep : function() {};
}

Walker.prototype = {};

Walker.prototype.timeTillNextStep = function() {
    // 3-4 seconds, but once in a while stop for a bit
    var base = 3000;
    if (Math.random() < 1/10) base = 8000;
    return base +  Math.random() * 1000;
}

Walker.prototype.start = function() {
    this.walking = true;
    this.step();
}

Walker.prototype.stop = function() {
    window.clearTimeout(this.timeout);
    this.timeout = null;
    this.walking = false;
}

Walker.prototype.step = function() {
    if (!this.walking) return;
    
    var dir = this.getNextDir()
    this.char.move(dir);
    this.onStep(dir);

    var self = this;
    window.clearTimeout(this.timeout);
    this.timeout = window.setTimeout(function() {
        self.step();
    }, this.timeTillNextStep());
}

},{}],4:[function(require,module,exports){
// Game modes are called 'modes' to avoid conflict with phaser game states.
// These are basically modes during the main gameplay state.
// Sorry mode rhymes with node :)

// Also. This should be view independent

module.exports = GamePlayModes = {};
var game;
var currentData = {}; // blah, some scope, so that different modes can communicate w/ each other

GamePlayModes.init = function(gameInstance) {
    game = gameInstance;
    
    // stuff some string ids into each mode, for interfacing outside (meh)
    for (var mode in this.modes) {
        this.modes[mode].id = mode;
    }

    this.current = this.modes.idle;
}

GamePlayModes.advance = function(transitionData) {
    var next = this.current.getNext(transitionData);
    if (!next) return; // staying in the same state 

    this.current.finish();
    this.current = next;
    this.current.execute(transitionData);
}

GamePlayModes.get = function() { return this.current.id; }


// Individual modes that the game can be in.
// TODO: separate content into a data file
GamePlayModes.modes = {};

// here is a template
GamePlayModes.modes.sample = {};
GamePlayModes.modes.sample.execute = function(data) {};
GamePlayModes.modes.sample.finish = function() {};
GamePlayModes.modes.sample.getNext = function(data) {};


// IDLE MODE: when nothing is going on. Waiting for the player to click or something
GamePlayModes.modes.idle = {}
GamePlayModes.modes.idle.execute = function() {
    currentData = {};
};
GamePlayModes.modes.idle.finish = function() {};
GamePlayModes.modes.idle.getNext = function(data) {
    // Clicked an inventory item
    if (!!data.item) return GamePlayModes.modes.itemSelected;
}

// ITEM SELECTED: player is about to use this item.
GamePlayModes.modes.itemSelected = {}
GamePlayModes.modes.itemSelected.execute = function(data) {
    var item = game.player.inventory.items[data.item];
    item.select();
    currentData.item = item;
}
GamePlayModes.modes.itemSelected.finish = function() {
    currentData.item.deselect();
    // keep the item around so it can be used
}
GamePlayModes.modes.itemSelected.getNext = function(data) {
    // If you click a cell, use the item on that cell
    if (!!data.coords) return GamePlayModes.modes.usingItem; 

    // If you click somewhere else, then cancel this use
    return GamePlayModes.modes.idle;
}

// USING ITEM: you're using an item.
// It should automatically advance to the idle mode.
GamePlayModes.modes.usingItem = {};
GamePlayModes.modes.usingItem.execute = function(data) {
    game.player.use(currentData.item, data.coords);

    if (Settings.advanceAllCells) GamePlayModes.advance();
}
GamePlayModes.modes.usingItem.finish = function() {
    delete currentData.item;
}
GamePlayModes.modes.usingItem.getNext = function(data) {
    return GamePlayModes.modes.idle;
}


},{}],5:[function(require,module,exports){
var Settings = window.Settings;
var Views = require('./views');

// view-independent modules
var Context = {
    Map: require('./map'),
    GamePlayModes: require('./gameplay-modes'),
    Items: require('./items'),
    Player: require('./player'),
    Wizard: require('./wizard')
}

window.game = {};

window.onload = function() {
    if (!(Settings.view in Views)) {
        alert('Pick one of these for the game view: ' + Object.keys(Views).join(', '));
        return;
    } 
    Views[Settings.view].load(Context);
}

},{"./gameplay-modes":4,"./items":10,"./map":18,"./player":23,"./views":24,"./wizard":40}],6:[function(require,module,exports){
module.exports = Bomb = {};
Bomb.id = 'bomb';

Bomb.useAt = function(coords) {
    var map = window.game.map;
    map.diamondClump(coords, map.species.neutralized);
}

},{}],7:[function(require,module,exports){
// Empty placeholder object. TODO

module.exports = Box = {};
Box.id = 'box';

},{}],8:[function(require,module,exports){
// Empty placeholder object. TODO

module.exports = Camera= {};
Camera.id = 'camera';

Camera.useAt = function(coords) {
    // Put the item in the spot...
    var map = window.game.map;
    map.placeItem(coords, this);

}

},{}],9:[function(require,module,exports){
// Empty placeholder object. TODO

module.exports = Detector = {};
Detector.id = 'detector';

Detector.useAt = function(coords) {
    var map = window.game.map;
    map.placeItem(coords, this);
}

},{}],10:[function(require,module,exports){
// this is sort of a manager object
// Usage:
// var box_instance = ToolChest.make(ToolChest.types.box);

module.exports = ToolChest = {};

// todo: put these in their own directory and auto discover them
var typeObjects = [
    require('./box.js'), // purposeless item for testing
    require('./detector.js'),
    require('./camera.js'),
    require('./neutralizer.js'),
    require('./bomb.js')
]

var typeTemplate = require('./type-template');

// Initialize types

ToolChest.types = {};

typeObjects.forEach(function(type) {
    console.assert(!!type.id, 'A type has no id'); // double check
    ToolChest.types[type.id] = type;
    type.__proto__ = typeTemplate;
})

// constructor
ToolChest.Item = function(type) {
    // Allow both strings and type objects to be passed in
    if (typeof type === 'string') type = ToolChest.types[type];
    console.assert(type.id in ToolChest.types, 'Unrecognized item type:', type.id)

    this.id = type.id + '_' + ToolChest.nextID();
    this.type_id = type.id;
    this.__proto__ = type;

    this.usageRadius = Settings.itemUsageRadii[type.id] || 1.5;
}

// shortcut constructor
ToolChest.make = function(type) { return new ToolChest.Item(type); }


ToolChest._next_id = 0;
ToolChest.nextID = function() { return this._next_id++; }

},{"./bomb.js":6,"./box.js":7,"./camera.js":8,"./detector.js":9,"./neutralizer.js":11,"./type-template":12}],11:[function(require,module,exports){
module.exports = Neutralizer = {};
Neutralizer.id = 'neutralizer';

// TODO: do something other than accessing the global game instance
Neutralizer.useAt = function(coords) {
    var map = window.game.map;
    map.set(coords, map.species.neutralized)
}

},{}],12:[function(require,module,exports){
// Methods that should be callable for each item type.
module.exports = TypeTemplate = {};

// Should be implemented differently for each item
TypeTemplate.useAt = function(coords) {
    console.log('Placeholder: using ' + this.id + ' at ' + coords);
}

TypeTemplate.select = function() {
    this.selected = true;
    this.refresh();
}

TypeTemplate.deselect = function() {
    this.selected = false;
    this.refresh();
}

// RENDERING

TypeTemplate.rendersTo = function(html) {
    this.html = html;
    this.html.dataset.itemId = this.id;
    this.html.dataset.itemType = this.type_id;
}

TypeTemplate.refresh = function() {
    if (!this.html) return;
    
    // handle a selected thing
    this.html.className = this.html.className.replace(/selected /g, '');
    if (this.selected) this.html.className += ' selected ';
}


},{}],13:[function(require,module,exports){
// This is the procedure which executes the advancing of the environment species
// from one iteration to the next.
//
// Takes an environment and advances it to its next iteration.


module.exports = Advancerator = function(env) {
    var range = env.range();

    // compute the next iteration 
    range.forEach(function(coords) {
        var cell = env.get(coords);
        var neighbors = env.neighbors(coords);
        cell.next(neighbors);
    })
    
    // now set them all
    range.forEach(function(coords) {
        env.get(coords).flush();
    })
}

},{}],14:[function(require,module,exports){
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
    for (var id in this.register) {
        nextStates[id] = this.get(id).nextState(this, this.neighbors);
    }

    // Which species are contenders for dominance in this cell?
    var contenders = Object.keys(nextStates).filter(function(id) {
        return nextStates[id].state === 1;
    })

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

},{"./species-battle":20}],15:[function(require,module,exports){
module.exports = GrowthRules = {
    magic: {
        id: 'magic',
        stateMap: {
            0: [0.001, 0.2, 0.1, 1, 1, 1, 1, 1, 0],
            1: [0, 0, 0, 1, 0, 1, 1, 0, 0]
        },
        weights: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    },

    // mostly used with ruts?
    magicCrazy: {
        id: 'magicCrazy',
        stateMap: {
            0: [0.5, 1, 1, 1, 1, 1, 1, 1, 1],
            1: [0, 0, 0, 0, 0, 0, 0, 0, 0]
        },
        weights: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    },
    absoluteActivation: {
        id: 'absoluteActivation',
        stateMap: {
            0: [0, 1, 1, 1, 1, 1, 1, 1, 1],
            1: [1, 1, 1, 1, 1, 1, 1, 1, 1],
        },
        weights: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    },

    // When plants are old enough, they become stable - less likely to grow, slightly likely to die
    plantsStable: {
        id: 'plantsStable',
        stateMap: {
            0: [  0,   0,   0, 0,   0, 0.1, 0.1, 1, 1, 1, 1,    1],
            1: [0.9, 0.9, 0.8, 1,   1,   1,   1, 1, 1, 1, 1, 0.95]
        },
        weights: [
            [1, 2, 1],
            [2, 0, 2],
            [1, 2, 1]
        ]
    },

    plants: {
        id: 'plants',
        stateMap: {
            0: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
            1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        },
        weights: [
            [1, 2, 1],
            [2, 0, 2],
            [1, 2, 1]
        ]
    },

    plantsCatalyzed: {
        id: 'plantsCatalyzed',
        stateMap: {
            0: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        },
        weights: [
            [1, 2, 1],
            [2, 0, 2],
            [1, 2, 1]
        ]
    },
    plantsDying: {
        id: 'plantsDying',
        stateMap: {
            0: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            1: [0, 0, 0, 0, 0, 1, 1, 1, 1]
        },
        weights: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    },
    completeDeath: {
        id: 'completeDeath',
        stateMap: {
            0: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            1: [0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
    }
}

},{}],16:[function(require,module,exports){
var GrowthRules = require('./growth-rules')

// Conditional growth rules are sorted by priority, low > high.

module.exports = speciesData = [];

// TESTING ONLY
speciesData.push({
    id: 'blue',
    symbol: '~',
    color: '#5F4F29',
});
speciesData.push({
    id: 'red',
    symbol: '~',
    color: '#5F4F29',
});
speciesData.push({
    id: 'green',
    symbol: '~',
    color: '#5F4F29',
});

// REAL SPECIES
speciesData.push({
    id: 'blank',
    symbol: '~',
    color: '#5F4F29',
});
speciesData.push({
    id: 'neutralized',
    symbol: 'x',
    color: '#422121',
});

speciesData.push({
    id: 'magic',
    symbol: '&#8960;',
    color: '#4C24A3',
    forceNeighborIteration: true,
    rules: {
        default: GrowthRules.magic,
        ruts: [
            {
                rut_id: 'magic',
                timeToIteration: 100,
                forceNeighborIteration: true,
                rules: GrowthRules.absoluteActivation
            }
        ]
    }
});

speciesData.push({
    id: 'grass',
    symbol: '&#8756;',
    color: '#46CF46', 
    rules: {
        default: GrowthRules.plants,
        conditional: [
            {
                min_neighbors: 1,
                species_id: 'magic',
                rules: GrowthRules.plantsDying
            }
        ],
        ruts: [
            {
                rut_id: 'footsteps',
                rules: GrowthRules.completeDeath
            }
        ]
    }
});

speciesData.push({
    id: 'flowers',
    symbol: '&#9880;',
    color: '#E46511',
    rules: {
        default: GrowthRules.plants,
        conditional: [
            {
                min_neighbors: 1,
                species_id: 'magic',
                rules: GrowthRules.plantsDying
            }
        ],
        ruts: [
            {
                rut_id: 'footsteps',
                rules: GrowthRules.completeDeath
            }
        ]
    }
});

speciesData.push({
    id: 'trees',
    symbol: '&psi;',
    color: '#174925',
    speed: 200,
    passable: true,
    rules: {
        default: GrowthRules.plants,
        ruts: [
            {
                rut_id: 'footsteps',
                rules: GrowthRules.completeDeath
            }
        ],
        conditional: [
            // the presence of grass catalyzes tree growth
            {
                species_id: 'grass',
                min_neighbors: 4,
                rules: GrowthRules.plantsCatalyzed
            },

            // tree growth stabilizes when the trees are old
            {
                species_id: 'trees',
                min_age: 3,
                rules: GrowthRules.plantsStable
            },

            {
                min_neighbors: 1,
                species_id: 'magic',
                rules: GrowthRules.plantsDying
            }
        ]
    }
});

// Pine trees - SAME RULES ETC AS THE OTHER TREES
// Just separated out for some interest/variety
speciesData.push({
    id: 'trees2',
    symbol: '&psi;',
    color: '#174925',
    speed: 200,
    passable: true,
    rules: {
        default: GrowthRules.plants,
        conditionalnope: [
            // the presence of grass catalyzes tree growth
            {
                species_id: 'grass',
                min_neighbors: 4,
                rules: GrowthRules.plantsCatalyzed
            },

            // tree growth stabilizes when the trees are old
            {
                species_id: 'trees2',
                min_age: 3,
                rules: GrowthRules.plantsStable
            },

            {
                min_neighbors: 1,
                species_id: 'magic',
                rules: GrowthRules.plantsDying
            }
        ]
    }
});



},{"./growth-rules":15}],17:[function(require,module,exports){
// Example:
// env = new Env({x:30, y:30});

var XY = window.XY;
var Cell = require('./cell.js')
var Advancerator = require('./advancerator.js');

module.exports = Env = function(size, blank_cell) {
    this.size = size;
    this.init(blank_cell);
};

Env.prototype = {};

Env.prototype.init = function(blank_cell) {
    this.cells = [];
    for (var x = 0; x < this.size.x; x++) {
        this.cells.push([]);
        for (var y = 0; y < this.size.y; y++) {
            this.cells[x][y] = new Cell(blank_cell, XY(x, y));
        }
    }

    // storing the neighbors on each cell has to happen after everything's initialized
    for (var x = 0; x < this.size.x; x++) {
        for (var y = 0; y < this.size.y; y++) {
            this.cells[x][y].setNeighbors(this.neighbors(XY(x,y)));
        }
    }

    return this;
}

Env.prototype.advance = function(numTimes) {
    if (typeof numTimes === 'undefined') numTimes = 1;

    for (var t = 0; t < numTimes; t+=1){
        Advancerator(this);
    }

    return this;
}

Env.prototype.OOB = function(coords) {
    return coords.x < 0 || coords.y < 0 || coords.x >= this.size.x || coords.y >= this.size.y
}

Env.prototype.get = function(coords) {
    if (this.OOB(coords)) return null;
    return this.cells[coords.x][coords.y];
}

Env.prototype.set = function(coords, value) {
    var cell = this.get(coords);
    if (!cell) return false;
    return cell.set(value);
}

// Returns a list of all possible coordinates
Env.prototype.range = function() {
    var coords = [];
    for (var x=0; x < this.size.x; x++) {
        for (var y=0; y < this.size.y; y++) {
            coords.push({x:x, y:y});
        }
    }
    return coords;
}

Env.prototype.neighbors = function(coords) {
    var neighbors = [
        {x:-1, y:-1},
        {x:-1, y:0},
        {x:-1, y:1},
        {x:0, y:-1},
        {x:0, y:0},  // <-- yes, I know this isn't a neighbor, but
        {x:0, y:1},  //     it's nice and clean to include it 
        {x:1, y:-1},
        {x:1, y:0},
        {x:1, y:1}
    ]

    var self = this;

    return neighbors.map(function(crds) {
        // get absolute coordinates
        var coordsAbsolute = {x: crds.x + coords.x, y: crds.y + coords.y};

        // structure it in a coord-map array
        return {coords: crds, value: self.get(coordsAbsolute)};
    })
}

Env.prototype.randomCoords = function() {
    return {
        x: Math.floor(Math.random() * this.size.x),
        y: Math.floor(Math.random() * this.size.y)
    }
}

},{"./advancerator.js":13,"./cell.js":14}],18:[function(require,module,exports){
var Settings = window.Settings;
var Env = require('./environment');
var Species = require('./species');
var SpeciesData = require('./data/species') 

module.exports = Map = {};

// initialize species based on the data
Map.species = {};
SpeciesData.forEach(function(s) {
    Map.species[s.id] = new Species(s);
})


Map.init = function(params) {
    this.size = params.size;
    this.center = {x: Math.floor(this.size.x/2), y: Math.floor(this.size.y/2)} // use Map.setCenter to change this
    this.env = new Env(this.size, this.species.blank);
}

Map.startIteration = function() {
    // this is just the first timeout
    function getTimeout(){
        // flat distribution because it's the first iteration
        return Math.random() * Settings.mapIterationTimeout
    }

    this.forEach(function(coords, cell) {
        setTimeout(function() { cell.iterate(); }, getTimeout());
    })
}

Map.generateTest = function() {
    var self = this;
    // register involved species with all of the cells
    self.forEach(function(coords, cell) {
        cell.add(self.species.trees2);
        cell.add(self.species.grass);
        cell.add(self.species.magic);
        cell.add(self.species.trees);
    })

    // spiral fun!
    var rut_cells = [
        // {x: 8, y: 9},
        // {x: 8, y: 10},
        // {x: 8, y: 11},
        // {x: 8, y: 12},

        {x: 9, y: 12},
        {x: 10, y: 12},
        {x: 11, y: 12},
        {x: 12, y: 12},

        {x: 12, y: 11},
        {x: 12, y: 10},
        {x: 12, y: 9},
        {x: 12, y: 8},

        {x: 12, y: 7},
        {x: 11, y: 7},
        {x: 10, y: 7},
        {x: 9, y: 7},
        {x: 8, y: 7},
        {x: 7, y: 7},
        {x: 6, y: 7},

        {x: 6, y: 8},
        {x: 6, y: 9},
        {x: 6, y: 10},
        {x: 6, y: 11},
        {x: 6, y: 12},
        {x: 6, y: 13},
        {x: 6, y: 14},

        {x: 7, y: 14},
        {x: 8, y: 14},
        {x: 9, y: 14},
        {x: 10, y: 14},
        {x: 11, y: 14},
        {x: 12, y: 14},
        {x: 13, y: 14},
        {x: 14, y: 14},

        {x: 14, y: 13},
        {x: 14, y: 12},
        {x: 14, y: 11},
        {x: 14, y: 10},
        {x: 14, y: 9},
        {x: 14, y: 8},
        {x: 14, y: 7},
        {x: 14, y: 6},
        {x: 14, y: 5},

        {x: 13, y: 5},
        {x: 12, y: 5},
        {x: 11, y: 5},
        {x: 10, y: 5},
        {x: 9, y: 5},
        {x: 8, y: 5},
        {x: 7, y: 5},
        {x: 6, y: 5},
        {x: 5, y: 5},
        {x: 4, y: 5},

        {x: 4, y: 6},
        {x: 4, y: 7},
        {x: 4, y: 8},
        {x: 4, y: 9},
        {x: 4, y: 10},
        {x: 4, y: 11},
        {x: 4, y: 12},
        {x: 4, y: 13},
        {x: 4, y: 14},
        {x: 4, y: 15},
        {x: 4, y: 16},

        {x: 5, y: 16},
        {x: 6, y: 16},
        {x: 7, y: 16},
        {x: 8, y: 16},
        {x: 9, y: 16},
        {x: 10, y: 16},
        {x: 11, y: 16},
        {x: 12, y: 16},
        {x: 13, y: 16},
        {x: 14, y: 16},
        {x: 15, y: 16},
        {x: 16, y: 16},
    ]
    
    rut_cells.forEach(function(coords) {
        var cell = self.env.get(coords);
        cell.rut('magic', 1);
    })

    //self.env.set({x:1,y:1}, self.species.trees)

    self.rect(self.species.trees, {x:0, y:0}, {x:7, y:0});
    //self.rect(self.species.trees2, {x:0, y:7}, {x:7, y:7});


    // self.rect(self.species.magic, {x:4, y:4}, {x:8, y:8});

    // this.env.advance(1);
    
    self.getCell({x: 2, y:0}).rut('footsteps')
}


Map.generate = function() {
    if (Settings.mode === 'test') return this.generateTest();

    var self = this;

    // register involved species with all of the cells
    self.forEach(function(coords, cell) {
        cell.add(self.species.magic);
        cell.add(self.species.grass);
        cell.add(self.species.trees);
        cell.add(self.species.trees2);
        cell.add(self.species.neutralized);
    })

    self.sow(self.species.grass, 1/10);
    self.sow(self.species.flowers, 1/50)
    self.sow(self.species.trees, 1/30);
    self.sow(self.species.trees2, 1/40);
    self.env.advance(10);

    // empty spot in the 0,0 corner
    self.rect(self.species.grass, {x:0, y:0}, {x:10, y:10});
    self.rect(self.species.magic, {x:2, y:2}, {x:4, y:4});

    self.env.advance(1);
}

Map.diamondClump = function(coords, species) {
    return this.clump(coords, [
        {x:  0, y:  0},
        {x:  1, y:  1},
        {x: -1, y:  1},
        {x:  1, y: -1},
        {x: -1, y: -1},
        {x:  0, y: -1},
        {x:  0, y:  1},
        {x: -1, y:  0},
        {x:  1, y:  0},
    ], species)
}

Map.rect = function(species, from, to) {
    var clump = [];
    for (var x = from.x; x <= to.x; x++) {
        for (var y = from.y; y <= to.y; y++) {
            clump.push({x:x, y:y});
        }
    }
    return this.clump(from, clump, species);
}

// randomly set cells as the species
Map.sow = function(species, frequency) {
    var self = this;

    self.forEach(function(coords, cell) {
        if (Math.random() > frequency) return;
        self.env.set(coords, species);
    })
/*
    var numSeeds = self.size.x * self.size.y * frequency;

    // Pick some places to seed
    var seeds = [];
    for (var i = 0; i < numSeeds; i++) {
        seeds.push(self.env.randomCoords());
    }

    seeds.forEach(function(coords) { self.env.set(coords, species); })
*/
    return this
}

// paste the clump at the designated center
Map.clump = function(center, coordClump, species) {
    var self = this;
    
    coordClump.forEach(function(coords) {
        var targetCoords = {x: coords.x + center.x, y: coords.y + center.y};
        self.env.set(targetCoords, species);
    })

    return this
}

Map.set = function(coords, species) {
    this.env.set(coords, species);
}

Map.getCell = function(coords) {
    return this.env.get(coords);
}


// iterates over a coordmap
Map.forEach = function(fn) {
    var self = this;
    self.env.range().forEach(function(coords) {
        fn(coords, self.env.get(coords));
    });
    return this;
}

Map.advance = function(n) {
    if (typeof n === 'undefined') n = 1;
    this.env.advance(n);
    return this;
}

Map.log = function() {
    // For debugging purposes
    var ascii = Utils.transpose(this.env.cells).map(function (r) {
        return r.map(function(cell) {
            return cell.species.id === 'blank' ? ' ' : cell.species.id[0];
        }).join(' ');
    }).join('\n');
    console.log(ascii);
}

},{"./data/species":16,"./environment":17,"./species":22}],19:[function(require,module,exports){
// EXAMPLE:
//
// var ruleset = new RuleSet({
//  stateMap: {
//      0: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
//      1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9] // the 0.9 means it's a 90% chance of getting a 1.
//  },
//  weights: [
//      [1, 2, 1],
//      [2, 0, 2],
//      [1, 2, 1]
//   ]
//  })
//
//  ruleset.transform(0, [[1,1,1],[0,0,0],[0,0,0]]) => 1


module.exports = RuleSet = function(ruleParams) {
    ruleParams = ruleParams || {};

    this.id = ruleParams.id;
    this.stateMap = ruleParams.stateMap || {};

    // TODO: this should really be a coordmap...
    this.weights = indexWeights(ruleParams.weights || [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1]
    ]);

    if (ruleParams.debug) this.debug = true;
}

RuleSet.prototype = {};

RuleSet.prototype.transform = function(state, neighbors, debug) {
    // If we try to transform anything unknown, things will just stay constant.
    if (!(state in this.stateMap)) { return state; }

    var sum = deepWeightedSum(neighbors, this.weights);

    if (sum >= this.stateMap[state].length) { return state; }

    if (this.debug) console.debug(debug, '|',  this.id, state, sum, '>>>', this.stateMap[state][sum])

    return this.probabilisticState(this.stateMap[state][sum]);
}

// Input 0.3 for a 30% chance at getting a 1 (versus a 0)
RuleSet.prototype.probabilisticState = function(state) {
   if (state === 0 || state === 1) return state;
   return Math.random() < state ? 1 : 0;
}

// neighbors should be a coord-map, like:
// [{coords:{x:0,y:0}, value:'whatever}, {coords:{x:1,y:1}, value:'whatever'}, ... ]
function deepWeightedSum(neighbors, weights) {
    var sum = 0;

    neighbors.forEach(function(neighbor) {
        var coords = neighbor.coords;
        sum += neighbor.value * weights[coords.x][coords.y];
    })

    return sum;
}


// This is janky.
// Turns a nested array into a fake nested array, so that you can
// access things like weights[-1][-1]
function indexWeights(deepArray) {
    console.assert(deepArray.length === 3); // sanity check
    console.assert(deepArray[0].length === 3);

    // ugh, ugh, ugh. Fake array.
    var range = [-1, 0, 1];
    var output = {};
    range.forEach(function(i) {
        output[i] = {};
        range.forEach(function(j) {
            output[i][j] = deepArray[i+1][j+1];
        })
    })

    return output;
}

},{}],20:[function(require,module,exports){
// This module is for deciding the winning species in a cell!
// 
// For now, it's just 'which species is higher in the pecking order'

module.exports = SpeciesBattle = {
    peckingOrder: [
        // sorted from low to high
        'blank',
        'grass',
        'flowers',
        'trees2',
        'trees',
        'magic',
        'neutralized'
    ],

    decide: function(ids) {
        if (ids.length === 0) return null;
        if (ids.length === 1) return ids[0];

        var self = this;
        ids.sort(function(id1, id2) {
            return self.peckingOrder.indexOf(id2) - self.peckingOrder.indexOf(id1);
        })
        return ids[0];
    }
}

},{}],21:[function(require,module,exports){
// THE POINT OF THIS MODULE IS....
//
//    ... To take a cell object and decide whether it has a species in it.
//    :D

var masks = {
    true: 1,
    false: 0
}

module.exports = SpeciesMask = function(species_id) {
    return function(cell) {
        if (!cell || !cell.species) return masks[false];
        return masks[cell.species.id === species_id];
    }
}

},{}],22:[function(require,module,exports){
var Utils = window.Utils;
var RuleSet = require('./ruleset');
var SpeciesMask = require('./species-mask');

module.exports = Species = function(params) {
    this.id = params.id || 'species' + Math.floor(Math.random()*1e8);

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
    // TODO: make a way to compose things together (like self.mask and cell.getAge)
    var maskedAges = mapCoordmap(neighbors, function(cell) { return !!cell ? self.mask(cell) * cell.getAge() : 0 });
    var age = Math.ceil(coordmapAvg(maskedAges));

    var iterationTime = Settings.mapIterationTimeout;
    if (ruleset.hasOwnProperty('iterationTime')) {
        iterationTime = ruleset.iterationTime;
    }
    
    return {state: nextState, age: age, iterationTime: iterationTime};
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

},{"./ruleset":19,"./species-mask":21}],23:[function(require,module,exports){
var Character = require('./character');
var ToolChest = require('./items');

var CELL_CHANGE_EVT = 'check_cell_for_magic';

module.exports = Player = function(map) {
    var player = new Character({
        map: map,
        id: 'player',

        speciesResponses: {
            'magic': function() {
                player.ouch();
            }
        },

        trailingRuts: {
            'footsteps': 1
        }
    });

    // ugh, TODO clean this up
    //player.sprite.scaleTo(game.cellDims).place(game.html.characters);
    player.moveTo(Settings.playerStart);

    // start some grass where the player is
    map.diamondClump(player.coords, map.species.grass)

    // Starting inventory
    initInventory(player, {
        neutralizer: 5,
        bomb: 3,
        camera: 3,
        detector: 3
    })

    player.inventory.rendersTo(document.getElementById('game-inventory'));

    return player;
}

function initInventory(player, inventoryCounts) {
    for (var itemType in inventoryCounts) {
        for (var i = 0; i < inventoryCounts[itemType]; i++) {
            player.gets(ToolChest.make(itemType));
        }
    }
}

},{"./character":1,"./items":10}],24:[function(require,module,exports){
module.exports = Views = {
    topdown: require('./topdown'),
    phaserIso: require('./phaser')
}

},{"./phaser":29,"./topdown":37}],25:[function(require,module,exports){
// Tree sprites are from
// http://opengameart.org/content/tree-collection-v26-bleeds-game-art
// Bleed - http://remusprites.carbonmade.com/

module.exports = AssetData = {
    blue: {
        url:     'images/colors/blue2.png',
        anchors: [0.5, 0.5],
    },
    red: {
        url:     'images/colors/red.png',
        anchors: [0.5, 0.5],
    },
    green: {
        url:     'images/colors/green.png',
        anchors: [0.5, 0.5],
    },
    player: {
        url:     'images/player-forward.png',
        anchors: [0.5, 1.0],
    },
    wizard: {
        url:     'images/wizard-forward.png',
        anchors: [0.5, 1.0],
    },
	neutralizer1: {
        url:    'images/neutralizer1.png',
        anchors: [0.5, 2/3],
    },
	neutralizer2: {
        url:    'images/neutralizer2.png',
        anchors: [0.5, 2/3],
    },
	neutralizer3: {
        url:    'images/neutralizer3.png',
        anchors: [0.5, 2/3],
    },
	magic: {
        url:    'images/magic-over-dirt.png',
        anchors: [0.5, 2/3],
    },
	dirt: {
        url:    'images/ground-dirt.png',
        anchors: [0.5, 2/3],
    },
	grass: {
        url:    'images/ground-grass.png',
        anchors: [0.5, 2/3],
    },
	flower: {
        // todo: do a real image for this
        url:    'images/ground-grass.png',
        anchors: [0.5, 2/3],
    },
	tree1: {
        url:    'images/tree_01_grass.png',
        anchors: [0.5, 2/3],
    },
	tree2: {
        url:    'images/tree_02_grass.png',
        anchors: [0.5, 0.75],
    },
	tree8: {
        url:    'images/tree_08_grass.png',
        anchors: [0.5, 2/3],
    },
	tree11: {
        url:    'images/tree_11_grass.png',
        anchors: [0.5, 2/3],
    },
	tree13: {
        url:    'images/tree_13_grass.png',
        anchors: [0.5, 0.75],
    }
}

},{}],26:[function(require,module,exports){
var SpeciesSprites = require('./data/species-sprites')
var Utils = window.Utils;

module.exports = PhaserCell = function(cell) {
    this.cell = cell;

    // Cache each sprite so we're not creating them on the fly
    this.register = {};
    for (var species_id in this.cell.register) {
        this.register[species_id] = {
            sprite: null,

            // At the moment, we're only showing 1 species per cell.
            // Whichever is marked as the dominant species, via cell.species
            visible: this.cell.species.id === species_id
        }
    }

    // TODO: set visible=false appropriately

    this.createSprites();
    this.bindEvents();
}

PhaserCell.prototype = {};

PhaserCell.prototype.bindEvents = function() {
    var self = this;
    this.cell.on('change', 'phaserRefresh', function(data) {
        self.onChange(data.species);
    })

    // Todo: if appropriate, bind createSpriteFor to 'add' event
}

PhaserCell.prototype.onChange = function(species) {
    // set sprite of this 
    this.hideAllExcept(species);
    this.showSprite(species);
}

PhaserCell.prototype.createSprites = function() {
    for (var species_id in this.register) {
        this.createSpriteFor(species_id);
    } 
}

window.alls = [];

PhaserCell.prototype.createSpriteFor = function(species_id) {
    var sprite_id = SpeciesSprites[species_id].id;

    if (Utils.isArray(sprite_id)) {
        sprite_id = Utils.randomChoice(sprite_id);
    }   

    // TODO: access game elsehow
    var reg = this.register[species_id];
    reg.sprite = window.game.addMapSprite(this.cell.coords, sprite_id);
        
    reg.sprite.alpha = reg.visible ? 1 : 0;

    window.alls.push(reg.sprite);

    return reg.sprite;
}

PhaserCell.prototype.showSprite = function(species) {
    //console.log('showSprite', this.cell.coords.x, this.cell.coords.y, species.id);
    var reg = this.register[species.id];
    if (!reg) return; // species is not registered yet
    if (!reg.sprite) return;          // sprite not initialized...
    if (reg.sprite.alpha > 0) return; // sprite already visible

    if (SpeciesSprites[species.id].fade) {
        window.game.add.tween(reg.sprite).to(
            { alpha: 1 },
            200,
            Phaser.Easing.Linear.None,
            true, // autostart
            0,    // delay
            0     // loop 
        );
    }
    else {
        reg.sprite.alpha = 1;
    }
}

PhaserCell.prototype.hideSprite = function(species_id) {
    var reg = this.register[species_id];
    if (!reg) return;        // species is not registered yet
    if (!reg.sprite) return; // sprite is not initialized yets
    if (reg.sprite.alpha === 0) return; // sprite is already hidden

    if (SpeciesSprites[species_id].fade) {
        window.game.add.tween(reg.sprite).to(
            { alpha: 0 },
            200,
            Phaser.Easing.Linear.None,
            true, //autostart
            0,    //delay
            0     //loop
        );
    }
    else {
        reg.sprite.alpha = 0;
    }
}

PhaserCell.prototype.hideAllExcept = function(species) {
    for (var id in this.register) {
        if (!!species.id && species.id === id) continue;
        this.hideSprite(id);
    }
}


},{"./data/species-sprites":28}],27:[function(require,module,exports){
module.exports = PhaserCharacter = function(character, sprite) {
    this.character = character;
    this.sprite = sprite;

    //this.createSprites(); // TODO
    this.bindEvents();
}

PhaserCharacter.prototype = {};

PhaserCharacter.prototype.bindEvents = function() {
    var self = this;
    
    this.character.on('moveDiscrete', 'phaserMoveDiscrete', function(data) {
        self.onMoveDiscrete(data);
    })
}

PhaserCharacter.prototype.onMoveDiscrete = function() {
    // move sprite with no animation
    //this.sprite.isoX = this.character.coords.x * Settings.cellDims.x;
    //this.sprite.isoY = this.character.coords.y * Settings.cellDims.y;
 
    // move sprite WITH animation
    var tween = window.game.add.tween(this.sprite);
    tween.to(
        {
            isoX: this.character.coords.x * Settings.cellDims.x - 30, // argh
            isoY: this.character.coords.y * Settings.cellDims.y - 23, // argh
        },
        400,
        Phaser.Easing.Sinusoidal.InOut,
        true, 0, 0
    )
    tween.onComplete.add(function() {
        // character has finished moving
    })
}

PhaserCharacter.prototype.createSprites = function() {
}

},{}],28:[function(require,module,exports){
// Index of which sprites to show for each species.

module.exports = SpeciesSprites = {};

// test species 
SpeciesSprites['blue'] =  { id: 'blue' }
SpeciesSprites['red'] =   { id: 'red' }
SpeciesSprites['green'] = { id: 'green' }


// actual species
SpeciesSprites['blank'] = {
    id: 'dirt'
}

SpeciesSprites['dirt'] = {
    id: 'dirt'
}

SpeciesSprites['neutralized'] = {
    id: ['neutralizer1', 'neutralizer2', 'neutralizer3'],
    fade: true
}

SpeciesSprites['magic'] = {
    id: 'magic',
    fade: true
}

SpeciesSprites['grass'] = {
    id: 'grass'
}

SpeciesSprites['flowers'] = {
    id: 'flower',
    fade: true
}

SpeciesSprites['trees'] = {
    id: ['tree1', 'tree8', 'tree11'],
    fade: true
}

SpeciesSprites['trees2'] = {
    id: ['tree2', 'tree13'],
    fade: true
}

},{}],29:[function(require,module,exports){
module.exports = phaserIso = {};

phaserIso.load = function(Context) {
    var GameStates = require('./states');

    window.game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, 'game', null, true, false);

    for (var stateName in GameStates) {
        var state = GameStates[stateName];
        if (typeof state.setContext === 'function') state.setContext(Context);
        game.state.add(stateName, state);
    }


    game.state.start('Boot');
};


},{"./states":32}],30:[function(require,module,exports){
var Settings = window.Settings;
var AssetData = require('../asset_data');

var game;

module.exports = Boot = function (_game) { 
    game = _game;
};

Boot.prototype = {
    preload: function () {
        for (var sprite_id in AssetData) {
            game.load.image(sprite_id, AssetData[sprite_id].url);
        }

        game.time.advancedTiming = true;

        game.plugins.add(new Phaser.Plugin.Isometric(game));
        
        game.world.setBounds(0, 0, Settings.gameDims.x, Settings.gameDims.y);

        game.physics.startSystem(Phaser.Plugin.Isometric.ISOARCADE);
        game.iso.anchor.setTo.apply(game.iso.anchor, Settings.gameAnchor);
    },

    create: function() {
        console.log('Game state: Boot');
        game.state.start('Menu');
    }
}

},{"../asset_data":25}],31:[function(require,module,exports){
var game;

module.exports = End = function (_game) { 
    game = _game;
};

End.prototype = {
    create: function () {
        console.log('Game state: End');
        // Todo :)

        game.state.start('Menu');
    },
};

},{}],32:[function(require,module,exports){
module.exports = GameStates = {
    Boot: require('./boot.js'),
    Menu: require('./menu.js'),
    Play: require('./play.js'),
    End:  require('./end.js'),
}

},{"./boot.js":30,"./end.js":31,"./menu.js":33,"./play.js":34}],33:[function(require,module,exports){
var game;

module.exports = Menu = function (_game) { 
    game = _game;
};

Menu.prototype = {
    create: function () {
        console.log('Game state: Menu');
        // Todo :)

        game.state.start('Play');
    },
};

},{}],34:[function(require,module,exports){
var XY = window.XY;
var Settings = window.Settings;
var AssetData = require('../asset_data');
var game;


// this holds player, wizard, etc
var Context;

var PhaserCell = require('../cell.js')
var PhaserCharacter = require('../character.js')

module.exports = Play = function (_game) { 
    game = _game;
};

Play.setContext = function(newContext) {
    console.assert(!!newContext.Map);
    console.assert(!!newContext.GamePlayModes);
    console.assert(!!newContext.Player);
    console.assert(!!newContext.Wizard);
    Context = newContext;
};

Play.prototype = {
    preload: function() {
        // TODO clean this up, find better homes for these methods
        game.addMapSprite = function(gameCoords, sprite_id) {
            // use for the map sprites, not character sprites
            var sprite = game.add.isoSprite(
                gameCoords.x * Settings.cellDims.x,
                gameCoords.y * Settings.cellDims.y,
                0,
                sprite_id, 0, game.mapGroup
            )
            sprite.anchor.set.apply(sprite.anchor, AssetData[sprite_id].anchors);

            return sprite;
        }

        game.map = Context.Map;
        game.map.init({
            size: Settings.mapSize
        })

        game.playModes = Context.GamePlayModes;
        game.playModes.init(game)
    },

    create: function () {
        console.log('Game state: Play');
        game.cursor = null;

        game.mapGroup = game.add.group();
        game.physics.isoArcade.gravity.setTo(0, 0, 0);

        game.map.generate();

        var phaserCells = [];
        game.map.forEach(function(coords, cell) {
            phaserCells.push(new PhaserCell(cell));
        })
        game.iso.simpleSort(game.mapGroup);
        
        game.cursor = new Phaser.Plugin.Isometric.Point3();
        game.input.onUp.add(onTap, this);

        // PLAYER
        // ** Sprite is completely independent from the player object
        // (Unlike the cell objs, who own their sprites)
        game.playerSprite = game.add.isoSprite(
            Settings.playerStart.x * Settings.cellDims.x,
            Settings.playerStart.y * Settings.cellDims.y,
            2, 'player', 0, game.mapGroup
        );
        game.playerSprite.anchor.set(0.5, 1.0);
        game.physics.isoArcade.enable(game.playerSprite);
        game.playerSprite.body.collideWorldBounds = true;
        
        game.player = Context.Player(game.map);
        var phaserPlayer = new PhaserCharacter(game.player, game.playerSprite);

        // TODO: this sprite issue is a huge mess; clean it up
        game.wizardSprite = game.add.isoSprite(
            Settings.wizardStart.x * Settings.cellDims.x,
            Settings.wizardStart.y * Settings.cellDims.y,
            2, 'wizard', 0, game.mapGroup
        )
        game.wizard = Context.Wizard(game.map, game.wizardSprite);
        var phaserWizard = new PhaserCharacter(game.wizard, game.wizardSprite);

        // CAMERA
        game.camera.follow(game.playerSprite);

        //var center = XY(game.playerSprite.x, game.playerSprite.y) 
        //var center = game.playerSprite;
        var center = XY(game.width / 2, game.height / 2)
        var deadzone = XY(
            game.camera.width * Settings.cameraDeadzone,
            game.camera.height * Settings.cameraDeadzone
        )
        game.camera.deadzone = new Phaser.Rectangle(
            center.x - deadzone.x / 2,
            center.y - deadzone.y / 2,
            deadzone.x,
            deadzone.y
        );

        bindInventoryEvents();

        // SPIN UP THE MAP
        game.map.startIteration();
    },

    update: function () {
        game.iso.unproject(game.input.activePointer.position, game.cursor);

        handleMovement();
        
        // Which cell is the player on? send game coords to player obj
        var spriteCoords = getGameCoords(game.playerSprite.isoX, game.playerSprite.isoY);
        if (!game.player.isAt(spriteCoords)) {
            game.player.moveTo(spriteCoords);
        }
    },
    render: function () {
        debugText();
    }
};

// Misc floating helpers
// TODO: refactor after decisions are made / stuff is stable

function debugText() {
    var cursor = getGameCoords(game.cursor.x, game.cursor.y);
    var lines = [
        'GAME',
        '  mode:     ' + game.playModes.get(),
        '  cursor:   ' + xyStr(cursor),
        '  last tap: ' + (!!game.lastTap ? xyStr(game.lastTap) : ''),
        'PLAYER',
        '  coords:    ' + xyStr(game.player.coords),
        '  health:    ' + game.player.health,
        '  speed:     ' + game.player.speed,
        '  underfoot: ' + Context.Map.getCell(game.player.coords).species.id 
    ]

    var color = "#CDE6BB";
    var lineheight = 14;
    var line = 1;
    for (var line = 0; line < lines.length; line++) {
        game.debug.text(lines[line], 2, (line + 1) * lineheight, color)
    }
}

function xyStr(xy) { return xy.x + ' ' + xy.y; }

function getGameCoords(isoX, isoY) {
  return XY(
    Math.round(isoX / Settings.cellDims.x),
    Math.round(isoY / Settings.cellDims.y)
  );
}

var stop = function() {
    game.playerSprite.body.velocity.setTo(0, 0);
}

function handleMovement() {

    var spriteCoords = getGameCoords(game.playerSprite.isoX, game.playerSprite.isoY);
    var cursorCoords = getGameCoords(game.cursor.x, game.cursor.y);
    if (spriteCoords.x === cursorCoords.x && spriteCoords.y === cursorCoords.y) {
        stop();
        return;
    }

    if (game.input.activePointer.isDown && game.playModes.get() === 'idle') {
        game.physics.isoArcade.moveToPointer(game.playerSprite, game.player.speed);
    }
    else {
       stop(); 
    }
}

function bindInventoryEvents() {
    // This is vanilla html, not phaser. TODO: see if there is a better way
    var inventoryHtml = document.getElementById('game-inventory');
    var slots = Array.apply(Array, inventoryHtml.getElementsByClassName('slot'));
    slots.forEach(function(slotHtml) {
        slotHtml.onclick = function(evt) {
            evt.stopPropagation(); // don't send it to the phaser game canvas
            console.log('Clicked:', slotHtml.dataset.itemId)
            game.playModes.advance({item: slotHtml.dataset.itemId});
        }
    })
}


function onTap(pointer, doubleTap) {
    game.lastTap = getGameCoords(game.cursor.x, game.cursor.y);

    // Taps signify possible mode changes
    game.playModes.advance({coords: game.lastTap});

    // todo: place inventory item
}


},{"../asset_data":25,"../cell.js":26,"../character.js":27}],35:[function(require,module,exports){
// Tree sprites are from
// http://opengameart.org/content/tree-collection-v26-bleeds-game-art
// Bleed - http://remusprites.carbonmade.com/

module.exports = AssetData = {
    blue: {
        symbol:  '~',
        color:   '#00B'
    },
    red: {
        symbol:  '~',
        color:   '#B00'
    },
    green: {
        symbol:  '~',
        color:   '#0B0'
    },
    blank: {
        symbol:  '~',
        color:   '#5F4F29'
    },
	neutralized: {
        symbol:  'x',
        color:   '#422121'
    },
	magic: {
        symbol: '&#8960;',
        color:  '#4C24A3'
    },
	dirt: {
        symbol: '&#8960;',
        color:  '#4C24A3'
    },
	grass: {
        symbol: '&#8756;',
        color:  '#46CF46'
    },
	flowers: {
        symbol: '&#9880;',
        color:  '#E46511'
    },
	trees: {
        symbol: '&psi;',
        color:  '#174925'
    },
	trees2: {
        symbol: '&#;',
        symbol: '&psi;',
    }
}

},{}],36:[function(require,module,exports){
module.exports = Controls = {};

var game;

Controls.init = function(gameInstance) {
    game = gameInstance;
    this.bindEvents();
}

Controls.bindEvents = function() {
    game.html.mouseOverlay.onclick = function(evt) {
        evt.stopPropagation();
        var offset = game.renderer.getPixelOffset();
        var mousePos = {
            x: evt.clientX - offset.x - game.renderer.bbox.left,
            y: evt.clientY - offset.y - game.renderer.bbox.top
        }
        var coords = game.renderer.getCoordsFromPixels(mousePos);
        game.state.advance({coords: coords});
    }

    document.body.onclick = function() {
        game.state.advance({});
    }
    
    this.bindInventory();
    this.bindMovement();
}

Controls.bindMovement = function() {
    var keyboardCallbacks = {
        37: Controls.handlers.left,
        39: Controls.handlers.right,
        38: Controls.handlers.up,
        40: Controls.handlers.down
    }

    window.addEventListener('keydown', function(event) {
        var keycode = event.fake || window.event ? event.keyCode : event.which;
        if (keycode in keyboardCallbacks) keyboardCallbacks[keycode]();
    });
}

Controls.bindInventory = function() {
    var self = this;
    var slots = Array.apply(Array, game.html.inventory.getElementsByClassName('slot'));
    slots.forEach(function(slotHtml) {
        slotHtml.onclick = function(evt) {
            evt.stopPropagation();
            self.handlers.inventory(slotHtml.dataset.itemId);
        }
    })
}

Controls.handlers = {};

// INVENTORY

Controls.handlers.inventory = function(itemId) {
    game.state.advance({item: itemId});
}


// MOVEMENT

Controls.handlers.left = function() {
    game.player.move(Utils.dirs['w']);
    game.refreshView();
},

Controls.handlers.right = function() {
    game.player.move(Utils.dirs['e']);
    game.refreshView();
},

Controls.handlers.up = function() {
    game.player.move(Utils.dirs['n']);
    game.refreshView();
},

Controls.handlers.down = function() {
    game.player.move(Utils.dirs['s']);
    game.refreshView();
}

},{}],37:[function(require,module,exports){
// OLD PROTOTYPE CODE
// WARNING: SUPER MESSY

var Utils = window.Utils;
var Settings = window.Settings;
window.UI = require('./ui');
var MapRenderer = require('./map-renderer');
var Controls = require('./controls');

var game = window.game;
var Context = null;
var ToolChest, Wizard, Player; // these will get instantiated in setContext()

module.exports = topdown = {}; 

topdown.load = function(globalContext) {
    setContext(globalContext);
    configGame(window.game);
    init();
}

function setContext(newContext) {
    Context = newContext;
    ToolChest = Context.Items; 
    Wizard = Context.Wizard;
    Player = Context.Player;

    var game = window.game;
    game.state = Context.GamePlayModes; // NOT THE SAME AS IT WAS BEFORE
    game.map = Context.Map;

    //game.size = Settings.gameSize; 
    game.size = Settings.mapSize; 

    game.cellDims = Settings.cellDims;
    window.TC = ToolChest;
}


var init = UI.infoWrap('loading...', function() {
    var game = window.game;
    game.html = {
        board: document.getElementById('game'),
        characters: document.getElementById('game-characters'),
        inventory: document.getElementById('game-inventory'),
        mouseOverlay: document.getElementById('mouse-overlay')
    }

    game.map.init({
        size: game.size,
    });

    game.map.generate();

    MapRenderer.init(game.map, {
        window: 10,
        dims: game.cellDims,
        html: game.html.board
    })

    // some interfaces with other stuff
    game.render = function() { MapRenderer.render(game.map.env); }
    game.renderer = MapRenderer;

    game.render();

    // Characters
    // TODO: separate character rendering and then don't pass charElement in here
    game.wizard = Wizard(game.map);
    game.player = Player(game.map);

    game.refreshView();
    game.state.init(game);
    Controls.init(game);

    game.map.startIteration();
});

function configGame(game) {
    game.refreshView = function() {
        if (!MapRenderer.isInWindow(game.player.coords)) {
            game.map.recenter(game.player.coords);
            game.player.refresh();
            game.wizard.refresh();
        }
    }

    game.refreshView2 = function() {
        var d = Map.getDistanceFromWindowEdge(game.player.coords);
        if (d.north > 0 || d.south > 0 || d.west > 0 || d.east > 0) {
            //console.log('d:', d)
            if (d.north > 0) game.map.shiftView({x:0, y:-d.north});
            if (d.south > 0) game.map.shiftView({x:0, y: d.south});
            if (d.west > 0) game.map.shiftView({x:-d.west, y:0});
            if (d.east > 0) game.map.shiftView({x: d.east, y:0});
            game.player.refresh();
            game.wizard.refresh();
        }
    }
}

},{"./controls":36,"./map-renderer":38,"./ui":39}],38:[function(require,module,exports){
var AssetData = require('./asset-data');

module.exports = MapRenderer = {};

MapRenderer.init = function(map, params) {
    this.map = map;
    this.window = params.window;

    // Direct references. So the parent should not overwrite them.
    this.html = params.html;
    this.dims = params.dims;
    this.centerCoords = this.map.center;
    this.bbox = params.html.getBoundingClientRect();
    this.centerPx = {
        x: this.bbox.width / 2,
        y: this.bbox.height / 2
    }
    this.viewSize = {
        x: this.bbox.width / this.dims.x,
        y: this.bbox.height / this.dims.y
    }
    this.zoomFactor = 2; // /shrug
}

// Settings
cellClass = 'cell'
cellIdDelimiter = '_'
cellIdPrefix = cellClass + cellIdDelimiter;


// Methods

MapRenderer.coordsToId = function(coords) {
    return cellIdPrefix + coords.x + cellIdDelimiter + coords.y
}
MapRenderer.idToCoords = function(id) {
    var coordArray = id.slice(cellIdPrefix.length).split(cellIdDelimiter);
    return {x: coordArray[0], y: coordArray[1] }
}

// more ugh. Pixels should be relative to the top left corner of the map itself, not the html element
 MapRenderer.getCoordsFromPixels = function(pixels) {
    return {
        x: Math.floor(pixels.x / this.dims.x),
        y: Math.floor(pixels.y / this.dims.y),
    }
}

MapRenderer.createCell = function(cellObject) {
    var cellElement = document.createElement('div');
    cellElement.setAttribute('class', cellClass);
    this.styleCell(cellElement, cellObject);
    this.bindCellEvents(cellObject);
    return cellElement;
}

MapRenderer.styleCell = function(cellElement, cellObject) {
    var assetData = AssetData[cellObject.species.id];
    cellElement.style.width = this.dims.x + 'px';
    cellElement.style.height = this.dims.y + 'px';
    cellElement.style.lineHeight = this.dims.y + 'px';
    cellElement.style.backgroundColor = assetData.color; 
    cellElement.innerHTML = assetData.symbol;

    // highlight ruts
    if (Object.keys(cellObject.ruts).length > 0) {
        cellElement.style.border = '1px solid red';
        cellElement.style.width = (this.dims.x - 2) + 'px';
        cellElement.style.height = (this.dims.y - 2) + 'px';

        var rut_string = '';
        for (var r in cellObject.getActiveRuts()) {
           rut_string += r[0].toUpperCase(); 
        }

        cellElement.innerHTML = rut_string;
        cellElement.style.color = 'red'
    }
}

MapRenderer.positionCell = function(cellElement, coords) {
    cellElement.setAttribute('id',  this.coordsToId(coords));

    var position = {
        x: this.centerPx.x + (-this.centerCoords.x + coords.x) * this.dims.x,
        y: this.centerPx.y + (-this.centerCoords.y + coords.y) * this.dims.y
    }

    cellElement.style.left = position.x + 'px';
    cellElement.style.top = position.y + 'px';
    return cellElement;
}

MapRenderer.bindCellEvents = function(cellObject) {
    var self = this;
    cellObject.on('change', 'refresh', function(data) {
       self.refreshCell(cellObject.coords) 
    })
}

MapRenderer.getCell = function(coords) {
    return document.getElementById(this.coordsToId(coords));
}

MapRenderer.render = function(env) {
    var self = this;

    self.rescale();

    self.html.innerHTML = '';

    env.range().forEach(function(coords) {
        var cellElement = self.createCell(env.get(coords));
        self.positionCell(cellElement, coords);
        self.html.appendChild(cellElement);
    })
}

MapRenderer.refresh = function(env, fullRefresh) {
    var self = this;
    env = env || this.map.env;

    self.rescale();

    var coordsToRefresh = env.range();

    // TODO: this is super buggy with cells that used to be in view but aren't anymore
    if (!fullRefresh) coordsToRefresh = coordsToRefresh.filter(function(crd) { return self.isInView(crd); });
 
    coordsToRefresh.forEach(function(coords) { self.refreshCoords(env, coords); })
    return this;
}

MapRenderer.refreshCoords = function(env, coords) {
    var cellObject = env.get(coords);
    var cellElement = document.getElementById(this.coordsToId(coords));
    this.styleCell(cellElement, cellObject)
    this.positionCell(cellElement, coords);
    return this;
}

MapRenderer.rescale = function() {
    // argh
    this.viewSize = {
        x: this.bbox.width / this.dims.x,
        y: this.bbox.height / this.dims.y
    };
    return this;
}

// Returns the number of pixels between the html's NW corner and the map's NW corner (at 0,0) 
MapRenderer.getPixelOffset = function() {
    return {
        x: this.centerPx.x + -this.centerCoords.x * this.dims.x,
        y: this.centerPx.y + -this.centerCoords.y * this.dims.y
    }
}

// Returns cell coords, not pixels
MapRenderer.getViewBbox = function() {
    return {
        x1: this.centerCoords.x - this.viewSize.x/2,
        x2: this.centerCoords.x + this.viewSize.x/2,
        y1: this.centerCoords.y - this.viewSize.y/2,
        y2: this.centerCoords.y + this.viewSize.y/2,
    }
}

// Returns whether a cell coords is in view or not
MapRenderer.isInView = function(coords) {
    var bbox = this.getViewBbox();
    return coords.x > bbox.x1
        && coords.x < bbox.x2
        && coords.y > bbox.y1
        && coords.y < bbox.y2;
}


MapRenderer.isInWindow = function(coords) {
    var distance = Math.max(
            Math.abs(coords.x - this.map.center.x),
            Math.abs(coords.y - this.map.center.y)
        )   
    return distance < this.window;

}

MapRenderer.refreshCell = function(coords, forceRefresh) {
    if (!forceRefresh && !this.isInView(coords)) return this;
    this.refreshCoords(this.map.env, coords);
}

MapRenderer.zoomOut = function() {
    this.dims.x /= this.zoomFactor;
    this.dims.y /= this.zoomFactor;
    //this.window *= this.zoomFactor;
    this.refresh()
    return this;
}

MapRenderer.zoomIn = function() {
    this.dims.x *= this.zoomFactor;
    this.dims.y *= this.zoomFactor;
    //this.window /= this.zoomFactor;
    this.refresh()
    return this;
}

},{"./asset-data":35}],39:[function(require,module,exports){
// UI/HUD

module.exports = UI = {};

UI.infoTimeout = null;

// Display info text for the specified lifetime
// If lifetime isn't specified, then the text will stay up forever (until something else is shown)
UI.info = function(text, lifetime) {

    document.getElementById('info').textContent = text;

    clearTimeout(UI.infoTimeout);
    if (typeof lifetime === 'number') {
        UI.infoTimeout = setTimeout(function() {
            UI.info('', false);
        }, lifetime)
    }
}

// Display info text only while the given function is executing
UI.infoWrap = function(text, fn) {
    return function() {
        UI.info(text);

        setTimeout(function() {
            fn();
            UI.info('');
        }, 0)
    }
}

UI.zoomOut = UI.infoWrap('zooming...', function() { game.renderer.zoomOut(); })
UI.zoomIn = UI.infoWrap('zooming...', function() { game.renderer.zoomIn(); })


},{}],40:[function(require,module,exports){
var Utils = window.Utils;
var Character = require('./character');
var Walking = require('./character/walking');

module.exports = Wizard = function(map) {
    var wizard = new Character({
        map: map,
        id: 'wizard',
        speciesResponses: {
            'neutralized': function() {
                wizard.ouch();
            }
        },

        trailingRuts: {
//            'magic': 1
        }
    });
    
    Events.init(wizard);

    // make sure wizard is beyond a certain point
    //var startingCoords = {x: -1, y: -1};
    //while (startingCoords.x < Settings.wizardMin.x && startingCoords.y < Settings.wizardMin.y) {
    //    startingCoords = game.map.env.randomCoords();
    //}
    var startingCoords = Settings.wizardStart;

    // ugh, TODO clean this up
    wizard.moveTo(startingCoords);
    window.wizard = wizard;

    // start magic where the wizard is
    //map.diamondClump(wizard.coords, map.species.magic)


    // have the wizard amble randomly
    wizard.getSomewhatRandomDir = function() {
        // 33% chance to walk in the same direction as last step
        if (!!this.lastStep && Math.random() < 1/3) {
            return this.lastStep;
        }
        return Utils.dirs[Utils.randomChoice(Utils.dirs)];
    }

    wizard.walk = new Walking(wizard,
        function getNextDir() {
            return wizard.getSomewhatRandomDir();
        },
        function onStep(dir) {
            //wizard.faceDirection(dir);
            
            // Note for the Phaser view: this movement happens before the animation, so it looks a bit
            // janky. The magic appears on the next tile before the wizard appears to arrive on the tile.
            // Maybe the phaser view could send a 'finished moving' signal back?
            // But it's hard to keep different views decoupled, in that case.
            
            wizard.emit('moveDiscrete', {});

            wizard.map.env.set(wizard.coords, wizard.map.species.magic);
            wizard.map.getCell(wizard.coords).refreshTimeout();

            // make sure the wizard trails magic
            wizard.lastStep = dir;
        }
    )
    wizard.walk.start();

    return wizard;
}

},{"./character":1,"./character/walking":3}]},{},[5]);
