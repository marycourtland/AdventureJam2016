var Settings = window.Settings;
var AssetData = require('./asset_data')
var Map = require('./map');
var XY = require('./xy');

window.game = null;
window.onload = function() {
    window.game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, 'game', null, true, false);

    game.mapGroup = null; // will be initialized

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

            game.mapGroup = game.add.group();
            game.plugins.add(new Phaser.Plugin.Isometric(game));

            game.iso.anchor.setTo.apply(game.iso.anchor, Settings.gameAnchor);

        },
        create: function () {
            Map.generate();
            Map.forEach(function(coords, cell) {
                cell.createSprites();
            })
            game.iso.simpleSort(game.mapGroup);
            
            game.cursor = new Phaser.Plugin.Isometric.Point3();

            game.input.onUp.add(onTap, this);

            startMapIteration();

        },
        update: function () {
            game.iso.unproject(game.input.activePointer.position, game.cursor);
        },
        render: function () {
        }
    };

    game.state.add('Boot', Boot);
    game.state.start('Boot');
};

function onTap(pointer, doubleTap) {
    var tapCoords = XY(
        Math.ceil(game.cursor.x / Settings.cellDims.x),
        Math.ceil(game.cursor.y / Settings.cellDims.y)
    )

    game.debug.text('tap: ' + tapCoords.x + ' ' + tapCoords.y, 2, 14, "#a7aebe");
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
