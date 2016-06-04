var Settings = window.Settings;
var ToolChest = require('./items');
var Utils = require('./utils');
var Controls = require('./controls');
var Wizard = require('./wizard');
var Player = require('./player');
window.TC = ToolChest;

var game = {};
game.map = require('./map');
game.state = require('./state');
game.size = Settings.gameSize; 
game.cellDims = Settings.cellDims;

window.game = game;

function initGame() {
    game.html = {
        board: document.getElementById('game'),
        characters: document.getElementById('game-characters'),
        inventory: document.getElementById('game-inventory'),
        mouseOverlay: document.getElementById('mouse-overlay')
    }

    game.map.init({
        size: game.size,
        dims: game.cellDims,
        window: 10,
        html: game.html.board
    });

    // Characters
    // TODO: separate character rendering and then don't pass charElement in here
    game.wizard = Wizard(game, game.map);
    game.player = Player(game, game.map);

    game.refreshView();
    game.state.init(game);
    Controls.init(game);

    game.iterateMap();
}

game.refreshView = function() {
    if (!game.map.isInWindow(game.player.coords)) {
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

if (Settings.advanceAllCells) {
    // TODO: maybe things would be nicer if this was demoted to a worker
    game.iterationTimeout = null;
    game.iterateMap = function() {
        if (Settings.mapIterationTimeout <= 0) return;

        game.map.advance();

        if (!Settings.randomizeCellIteration) {
            game.map.refresh();
            if (window.doCounts) window.doCounts();
        }
        else {
            // Pick random times to show the cell update
            // TODO: the isInView call might be outdated if we change views
            game.map.forEach(function(coords, cell) {
                if (!game.map.isInView(coords)) return;
                setTimeout(function() {
                    game.map.refreshCell(coords);
                }, Math.random() * Settings.mapIterationTimeout);
            })
        }
        
        // Schedule another map iteration
        clearTimeout(game.iterationTimeout);
        game.iterationTimeout = setTimeout(function() {
            game.iterateMap();
        }, Settings.mapIterationTimeout)
    }
}
else {
    // Advance each cell individually
    // spin off its own little timer thingy
    // ** THIS IS SUPER PROTOTYPE-Y
    game.iterateMap = function() {
        game.map.env.range().forEach(function(coords) {
            var cell = game.map.getCell(coords);
            cell.iterationTimeout = null;
            cell.iterate = function() {
                if (Settings.mapIterationTimeout <= 0) return;

                cell.advance();

                game.map.refreshCell(coords);

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
                var neighbors = game.map.env.neighbors(coords);
                this.next(neighbors);
                this.flush();
            }

            cell.iterate();
        })
    }
}

// UI/HUD
window.UI = require('./ui');
window.onload = UI.infoWrap('loading...', initGame);
