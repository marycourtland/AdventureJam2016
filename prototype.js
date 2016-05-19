var Map = require('./map');
var Sprite = require('./sprite');
var Character = require('./character')
var SpriteData = require('./sprite-data');
var Utils = require('./utils');
 
var Settings = window.Settings;

var game = {};
game.size = Settings.gameSize; 
game.cellDims = Settings.cellDims;

window.game = game;

var player; 

function initGame() {
    boardElement = document.getElementById('game');
    charElement = document.getElementById('game-characters')

    Map.init({
        size: game.size,
        dims: game.cellDims,
        window: 7,
        html: boardElement
    });

    player = new Character({
        map: Map,
        id: 'player',
        sprite: 'player'
    })

    // ugh, TODO clean this up
    player.sprite.scaleTo(game.cellDims).place(charElement);
    player.moveTo(Map.center)
    window.pl = player;

    bindEvents();
    iterateMap();
}

function bindEvents() {
    var mouseOverlay = document.getElementById('mouse-overlay');

    mouseOverlay.onclick = function() {
        Map.advance();
        Map.refresh();
    }

    var keyboardCallbacks = {
        37: function goLeft(evt) {
            player.move(Utils.dirs['w']);
            refreshCamera();
        },

        39: function goRight(evt) {
            player.move(Utils.dirs['e']);
            refreshCamera();
        },

        38: function goUp(evt) {
            player.move(Utils.dirs['n']);
            refreshCamera();
        },

        40: function goDown(evt) {
            player.move(Utils.dirs['s']);
            refreshCamera();
        }
    }

    window.addEventListener('keyup', function(event) {
        var keycode = event.fake || window.event ? event.keyCode : event.which;
        if (keycode in keyboardCallbacks) keyboardCallbacks[keycode]();
    });

}

function refreshCamera() {
    if (!Map.isInWindow(player.coords)) {
        Map.recenter(player.coords);
        player.refresh();
    }
}

// TODO: maybe things would be nicer if this was demoted to a worker
game.iterationTimeout = null;
window.iterateMap = function() {
    if (Settings.mapIterationTimeout <= 0) return;

    Map.advance();

    if (!Settings.randomizeCellIteration) {
        Map.refresh();
    }
    else {
        // Pick random times to show the cell update
        // TODO: the isInView call might be outdated if we change views
        Map.forEach(function(coords, cell) {
            if (!Map.isInView(coords)) return;
            setTimeout(function() {
                Map.refreshCell(coords);
            }, Math.random() * Settings.mapIterationTimeout);
        })
    }
    
    // Schedule another map iteration
    clearTimeout(game.iterationTimeout);
    game.iterationTimeout = setTimeout(function() {
        iterateMap();
    }, Settings.mapIterationTimeout)
}

// UI/HUD
window.UI = require('./ui');
window.onload = UI.infoWrap('loading...', initGame);
