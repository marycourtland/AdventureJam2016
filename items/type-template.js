// Methods that should be callable for each item type.
var TypeTemplate = module.exports = {};

// Should be implemented differently for each item
TypeTemplate.useAt = function(coords) {
    console.log('Placeholder: using ' + this.id + ' at ' + coords);
}

TypeTemplate.select = function() {
    this.selected = true;
    this.refresh();
}

TypeTemplate.deselect = function() {
    this.selected = false;
    this.refresh();
}

// RENDERING

TypeTemplate.rendersTo = function(html) {
    this.html = html;
    this.html.dataset.itemId = this.id;
    this.html.dataset.itemType = this.type_id;
}

TypeTemplate.refresh = function() {
    if (!this.html) return;
    
    // handle a selected thing
    this.html.className = this.html.className.replace(/selected /g, '');
    if (this.selected) this.html.className += ' selected ';
}

