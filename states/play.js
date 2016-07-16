var Settings = window.Settings;
var AssetData = require('../asset_data');
var Map = require('../map');
var GamePlayModes = require('../gameplay-modes');
var Player = require('../player');
var Wizard = require('../wizard');
var XY = require('../xy');
var game;

module.exports = Play = function (_game) { 
    game = _game;
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

        game.map = Map;
        game.map.init({
            size: Settings.mapSize
        })

        game.playModes = GamePlayModes;
        game.playModes.init(game)
    },

    create: function () {
        console.log('Game state: Play');
        game.cursor = null;

        game.mapGroup = game.add.group();
        game.physics.isoArcade.gravity.setTo(0, 0, 0);

        game.map.generate();
        game.map.forEach(function(coords, cell) {
            cell.createSprites();
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
        
        game.player = Player(game.map);

        // TODO: this sprite issue is a huge mess; clean it up
        game.wizardSprite = game.add.isoSprite(
            Settings.wizardStart.x * Settings.cellDims.x,
            Settings.wizardStart.y * Settings.cellDims.y,
            2, 'wizard', 0, game.mapGroup
        )
        game.wizard = Wizard(game.map, game.wizardSprite);

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
        '  underfoot: ' + Map.getCell(game.player.coords).species.id 
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

function startMapIteration() {
    // this is just to kick off each cell
    function getTimeout() {
        // flat distribution because it' the first iteration
        return Math.random() * Settings.mapIterationTimeout;
    }

    Map.env.range().forEach(function(coords) {
        var cell = Map.getCell(coords);

        window.setTimeout(function() { cell.iterate(); }, getTimeout());
    })
}

