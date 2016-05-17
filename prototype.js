var Map = require('./map');
var Sprite = require('./sprite');
var SpriteData = require('./sprite-data');

var game = {};
game.size = {x:50, y:50}; // cells
game.cellDims = {x:30, y:30}; // pixels
window.game = game;

var Character;

function initGame() {
    boardElement = document.getElementById('game');
    charElement = document.getElementById('game-characters')

    Map.init(game.size, game.cellDims, boardElement);
    Map.recenter(0, 0)

    // TODO: this is a bare sprite... should have a character object
    // which binds itself to map coordinates (not pixels)
    Character = (new Sprite(SpriteData.character)).setFrame('up').scaleTo(game.cellDims).place(charElement);
    Character.move(Map.getOffset()).move({x: game.cellDims.x/2, y: game.cellDims.y/2});
    window.ch = Character;

    bindEvents();
}

function bindEvents() {
    var mouseOverlay = document.getElementById('mouse-overlay');

    mouseOverlay.onclick = function() {
        Map.advance();
        Map.refresh();
    }

    var keyboardCallbacks = {
        37: function goLeft(evt) {
            Map.recenter(Map.center.x - 1, Map.center.y);
            Character.setFrame('left');
        },

        39: function goRight(evt) {
            Map.recenter(Map.center.x + 1, Map.center.y);
            Character.setFrame('right');
        },

        38: function goUp(evt) {
            Map.recenter(Map.center.x, Map.center.y - 1);
            Character.setFrame('up');
        },

        40: function goDown(evt) {
            Map.recenter(Map.center.x, Map.center.y + 1);
            Character.setFrame('down');
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
