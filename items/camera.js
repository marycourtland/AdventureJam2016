// Empty placeholder object. TODO

var Camera = module.exports = {};
Camera.id = 'camera';

Camera.useAt = function(coords) {
    // Put the item in the spot...
    this.coords = coords;
    var map = window.game.map;
    map.placeItem(coords, this);

}

Camera.getVisibility = function() {
    return {
        x1: this.coords.x - Settings.visibilityCamera,
        y1: this.coords.y - Settings.visibilityCamera,
        x2: this.coords.x + Settings.visibilityCamera + 1,
        y2: this.coords.y + Settings.visibilityCamera + 1,
    }
}

// Same as character.isCoordsVisible. TODO: a single 'visibility' component would be nice
Camera.isCoordsVisible = function(coords) {
    var visibilityBbox = this.getVisibility();
    return (
        coords.x >= visibilityBbox.x1 &&
        coords.x <= visibilityBbox.x2 &&
        coords.y >= visibilityBbox.y1 &&
        coords.y <= visibilityBbox.y2
    )
}
