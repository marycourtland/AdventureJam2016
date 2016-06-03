// Empty placeholder object. TODO

module.exports = Detector = {};
Detector.id = 'detector';

Detector.useAt = function(coords) {
    var map = window.game.map;
    map.placeItem(coords, this);
}
