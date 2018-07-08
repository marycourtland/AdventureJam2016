// OLD PROTOTYPE CODE
// WARNING: SUPER MESSY

var Utils = window.Utils;
var Settings = window.Settings;
window.UI = require('./ui');
var Controls = require('./controls');
var TopDownView = require('./top-down-view');
var MapRenderer = require('./map-renderer');
var CharacterRenderer = require('./character-renderer');

var game = window.game;
var Context = null;
var ToolChest, Wizard, Player; // these will get instantiated in setContext()

module.exports = topdown = {}; 

topdown.load = function(globalContext) {
    setContext(globalContext);
    configGame(window.game);
    init();
}

function setContext(newContext) {
    Context = newContext;
    ToolChest = Context.Items; 
    Wizard = Context.Wizard;
    Player = Context.Player;

    var game = window.game;
    game.state = Context.GamePlayModes; // NOT THE SAME AS IT WAS BEFORE
    game.map = Context.Map;

    //game.size = Settings.gameSize; 
    game.size = Settings.mapSize; 

    game.cellDims = Settings.cellDims;
    window.TC = ToolChest;
}


var init = UI.infoWrap('loading...', function() {
    var game = window.game;

    // Map
    game.map.init({
        size: game.size,
    });

    game.map.generate();

    // Characters
    game.wizard = Wizard(game.map);
    game.player = Player(game.map);


    // Renderers
    game.viewParams = {
        window: 10,
        size: game.size,
        dims: game.cellDims,
        margin: 2,
        html: {
            container: document.getElementById('board-layers'),
            board: document.getElementById('game'),
            characters: document.getElementById('game-characters'),
            inventory: document.getElementById('game-inventory'),
            mouseOverlay: document.getElementById('mouse-overlay')
        }
    }

    game.view = new TopDownView(game.viewParams);
    game.renderer = new MapRenderer(game.map);

    game.view.addRenderer(game.renderer);
    game.view.addRenderer(new CharacterRenderer('wizard', game.wizard));
    game.view.addRenderer(new CharacterRenderer('player', game.player));

    game.view.init(game.viewParams)

    game.view.recenter(game.player.coords);
    game.wizard.refresh();
    game.player.refresh();

    game.view.render();

    game.state.init(game);
    Controls.init(game, game.viewParams);

    game.map.startIteration();
});

function configGame(game) {
    game.refreshView2 = function() {
        if (!game.view.isInView(game.player.coords)) {
            game.view.recenter(game.player.coords);
            game.player.refresh();
            game.wizard.refresh();
        }
    }

    game.refreshView = function() {
        var margin = 3;
        var d = game.view.getDistanceFromWindowEdge(game.player.coords);
        if (d.north < margin || d.south < margin || d.west < margin || d.east < margin) {
            //console.log('d:', d)
            if (d.north < margin) game.view.shiftView({x:0, y:-1});
            if (d.south < margin) game.view.shiftView({x:0, y: 1});
            if (d.west < margin) game.view.shiftView({x:-1, y:0});
            if (d.east < margin) game.view.shiftView({x: 1, y:0});
            game.player.refresh();
            game.wizard.refresh();
        }
    }
}

