var Bomb = module.exports = {};
Bomb.id = 'bomb';

Bomb.useAt = function(coords) {
    var map = window.game.map;
    map.diamondClump(coords, map.species.neutralized);
}
