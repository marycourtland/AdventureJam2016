var Character = require('./character');
var Utils = require('./utils');
var Walking = require('./character/walking');

module.exports = Wizard = function(map, sprite) {
    var wizard = new Character({
        map: map,
        id: 'wizard',
        speciesResponses: {
            'neutralized': function() {
                wizard.ouch();
            }
        },

        trailingRuts: {
            'magic': 1
        }
    });

    // create the sprite (Character does not do that)

    // make sure wizard is beyond a certain point
    //var startingCoords = {x: -1, y: -1};
    //while (startingCoords.x < Settings.wizardMin.x && startingCoords.y < Settings.wizardMin.y) {
    //    startingCoords = game.map.env.randomCoords();
    //}
    var startingCoords = Settings.wizardStart;

    // ugh, TODO clean this up
    wizard.moveTo(startingCoords);
    window.wizard = wizard;

    // start magic where the wizard is
    //map.diamondClump(wizard.coords, map.species.magic)


    // have the wizard amble randomly
    wizard.getSomewhatRandomDir = function() {
        // 33% chance to walk in the same direction as last step
        if (!!this.lastStep && Math.random() < 1/3) {
            return this.lastStep;
        }
        return Utils.dirs[Utils.randomChoice(Utils.dirs)];
    }

    wizard.walk = new Walking(wizard,
        function getNextDir() {
            return wizard.getSomewhatRandomDir();
        },
        function onStep(dir) {
            //wizard.faceDirection(dir);

            // move sprite
            //sprite.isoX = wizard.coords.x * Settings.cellDims.x;
            //sprite.isoY = wizard.coords.y * Settings.cellDims.y;

            var tween = window.game.add.tween(sprite)
                
            tween.to(
                {
                    isoX: wizard.coords.x * Settings.cellDims.x - 30, // argh
                    isoY: wizard.coords.y * Settings.cellDims.y - 23, // argh
                },
                400,
                //Phaser.Easing.Linear.None,
                Phaser.Easing.Sinusoidal.InOut,
                true, 0, 0
            )
            tween.onComplete.add(function() {
                map.env.set(wizard.coords, map.species.magic)
                map.getCell(wizard.coords).refreshTimeout();
            })

            // make sure the wizard trails magic
            wizard.lastStep = dir;
        }
    )
    wizard.walk.start();

    return wizard;
}
