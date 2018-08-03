var Character = require('./character');
var ToolChest = require('./items');

var CELL_CHANGE_EVT = 'check_cell_for_magic';

var Player = module.exports = function(map) {
    var player = new Character({
        map: map,
        id: 'player',
        visibility: Settings.visibilityPlayer,

        speciesResponses: {
            'magic': function() {
                player.ouch();
            }
        },

        trailingRuts: {
            'footsteps': 1
        }
    });

    // ugh, TODO clean this up
    //player.sprite.scaleTo(game.cellDims).place(game.html.characters);
    player.moveTo(Settings.playerStart);

    // start some grass where the player is
    map.diamondClump(player.coords, map.species.grass)

    // Starting inventory
    initInventory(player, {
        neutralizer: 1,
        bomb: 4,
        camera: 8,
        detector: 4
    })

    player.inventory.rendersTo(document.getElementById('game-inventory'));

    return player;
}

function initInventory(player, inventoryCounts) {
    for (var itemType in inventoryCounts) {
        for (var i = 0; i < inventoryCounts[itemType]; i++) {
            player.gets(ToolChest.make(itemType));
        }
    }
}
