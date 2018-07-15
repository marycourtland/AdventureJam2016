// Empty placeholder object. TODO

var Camera = module.exports = {};
Camera.id = 'camera';

Camera.useAt = function(coords) {
    // Put the item in the spot...
    var map = window.game.map;
    map.placeItem(coords, this);

}
