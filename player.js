var Character = require('./character');
var ToolChest = require('./items');

var CELL_CHANGE_EVT = 'check_cell_for_magic';

module.exports = Player = function(game) {
    var player = new Character({
        map: game.map,
        id: 'player',
        sprite: 'player',

        // check whether player needs to lose health (from being on magic)
        onWalk: function(coords) {
            var newCell = player.map.getCell(coords);
            if (newCell.species.id === 'magic') {
                player.ouch();
            } 
            
            // keep track of older cell
            if (player.previousCell) player.previousCell.off('change', CELL_CHANGE_EVT);

            player.previousCell = newCell;

            newCell.on('change', CELL_CHANGE_EVT, function(data) {
                if (data.species.id === 'magic') player.ouch();
            })
        }
    });

    player.previousCell = null;

    // ugh, TODO clean this up
    player.sprite.scaleTo(game.cellDims).place(game.html.characters);
    player.moveTo(game.map.center);

    // temporary
    window.player = player;;

    // Starting inventory
    initInventory(player, {
        neutralizer: 5,
        bomb: 3,
        camera: 3,
        detector: 3
    })

    player.inventory.rendersTo(game.html.inventory);

    return player;
}

function initInventory(player, inventoryCounts) {
    for (var itemType in inventoryCounts) {
        for (var i = 0; i < inventoryCounts[itemType]; i++) {
            player.gets(ToolChest.make(itemType));
        }
    }
}
