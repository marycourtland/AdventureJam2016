var TopDownView  = module.exports = function() {
    this.renderers = [];
}

TopDownView.prototype = {};

TopDownView.prototype.addRenderer = function(renderer) {
    this.renderers.push(renderer);
}

TopDownView.prototype.init = function(params) {
    this.renderers.forEach(function(renderer) {
        renderer.init(params);
    })
}