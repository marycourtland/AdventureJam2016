var Map = require('./map');
var Settings = window.Settings;
var Character = require('./character');
var Utils = require('./utils');
var Walking = require('./character/walking');
var ToolChest = require('./items');
window.TC = ToolChest;

var game = {};
game.size = Settings.gameSize; 
game.cellDims = Settings.cellDims;

window.game = game;

var player, wizard;

function initGame() {
    boardElement = document.getElementById('game');
    charElement = document.getElementById('game-characters')
    inventoryElement = document.getElementById('game-inventory')

    Map.init({
        size: game.size,
        dims: game.cellDims,
        window: 8,
        html: boardElement
    });

    player = new Character({
        map: Map,
        id: 'player',
        sprite: 'player'
    })

    wizard = new Character({
        map: Map,
        id: 'wizard',
        sprite: 'wizard'
    })

    // ugh, TODO clean this up
    wizard.sprite.scaleTo(game.cellDims).place(charElement);
    wizard.moveTo(Map.env.randomCoords());
    window.wizard = wizard;

    player.sprite.scaleTo(game.cellDims).place(charElement);
    player.moveTo(Map.center)
    window.pl = player;

    // Player initial inventory
    player.gets(ToolChest.make(ToolChest.types.neutralizer))
    player.gets(ToolChest.make(ToolChest.types.neutralizer))
    player.gets(ToolChest.make(ToolChest.types.neutralizer))
    player.gets(ToolChest.make(ToolChest.types.neutralizer))
    player.gets(ToolChest.make(ToolChest.types.neutralizer))
    player.gets(ToolChest.make(ToolChest.types.bomb))
    player.gets(ToolChest.make(ToolChest.types.bomb))
    player.gets(ToolChest.make(ToolChest.types.bomb))
    player.gets(ToolChest.make(ToolChest.types.camera))
    player.gets(ToolChest.make(ToolChest.types.camera))
    player.gets(ToolChest.make(ToolChest.types.camera))
    player.gets(ToolChest.make(ToolChest.types.detector))
    player.gets(ToolChest.make(ToolChest.types.detector))
    player.gets(ToolChest.make(ToolChest.types.detector))

    player.inventory.rendersTo(inventoryElement);


    // start magic where the wizard is
    Map.diamondClump(wizard.coords, Map.species.magic)


    // have the wizard amble randomly
    wizard.getSomewhatRandomDir = function() {
        // 33% chance to walk in the same direction as last step
        if (!!this.lastStep && Math.random() < 1/3) {
            return this.lastStep;
        }
        return Utils.dirs[Utils.randomChoice(Utils.dirs)];
    }

    wizard.walk = new Walking(wizard,
        function() {
            return wizard.getSomewhatRandomDir();
        },
        function onStep(dir) {
            wizard.faceDirection(dir);
            wizard.refresh();

            // make sure the wizard trails magic
            Map.set(wizard.coords, Map.species.magic);
            Map.refreshCell(wizard.coords);

            wizard.lastStep = dir;
        }
    )
    wizard.walk.start();

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

    window.addEventListener('keydown', function(event) {
        var keycode = event.fake || window.event ? event.keyCode : event.which;
        if (keycode in keyboardCallbacks) keyboardCallbacks[keycode]();
    });

}

function refreshCamera() {
    if (!Map.isInWindow(player.coords)) {
        Map.recenter(player.coords);
        player.refresh();
        wizard.refresh();
    }
}

// TODO: maybe things would be nicer if this was demoted to a worker
game.iterationTimeout = null;
window.iterateMap = function() {
    if (Settings.mapIterationTimeout <= 0) return;

    Map.advance();

    if (!Settings.randomizeCellIteration) {
        Map.refresh();
        if (window.doCounts) window.doCounts();
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
