// Game modes are called 'modes' to avoid conflict with phaser game states.
// These are basically modes during the main gameplay state.
// Sorry mode rhymes with node :)

// Also. This should be view independent

module.exports = GamePlayModes = {};
var game;
var currentData = {}; // blah, some scope, so that different modes can communicate w/ each other

GamePlayModes.init = function(gameInstance) {
    game = gameInstance;
    
    // stuff some string ids into each mode, for interfacing outside (meh)
    for (var mode in this.modes) {
        this.modes[mode].id = mode;
    }

    this.current = this.modes.idle;
}

GamePlayModes.advance = function(transitionData) {
    var next = this.current.getNext(transitionData);
    if (!next) return; // staying in the same state 

    this.current.finish();
    this.current = next;
    this.current.execute(transitionData);
}

GamePlayModes.get = function() { return this.current.id; }


// Individual modes that the game can be in.
// TODO: separate content into a data file
GamePlayModes.modes = {};

// here is a template
GamePlayModes.modes.sample = {};
GamePlayModes.modes.sample.execute = function(data) {};
GamePlayModes.modes.sample.finish = function() {};
GamePlayModes.modes.sample.getNext = function(data) {};


// IDLE MODE: when nothing is going on. Waiting for the player to click or something
GamePlayModes.modes.idle = {}
GamePlayModes.modes.idle.execute = function() {
    currentData = {};
};
GamePlayModes.modes.idle.finish = function() {};
GamePlayModes.modes.idle.getNext = function(data) {
    // Clicked an inventory item
    if (!!data.item) return GamePlayModes.modes.itemSelected;

    if (!!data.coords) game.player.emit('inspect-cell', {coords: data.coords});
}

// ITEM SELECTED: player is about to use this item.
GamePlayModes.modes.itemSelected = {}
GamePlayModes.modes.itemSelected.execute = function(data) {
    var item = game.player.inventory.items[data.item];
    item.select();
    currentData.item = item;
}
GamePlayModes.modes.itemSelected.finish = function() {
    currentData.item.deselect();
    // keep the item around so it can be used
}
GamePlayModes.modes.itemSelected.getNext = function(data) {
    // If you click a cell, use the item on that cell
    if (!!data.coords) return GamePlayModes.modes.usingItem; 

    // If you click somewhere else, then cancel this use
    return GamePlayModes.modes.idle;
}

// USING ITEM: you're using an item.
// It should automatically advance to the idle mode.
GamePlayModes.modes.usingItem = {};
GamePlayModes.modes.usingItem.execute = function(data) {
    game.player.use(currentData.item, data.coords);

    if (Settings.advanceAllCells) GamePlayModes.advance();
}
GamePlayModes.modes.usingItem.finish = function() {
    delete currentData.item;
}
GamePlayModes.modes.usingItem.getNext = function(data) {
    return GamePlayModes.modes.idle;
}
