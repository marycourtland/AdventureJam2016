(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Tree sprites are from
// http://opengameart.org/content/tree-collection-v26-bleeds-game-art
// Bleed - http://remusprites.carbonmade.com/

module.exports = AssetData = {
    player: {
        url:     'images/player-forward.png',
        anchors: [0.5, 1.0],
    },
    wizard: {
        url:     'images/wizard.png',
        anchors: [0.5, 1.0],
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

},{}],2:[function(require,module,exports){
var Inventory = require('./inventory');
var Utils = require('../utils');

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

    return this;
}

Character.prototype.move = function(diff) {
    console.assert(Math.abs(diff.x) + Math.abs(diff.y) === 1, 'character should only move 1 step at a time')

    this.moveTo({x: this.coords.x + diff.x, y: this.coords.y + diff.y});
    this.faceDirection(diff);
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

},{"../utils":23,"./inventory":3}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
var Settings = window.Settings;
var AssetData = require('./asset_data')
var Map = require('./map');
var Player = require('./player');
var XY = require('./xy');

window.player = null;
window.game = null;

window.onload = function() {
    window.game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, 'game', null, true, false);

    game.mapGroup = null; // will be initialized

    // use for the map sprites, not character sprites
    game.addMapSprite = function(gameCoords, sprite_id) {
        var sprite = game.add.isoSprite(
            gameCoords.x * Settings.cellDims.x,
            gameCoords.y * Settings.cellDims.y,
            0,
            sprite_id, 0, game.mapGroup
        )
        sprite.anchor.set.apply(sprite.anchor, AssetData[sprite_id].anchors);

        return sprite;
    }

    Map.init({
        size: Settings.gameSize
    })


    // Initialize Phaser game state
    game.cursor = null;

    var Boot = function (game) {};
    Boot.prototype = {
        preload: function () {
            for (var sprite_id in AssetData) {
                game.load.image(sprite_id, AssetData[sprite_id].url);
            }

            game.time.advancedTiming = true;

            game.plugins.add(new Phaser.Plugin.Isometric(game));
            
            game.world.setBounds(0, 0, 5000, 5000);

            game.physics.startSystem(Phaser.Plugin.Isometric.ISOARCADE);
            game.iso.anchor.setTo.apply(game.iso.anchor, Settings.gameAnchor);

        },
        create: function () {
            game.mapGroup = game.add.group();
            game.physics.isoArcade.gravity.setTo(0, 0, 0);

            Map.generate();
            Map.forEach(function(coords, cell) {
                cell.createSprites();
            })
            game.iso.simpleSort(game.mapGroup);
            
            
            game.cursor = new Phaser.Plugin.Isometric.Point3();
            game.input.onUp.add(onTap, this);

            // PLAYER
            // ** Sprite is completely independent from the player object
            // (Unlike the cell objs, who own their sprites)
            //
            game.playerSprite = game.add.isoSprite(38, 38, 2, 'player', 0, game.mapGroup);
            game.playerSprite.anchor.set(0.5, 1.0);
            game.physics.isoArcade.enable(game.playerSprite);
            game.playerSprite.body.collideWorldBounds = true;
            
            game.player = Player(Map);

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
            console.log('Center:', center);
            console.log('Deadzone:', game.camera.deadzone)



            // SPIN UP THE MAP
            startMapIteration();

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

    game.state.add('Boot', Boot);
    game.state.start('Boot');
};

// TODO: refactor after decisions are made / stuff is stable

function debugText() {
    var cursor = getGameCoords(game.cursor.x, game.cursor.y);
    var lines = [
        'CURSOR',
        '  coords: ' + cursor.x + ' ' + cursor.y,
        'PLAYER',
        '  coords: ' + game.player.coords.x + ' ' + game.player.coords.y,
        '  health: ' + game.player.health,
        '  speed:  ' + game.player.speed
    ]

    var color = "#CDE6BB";
    var lineheight = 14;
    var line = 1;
    for (var line = 0; line < lines.length; line++) {
        game.debug.text(lines[line], 2, (line + 1) * lineheight, color)
    }
}

function getGameCoords(isoX, isoY) {
  return XY(
    Math.round(isoX / Settings.cellDims.x),
    Math.round(isoY / Settings.cellDims.y)
  );
}

function onTap(pointer, doubleTap) {
    var tapCoords = getGameCoords(game.cursor.x, game.cursor.y);
    // todo: place inventory item
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

    if (game.input.activePointer.isDown) {
        game.physics.isoArcade.moveToPointer(game.playerSprite, 500);
    }
    else {
       stop(); 
    }


}

function startMapIteration() {
    Map.env.range().forEach(function(coords) {
        var cell = Map.getCell(coords);
        cell.iterationTimeout = null;
        cell.iterate = function() {
            if (Settings.mapIterationTimeout <= 0) return;

            cell.advance();

            // schedule another iteration
            clearTimeout(cell.iterationTimeout);
            cell.iterationTimeout = setTimeout(function() {
                cell.iterate();
            }, getTimeout() )
        }

        function getTimeout() {
            // adjust the settings a bit, randomly...
            var scale = 1 + 0.5 * (Math.random() * 2 - 1);
            return Settings.mapIterationTimeout * scale;
        }

        // single-cell replacement for Advancerator
        cell.advance = function() {
            var neighbors = Map.env.neighbors(coords);
            this.next(neighbors);
            this.flush();
        }

        window.setTimeout(function() { cell.iterate(); }, getTimeout());
    })
}


},{"./asset_data":1,"./map":17,"./player":22,"./xy":24}],5:[function(require,module,exports){
module.exports = Bomb = {};
Bomb.id = 'bomb';

Bomb.useAt = function(coords) {
    var map = window.game.map;
    map.diamondClump(coords, map.species.neutralized);
    map.refresh();
}

},{}],6:[function(require,module,exports){
// Empty placeholder object. TODO

module.exports = Box = {};
Box.id = 'box';

},{}],7:[function(require,module,exports){
// Empty placeholder object. TODO

module.exports = Camera= {};
Camera.id = 'camera';

Camera.useAt = function(coords) {
    // Put the item in the spot...
    var map = window.game.map;
    map.placeItem(coords, this);

}

},{}],8:[function(require,module,exports){
// Empty placeholder object. TODO

module.exports = Detector = {};
Detector.id = 'detector';

Detector.useAt = function(coords) {
    var map = window.game.map;
    map.placeItem(coords, this);
}

},{}],9:[function(require,module,exports){
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

},{"./bomb.js":5,"./box.js":6,"./camera.js":7,"./detector.js":8,"./neutralizer.js":10,"./type-template":11}],10:[function(require,module,exports){
module.exports = Neutralizer = {};
Neutralizer.id = 'neutralizer';

// TODO: do something other than accessing the global game instance
Neutralizer.useAt = function(coords) {
    var map = window.game.map;
    map.set(coords, map.species.neutralized)
    map.refreshCell(coords);
}

},{}],11:[function(require,module,exports){
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


},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

    // register contains:
    //  species
    //  age
    //  sprite obj
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

    // Update age
    if (this.nextSpecies)
        this.register[this.nextSpecies.id].age = nextStates[this.nextSpecies.id].age;
    
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

// This has to be done separately
Cell.prototype.createSprites = function() {
    // This will have to be turned off and on as needed
    for (var species_id in this.register) {
        var reg = this.register[species_id];
        var sprite_id = reg.species.sprite.id;
        if (Utils.isArray(sprite_id)) {
            sprite_id = Utils.randomChoice(sprite_id)
        }

        // TODO: access game elsehow
        reg.sprite = window.game.addMapSprite(this.coords, sprite_id);
        
        reg.sprite.alpha = reg.visible ? 1 : 0
    }
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

},{"../utils":23,"./species-battle":19}],14:[function(require,module,exports){
module.exports = GrowthRules = {
    magic: {
        stateMap: {
            0: [0.001, 0.1, 0, 1, 1, 1, 1, 1, 0],
            1: [0, 0, 0, 1, 0, 1, 1, 0, 0]
        },
        weights: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    },

    // When plants are old enough, they become stable - less likely to grow, slightly likely to die
    plantsStable: {
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
        stateMap: {
            0: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            1: [0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
    }
}

},{}],15:[function(require,module,exports){
var GrowthRules = require('./growth-rules')

// Conditional growth rules are sorted by priority, low > high.

module.exports = speciesData = [
    {
        id: 'blank',
        symbol: '~',
        color: '#5F4F29',
        sprite: {id: 'dirt'}
    },
    {
        id: 'neutralized',
        symbol: 'x',
        color: '#422121',
        sprite: {id: 'neutralized'}
    },

    {
        id: 'magic',
        symbol: '&#8960;',
        color: '#4C24A3',
        sprite: {
            id: 'magic',
            fade: true
        },
        rules: {
            default: GrowthRules.magic
        }
    },

    {
        id: 'grass',
        symbol: '&#8756;',
        color: '#46CF46', 
        sprite: {id: 'grass'},
        rules: {
            default: GrowthRules.plants,
            conditional: [
                {
                    min_neighbors: 1,
                    species_id: 'magic',
                    rules: GrowthRules.plantsDying
                }
            ]
        }
    },

    {
        id: 'flowers',
        symbol: '&#9880;',
        color: '#E46511',
        sprite: {
            id: 'flower',
            fade: true
        },
        rules: {
            default: GrowthRules.plants,
            conditional: [
                {
                    min_neighbors: 1,
                    species_id: 'magic',
                    rules: GrowthRules.plantsDying
                }
            ]
        }
    },

    {
        id: 'trees',
        symbol: '&psi;',
        color: '#174925',
        sprite: {
            id: ['tree1', 'tree8', 'tree11', 'tree13'],
            fade: true
        },
        speed: 200,
        passable: false,
        rules: {
            default: GrowthRules.plants,
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
    },

    // Pine trees - SAME RULES ETC AS THE OTHER TREES
    // Just separated out for some interest/variety
    {
        id: 'trees2',
        symbol: '&psi;',
        color: '#174925',
        sprite: {
            id: ['tree2'],
            fade: true
        },
        speed: 200,
        passable: false,
        rules: {
            default: GrowthRules.plants,
            conditional: [
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
    },

]

},{"./growth-rules":14}],16:[function(require,module,exports){
// Example:
// env = new Env({x:30, y:30});

var Cell = require('./cell.js')
var Advancerator = require('./advancerator.js');
var XY = require('../xy');

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

},{"../xy":24,"./advancerator.js":12,"./cell.js":13}],17:[function(require,module,exports){
var Env = require('./environment');
var Species = require('./species');
//var Renderer = require('./renderer')
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

    // Unused prototype stuff
    //this.dims = params.dims;
    //this.window = params.window; // what radius of tiles should comprise the camera window?
    //this.renderer = new Renderer(params.html, this.dims, this.center);
    //this.render();
}


Map.generate = function() {
    var self = this;

    // register involved species with all of the cells
    self.env.range().forEach(function(coords) {
        var cell = self.env.get(coords);
        cell.add(self.species.magic);
        cell.add(self.species.grass);
        cell.add(self.species.trees);
        cell.add(self.species.trees2);
    })

    self.sow(self.species.grass, 1/10);
    self.sow(self.species.flowers, 1/50)
    self.sow(self.species.trees, 1/20);
    self.sow(self.species.trees2, 1/20);
    self.env.advance(3);

    // empty spot in the 0,0 corner
    self.rect(self.species.grass, {x:0, y:0}, {x:6, y:6});

    // here is some magic until the wizard is implemented
    self.diamondClump(self.center, self.species.magic)

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
    for (var x = from.x; x < to.x; x++) {
        for (var y = from.y; y < to.y; y++) {
            clump.push({x:x, y:y});
        }
    }
    return this.clump(from, clump, species);
}

// randomly set cells as the species
Map.sow = function(species, frequency) {
    var self = this;
    var numSeeds = self.size.x * self.size.y * frequency;

    // Pick some places to seed
    var seeds = [];
    for (var i = 0; i < numSeeds; i++) {
        seeds.push(self.env.randomCoords());
    }

    seeds.forEach(function(coords) { self.env.set(coords, species); })

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


// UNUSED PROTOTYPE STUFF
/*

// MARGINS / CAMERA
Map.isInWindow = function(coords) {
    var distance = Math.max(
        Math.abs(coords.x - this.center.x),
        Math.abs(coords.y - this.center.y)
    )
    return distance < this.window;
}

Map.getDistanceFromWindowEdge = function(coords) {
    return {
        north: (this.center.y - this.window) - coords.y,
        west: (this.center.x - this.window) - coords.x,
        south: coords.y - (this.center.y + this.window),
        east: coords.x - (this.center.x + this.window)
    }
}



// Different than isInWindow. Uses the rectangular renderer view
Map.isInView = function(coords) {
    return this.renderer.isInView(coords);
}

// ITEMS
Map.placeItem = function(coords, item) {
    var cell = this.env.get(coords);
    cell.addItem(item);
    // put it in the html
    item.rendersTo(this.renderer.getCell(coords));
}


// RENDERING
Map.render = function() { this.renderer.render(this.env); return this; }
Map.refresh = function() { this.renderer.refresh(this.env); return this; }
Map.refreshFull = function() { this.renderer.refresh(this.env, true); return this; }

Map.refreshCell = function(coords, forceRefresh) {
    if (!forceRefresh && !this.isInView(coords)) return this;
    this.renderer.refreshCoords(this.env, coords);
}

Map.zoomFactor = 2;

Map.zoomIn = function() {
    this.dims.x *= Map.zoomFactor;
    this.dims.y *= Map.zoomFactor;
    this.window /= Map.zoomFactor;
    this.refreshFull();
    return this;
}

Map.zoomOut = function() {
    this.dims.x /= Map.zoomFactor;
    this.dims.y /= Map.zoomFactor;
    this.window *= Map.zoomFactor;
    this.refreshFull();
    return this;
}

Map.recenter = function(coords) {
    this.center.x = coords.x;
    this.center.y = coords.y;
    this.refreshFull();
    return this;
}

Map.shiftView = function(dCoords) {
    this.recenter({
        x: this.center.x + dCoords.x,
        y: this.center.y + dCoords.y
    })
    return this;
}


// ugh
Map.getOffset = function() {
    return this.renderer.getPixelOffset();
}

// more ugh. Pixels should be relative to the top left corner of the map itself, not the html element
Map.getCoordsFromPixels = function(pixels) {
    return {
        x: Math.floor(pixels.x / this.dims.x),
        y: Math.floor(pixels.y / this.dims.y),
    }
}

// clump all this stuff together in a renderer
Map.renderer = require('./renderer')
*/

},{"./data/species":15,"./environment":16,"./species":21}],18:[function(require,module,exports){
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

    this.stateMap = ruleParams.stateMap || {};

    // TODO: this should really be a coordmap...
    this.weights = indexWeights(ruleParams.weights || [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1]
    ]);
}

RuleSet.prototype = {};

RuleSet.prototype.transform = function(state, neighbors) {
    // If we try to transform anything unknown, things will just stay constant.
    if (!(state in this.stateMap)) { return state; }

    var sum = deepWeightedSum(neighbors, this.weights);

    if (sum >= this.stateMap[state].length) { return state; }

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

},{}],19:[function(require,module,exports){
// This module is for deciding the winning species in a cell!
// 
// For now, it's just 'which species is higher in the pecking order'

module.exports = SpeciesBattle = {
    peckingOrder: [
        // sorted from low to high
        'blank',
        'grass',
        'flowers',
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

},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
var RuleSet = require('./ruleset');
var SpeciesMask = require('./species-mask');

module.exports = Species = function(params) {
    this.id = params.id || 'species' + Math.floor(Math.random()*1e8);
    this.sprite = params.sprite;

    // behavior
    // TODO: fix passable for phaser
    this.passable = params.hasOwnProperty('passable') ? params.passable : true;

    if (params.hasOwnProperty('speed')) {
        this.speed = params.speed;
    }

    this.initRules(params.rules);

    //this.ruleSet = new RuleSet(params.rules);

    // This is a function to decide whether a cell hosts this species or not
    this.mask = SpeciesMask(this.id);
}

Species.prototype = {};

// this is sort of messy; it populates stuff in the rules object
Species.prototype.initRules = function(rules) {
    this.rules = rules || {};

    // The default rules govern how the species spreads based on its own presence
    this.rules.default = new RuleSet(this.rules.default)   

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

    var nextState = ruleset.transform(maskedCell, maskedNeighbors);

    // propagate age (this will only be used if nextState is 1)
    // TODO: make a way to compose things together (like self.mask and cell.getAge)
    var maskedAges = mapCoordmap(neighbors, function(cell) { return !!cell ? self.mask(cell) * cell.getAge() : 0 });
    var age = Math.ceil(coordmapAvg(maskedAges));
    
    return {state: nextState, age: age};
}


Species.prototype.decideRuleset = function(cell, neighbors) {
    var winningRuleset = this.rules.default;

    if (this.rules.conditional.length === 0) return winningRuleset;

    // Conditional rules are sorted from lowest priority to highest.

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

},{"./ruleset":18,"./species-mask":20}],22:[function(require,module,exports){
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

},{"./character":2,"./items":9}],23:[function(require,module,exports){
module.exports = Utils = {};

Utils.dirs = { 
    'n': {x: 0, y: -1},
    's': {x: 0, y: 1},
    'w': {x: -1, y:0},
    'e': {x: 1, y:0}
}

Utils.randomChoice = function(array) {
    if (!Utils.isArray(array) && typeof array === 'object') array = Object.keys(array);
    return array[Math.floor(Math.random() * array.length)];
}

Utils.isArray = function(array) {
    return array.constructor === [].constructor;
}

Utils.distance = function(coords1, coords2) {
    return Math.sqrt(
        Math.pow(coords1.x - coords2.x, 2) +
        Math.pow(coords1.y - coords2.y, 2)
    )
}

},{}],24:[function(require,module,exports){
module.exports = function(x, y) {
    return new XY(x, y);
}

var XY = function(x, y) {
    this.x = x;
    this.y = y;
}

},{}]},{},[4]);
