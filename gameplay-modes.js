// Game modes are called 'modes' to avoid conflict with phaser game states.
// These are basically modes during the main gameplay state.
// Sorry mode rhymes with node :)

// Also. This should be view independent

// ***** TODO!!!
// Instead of passing random properties through game.state.advance,
// there should be more context as to what the player actually did, like
// {selected_cell_coords: <coords>} instead of {coords: <coords>}
// (that might not be the best way to do it)


var GamePlayModes = module.exports = {};
var game;
var currentData = {}; // blah, some scope, so that different modes can communicate w/ each other. TODO: improve this!!

GamePlayModes.init = function(gameInstance) {
    game = gameInstance;
    
    // stuff some string ids into each mode, for interfacing outside (meh)
    for (var mode in this.modes) {
        this.modes[mode].id = mode;
    }

    this.current = this.modes.idle;
    this.history = [{mode: this.current, data: {}}];
    this.history_index = 0;

    this.transitionData = {}; // not the best to keep it here, but needs to be overwritten by back/forward
}

GamePlayModes.advance = function(transitionData) {
    if (Object.keys(transitionData).length == 0) return;
    this.transitionData = transitionData;
    var next = this.getNext();
    if (!next) return; // staying in the same state

    this.current.finish();
    this.historyPush(next);
    this.current = next;
    this.current.execute(this.transitionData);
}


GamePlayModes.getNext = function() {
    // Maybe these checks for navigation should happen for each mode, not up front?
    if (this.transitionData.navigate == 'back') return this.historyBack();
    if (this.transitionData.navigate == 'forward') return this.historyForward();
    return this.current.getNext(this.transitionData);
}

GamePlayModes.historyPush = function(mode) {
    if (this.history_index > 0) {
        this.history = this.history.slice(this.history_index);
    }
    this.history.splice(0, 0, {mode: mode, data: Utils.shallowClone(this.transitionData)});
    this.history_index = 0;
}

GamePlayModes.historyBack = function() {
    this.history_index += 1;
    var item = this.history[this.history_index];
    this.transitionData = item.data;
    return item.mode;
}

GamePlayModes.historyForward = function() {
    this.history_index = Math.max(0, this.history_index - 1);
    var item = this.history[this.history_index];
    this.transitionData = item.data;
    return item.mode;
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
    if (!!data.item)
        return GamePlayModes.modes.itemSelected;
    if (!!data.inspector && !!data.coords && game.player.isCoordsVisible(data.coords))
        return GamePlayModes.modes.viewingInspector;

    // if (!!data.coords) game.player.emit('inspect-cell', {coords: data.coords});
    // if (!!data.species_id) game.player.emit('inspect-species', {species_id: data.species_id});
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
    if (!!data.coords && data.visible) return GamePlayModes.modes.usingItem; 

    if (!!data.item) return GamePlayModes.modes.itemSelected;

    // If you click somewhere else, then cancel this use
    return GamePlayModes.modes.idle;
}

// USING ITEM: you're using an item.
GamePlayModes.modes.usingItem = {};
GamePlayModes.modes.usingItem.execute = function(data) {
    game.player.use(currentData.item, data.coords);
}
GamePlayModes.modes.usingItem.finish = function() {
    if (currentData.success) {
        currentData.item.deselect();
        delete currentData.item;
    }
}
GamePlayModes.modes.usingItem.getNext = function(data) {
    currentData.success = data.success;
    if (!data.success) {
        return GamePlayModes.modes.itemSelected;
    }
    else {
        return GamePlayModes.modes.idle;
    }
}


// VIEWING INSPECTOR
GamePlayModes.modes.viewingInspector = {}
GamePlayModes.modes.viewingInspector.execute = function(data) {
    if (!!data.coords) {
        game.player.emit('inspect-cell', {coords: data.coords});
        currentData = {coords: data.coords};
    }
    if (!!data.species_id) {
        game.player.emit('inspect-species', {species_id: data.species_id});
        currentData = {species_id: data.species_id};
    }
}

GamePlayModes.modes.viewingInspector.finish = function() {
    // It would also be nice to emit a different event to the player (see getNext)
    game.player.emit('inspect-cell', {}); // this will toggle the inspector off (ugh)
}
GamePlayModes.modes.viewingInspector.getNext = function(data) {
    // TODO: IMPROVE THIS - it would be nice if the event coming from the UI didn't appear
    // as if the player intended to open the inspector (when the inspector is already open).
    if (data.inspector && data.coords) {
        return GamePlayModes.modes.idle;
    }

    // TODO: improve this too
    if (currentData.coords && !data.coords) return this;
    if (currentData.species_id && !data.species_id) return this;
}