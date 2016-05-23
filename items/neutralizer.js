module.exports = Neutralizer = {};
Neutralizer.id = 'neutralizer';

// TODO: do something other than accessing the global game instance
Neutralizer.useAt = function(coords) {
    var map = window.game.map;
    map.set(coords, map.species.neutralized)
    map.refreshCell(coords);
}
