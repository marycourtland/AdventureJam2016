var BaseRenderer = require('./base-renderer');

var FogRenderer = module.exports = function(game) {
    this.game = game;
}

FogRenderer.prototype = new BaseRenderer();

FogRenderer.prototype.onInit = function(params) {
    this.html = params.html.fog;
    this.ctx = this.html.getContext('2d');
    this.render();
    this.bindEvents();
}

FogRenderer.prototype.bindEvents = function() {
    this.game.player.on('refresh', 'visibilityUpdate', () => {
        this.render();
    })
}

FogRenderer.prototype.refresh = function() {
    this.render(); // ???
}

FogRenderer.prototype.render = function() {
    var player = game.player;
    var size = XY(game.size.x * game.cellDims.x, game.size.y * game.cellDims.y);
    var visibilityBbox = player.getVisibility();

    this.ctx.clearRect(0, 0, size.x, size.y);

    // If all cells are visible, don't bother with the extra operations.
    if (visibilityBbox.x1 === 0 && visibilityBbox.y1 === 0 && visibilityBbox.x2 === game.size.x && visibilityBbox.y2 === game.size.y) {
        return;
    }

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.filter = 'none';
    this.ctx.fillStyle = "#0C1416";
    this.ctx.fillRect(0, 0, size.x, size.y);

    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.filter = 'blur(' + (10 * game.view.zoom) + 'px)'; // note: this isn't compatible w/ all browsers
    this.ctx.fillRect(
        (visibilityBbox.x1) * game.cellDims.x,
        (visibilityBbox.y1) * game.cellDims.y,
        (visibilityBbox.x2 - visibilityBbox.x1) * game.cellDims.x,
        (visibilityBbox.y2 - visibilityBbox.y1) * game.cellDims.y
    )
}