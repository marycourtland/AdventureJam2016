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
    var size = XY(game.size.x * game.cellDims.x, game.size.y * game.cellDims.y);

    this.ctx.clearRect(0, 0, size.x, size.y);

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.filter = 'none';
    this.ctx.fillStyle = "#0C1416";
    this.ctx.fillRect(0, 0, size.x, size.y);

    this.getVisibilityBoxes().forEach((visibilityBbox) => {
        // If all cells are visible, don't bother with the extra operations.
        // TODO: prevent all visibility bbox updates if any of them cover the whole map
        // (and prevent the full fog fill above)
        if (visibilityBbox.x1 === 0 && visibilityBbox.y1 === 0 && visibilityBbox.x2 === game.size.x && visibilityBbox.y2 === game.size.y) {
            return;
        }

        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.filter = 'blur(' + (10 * game.view.zoom) + 'px)'; // note: this isn't compatible w/ all browsers
        this.ctx.fillRect(
            (visibilityBbox.x1) * game.cellDims.x,
            (visibilityBbox.y1) * game.cellDims.y,
            (visibilityBbox.x2 - visibilityBbox.x1) * game.cellDims.x,
            (visibilityBbox.y2 - visibilityBbox.y1) * game.cellDims.y
        )
    })
}

FogRenderer.prototype.getVisibilityBoxes = function() {
    var visBoxes = [];

    // Player visibility
    visBoxes.push(game.player.getVisibility());

    // Areas of visibility around cameras
    // TODO: this code could live on the camera item. (But, currently no access to the item from here)
    if (game.map.items.camera) {
        for (var item_id in this.game.map.items.camera) {
            var coords = this.game.map.items.camera[item_id];
            visBoxes.push({
                x1: coords.x - Settings.visibilityCamera,
                y1: coords.y - Settings.visibilityCamera,
                x2: coords.x + Settings.visibilityCamera + 1,
                y2: coords.y + Settings.visibilityCamera + 1,
            })
        }
    }

    return visBoxes;
}