// Woohoo, the game state!

module.exports = GameState = {};
var game;
var currentData = {}; // blah, some scope, so that different state nodes can communicate w/ each other

GameState.init = function(gameInstance) {
    game = gameInstance;
    this.current = this.nodes.idle;
}

GameState.advance = function(transitionData) {
    var next = this.current.getNext(transitionData);
    if (!next) return; // staying in the same state 

    this.current.finish();
    this.current = next;
    this.current.execute(transitionData);
}


// Individual states that the game can be in.
// TODO: separate content into a data file
GameState.nodes = {};

// here is a template
GameState.nodes.sample = {};
GameState.nodes.sample.execute = function(data) {};
GameState.nodes.sample.finish = function() {};
GameState.nodes.sample.getNext = function(data) {};


// IDLE STATE: when nothing is going on. Waiting for the player to click or something
GameState.nodes.idle = {}
GameState.nodes.idle.execute = function() {
    currentData = {};
};
GameState.nodes.idle.finish = function() {};
GameState.nodes.idle.getNext = function(data) {
    // Clicked an inventory item
    if (!!data.item) return GameState.nodes.itemSelected;
}

// ITEM SELECTED: player is about to use this item.
GameState.nodes.itemSelected = {}
GameState.nodes.itemSelected.execute = function(data) {
    var item = game.player.inventory.items[data.item];
    item.select();
    currentData.item = item;
}
GameState.nodes.itemSelected.finish = function() {
    currentData.item.deselect();
    // keep the item around so it can be used
}
GameState.nodes.itemSelected.getNext = function(data) {
    // If you click a cell, use the item on that cell
    if (!!data.coords) return GameState.nodes.usingItem; 

    // If you click somewhere else, then cancel this use
    return GameState.nodes.idle;
}

// USING ITEM: you're using an item.
// It should automatically advance to the idle state.
GameState.nodes.usingItem = {};
GameState.nodes.usingItem.execute = function(data) {
    game.player.use(currentData.item, data.coords);
    GameState.advance();
}
GameState.nodes.usingItem.finish = function() {
    delete currentData.item;
}
GameState.nodes.usingItem.getNext = function(data) { return GameState.nodes.idle; }
