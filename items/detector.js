// Empty placeholder object. TODO

var Detector = module.exports = {};
Detector.id = 'detector';

Detector.useAt = function(coords) {
    var map = window.game.map;
    map.placeItem(coords, this);
}
