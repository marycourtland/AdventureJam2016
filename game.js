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
            
            // CONTROLS
            initMovement();

            // CAMERA
            game.camera.follow(game.playerSprite);

            // SPIN UP THE MAP
            startMapIteration();

        },
        update: function () {
            game.iso.unproject(game.input.activePointer.position, game.cursor);
            
            // Which cell is the player on? send game coords to player obj
            var inputCoords = getGameCoords(game.playerSprite.isoX, game.playerSprite.isoY);
            if (!game.player.isAt(inputCoords)) {
                game.player.moveTo(inputCoords);
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
    var lines = [
        'PLAYER',
        '  coords: ' + game.player.coords.x + ' ' + game.player.coords.y,
        '  health: ' + game.player.health
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


// This is pretty temporary until I decide on input stuff
var speed = 250;
var movementButtons = [
    {id: 'move-left',  vel: XY(-speed, 0)},
    {id: 'move-right', vel: XY(speed, 0)},
    {id: 'move-up',    vel: XY(0, -speed)},
    {id: 'move-down',  vel: XY(0, speed)},
]

function initMovement() {
    movementButtons.forEach(function(item) {
        var button = document.getElementById(item.id);

        var go = function(evt) {
            evt.stopPropagation();
            game.playerSprite.body.velocity.x = item.vel.x;
            game.playerSprite.body.velocity.y = item.vel.y;
        }

        var stop = function(evt) {
            evt.stopPropagation();
            game.playerSprite.body.velocity.x = 0;
            game.playerSprite.body.velocity.y = 0;
        }

        button.addEventListener('mousedown', go);
        button.addEventListener('mouseup', stop);
        button.addEventListener('touchstart', go);
        button.addEventListener('touchend', stop);
    })

}
initMovement();


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

