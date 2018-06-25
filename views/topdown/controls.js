module.exports = Controls = {};

var game;

Controls.init = function(gameInstance, params) {
    game = gameInstance;
    this.html = params.html;
    this.bindEvents();
}

Controls.bindEvents = function() {
    this.html.mouseOverlay.onclick = function(evt) {
        evt.stopPropagation();
        var offset = game.renderer.getPixelOffset();
        var mousePos = {
            x: evt.clientX - offset.x - game.renderer.bbox.left,
            y: evt.clientY - offset.y - game.renderer.bbox.top
        }
        var coords = game.renderer.getCoordsFromPixels(mousePos);
        game.state.advance({coords: coords});
    }

    document.body.onclick = function() {
        game.state.advance({});
    }
    
    this.bindInventory();
    this.bindMovement();
}

Controls.bindMovement = function() {
    var keyboardCallbacks = {
        37: Controls.handlers.left,
        39: Controls.handlers.right,
        38: Controls.handlers.up,
        40: Controls.handlers.down
    }

    window.addEventListener('keydown', function(event) {
        var keycode = event.fake || window.event ? event.keyCode : event.which;
        if (keycode in keyboardCallbacks) keyboardCallbacks[keycode]();
    });
}

Controls.bindInventory = function() {
    var self = this;
    var slots = Array.apply(Array, this.html.inventory.getElementsByClassName('slot'));
    slots.forEach(function(slotHtml) {
        slotHtml.onclick = function(evt) {
            evt.stopPropagation();
            self.handlers.inventory(slotHtml.dataset.itemId);
        }
    })
}

Controls.handlers = {};

// INVENTORY

Controls.handlers.inventory = function(itemId) {
    game.state.advance({item: itemId});
}


// MOVEMENT

Controls.handlers.left = function() {
    game.player.move(Utils.dirs['w']);
    game.refreshView();
},

Controls.handlers.right = function() {
    game.player.move(Utils.dirs['e']);
    game.refreshView();
},

Controls.handlers.up = function() {
    game.player.move(Utils.dirs['n']);
    game.refreshView();
},

Controls.handlers.down = function() {
    game.player.move(Utils.dirs['s']);
    game.refreshView();
}
