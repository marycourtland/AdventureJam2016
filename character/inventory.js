module.exports = Inventory = function(char) {
    this.char = char;
    this.items = {};
    this.numSlots = 20;
}

Inventory.prototype = {};

Inventory.prototype.has = function(itemId) {
    return itemId in this.items;
}

Inventory.prototype.addItem = function(item) {
    this.items[item.id] = item;
    item.refresh();
}

Inventory.prototype.removeItem = function(item) {
    delete this.items[item.id];
    
    // This will put all the rest of the items in different places.
    // TODO: maintain a static slot > item mapping
    this.assignItemsToSlots();
    this.refresh();
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
    
    if (nextSlot < this.numSlots) {
        for (var i = nextSlot; i < this.numSlots; i++) {
            clearSlot(slotHtmls[i]);
        }
    }
}

// UGH. TODO: this needs to go elsewhere
function clearSlot(slotHtml) {
    delete slotHtml.dataset.itemId;
    delete slotHtml.dataset.itemType;
}

Inventory.prototype.refresh = function() {
    if (!this.html) return;

    for (var itemId in this.items) {
        this.items[itemId].refresh();
    }
}
