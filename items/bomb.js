module.exports = Bomb = {};
Bomb.id = 'bomb';

Bomb.useAt = function(coords) {
    var map = window.game.map;
    Map.diamondClump(coords, map.species.neutralized);
    Map.refresh();
}
