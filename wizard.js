var Character = require('./character');
var Utils = require('./utils');
var Walking = require('./character/walking');

module.exports = Wizard = function(game) {
    var wizard = new Character({
        map: game.map,
        id: 'wizard',
        sprite: 'wizard' 
    });

    // ugh, TODO clean this up
    wizard.sprite.scaleTo(game.cellDims).place(game.html.characters);
    wizard.moveTo(game.map.env.randomCoords());
    window.wizard = wizard;

    // start magic where the wizard is
    game.map.diamondClump(wizard.coords, game.map.species.magic)


    // have the wizard amble randomly
    wizard.getSomewhatRandomDir = function() {
        // 33% chance to walk in the same direction as last step
        if (!!this.lastStep && Math.random() < 1/3) {
            return this.lastStep;
        }
        return Utils.dirs[Utils.randomChoice(Utils.dirs)];
    }

    wizard.walk = new Walking(wizard,
        function() {
            return wizard.getSomewhatRandomDir();
        },
        function onStep(dir) {
            wizard.faceDirection(dir);
            wizard.refresh();

            // make sure the wizard trails magic
            game.map.set(wizard.coords, Map.species.magic);
            game.map.refreshCell(wizard.coords);

            wizard.lastStep = dir;
        }
    )
    wizard.walk.start();

    return wizard;
}
