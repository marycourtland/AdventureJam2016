var Neutralizer = module.exports = {};
Neutralizer.id = 'neutralizer';
Neutralizer.infinite = true;

// TODO: do something other than accessing the global game instance
Neutralizer.useAt = function(coords) {
    var map = window.game.map;
    map.set(coords, map.species.neutralized)
}
