// Methods that should be callable for each item type.
module.exports = TypeTemplate = {};

// Should be implemented differently for each item
TypeTemplate.useAt = function(coords) {
    console.log('Using ' + this.id + ' at ' + coords);
}

// RENDERING

TypeTemplate.rendersTo = function(html) {
    this.html = html;
    this.html.dataset.itemId = this.id;
    this.html.dataset.itemType = this.type_id;
}

TypeTemplate.refresh = function() {
    if (!this.html) return;
    // TODO: IS THIS METHOD EVEN NEEDED ???
}

