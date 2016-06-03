module.exports = Bomb = {};
Bomb.id = 'bomb';

Bomb.useAt = function(coords) {
    var map = window.game.map;
    map.diamondClump(coords, map.species.neutralized);
    map.refresh();
}
