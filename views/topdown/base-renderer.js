var BaseRenderer = module.exports = function() {
};

BaseRenderer.prototype = {};

BaseRenderer.prototype.init = function(view, params) {
    this.view = view;
    this.dims = params.dims;
    this.viewParams = params;
    this.onInit(params);
}

BaseRenderer.prototype.onInit = function(params) {};

BaseRenderer.prototype.refresh = function() {};
BaseRenderer.prototype.render = function() {};

BaseRenderer.prototype.onRecenter = function() {};