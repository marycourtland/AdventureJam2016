var Settings = window.Settings;
var Views = require('./views');

// view-independent modules
var Context = {
    Map: require('./map'),
    GamePlayModes: require('./gameplay-modes'),
    Items: require('./items'),
    Player: require('./player'),
    Wizard: require('./wizard')
}

window.game = {};

window.onload = function() {
    if (!(Settings.view in Views)) {
        alert('Pick one of these for the game view: ' + Object.keys(Views).join(', '));
        return;
    } 
    Views[Settings.view].load(Context);
}
