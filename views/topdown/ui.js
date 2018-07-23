// UI/HUD

var UI = module.exports = {};

UI.infoTimeout = null;

// Display info text for the specified lifetime
// If lifetime isn't specified, then the text will stay up forever (until something else is shown)
UI.info = function(text, lifetime) {

    document.getElementById('info').textContent = text;

    clearTimeout(UI.infoTimeout);
    if (typeof lifetime === 'number') {
        UI.infoTimeout = setTimeout(function() {
            UI.info('', false);
        }, lifetime)
    }
}

// Display info text only while the given function is executing
UI.infoWrap = function(text, fn) {
    return function() {
        UI.info(text);

        setTimeout(function() {
            fn();
            UI.info('');
        }, 0)
    }
}

// TODO: should these live elsewhere?

UI.zoomOut = UI.infoWrap('zooming...', function() { game.view.zoomOut(); })
UI.zoomIn = UI.infoWrap('zooming...', function() { game.view.zoomIn(); })

UI.fogOff = UI.infoWrap('unfogging...', () => {
    game.player.visibility = -1;
    game.view.rerender();
})

UI.fogOn = UI.infoWrap('fogging...', () => {
    game.player.visibility = Settings.visibilityPlayer;
    game.view.rerender();
})
