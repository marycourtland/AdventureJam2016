var PhaserCharacter = module.exports = function(character, sprite) {
    this.character = character;
    this.sprite = sprite;

    //this.createSprites(); // TODO
    this.bindEvents();
}

PhaserCharacter.prototype = {};

PhaserCharacter.prototype.bindEvents = function() {
    var self = this;
    
    this.character.on('moveDiscrete', 'phaserMoveDiscrete', function(data) {
        self.onMoveDiscrete(data);
    })
}

PhaserCharacter.prototype.onMoveDiscrete = function() {
    // move sprite with no animation
    //this.sprite.isoX = this.character.coords.x * Settings.cellDims.x;
    //this.sprite.isoY = this.character.coords.y * Settings.cellDims.y;
 
    // move sprite WITH animation
    var tween = window.game.add.tween(this.sprite);
    tween.to(
        {
            isoX: this.character.coords.x * Settings.cellDims.x - 30, // argh
            isoY: this.character.coords.y * Settings.cellDims.y - 23, // argh
        },
        400,
        Phaser.Easing.Sinusoidal.InOut,
        true, 0, 0
    )
    tween.onComplete.add(function() {
        // character has finished moving
    })
}

PhaserCharacter.prototype.createSprites = function() {
}
