module.exports = Inventory = function(char) {
    this.char = char;
    this.items = {};
}

Inventory.prototype = {};


Inventory.prototype.addItem = function(item) {
    this.items[item.id] = item;
}

Inventory.prototype.removeItem = function(item) {
    delete this.items[item.id];
}

// RENDERING
// TODO: this could be its own renderer

// Rendering initializer
Inventory.prototype.rendersTo = function(html) {
    this.html = html;
    this.assignItemsToSlots();
    this.refresh();
}

Inventory.prototype.assignItemsToSlots = function() {
    var slotHtmls = this.html.getElementsByClassName('slot');

    var nextSlot = 0;
    for (var itemId in this.items) {
        // Put it in the next slot
        this.items[itemId].rendersTo(slotHtmls[nextSlot]);
        nextSlot += 1;
    }
}

Inventory.prototype.refresh = function() {
    if (!this.html) return;

    for (var itemId in this.items) {
        this.items[itemId].refresh();
    }
}
