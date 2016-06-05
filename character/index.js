var Sprite = require('./sprite');
var SpriteData = require('./data/sprites');
var Inventory = require('./inventory');
var Utils = require('../utils');

var CHAR_SPECIES_LISTENER_PREFIX = 'character-species-listener-';

module.exports = Character = function(params) {
    params.id = params.id || '';
    params.sprite= params.sprite || '';

    console.assert(params.sprite in SpriteData, "spriteId doesn't exist: " + params.sprite);

    this.map = params.map;
    this.id = params.id;
    //this.sprite = new Sprite(SpriteData[params.sprite]).setFrame(Object.keys(SpriteData[params.sprite].frames)[0]);
    this.coords = {x:0, y:0};

    this.inventory = new Inventory(this);
    this.health = Settings.maxHealth;

    // Responses to species. These specify what happens when the char either walks onto a new species, or the current cell changes.
    this.speciesResponses = params.speciesResponses || {};
    // sanity check
    for (var species_id in this.speciesResponses) {
        console.assert(typeof this.speciesResponses[species_id] === 'function');
    }
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

    // move sprite (put it in the center of the tile)
    var pos = {
        x: this.coords.x * this.map.dims.x,
        y: this.coords.y * this.map.dims.y,
    }
    var offset = this.map.getOffset();
    this.sprite.moveTo({x: pos.x + offset.x, y: pos.y + offset.y});
    this.sprite.move({x: this.map.dims.x / 2, y: this.map.dims.y / 2});

    // TODO: make sure it doesn't go off the map... or handle that case or something

    // Respond appropriately to whatever species is underfoot
    // ** For now, doesn't pass anything to the response function 
    var newCell = this.map.getCell(this.coords);
    this.respondToSpecies(newCell.species);

    var self = this;
    oldCell.off('change', CHAR_SPECIES_LISTENER_PREFIX + this.id);
    newCell.on('change', CHAR_SPECIES_LISTENER_PREFIX + this.id, function(data) {
        self.respondToSpecies(data.species)
    })

    return this;
}

Character.prototype.move = function(diff) {
    console.assert(Math.abs(diff.x) + Math.abs(diff.y) === 1, 'character should only move 1 step at a time')

    this.moveTo({x: this.coords.x + diff.x, y: this.coords.y + diff.y});
    this.faceDirection(diff);
    return this;
}

Character.prototype.respondToSpecies = function(species) {
    if (species.id in this.speciesResponses) {
        this.speciesResponses[species.id]();
    }
}

Character.prototype.faceDirection = function(dir) {
    var scaledDir = {
        x: dir.x / (dir.x === 0 ? 1 : Math.abs(dir.x)),
        y: dir.y / (dir.y === 0 ? 1 : Math.abs(dir.y))
    };

    var frame;
    for (var dirFrame in Utils.dirs) {
        if (scaledDir.x === Utils.dirs[dirFrame].x && scaledDir.y === Utils.dirs[dirFrame].y) {
            frame = dirFrame;
            break;
        }
    }

    this.sprite.setFrame(frame);
    return this;
}

Character.prototype.refresh = function() {
    this.moveTo(this.coords);
    this.sprite.refreshPosition();
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
