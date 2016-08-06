var Utils = window.Utils;
var Character = require('./character');
var Walking = require('./character/walking');

module.exports = Wizard = function(map) {
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
    
    Events.init(wizard);

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
            
            // Note for the Phaser view: this movement happens before the animation, so it looks a bit
            // janky. The magic appears on the next tile before the wizard appears to arrive on the tile.
            // Maybe the phaser view could send a 'finished moving' signal back?
            // But it's hard to keep different views decoupled, in that case.
            
            wizard.emit('moveDiscrete', {});

            wizard.map.env.set(wizard.coords, wizard.map.species.magic);
            wizard.map.getCell(wizard.coords).refreshTimeout();

            // make sure the wizard trails magic
            wizard.lastStep = dir;
        }
    )
    wizard.walk.start();

    return wizard;
}
