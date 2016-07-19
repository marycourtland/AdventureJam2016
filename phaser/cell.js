var SpeciesSprites = require('./data/species-sprites')
var Utils = require('../utils')

module.exports = PhaserCell = function(cell) {
    this.cell = cell;

    // Cache each sprite so we're not creating them on the fly
    this.register = {};
    for (var species_id in this.cell.register) {
        this.register[species_id] = {
            sprite: null,

            // At the moment, we're only showing 1 species per cell.
            // Whichever is marked as the dominant species, via cell.species
            visible: this.cell.species.id === species_id
        }
    }

    // TODO: set visible=false appropriately

    this.createSprites();
    this.bindEvents();
}

PhaserCell.prototype = {};

PhaserCell.prototype.bindEvents = function() {
    var self = this;
    this.cell.on('change', 'phaserRefresh', function(data) {
        self.onChange(data.species);
    })

    // Todo: if appropriate, bind createSpriteFor to 'add' event
}

PhaserCell.prototype.onChange = function(species) {
    // set sprite of this 
    this.hideAllExcept(species);
    this.showSprite(species);
}

PhaserCell.prototype.createSprites = function() {
    for (var species_id in this.register) {
        this.createSpriteFor(species_id);
    } 
}

PhaserCell.prototype.createSpriteFor = function(species_id) {
    var sprite_id = SpeciesSprites[species_id].id;

    if (Utils.isArray(sprite_id)) {
        sprite_id = Utils.randomChoice(sprite_id);
    }   

    // TODO: access game elsehow
    var reg = this.register[species_id];
    reg.sprite = window.game.addMapSprite(this.cell.coords, sprite_id);
        
    reg.sprite.alpha = reg.visible ? 1 : 0;

    return reg.sprite;
}

PhaserCell.prototype.showSprite = function(species) {
    var reg = this.register[species.id];
    if (!reg) return; // species is not registered yet
    if (!reg.sprite) return;          // sprite not initialized...
    if (reg.sprite.alpha > 0) return; // sprite already visible

    if (SpeciesSprites[species.id].fade) {
        window.game.add.tween(reg.sprite).to(
            { alpha: 1 },
            200,
            Phaser.Easing.Linear.None,
            true, // autostart
            0,    // delay
            0     // loop 
        );
    }
    else {
        reg.sprite.alpha = 1;
    }
}

PhaserCell.prototype.hideSprite = function(species_id) {
    var reg = this.register[species_id];
    if (!reg) return;        // species is not registered yet
    if (!reg.sprite) return; // sprite is not initialized yets
    if (reg.sprite.alpha === 0) return; // sprite is already hidden

    if (SpeciesSprites[species_id].fade) {
        window.game.add.tween(reg.sprite).to(
            { alpha: 0 },
            200,
            Phaser.Easing.Linear.None,
            true, //autostart
            0,    //delay
            0     //loop
        );
    }
    else {
        reg.sprite.alpha = 0;
    }
}

PhaserCell.prototype.hideAllExcept = function(species_id) {
    for (var id in this.register) {
        if (!!species_id && species_id === id) continue;
        this.hideSprite(id);
    }
}

