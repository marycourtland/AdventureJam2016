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
    var pixelPosition = this.getPixelsFromCoords(coords, 'middle');
    this.sprite.moveTo(pixelPosition);
}

CharacterRenderer.prototype.bindEvents = function() {
    var self = this;
    
    this.character.on('moveDiscrete', 'topdownMoveDiscrete', function(data) {
        self.onMoveDiscrete(data);
    })
}

CharacterRenderer.prototype.onMoveDiscrete = function() {
    this.moveTo(this.character.coords);
}