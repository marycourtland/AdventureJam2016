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
        window: 8,
        html: game.html.board
    });

    // Characters
    // TODO: separate character rendering and then don't pass charElement in here
    game.wizard = Wizard(game, game.map);
    game.player = Player(game, game.map);

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

// UI/HUD
window.UI = require('./ui');
window.onload = UI.infoWrap('loading...', initGame);
