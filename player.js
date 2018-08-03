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

    // Override visibility to count the cells viewable via camera
    player.isCoordsVisible = function(coords) {
        var selfVisible = this.__proto__.isCoordsVisible.call(this, coords);
        if (selfVisible) return true;

        if (game.map.items.camera) {
            for (var item_id in game.map.items.camera) {
                var item_coords = game.map.items.camera[item_id];
                var item = game.map.getCell(item_coords).getItem(item_id);
                if (item.isCoordsVisible(coords)) return true;
            }
        }

        return false;
    }

    return player;
}

function initInventory(player, inventoryCounts) {
    for (var itemType in inventoryCounts) {
        for (var i = 0; i < inventoryCounts[itemType]; i++) {
            player.gets(ToolChest.make(itemType));
        }
    }
}