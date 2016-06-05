module.exports = function(x, y) {
    return new XY(x, y);
}

var XY = function(x, y) {
    this.x = x;
    this.y = y;
}
