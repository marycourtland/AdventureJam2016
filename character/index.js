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
