// this is sort of a manager object
// Usage:
// var box_instance = ToolChest.make(ToolChest.types.box);

module.exports = ToolChest = {};

// todo: put these in their own directory and auto discover them
var typeObjects = [
    require('./box.js'), // purposeless item for testing
    require('./detector.js'),
    require('./camera.js'),
    require('./neutralizer.js'),
    require('./bomb.js')
]

var typeTemplate = require('./type-template');

// Initialize types

ToolChest.types = {};

typeObjects.forEach(function(type) {
    console.assert(!!type.id, 'A type has no id'); // double check
    ToolChest.types[type.id] = type;
    type.__proto__ = typeTemplate;
})

// constructor
ToolChest.Item = function(type) {
    // Allow both strings and type objects to be passed in
    if (typeof type === 'string') type = ToolChest.types[type];
    console.assert(type.id in ToolChest.types, 'Unrecognized item type:', type.id)

    this.id = type.id + '_' + ToolChest.nextID();
    this.type_id = type.id;
    this.__proto__ = type;
}

// shortcut constructor
ToolChest.make = function(type) { return new ToolChest.Item(type); }


ToolChest._next_id = 0;
ToolChest.nextID = function() { return this._next_id++; }
