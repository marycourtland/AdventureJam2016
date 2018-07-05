var Sprite = require('./sprite');
var SpriteData = require('./data/sprites');
var BaseRenderer = require('./base-renderer');

var CharacterRenderer = module.exports = function(spriteId, character) {

    this.character = character;

    var spriteData = SpriteData[spriteId];
    console.assert(!!spriteData, "spriteId doesn't exist: " + spriteId);
    this.sprite = new Sprite(spriteData).setFrame(Object.keys(spriteData.frames)[0]);
}

CharacterRenderer.prototype = new BaseRenderer();

CharacterRenderer.prototype.onInit = function(params) {
    this.sprite.scaleTo(params.dims).place(params.html.characters);
    this.bindEvents();

    this.moveTo(this.character.coords);
}

CharacterRenderer.prototype.moveTo = function(coords) {
    var pixelPosition = this.view.getPixelsFromCoords(coords, {cellAnchor:'middle'});
    this.sprite.moveTo(pixelPosition);
}

CharacterRenderer.prototype.bindEvents = function() {
    var self = this;

    this.character.on('refresh', 'topdownRefresh', function(data) {
        self.refresh(data);
    })
}

CharacterRenderer.prototype.refresh = function() {
    this.render(); // ???
}

CharacterRenderer.prototype.render = function() {
    this.moveTo(this.character.coords);
}