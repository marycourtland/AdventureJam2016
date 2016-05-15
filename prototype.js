var Map = require('./map');

var game = {};
game.size = {x:50, y:50}; // cells
game.cellDims = {x:50, y:50}; // pixels
window.game = game;

function initGame() {
    boardElement = document.getElementById('game');

    Map.init(game.size, game.cellDims, boardElement);
    bindEvents();
}

function bindEvents() {
    var mouseOverlay = document.getElementById('mouse-overlay');

    mouseOverlay.onclick = function() {
        Map.advance();
        Map.render();
    }

    var keyboardCallbacks = {
        37: function goLeft(evt) {
            Map.recenter(Map.center.x - 1, Map.center.y);
        },

        39: function goRight(evt) {
            Map.recenter(Map.center.x + 1, Map.center.y);
        },

        38: function goUp(evt) {
            Map.recenter(Map.center.x, Map.center.y - 1);
        },

        40: function goDown(evt) {
            Map.recenter(Map.center.x, Map.center.y + 1);
        }
    }

    window.addEventListener('keyup', function(event) {
        var keycode = event.fake || window.event ? event.keyCode : event.which;
        if (keycode in keyboardCallbacks) keyboardCallbacks[keycode]();
    });

}


// UI/HUD

window.UI = {};

UI.infoTimeout = null;

// Display info text for the specified lifetime
// If lifetime isn't specified, then the text will stay up forever (until something else is shown)
UI.info = function(text, lifetime) {

    document.getElementById('info').textContent = text;

    clearTimeout(UI.infoTimeout);
    if (typeof lifetime === 'number') {
        UI.infoTimeout = setTimeout(function() {
            UI.info('', false);
        }, lifetime)
    }
}

// Display info text only while the given function is executing
UI.infoWrap = function(text, fn) {
    return function() {
        UI.info(text);

        setTimeout(function() {
            fn();
            UI.info('');
        }, 0)
    }
}

UI.zoomOut = UI.infoWrap('zooming...', function() { Map.zoomOut(); })
UI.zoomIn = UI.infoWrap('zooming...', function() { Map.zoomIn(); })

window.onload = UI.infoWrap('loading...', initGame);
