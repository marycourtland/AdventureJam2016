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
        dims: game.cellDims,
        html: {
            board: document.getElementById('game'),
            characters: document.getElementById('game-characters'),
            inventory: document.getElementById('game-inventory'),
            mouseOverlay: document.getElementById('mouse-overlay')
        }
    }

    game.view = new TopDownView();
    game.renderer = new MapRenderer(game.map);

    game.view.addRenderer(game.renderer);
    game.view.addRenderer(new CharacterRenderer('wizard', game.wizard));
    game.view.addRenderer(new CharacterRenderer('player', game.player));

    game.view.init(game.viewParams)

    game.wizard.refresh();
    game.player.refresh();

    // some interfaces with other stuff
    game.render = function() { game.renderer.render(game.map.env); }

    game.render();

    game.refreshView();
    game.state.init(game);
    Controls.init(game, game.viewParams);

    game.map.startIteration();
});

function configGame(game) {
    game.refreshView = function() {
        if (!game.renderer.isInWindow(game.player.coords)) {
            game.renderer.recenter(game.player.coords);
            game.player.refresh();
            game.wizard.refresh();
        }
    }

    game.refreshView2 = function() {
        var d = Map.getDistanceFromWindowEdge(game.player.coords);
        if (d.north > 0 || d.south > 0 || d.west > 0 || d.east > 0) {
            //console.log('d:', d)
            if (d.north > 0) game.renderer.shiftView({x:0, y:-d.north});
            if (d.south > 0) game.renderer.shiftView({x:0, y: d.south});
            if (d.west > 0) game.renderer.shiftView({x:-d.west, y:0});
            if (d.east > 0) game.renderer.shiftView({x: d.east, y:0});
            game.player.refresh();
            game.wizard.refresh();
        }
    }
}
