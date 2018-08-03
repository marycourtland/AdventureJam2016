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

    var visBoxes = this.getVisibilityBoxes();

    // If all cells are visible, don't bother with the extra operations.
    var completeVisibilities = visBoxes.filter((visibilityBbox) => {
        return visibilityBbox.x1 === 0 && visibilityBbox.y1 === 0 && visibilityBbox.x2 === game.size.x && visibilityBbox.y2 === game.size.y;
    })
    if (completeVisibilities.length > 0) return;


    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.filter = 'none';
    this.ctx.fillStyle = "#0C1416";
    this.ctx.fillRect(0, 0, size.x, size.y);

    visBoxes.forEach((visibilityBbox) => {
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

    // TODO: this called every time the player moves. Would be nice to know
    // whether we need to refresh the camera visibility boxes or not.

    // Player visibility
    visBoxes.push(game.player.getVisibility());

    // Areas of visibility around cameras
    if (game.map.items.camera) {
        for (var item_id in this.game.map.items.camera) {
            var coords = this.game.map.items.camera[item_id];
            var item = this.game.map.getCell(coords).getItem(item_id);
            visBoxes.push(item.getVisibility());
        }
    }

    return visBoxes;
}