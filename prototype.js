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
    document.getElementById('mouse-overlay').onclick = function() {
        Map.advance();
        Map.render();
    }
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
