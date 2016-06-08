var Settings = window.Settings;
var GameStates = require('./states');

window.game = null;

window.onload = function() {
    window.game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, 'game', null, true, false);

    for (var state in GameStates) {
        game.state.add(state, GameStates[state]);
    }

    game.state.start('Boot');
};

