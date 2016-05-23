var Sprite = require('./sprite');
var SpriteData = require('./data/sprites');
var Inventory = require('./inventory');
var Utils = require('../utils');

module.exports = Character = function(params) {
    params.id = params.id || '';
    params.sprite= params.sprite || '';

    console.assert(params.sprite in SpriteData, "spriteId doesn't exist: " + params.sprite);

    this.map = params.map;
    this.id = params.id;
    this.sprite = new Sprite(SpriteData[params.sprite]).setFrame(Object.keys(SpriteData[params.sprite].frames)[0]);
    this.coords = {x:0, y:0};

    this.inventory = new Inventory(this);
}

Character.prototype = {};


// ============= MOVEMENT / RENDERING

Character.prototype.moveTo = function(coords) {
    this.coords.x = coords.x;
    this.coords.y = coords.y;

    // move sprite
    var pos = {
        x: this.coords.x * this.map.dims.x,
        y: this.coords.y * this.map.dims.y,
    }

    var offset = this.map.getOffset();
    this.sprite.moveTo({x: pos.x + offset.x, y: pos.y + offset.y});

    // put the sprite in the center of the tile
    this.sprite.move({x: this.map.dims.x / 2, y: this.map.dims.y / 2});

    // TODO: make sure it doesn't go off the map... or handle that case or something

    return this;
}

Character.prototype.move = function(diff) {
    console.assert(Math.abs(diff.x) + Math.abs(diff.y) === 1, 'character should only move 1 step at a time')

    this.moveTo({x: this.coords.x + diff.x, y: this.coords.y + diff.y});
    this.faceDirection(diff);
    return this;
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


// ============================== ITEMS / INVENTORY

Character.prototype.gets = function(item) {
    this.inventory.addItem(item);
}

Character.prototype.use = function(item, coords) {
    if (!this.inventory.has(item.id)) return;
    this.inventory.removeItem(item);
    item.useAt(coords);
}
