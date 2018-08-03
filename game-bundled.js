(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

var Events = window.Events;
var Utils = window.Utils;

var Inventory = require('./inventory');

var CHAR_SPECIES_LISTENER_PREFIX = 'character-species-listener-';
var VISIBILITY_ALL = -1;

var Character = module.exports = function (params) {
  params.id = params.id || '';
  this.map = params.map;
  this.id = params.id;
  this.coords = {
    x: 0,
    y: 0
  };
  this.visibility = params.hasOwnProperty('visibility') ? params.visibility : VISIBILITY_ALL;
  this.inventory = new Inventory(this);
  this.health = Settings.maxHealth;
  Events.init(this); // Responses to species. These specify what happens when the char either walks onto a new species, or the current cell changes.

  this.speciesResponses = params.speciesResponses || {}; // sanity check

  for (var species_id in this.speciesResponses) {
    console.assert(typeof this.speciesResponses[species_id] === 'function');
  } // Speed while walking through the map
  // This will change depending on where you are (e.g. in forest)
  // TODO: put this default 


  this.defaultSpeed = Settings.defaultSpeed;
  this.speed = this.defaultSpeed;
  this.trailingRuts = params.trailingRuts || {};
};

Character.prototype = {}; // ============= MOVEMENT / RENDERING

Character.prototype.canBeAt = function (coords) {
  var cell = this.map.getCell(coords);
  return !!cell && cell.species.passable;
};

Character.prototype.moveTo = function (coords) {
  // no need to do stuff if we're already there
  if (this.coords.x === coords.x && this.coords.y === coords.y) {
    return this;
  } // make sure we're allowed to move to this spot


  if (!this.canBeAt(coords)) return this;
  var oldCell = this.map.getCell(this.coords);
  this.coords.x = coords.x;
  this.coords.y = coords.y; // Respond appropriately to whatever species is underfoot
  // ** For now, doesn't pass anything to the response function 

  var newCell = this.map.getCell(this.coords);
  this.respondToSpecies(newCell.species);
  var self = this;
  oldCell.off('change', CHAR_SPECIES_LISTENER_PREFIX + this.id);
  newCell.on('change', CHAR_SPECIES_LISTENER_PREFIX + this.id, function (data) {
    self.respondToSpecies(data.species);
  }); // trail ruts underfoot, like footsteps or whatnot

  for (var rut_id in this.trailingRuts) {
    newCell.rut(rut_id, {
      intensity: this.trailingRuts[rut_id],
      active: true
    });
  }

  this.emit('refresh');
  return this;
};

Character.prototype.move = function (diff) {
  console.assert(Math.abs(diff.x) + Math.abs(diff.y) === 1, 'character should only move 1 step at a time');
  this.moveTo({
    x: this.coords.x + diff.x,
    y: this.coords.y + diff.y
  }); //this.faceDirection(diff);

  return this;
};

Character.prototype.isAt = function (coords) {
  return coords.x === this.coords.x && coords.y === this.coords.y;
};

Character.prototype.respondToSpecies = function (species) {
  if (species.id in this.speciesResponses) {
    this.speciesResponses[species.id]();
  } // SET WALKING SPEED
  // TODO: not working yet


  if (typeof species.speed === 'number') {
    this.speed = species.speed;
  } else {
    this.speed = this.defaultSpeed;
  }
};

Character.prototype.getSpeed = function () {
  return this.speed;
}; // not sure if this is needed anymore


Character.prototype.refresh = function () {
  this.moveTo(this.coords);
}; // ============================== VISIBILITY
// Returns a bounding box; {x1, y1, x2, y2}


Character.prototype.getVisibility = function () {
  if (this.visibility == VISIBILITY_ALL) {
    return {
      x1: 0,
      y1: 0,
      x2: this.map.size.x,
      y2: this.map.size.y
    };
  } else {
    return {
      x1: this.coords.x - this.visibility,
      x2: this.coords.x + this.visibility + 1,
      y1: this.coords.y - this.visibility,
      y2: this.coords.y + this.visibility + 1
    };
  }
};

Character.prototype.isCoordsVisible = function (coords) {
  var visibilityBbox = this.getVisibility();
  return coords.x >= visibilityBbox.x1 && coords.x <= visibilityBbox.x2 && coords.y >= visibilityBbox.y1 && coords.y <= visibilityBbox.y2;
}; // ============================== HEALTH ETC


Character.prototype.ouch = function () {
  if (this.health === 0) return; // can't go negative health

  this.health -= 1; // ugh

  document.getElementById('player-health').textContent = this.health;
  console.log('Ouch', this.health);
  if (this.health === 0) this.die();
};

Character.prototype.die = function () {
  console.log('Oops, dead.');
}; // ============================== ITEMS / INVENTORY


Character.prototype.gets = function (item) {
  this.inventory.addItem(item);
};

Character.prototype.use = function (item, coords) {
  if (!this.inventory.has(item.id) || Utils.distance(coords, this.coords) > item.usageRadius) {
    game.state.advance({
      success: false,
      item: item.id
    });
    return;
  }

  if (!item.infinite) this.inventory.removeItem(item);
  item.useAt(coords);
  game.state.advance({
    success: true,
    item: item.id
  });
};

},{"./inventory":2}],2:[function(require,module,exports){
"use strict";

var Inventory = module.exports = function (char) {
  this.char = char;
  this.items = {};
  this.numSlots = 20;
};

Inventory.prototype = {};

Inventory.prototype.has = function (itemId) {
  return itemId in this.items;
};

Inventory.prototype.addItem = function (item) {
  this.items[item.id] = item;
  item.refresh();
};

Inventory.prototype.removeItem = function (item) {
  delete this.items[item.id]; // This will put all the rest of the items in different places.
  // TODO: maintain a static slot > item mapping

  this.assignItemsToSlots();
  this.refresh();
}; // RENDERING
// TODO: this could be its own renderer
// Rendering initializer


Inventory.prototype.rendersTo = function (html) {
  this.html = html;
  this.assignItemsToSlots();
  this.refresh();
};

Inventory.prototype.assignItemsToSlots = function () {
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
}; // UGH. TODO: this needs to go elsewhere


function clearSlot(slotHtml) {
  delete slotHtml.dataset.itemId;
  delete slotHtml.dataset.itemType;
}

Inventory.prototype.refresh = function () {
  if (!this.html) return;

  for (var itemId in this.items) {
    this.items[itemId].refresh();
  }
};

},{}],3:[function(require,module,exports){
"use strict";

var Walker = module.exports = function (char, getNextDir, onStep) {
  this.char = char;
  this.timeout = null;
  this.walking = false;
  this.getNextDir = getNextDir;
  this.onStep = typeof onStep === 'function' ? onStep : function () {};
};

Walker.prototype = {};

Walker.prototype.timeTillNextStep = function () {
  // 3-4 seconds, but once in a while stop for a bit
  var base = 3000;
  if (Math.random() < 1 / 10) base = 8000;
  return base + Math.random() * 1000;
};

Walker.prototype.start = function () {
  this.walking = true;
  this.step();
};

Walker.prototype.stop = function () {
  window.clearTimeout(this.timeout);
  this.timeout = null;
  this.walking = false;
};

Walker.prototype.step = function () {
  if (!this.walking) return;
  var dir = this.getNextDir();
  this.char.move(dir);
  this.onStep(dir);
  var self = this;
  window.clearTimeout(this.timeout);
  this.timeout = window.setTimeout(function () {
    self.step();
  }, this.timeTillNextStep());
};

},{}],4:[function(require,module,exports){
"use strict";

var Settings = window.Settings;

var Views = require('./views'); // view-independent modules


var Context = {
  Map: require('./map'),
  GamePlayModes: require('./gameplay-modes'),
  Items: require('./items'),
  Player: require('./player'),
  Wizard: require('./wizard')
};
window.game = {};

window.onload = function () {
  if (!(Settings.view in Views)) {
    alert('Pick one of these for the game view: ' + Object.keys(Views).join(', '));
    return;
  }

  Views[Settings.view].load(Context);
};

},{"./gameplay-modes":5,"./items":10,"./map":20,"./player":28,"./views":29,"./wizard":53}],5:[function(require,module,exports){
"use strict";

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

GamePlayModes.init = function (gameInstance) {
  game = gameInstance; // stuff some string ids into each mode, for interfacing outside (meh)

  for (var mode in this.modes) {
    this.modes[mode].id = mode;
  }

  this.current = this.modes.idle;
  this.history = [{
    mode: this.current,
    data: {}
  }];
  this.history_index = 0;
  this.transitionData = {}; // not the best to keep it here, but needs to be overwritten by back/forward
};

GamePlayModes.advance = function (transitionData) {
  if (Object.keys(transitionData).length == 0) return;
  this.transitionData = transitionData;
  var next = this.getNext();
  if (!next) return; // staying in the same state

  this.current.finish();
  this.historyPush(next);
  this.current = next;
  this.current.execute(this.transitionData);
};

GamePlayModes.getNext = function () {
  // Maybe these checks for navigation should happen for each mode, not up front?
  if (this.transitionData.navigate == 'back') return this.historyBack();
  if (this.transitionData.navigate == 'forward') return this.historyForward();
  return this.current.getNext(this.transitionData);
};

GamePlayModes.historyPush = function (mode) {
  if (this.history_index > 0) {
    this.history = this.history.slice(this.history_index);
  }

  this.history.splice(0, 0, {
    mode: mode,
    data: Utils.shallowClone(this.transitionData)
  });
  this.history_index = 0;
};

GamePlayModes.historyBack = function () {
  this.history_index += 1;
  var item = this.history[this.history_index];
  this.transitionData = item.data;
  return item.mode;
};

GamePlayModes.historyForward = function () {
  this.history_index = Math.max(0, this.history_index - 1);
  var item = this.history[this.history_index];
  this.transitionData = item.data;
  return item.mode;
};

GamePlayModes.get = function () {
  return this.current.id;
}; // Individual modes that the game can be in.
// TODO: separate content into a data file


GamePlayModes.modes = {}; // here is a template

GamePlayModes.modes.sample = {};

GamePlayModes.modes.sample.execute = function (data) {};

GamePlayModes.modes.sample.finish = function () {};

GamePlayModes.modes.sample.getNext = function (data) {}; // IDLE MODE: when nothing is going on. Waiting for the player to click or something


GamePlayModes.modes.idle = {};

GamePlayModes.modes.idle.execute = function () {
  currentData = {};
};

GamePlayModes.modes.idle.finish = function () {};

GamePlayModes.modes.idle.getNext = function (data) {
  // Clicked an inventory item
  if (!!data.item) return GamePlayModes.modes.itemSelected;
  if (!!data.inspector && !!data.coords && game.player.isCoordsVisible(data.coords)) return GamePlayModes.modes.viewingInspector; // if (!!data.coords) game.player.emit('inspect-cell', {coords: data.coords});
  // if (!!data.species_id) game.player.emit('inspect-species', {species_id: data.species_id});
}; // ITEM SELECTED: player is about to use this item.


GamePlayModes.modes.itemSelected = {};

GamePlayModes.modes.itemSelected.execute = function (data) {
  var item = game.player.inventory.items[data.item];
  item.select();
  currentData.item = item;
};

GamePlayModes.modes.itemSelected.finish = function () {
  currentData.item.deselect(); // keep the item around so it can be used
};

GamePlayModes.modes.itemSelected.getNext = function (data) {
  // If you click a cell, use the item on that cell
  if (!!data.coords && data.visible) return GamePlayModes.modes.usingItem;
  if (!!data.item) return GamePlayModes.modes.itemSelected; // If you click somewhere else, then cancel this use

  return GamePlayModes.modes.idle;
}; // USING ITEM: you're using an item.


GamePlayModes.modes.usingItem = {};

GamePlayModes.modes.usingItem.execute = function (data) {
  game.player.use(currentData.item, data.coords);
};

GamePlayModes.modes.usingItem.finish = function () {
  if (currentData.success && !currentData.item.infinite) {
    currentData.item.deselect();
    delete currentData.item;
  }
};

GamePlayModes.modes.usingItem.getNext = function (data) {
  currentData.success = data.success;

  if (!data.success || currentData.item.infinite) {
    return GamePlayModes.modes.itemSelected;
  } else {
    return GamePlayModes.modes.idle;
  }
}; // VIEWING INSPECTOR


GamePlayModes.modes.viewingInspector = {};

GamePlayModes.modes.viewingInspector.execute = function (data) {
  if (!!data.coords) {
    game.player.emit('inspect-cell', {
      coords: data.coords
    });
    currentData = {
      coords: data.coords
    };
  }

  if (!!data.species_id) {
    game.player.emit('inspect-species', {
      species_id: data.species_id
    });
    currentData = {
      species_id: data.species_id
    };
  }
};

GamePlayModes.modes.viewingInspector.finish = function () {
  // It would also be nice to emit a different event to the player (see getNext)
  game.player.emit('inspect-cell', {}); // this will toggle the inspector off (ugh)
};

GamePlayModes.modes.viewingInspector.getNext = function (data) {
  // TODO: IMPROVE THIS - it would be nice if the event coming from the UI didn't appear
  // as if the player intended to open the inspector (when the inspector is already open).
  if (data.inspector && data.coords) {
    return GamePlayModes.modes.idle;
  }

  if (data.escape) {
    return GamePlayModes.modes.idle;
  } // TODO: improve this too


  if (currentData.coords && !data.coords) return this;
  if (currentData.species_id && !data.species_id) return this;
};

},{}],6:[function(require,module,exports){
"use strict";

var Bomb = module.exports = {};
Bomb.id = 'bomb';

Bomb.useAt = function (coords) {
  var map = window.game.map;
  map.diamondClump(coords, map.species.neutralized);
};

},{}],7:[function(require,module,exports){
"use strict";

// Empty placeholder object. TODO
var Box = module.exports = {};
Box.id = 'box';

},{}],8:[function(require,module,exports){
"use strict";

// Empty placeholder object. TODO
var Camera = module.exports = {};
Camera.id = 'camera';

Camera.useAt = function (coords) {
  // Put the item in the spot...
  this.coords = coords;
  var map = window.game.map;
  map.placeItem(coords, this);
};

Camera.getVisibility = function () {
  return {
    x1: this.coords.x - Settings.visibilityCamera,
    y1: this.coords.y - Settings.visibilityCamera,
    x2: this.coords.x + Settings.visibilityCamera + 1,
    y2: this.coords.y + Settings.visibilityCamera + 1
  };
}; // Same as character.isCoordsVisible. TODO: a single 'visibility' component would be nice


Camera.isCoordsVisible = function (coords) {
  var visibilityBbox = this.getVisibility();
  return coords.x >= visibilityBbox.x1 && coords.x <= visibilityBbox.x2 && coords.y >= visibilityBbox.y1 && coords.y <= visibilityBbox.y2;
};

},{}],9:[function(require,module,exports){
"use strict";

// Empty placeholder object. TODO
var Detector = module.exports = {};
Detector.id = 'detector';

Detector.useAt = function (coords) {
  var map = window.game.map;
  map.placeItem(coords, this);
};

},{}],10:[function(require,module,exports){
"use strict";

// this is sort of a manager object
// Usage:
// var box_instance = ToolChest.make(ToolChest.types.box);
var ToolChest = module.exports = {}; // todo: put these in their own directory and auto discover them

var typeObjects = [require('./box.js'), // purposeless item for testing
require('./detector.js'), require('./camera.js'), require('./neutralizer.js'), require('./bomb.js')];

var typeTemplate = require('./type-template'); // Initialize types


ToolChest.types = {};
typeObjects.forEach(function (type) {
  console.assert(!!type.id, 'A type has no id'); // double check

  ToolChest.types[type.id] = type;
  type.__proto__ = typeTemplate;
}); // constructor

ToolChest.Item = function (type) {
  // Allow both strings and type objects to be passed in
  if (typeof type === 'string') type = ToolChest.types[type];
  console.assert(type.id in ToolChest.types, 'Unrecognized item type:', type.id);
  this.id = type.id + '_' + ToolChest.nextID();
  this.type_id = type.id;
  this.__proto__ = type;
  this.usageRadius = Settings.itemUsageRadii[type.id] || 1.5;
}; // shortcut constructor


ToolChest.make = function (type) {
  return new ToolChest.Item(type);
};

ToolChest._next_id = 0;

ToolChest.nextID = function () {
  return this._next_id++;
};

},{"./bomb.js":6,"./box.js":7,"./camera.js":8,"./detector.js":9,"./neutralizer.js":11,"./type-template":12}],11:[function(require,module,exports){
"use strict";

var Neutralizer = module.exports = {};
Neutralizer.id = 'neutralizer';
Neutralizer.infinite = true; // TODO: do something other than accessing the global game instance

Neutralizer.useAt = function (coords) {
  var map = window.game.map;
  map.set(coords, map.species.neutralized);
};

},{}],12:[function(require,module,exports){
"use strict";

// Methods that should be callable for each item type.
var TypeTemplate = module.exports = {}; // Should be implemented differently for each item

TypeTemplate.useAt = function (coords) {
  console.log('Placeholder: using ' + this.id + ' at ' + coords);
};

TypeTemplate.select = function () {
  this.selected = true;
  this.refresh();
};

TypeTemplate.deselect = function () {
  this.selected = false;
  this.refresh();
}; // RENDERING


TypeTemplate.rendersTo = function (html) {
  this.html = html;
  this.html.dataset.itemId = this.id;
  this.html.dataset.itemType = this.type_id;
};

TypeTemplate.refresh = function () {
  if (!this.html) return; // handle a selected thing

  this.html.className = this.html.className.replace(/selected /g, '');
  if (this.selected) this.html.className += ' selected ';
};

},{}],13:[function(require,module,exports){
"use strict";

// This is the procedure which executes the advancing of the environment species
// from one iteration to the next.
//
// Takes an environment and advances it to its next iteration.
var Advancerator = module.exports = function (env) {
  var range = env.shuffledRange(); // compute the next iteration 

  range.forEach(function (coords) {
    var cell = env.get(coords);
    var neighbors = env.neighbors(coords);
    cell.next(neighbors);
  }); // now set them all

  range.forEach(function (coords) {
    env.get(coords).flush();
  });
};

},{}],14:[function(require,module,exports){
"use strict";

// Super hacky way to reference everything
var Catalogue = module.exports = {
  species: {},
  ruts: {},
  rules: {},
  add: function add(type, obj) {
    if (!(type in Catalogue)) return;
    if (!obj.id) return;

    if (!(obj.id in Catalogue[type])) {
      Catalogue[type][obj.id] = obj;
    }
  }
};
window.catalogue = Catalogue;

},{}],15:[function(require,module,exports){
"use strict";

// A cell (location on the grid) can have multiple species living in it.
// But one of them is dominant (which will be displayed)
//
// ^ that might change :)
// like if, instead of having a dominant species, we had a function to take
// all the species and compute which one is dominant
var SpeciesBattle = require('./species-battle');

var Events = window.Events;
var Utils = window.Utils;

var Cell = module.exports = function (blank, coords) {
  this.species = null;
  this.coords = coords;
  this.neighbors = [];
  this.items = []; // species register contains:
  //  species
  //  age

  this.register = {}; // indexed by id
  // Ruts

  this.ruts = {}; // indexed by rut id
  // the 'next' slot is just a holding pattern until the current iteration is finalized
  // use cell.next(species), then cell.flush() to set it

  this.nextSpecies = null;
  this.iterationTime = Settings.mapIterationTimeout; // this will be overwritten after setting a species

  this.forcedIterationTime = -1; //    this.callbacks = {add:{}, change:{}}

  this.set(blank || '');
};

Cell.prototype = {};
Events.init(Cell.prototype);

Cell.prototype.setNeighbors = function (neighbors) {
  this.neighbors = neighbors || [];
};

Cell.prototype.forEachNeighbor = function (callback) {
  this.neighbors.forEach(function (n) {
    if (n.value) callback(n.value);
  });
}; // convenience, to get the species object


Cell.prototype.get = function (species_id) {
  if (!(species_id in this.register)) return null;
  return this.register[species_id].species;
}; // get properties for the dominant species


Cell.prototype.getAge = function (species_id) {
  if (!species_id && !this.species) return null;
  species_id = species_id || this.species.id;
  if (!this.register[species_id]) return null;
  return this.register[species_id].age;
};

Cell.prototype.getStrength = function () {
  if (!this.species) return null;
  return this.register[this.species.id].strength;
}; // sets the dominant species


Cell.prototype.set = function (species) {
  if (!!this.species && !!species && this.species.id === species.id) {
    return; // no need to re-set the same species
  }

  if (!!species) {
    this.species = species;
    this.add(species); // just in case it's not already set

    this.register[species.id].age = Math.max(this.register[species.id].age, 1);
    this.register[species.id].strength = Math.max(this.register[species.id].strength, 1);
    this.emit('change', {
      species: species
    }); // propagate rut activation

    var ruts = species.getIndexedRuts();

    for (var rut_id in ruts) {
      this.forEachNeighbor(function (cell) {
        cell.activateRut(rut_id);
      });
    }
  }

  return this;
}; // decide which species to be next
// ** each registered species does its own computation


Cell.prototype.next = function () {
  var _this = this;

  this.refreshActiveRuts();
  var nextStates = {};

  for (var species_id in this.register) {
    nextStates[species_id] = this.get(species_id).nextState(this, this.neighbors);
  } // Which species are contenders for dominance in this cell?


  var contenders = Object.keys(nextStates).filter(function (species_id) {
    return nextStates[species_id].state === 1;
  }).map(function (species_id) {
    return _this.register[species_id];
  }); // update strength prior to the species battle

  for (var species_id in this.register) {
    this.register[species_id].strength = nextStates[species_id].strength;
  } // THE SPECIES BATTLE IT OUT...


  this.nextSpecies = SpeciesBattle.decide(contenders).species; // Update age and strength for all species in the register

  for (var species_id in this.register) {
    this.register[species_id].age = nextStates[species_id].age;
  }

  if (this.nextSpecies) {
    var nextState = nextStates[this.nextSpecies.id];
    this.iterationTime = nextState.iterationTime;

    if (this.nextSpecies.forceNeighborIteration) {
      this.forceNeighborIteration();
    }
  }
};

Cell.prototype.flush = function () {
  var previousSpeciesId = this.species ? this.species.id : null;
  if (!this.nextSpecies) this.nextSpecies = this.register.blank.species; // The following block was from when the species age was only incremented
  // if it was the dominant species (cell.species).
  // if (!!this.nextSpecies) { 
  //     // if the species is incumbent, increment its age.
  //     if (previousSpeciesId === this.nextSpecies.id) {
  //         this.register[this.nextSpecies.id].age += 1;
  //     }
  //     else if (!!previousSpeciesId) {
  //         // reset of the age of the newly-dead species to 0
  //         this.register[previousSpeciesId].age = 0;
  //     }
  // }

  this.set(this.nextSpecies);
};

Cell.prototype.add = function (species, age, strength) {
  age = age || 0;
  strength = strength || species.initial_strength || 1; //Math.floor(Math.random()*10);

  if (!species) {
    // this happens when a species dies
    species = this.get('blank'); // this SHOULD be one of the registered species
  }

  if (species.id in this.register) return; // It's already added. No need to re-add it.

  this.register[species.id] = {
    species: species,
    age: age,
    strength: strength // make sure there's a dominant species

  };

  if (Object.keys(this.register).length === 1 || !this.species) {
    this.species = species;
  }

  this.emit('add', {
    species: species
  });
  return this;
};

Cell.prototype.getRegister = function () {
  var _this2 = this;

  // only return species who are present. (Age > 0)
  var register = Object.keys(this.register).map(function (species_id) {
    return _this2.register[species_id];
  });
  register.sort(function (a, b) {
    return b.strength - a.strength;
  });
  register = register.filter(function (reg) {
    return reg.age > 0 && reg.species.id != 'blank';
  });
  register = register.map(function (reg) {
    reg.is_dominant = reg.species.id == _this2.species.id;
    return reg;
  });
  return register;
};

Cell.prototype.getRuts = function () {
  // eh...
  return Object.keys(this.ruts);
};

Cell.prototype.getItem = function (item_id) {
  var matching_items = this.items.filter(function (item) {
    return item.id == item_id;
  });
  return matching_items.length > 0 ? matching_items[0] : null;
}; // ITERATION STUFF
// This is for when a cell gets manually set, and we have to pull various properties about it
// e.g. the magic iteration time


Cell.prototype.refreshTimeout = function () {
  this.scheduleIteration();
};

Cell.prototype.scheduleIteration = function () {
  clearTimeout(this.iterationTimeout);
  this._timeout = this.getIterationTime();
  this._t = new Date() + this._timeout; // the time at which the cell will iterate again

  var self = this;
  this.iterationTimeout = setTimeout(function () {
    self.iterate();
  }, self._timeout); //reset the forced iteration

  this.forcedIterationTime = -1;
};

Cell.prototype.timeUntilIteration = function () {
  if (!this._t) return Settings.mapIterationTimeout; // meh, default

  return this._t - new Date();
};

Cell.prototype.getIterationTime = function () {
  // we'll use the shortest possible time
  var possibleTimes = [];
  possibleTimes.push(this.timeUntilIteration());
  possibleTimes.push(Settings.mapIterationTimeout); // this should be fairly long
  // Sometimes, neighboring cells will want to force a faster iteration at their boundaries

  if (this.forcedIterationTime > 0) possibleTimes.push(this.forcedIterationTime); // get the shortest iteration time for ALL possible species

  for (var species_id in this.register) {
    possibleTimes.push(this.get(species_id).getIterationTime(this.getActiveRuts()));
  }

  possibleTimes = possibleTimes.filter(function (t) {
    return t >= 0;
  });
  var scale = 1 + 0.5 * (Math.random() * 2 - 1);
  return Utils.arrayMin(possibleTimes) * scale;
  ;
};

Cell.prototype.iterate = function () {
  if (Settings.mapIterationTimeout <= 0) return;
  this.advance(); // schedule another iteration

  this.scheduleIteration();
}; // Single-cell replacement for Advancerator


Cell.prototype.advance = function () {
  this.next(); // Note: when the whole array of cells was being updated all at the same time,
  // flush() was delayed. But now each cell updates itself independently, so
  // we don't have to wait for the rest of the cells before calling flush().

  this.flush();
}; // Neighboring cells use this method to try to speed up the iteration


Cell.prototype.forceIterationTime = function (time) {
  this.refreshActiveRuts();
  if (this.forcedIterationTime > 0) return; // experimental

  if (time > this.getIterationTime()) return;
  if (time > this.forcedIterationTime && this.forcedIterationTime > 0) return;
  this.forcedIterationTime = time;
}; // *This* cell might try to force *its* neighbors to iterate


Cell.prototype.forceNeighborIteration = function () {
  var time = this.getIterationTime();
  this.forEachNeighbor(function (cell) {
    cell.forceIterationTime(time);
  });
}; // RUTS =======


Cell.prototype.rut = function (rut_id, options) {
  options = options || {};
  options.active = options.active || false;
  options.intensity = options.intensity || 1;
  this.ruts[rut_id] = {
    active: options.active,
    intensity: options.intensity
  };

  if (options.active) {
    this.iterate();
  }
}; // ruts should only be active if any of the cells in the neighborhood
// has the rut's species as dominant


Cell.prototype.refreshActiveRuts = function () {
  var activeRutIds = [];
  this.forEachNeighbor(function (cell) {
    if (!cell.species) return;

    for (var rut_id in cell.species.getIndexedRuts()) {
      activeRutIds.push(rut_id);
    }
  });

  for (var rut_id in this.ruts) {
    this.ruts[rut_id].active = !!(activeRutIds.indexOf(rut_id) !== -1);
  }
};

Cell.prototype.getActiveRuts = function () {
  this.refreshActiveRuts();
  var activeRuts = {};

  for (var rut_id in this.ruts) {
    if (this.ruts[rut_id].active && this.ruts[rut_id].intensity > 0) activeRuts[rut_id] = this.ruts[rut_id];
  }

  return activeRuts;
};

Cell.prototype.activateRut = function (rut_id) {
  if (rut_id in this.ruts) {
    this.ruts[rut_id].active = true;
    this.refreshTimeout();
  }
}; // ITEMS =======


Cell.prototype.addItem = function (item) {
  this.items.push(item);
  this.emit('add-item', {
    item: item
  });
};

Cell.prototype.removeItem = function (item) {
  var index = this.items.indexOf(item);

  if (index > -1) {
    this.items.splice(index, 1);
    this.emit('remove-item', {
      item: item
    });
  }
};

},{"./species-battle":22}],16:[function(require,module,exports){
"use strict";

var GrowthRules = module.exports = {
  magic: {
    id: 'magic',
    stateMap: {
      0: [0.001, 0.2, 0.1, 1, 1, 1, 1, 1, 0],
      1: [0, 0, 0, 1, 0, 1, 1, 0, 0]
    },
    weights: [[1, 1, 1], [1, 0, 1], [1, 1, 1]],
    description: "spreads irregularily"
  },
  // mostly used with ruts?
  magicCrazy: {
    id: 'magicCrazy',
    stateMap: {
      0: [0.5, 1, 1, 1, 1, 1, 1, 1, 1],
      1: [0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    weights: [[1, 1, 1], [1, 0, 1], [1, 1, 1]],
    description: "spreads rapidly"
  },
  absoluteActivation: {
    id: 'absoluteActivation',
    stateMap: {
      0: [0, 1, 1, 1, 1, 1, 1, 1, 1],
      1: [1, 1, 1, 1, 1, 1, 1, 1, 1]
    },
    weights: [[1, 1, 1], [1, 0, 1], [1, 1, 1]],
    description: "spreads rapidly"
  },
  trees: {
    id: 'trees',
    stateMap: {
      0: [0, 0, 0, 0, 0.4, 0.4, 0.6, 0.6, 1, 1, 1, 1],
      1: [0.6, 0.7, 0.8, 0.9, 1, 1, 1, 1, 1, 1, 1, 1]
    },
    weights: [[1, 2, 1], [2, 0, 2], [1, 2, 1]],
    description: "grows steadily"
  },
  // When trees are old enough, they become stable - less likely to grow, slightly likely to die
  treesStable: {
    id: 'treesStable',
    stateMap: {
      0: [0, 0, 0, 0, 0, 0.1, 0.1, 1, 1, 1, 1, 1],
      1: [0.8, 0.9, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 0.95]
    },
    weights: [[1, 2, 1], [2, 0, 2], [1, 2, 1]],
    description: "stabilizes its growth"
  },
  plants: {
    id: 'plants',
    stateMap: {
      0: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
      1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    },
    weights: [[1, 2, 1], [2, 0, 2], [1, 2, 1]],
    description: "grows steadily"
  },
  plantsCatalyzed: {
    id: 'plantsCatalyzed',
    stateMap: {
      0: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    },
    weights: [[1, 2, 1], [2, 0, 2], [1, 2, 1]],
    description: "grows rapidly"
  },
  plantsDying: {
    id: 'plantsDying',
    stateMap: {
      0: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      1: [0, 0, 0, 0, 0, 1, 1, 1, 1]
    },
    weights: [[1, 1, 1], [1, 0, 1], [1, 1, 1]],
    description: "dies off"
  },
  completeDeath: {
    id: 'completeDeath',
    stateMap: {
      0: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      1: [0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    description: "is eradicated"
  }
};

},{}],17:[function(require,module,exports){
"use strict";

var ruts = module.exports = [{
  id: 'footsteps',
  description: 'the ground has been trampled' // ... any other things to put here?

}, {
  id: 'magic',
  description: 'a magical channel is present'
}];

},{}],18:[function(require,module,exports){
"use strict";

var GrowthRules = require('./growth-rules'); // Conditional growth rules are sorted by priority, low > high.


var speciesData = module.exports = []; // TESTING ONLY

speciesData.push({
  id: 'blue',
  symbol: '~',
  color: '#5F4F29'
});
speciesData.push({
  id: 'red',
  symbol: '~',
  color: '#5F4F29'
});
speciesData.push({
  id: 'green',
  symbol: '~',
  color: '#5F4F29'
}); // REAL SPECIES

speciesData.push({
  id: 'blank',
  symbol: '~',
  color: '#5F4F29',
  description: {
    singular: 'dirt',
    plural: 'dirt'
  },
  initial_strength: 1
});
speciesData.push({
  id: 'neutralized',
  symbol: 'x',
  color: '#422121',
  description: {
    singular: 'neutralizer',
    plural: 'neutralizer'
  }
});
speciesData.push({
  id: 'magic',
  symbol: '&#8960;',
  color: '#4C24A3',
  description: {
    singular: 'magic',
    plural: 'magical areas'
  },
  forceNeighborIteration: true,
  initial_strength: 10,
  strength_threshhold: 5,
  rules: {
    default: GrowthRules.magic,
    conditional: [{
      species_id: 'neutralized',
      min_neighbors: 1,
      rules: GrowthRules.completeDeath
    }],
    ruts: [{
      rut_id: 'magic',
      timeToIteration: 100,
      forceNeighborIteration: true,
      rules: GrowthRules.absoluteActivation
    }]
  }
});
speciesData.push({
  id: 'grass',
  symbol: '&#8756;',
  color: '#46CF46',
  description: {
    singular: 'grass',
    plural: 'grass'
  },
  initial_strength: 1,
  strength_threshhold: 1,
  rules: {
    default: GrowthRules.plants,
    conditional: [// the presence of trees catalyzes smaller plants' growth
    {
      species_id: 'trees',
      min_neighbors: 3,
      rules: GrowthRules.plantsCatalyzed
    }, {
      species_id: 'trees2',
      min_neighbors: 3,
      rules: GrowthRules.plantsCatalyzed
    }, {
      min_neighbors: 1,
      species_id: 'magic',
      rules: GrowthRules.plantsDying
    }],
    ruts: [{
      rut_id: 'footsteps',
      rules: GrowthRules.completeDeath
    }]
  }
});
speciesData.push({
  id: 'flowers',
  symbol: '&#9880;',
  color: '#E46511',
  description: {
    singular: 'a cluster of flowers',
    plural: 'flowers'
  },
  initial_strength: 1,
  strength_threshhold: 1,
  rules: {
    default: GrowthRules.plants,
    conditional: [// the presence of trees catalyzes smaller plants' growth
    {
      species_id: 'trees',
      min_neighbors: 3,
      rules: GrowthRules.plantsCatalyzed
    }, {
      species_id: 'trees2',
      min_neighbors: 3,
      rules: GrowthRules.plantsCatalyzed
    }, {
      min_neighbors: 1,
      species_id: 'magic',
      rules: GrowthRules.plantsDying
    }],
    ruts: [{
      rut_id: 'footsteps',
      rules: GrowthRules.completeDeath
    }]
  }
});
speciesData.push({
  id: 'trees',
  symbol: '&psi;',
  color: '#174925',
  description: {
    singular: 'a pine tree',
    plural: 'pine trees'
  },
  passable: true,
  initial_strength: 3,
  strength_threshhold: 3,
  rules: {
    default: GrowthRules.trees,
    ruts: [{
      rut_id: 'footsteps',
      rules: GrowthRules.completeDeath
    }],
    lifespan: [// tree growth stabilizes when the trees are old
    {
      min_age: 10,
      rules: GrowthRules.treesStable
    }],
    conditional: [{
      min_neighbors: 1,
      species_id: 'magic',
      rules: GrowthRules.plantsDying
    }]
  }
}); // Pine trees - SAME RULES ETC AS THE OTHER TREES
// Just separated out for some interest/variety

speciesData.push({
  id: 'trees2',
  symbol: '&psi;',
  color: '#174925',
  description: {
    singular: 'a cedar tree',
    plural: 'cedar trees'
  },
  passable: true,
  initial_strength: 3,
  strength_threshhold: 3,
  rules: {
    default: GrowthRules.trees,
    lifespan: [// tree growth stabilizes when the trees are old
    {
      min_age: 10,
      rules: GrowthRules.treesStable
    }],
    conditional: [{
      min_neighbors: 1,
      species_id: 'magic',
      rules: GrowthRules.plantsDying
    }]
  }
});

},{"./growth-rules":16}],19:[function(require,module,exports){
"use strict";

// Example:
// env = new Env({x:30, y:30});
var XY = window.XY;

var Cell = require('./cell.js');

var Advancerator = require('./advancerator.js');

var Env = module.exports = function (size, blank_cell) {
  this.size = size;
  this.init(blank_cell);
};

Env.prototype = {};

Env.prototype.init = function (blank_cell) {
  this.cells = [];

  for (var x = 0; x < this.size.x; x++) {
    this.cells.push([]);

    for (var y = 0; y < this.size.y; y++) {
      this.cells[x][y] = new Cell(blank_cell, XY(x, y));
    }
  } // storing the neighbors on each cell has to happen after everything's initialized


  for (var x = 0; x < this.size.x; x++) {
    for (var y = 0; y < this.size.y; y++) {
      this.cells[x][y].setNeighbors(this.neighbors(XY(x, y)));
    }
  }

  return this;
};

Env.prototype.advance = function (numTimes) {
  if (typeof numTimes === 'undefined') numTimes = 1;

  for (var t = 0; t < numTimes; t += 1) {
    Advancerator(this);
  }

  return this;
};

Env.prototype.OOB = function (coords) {
  return coords.x < 0 || coords.y < 0 || coords.x >= this.size.x || coords.y >= this.size.y;
};

Env.prototype.get = function (coords) {
  if (!coords) return null;
  if (!coords.hasOwnProperty('x') || !coords.hasOwnProperty('y')) return null;
  if (this.OOB(coords)) return null;
  return this.cells[coords.x][coords.y];
};

Env.prototype.set = function (coords, value) {
  var cell = this.get(coords);
  if (!cell) return false;
  return cell.set(value);
}; // Returns a list of all possible coordinates


Env.prototype.range = function () {
  var coords = [];

  for (var x = 0; x < this.size.x; x++) {
    for (var y = 0; y < this.size.y; y++) {
      coords.push({
        x: x,
        y: y
      });
    }
  }

  return coords;
}; // Returns a list of all possible coordinates


Env.prototype.shuffledRange = function () {
  var coords = this.range();
  var shuffled = [];

  for (var i = 0; i < coords.length; i++) {
    shuffled.push(coords[Math.floor(Math.random * coords.length)]);
  }

  return coords;
};

Env.prototype.neighbors = function (coords) {
  var neighbors = [{
    x: -1,
    y: -1
  }, {
    x: -1,
    y: 0
  }, {
    x: -1,
    y: 1
  }, {
    x: 0,
    y: -1
  }, {
    x: 0,
    y: 0
  }, // <-- yes, I know this isn't a neighbor, but
  {
    x: 0,
    y: 1
  }, //     it's nice and clean to include it 
  {
    x: 1,
    y: -1
  }, {
    x: 1,
    y: 0
  }, {
    x: 1,
    y: 1
  }];
  var self = this;
  return neighbors.map(function (crds) {
    // get absolute coordinates
    var coordsAbsolute = {
      x: crds.x + coords.x,
      y: crds.y + coords.y
    }; // structure it in a coord-map array

    return {
      coords: crds,
      value: self.get(coordsAbsolute)
    };
  });
};

Env.prototype.randomCoords = function () {
  return {
    x: Math.floor(Math.random() * this.size.x),
    y: Math.floor(Math.random() * this.size.y)
  };
};

},{"./advancerator.js":13,"./cell.js":15}],20:[function(require,module,exports){
"use strict";

var Settings = window.Settings;

var Env = require('./environment');

var Species = require('./species');

var SpeciesData = require('./data/species');

var RutData = require('./data/ruts');

var Catalogue = require('./catalogue');

var Map = module.exports = {}; // initialize species based on the data

Map.species = {};
SpeciesData.forEach(function (s) {
  Map.species[s.id] = new Species(s);
}); // inialize ruts, at least in the catalogue

RutData.forEach(function (rut) {
  Catalogue.add('ruts', rut);
});

Map.init = function (params) {
  this.size = params.size;
  this.center = {
    x: Math.floor(this.size.x / 2),
    y: Math.floor(this.size.y / 2) // use Map.setCenter to change this

  };
  this.env = new Env(this.size, this.species.blank);
  this.items = {}; // indexed by item type
};

Map.startIteration = function () {
  // this is just the first timeout
  function getTimeout() {
    // flat distribution because it's the first iteration
    return Math.random() * Settings.mapIterationTimeout;
  }

  this.forEach(function (coords, cell) {
    setTimeout(function () {
      cell.iterate();
    }, getTimeout());
  });
};

Map.generateTest = function () {
  var self = this; // register involved species with all of the cells

  self.forEach(function (coords, cell) {
    cell.add(self.species.trees2);
    cell.add(self.species.grass);
    cell.add(self.species.magic);
    cell.add(self.species.trees);
  }); // spiral fun!

  var rut_cells = [// {x: 8, y: 9},
  // {x: 8, y: 10},
  // {x: 8, y: 11},
  // {x: 8, y: 12},
  {
    x: 9,
    y: 12
  }, {
    x: 10,
    y: 12
  }, {
    x: 11,
    y: 12
  }, {
    x: 12,
    y: 12
  }, {
    x: 12,
    y: 11
  }, {
    x: 12,
    y: 10
  }, {
    x: 12,
    y: 9
  }, {
    x: 12,
    y: 8
  }, {
    x: 12,
    y: 7
  }, {
    x: 11,
    y: 7
  }, {
    x: 10,
    y: 7
  }, {
    x: 9,
    y: 7
  }, {
    x: 8,
    y: 7
  }, {
    x: 7,
    y: 7
  }, {
    x: 6,
    y: 7
  }, {
    x: 6,
    y: 8
  }, {
    x: 6,
    y: 9
  }, {
    x: 6,
    y: 10
  }, {
    x: 6,
    y: 11
  }, {
    x: 6,
    y: 12
  }, {
    x: 6,
    y: 13
  }, {
    x: 6,
    y: 14
  }, {
    x: 7,
    y: 14
  }, {
    x: 8,
    y: 14
  }, {
    x: 9,
    y: 14
  }, {
    x: 10,
    y: 14
  }, {
    x: 11,
    y: 14
  }, {
    x: 12,
    y: 14
  }, {
    x: 13,
    y: 14
  }, {
    x: 14,
    y: 14
  }, {
    x: 14,
    y: 13
  }, {
    x: 14,
    y: 12
  }, {
    x: 14,
    y: 11
  }, {
    x: 14,
    y: 10
  }, {
    x: 14,
    y: 9
  }, {
    x: 14,
    y: 8
  }, {
    x: 14,
    y: 7
  }, {
    x: 14,
    y: 6
  }, {
    x: 14,
    y: 5
  }, {
    x: 13,
    y: 5
  }, {
    x: 12,
    y: 5
  }, {
    x: 11,
    y: 5
  }, {
    x: 10,
    y: 5
  }, {
    x: 9,
    y: 5
  }, {
    x: 8,
    y: 5
  }, {
    x: 7,
    y: 5
  }, {
    x: 6,
    y: 5
  }, {
    x: 5,
    y: 5
  }, {
    x: 4,
    y: 5
  }, {
    x: 4,
    y: 6
  }, {
    x: 4,
    y: 7
  }, {
    x: 4,
    y: 8
  }, {
    x: 4,
    y: 9
  }, {
    x: 4,
    y: 10
  }, {
    x: 4,
    y: 11
  }, {
    x: 4,
    y: 12
  }, {
    x: 4,
    y: 13
  }, {
    x: 4,
    y: 14
  }, {
    x: 4,
    y: 15
  }, {
    x: 4,
    y: 16
  }, {
    x: 5,
    y: 16
  }, {
    x: 6,
    y: 16
  }, {
    x: 7,
    y: 16
  }, {
    x: 8,
    y: 16
  }, {
    x: 9,
    y: 16
  }, {
    x: 10,
    y: 16
  }, {
    x: 11,
    y: 16
  }, {
    x: 12,
    y: 16
  }, {
    x: 13,
    y: 16
  }, {
    x: 14,
    y: 16
  }, {
    x: 15,
    y: 16
  }, {
    x: 16,
    y: 16
  }];
  rut_cells.forEach(function (coords) {
    var cell = self.env.get(coords);
    cell.rut('magic', {
      intensity: 1
    });
  }); //self.env.set({x:1,y:1}, self.species.trees)

  self.rect(self.species.trees, {
    x: 0,
    y: 0
  }, {
    x: 7,
    y: 0
  }); //self.rect(self.species.trees2, {x:0, y:7}, {x:7, y:7});
  // self.rect(self.species.magic, {x:4, y:4}, {x:8, y:8});
  // this.env.advance(1);

  self.getCell({
    x: 2,
    y: 0
  }).rut('footsteps');
};

Map.generate = function () {
  if (Settings.mode === 'test') return this.generateTest();
  var self = this; // register involved species with all of the cells

  self.forEach(function (coords, cell) {
    cell.add(self.species.grass);
    cell.add(self.species.trees);
    cell.add(self.species.trees2);
    cell.add(self.species.neutralized);
  });
  self.sow(self.species.grass, 1 / 10);
  self.sow(self.species.flowers, 1 / 50);
  self.sow(self.species.trees, 1 / 10);
  self.sow(self.species.trees2, 1 / 30);
  self.env.advance(10);
  self.forEach(function (coords, cell) {
    cell.add(self.species.magic);
  }); // empty spot in the 0,0 corner
  // self.rect(self.species.grass, {x:0, y:0}, {x:10, y:10});
  // self.rect(self.species.magic, {x:2, y:2}, {x:4, y:4});

  self.env.advance(2);
};

Map.diamondClump = function (coords, species) {
  return this.clump(coords, [{
    x: 0,
    y: 0
  }, {
    x: 1,
    y: 1
  }, {
    x: -1,
    y: 1
  }, {
    x: 1,
    y: -1
  }, {
    x: -1,
    y: -1
  }, {
    x: 0,
    y: -1
  }, {
    x: 0,
    y: 1
  }, {
    x: -1,
    y: 0
  }, {
    x: 1,
    y: 0
  }], species);
};

Map.rect = function (species, from, to) {
  var clump = [];

  for (var x = from.x; x <= to.x; x++) {
    for (var y = from.y; y <= to.y; y++) {
      clump.push({
        x: x,
        y: y
      });
    }
  }

  return this.clump(from, clump, species);
}; // randomly set cells as the species


Map.sow = function (species, frequency) {
  var self = this;
  self.forEach(function (coords, cell) {
    if (Math.random() > frequency) return;
    self.env.set(coords, species);
  });
  /*
      var numSeeds = self.size.x * self.size.y * frequency;
  
      // Pick some places to seed
      var seeds = [];
      for (var i = 0; i < numSeeds; i++) {
          seeds.push(self.env.randomCoords());
      }
  
      seeds.forEach(function(coords) { self.env.set(coords, species); })
  */

  return this;
}; // paste the clump at the designated center


Map.clump = function (center, coordClump, species) {
  var self = this;
  coordClump.forEach(function (coords) {
    var targetCoords = {
      x: coords.x + center.x,
      y: coords.y + center.y
    };
    self.env.set(targetCoords, species);
  });
  return this;
};

Map.set = function (coords, species) {
  this.env.set(coords, species);
};

Map.getCell = function (coords) {
  return this.env.get(coords);
}; // iterates over a coordmap


Map.forEach = function (fn) {
  var self = this;
  self.env.range().forEach(function (coords) {
    fn(coords, self.env.get(coords));
  });
  return this;
};

Map.advance = function (n) {
  if (typeof n === 'undefined') n = 1;
  this.env.advance(n);
  return this;
};

Map.log = function () {
  // For debugging purposes
  var ascii = Utils.transpose(this.env.cells).map(function (r) {
    return r.map(function (cell) {
      return cell.species.id === 'blank' ? ' ' : cell.species.id[0];
    }).join(' ');
  }).join('\n');
  console.log(ascii);
}; // items


Map.placeItem = function (coords, item) {
  if (!this.items[item.type_id]) this.items[item.type_id] = {};
  this.items[item.type_id][item.id] = coords;
  var cell = this.env.get(coords);
  cell.addItem(item);
};

Map.removeItem = function (coords, item) {
  if (this.items[item.type_id]) delete this.items[item.type_id][item.id];
  var cell = this.env.get(coords);
  cell.removeItem(item);
};

},{"./catalogue":14,"./data/ruts":17,"./data/species":18,"./environment":19,"./species":24}],21:[function(require,module,exports){
"use strict";

// EXAMPLE:
//
// var ruleset = new RuleSet({
//  stateMap: {
//      0: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
//      1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9] // the 0.9 means it's a 90% chance of getting a 1.
//  },
//  weights: [
//      [1, 2, 1],
//      [2, 0, 2],
//      [1, 2, 1]
//   ]
//  })
//
//  ruleset.transform(0, [[1,1,1],[0,0,0],[0,0,0]]) => 1
var Catalogue = require('./catalogue');

var RuleSet = module.exports = function (ruleParams) {
  ruleParams = ruleParams || {};
  this.id = ruleParams.id;
  this.stateMap = ruleParams.stateMap || {};
  this.description = ruleParams.description || "has an unknown behavior"; // TODO: this should really be a coordmap...

  this.weights = indexWeights(ruleParams.weights || [[1, 1, 1], [1, 0, 1], [1, 1, 1]]);
  if (ruleParams.debug) this.debug = true;
  Catalogue.add('rules', this);
};

RuleSet.prototype = {};

RuleSet.prototype.transform = function (state, neighbors, debug) {
  // If we try to transform anything unknown, things will just stay constant.
  if (!(state in this.stateMap)) {
    return state;
  }

  var sum = deepWeightedSum(neighbors, this.weights);

  if (sum >= this.stateMap[state].length) {
    return state;
  }

  if (this.debug) console.debug(debug, '|', this.id, state, sum, '>>>', this.stateMap[state][sum]);
  return this.probabilisticState(this.stateMap[state][sum]);
}; // Input 0.3 for a 30% chance at getting a 1 (versus a 0)


RuleSet.prototype.probabilisticState = function (state) {
  if (state === 0 || state === 1) return state;
  return Math.random() < state ? 1 : 0;
}; // neighbors should be a coord-map, like:
// [{coords:{x:0,y:0}, value:'whatever}, {coords:{x:1,y:1}, value:'whatever'}, ... ]


function deepWeightedSum(neighbors, weights) {
  var sum = 0;
  neighbors.forEach(function (neighbor) {
    var coords = neighbor.coords;
    sum += neighbor.value * weights[coords.x][coords.y];
  });
  return sum;
} // This is janky.
// Turns a nested array into a fake nested array, so that you can
// access things like weights[-1][-1]


function indexWeights(deepArray) {
  console.assert(deepArray.length === 3); // sanity check

  console.assert(deepArray[0].length === 3); // ugh, ugh, ugh. Fake array.

  var range = [-1, 0, 1];
  var output = {};
  range.forEach(function (i) {
    output[i] = {};
    range.forEach(function (j) {
      output[i][j] = deepArray[i + 1][j + 1];
    });
  });
  return output;
}

},{"./catalogue":14}],22:[function(require,module,exports){
"use strict";

// This module is for deciding the winning species in a cell!
// 
// For now, it's just 'which species is higher in the pecking order'
var SpeciesBattle = module.exports = {
  peckingOrder: [// This is to break ties in case two species have the same strength.
  // sorted from low to high
  'blank', 'grass', 'trees2', 'trees', 'flowers', 'magic', 'neutralized'],
  decide: function decide(species) {
    if (species.length === 0) return null;
    if (species.length === 1) return species[0];
    var self = this;
    species.sort(function (species1, species2) {
      // blanks shouldn't be dominant over other species
      if (species1.species.id == 'blank') return 1;
      if (species2.species.id == 'blank') return -1;

      if (species1.strength != species2.strength) {
        return species2.strength - species1.strength;
      } else {
        return self.peckingOrder.indexOf(species2.species.id) - self.peckingOrder.indexOf(species1.species.id);
      }
    }); //return ids[Math.floor(Math.random()*ids.length)];

    return species[0];
  }
};

},{}],23:[function(require,module,exports){
"use strict";

// THE POINT OF THIS MODULE IS....
//
//    ... To take a cell object and decide whether it has a species in it.
//    :D
var masks = {
  true: 1,
  false: 0
};

var SpeciesMask = module.exports = function (species_id, min_age) {
  min_age = min_age || 0;
  return function (cell) {
    if (!cell || !cell.species) return masks[false];
    if (!cell.register[species_id]) return masks[false]; //return masks[cell.species.id === species_id];

    return masks[cell.register[species_id].age > min_age];
  };
};

},{}],24:[function(require,module,exports){
"use strict";

var Utils = window.Utils;

var RuleSet = require('./ruleset');

var SpeciesMask = require('./species-mask');

var Catalogue = require('./catalogue');

var Species = module.exports = function (params) {
  this.id = params.id || 'species' + Math.floor(Math.random() * 1e8);
  this.description = params.description || "unknown species"; // behavior
  // TODO: fix passable for phaser

  this.passable = params.hasOwnProperty('passable') ? params.passable : true;

  if (params.hasOwnProperty('speed')) {
    this.speed = params.speed;
  }

  if (params.hasOwnProperty('timeToIteration')) {
    this.timeToIteration = params.timeToIteration;
  }

  if (params.hasOwnProperty('forceNeighborIteration')) {
    this.forceNeighborIteration = params.forceNeighborIteration;
  }

  this.initRules(params.rules); // This is a function to decide whether a cell hosts this species or not

  this.mask = SpeciesMask(this.id);
  Catalogue.add('species', this);
};

Species.prototype = {}; // this is sort of messy; it populates stuff in the rules object

Species.prototype.initRules = function (rules) {
  this.rules = rules || {}; // The default rules govern how the species spreads based on its own presence

  this.rules.default = new RuleSet(this.rules.default); // Ruts are like conditionals, but semantically different

  this.rules.ruts = this.rules.ruts || [];
  this.rules.ruts.forEach(function (rut) {
    rut.rules = new RuleSet(rut.rules);
  }); // Lifespan rules are conditional on this species' age

  this.rules.lifespan = this.rules.lifespan || [];
  this.rules.lifespan.forEach(function (condition) {
    condition.mask = SpeciesMask(condition.species_id, condition.min_age);
    condition.rules = new RuleSet(condition.rules);
  }); // Conditional rules are based on other species

  this.rules.conditional = this.rules.conditional || [];
  this.rules.conditional.forEach(function (condition) {
    condition.mask = SpeciesMask(condition.species_id, condition.min_age);
    condition.rules = new RuleSet(condition.rules);
  });
};

Species.prototype.getSymbol = function () {
  return this.symbol;
};

Species.prototype.getColor = function () {
  return this.color;
}; // Returns 1 or 0, depending on whether the next iteration should include this species


Species.prototype.nextState = function (cell, neighbors) {
  // turn these things into arrays of 1s and 0s (or whatever)
  var self = this; // these are the rules to use.

  var ruleset = this.decideRuleset(cell, neighbors); // these are masked by THIS species, not a foreign species returned by decideRuleset

  var maskedCell = this.mask(cell);
  var maskedNeighbors = mapCoordmap(neighbors, self.mask);
  var nextState = ruleset.transform(maskedCell, maskedNeighbors, Math.round(cell.forcedIterationTime) / 1000 + ' ' + Math.round(cell.t_temp) / 1000 + ' ' + cell.coords.x + ',' + cell.coords.y + ' ' + this.id); // propagate age (this will only be used if nextState is 1)

  var age = nextState == 1 ? cell.register[this.id].age + 1 : 0;
  var strength = this.decideStrengthFromNeighbors(neighbors);
  var iterationTime = Settings.mapIterationTimeout;

  if (ruleset.hasOwnProperty('iterationTime')) {
    iterationTime = ruleset.iterationTime;
  }

  return {
    state: nextState,
    age: age,
    strength: strength,
    iterationTime: iterationTime
  };
};

Species.prototype.decideRuleset = function (cell, neighbors) {
  var winningRuleset = this.rules.default;
  if (this.rules.conditional.length + this.rules.ruts.length === 0) return winningRuleset; // RUTS
  // If a rut is present, it can override other stuff
  // - should be sorted from HIGHEST priority to lowest.

  for (var i = 0; i < this.rules.ruts.length; i++) {
    // The probability that this rut ends up affecting the cell
    // is proportional to its intensity (0 to 1)
    // TODO: this needs testing
    var rut = this.rules.ruts[i];
    var intensity = rut.rut_id in cell.ruts ? cell.ruts[rut.rut_id].intensity : 0;
    if (!intensity || Math.random() > intensity) continue;
    winningRuleset = rut.rules;
    return winningRuleset;
  } // CONDITIONAL RULES
  // - should be sorted from lowest priority to highest.


  this.rules.lifespan.forEach(function (condition) {
    // the cell age has to meet the age threshhold
    if (condition.min_age && cell.getAge(condition.species_id) < condition.min_age) return;
    winningRuleset = condition.rules;
  });
  this.rules.conditional.forEach(function (condition) {
    var maskedNeighbors = mapCoordmap(neighbors, condition.mask);
    var count = coordmapSum(maskedNeighbors); // the number of neighbors has to meet the neighbor threshhold

    if (condition.min_neighbors && count < condition.min_neighbors) return;
    winningRuleset = condition.rules;
  });
  return winningRuleset;
};

Species.prototype.decideStrengthFromNeighbors = function (neighbors) {
  var _this = this;

  var speciesNeighbors = filterCoordmap(neighbors, function (cell) {
    return !!cell && _this.id in cell.register;
  });
  var neighborStrength = mapCoordmap(speciesNeighbors, function (cell) {
    return cell.register[_this.id].strength;
  });
  var avgStrength = coordmapAvg(neighborStrength);
  return avgStrength;
};

Species.prototype.getIterationTime = function (ruts) {
  // Of all possible iteration times, pick the shortest.
  var possibleTimes = [];
  possibleTimes.push(this.timeToIteration || Settings.mapIterationTimeout); // for iteration times, ignore rut intensity. We're just looking for any possibility
  // of a shorter iteration time.

  ruts = ruts || {};

  for (var rut_id in ruts) {
    var rut = this.getRut(rut_id);
    if (rut && rut.hasOwnProperty('timeToIteration')) possibleTimes.push(rut.timeToIteration);
  }

  return Utils.arrayMin(possibleTimes);
};

Species.prototype.getRut = function (rut_id) {
  for (var i = 0; i < this.rules.ruts.length; i++) {
    if (this.rules.ruts[i].rut_id === rut_id) return this.rules.ruts[i];
  }

  return null;
}; // meh, data structure juggling


Species.prototype.getIndexedRuts = function () {
  var ruts = {};

  for (var i = 0; i < this.rules.ruts.length; i++) {
    var rut_id = this.rules.ruts[i].rut_id;
    ruts[rut_id] = this.rules.ruts[i];
  }

  return ruts;
}; // TODO make a coordmap object type...


function mapCoordmap(coordmap, mapFunction) {
  return coordmap.map(function (coordmapItem) {
    return {
      coords: coordmapItem.coords,
      value: mapFunction(coordmapItem.value)
    };
  });
}

function filterCoordmap(coordmap, filterFunction) {
  return coordmap.filter(function (coordmapItem) {
    return filterFunction(coordmapItem.value);
  });
}

function coordmapSum(coordmap) {
  var sum = 0;
  coordmap.forEach(function (coordmapItem) {
    sum += coordmapItem.value;
  });
  return sum;
}

function coordmapAvg(coordmap) {
  return coordmapSum(coordmap) / coordmap.length;
}

},{"./catalogue":14,"./ruleset":21,"./species-mask":23}],25:[function(require,module,exports){

},{}],26:[function(require,module,exports){
// doT.js
// 2011, Laura Doktorova, https://github.com/olado/doT
// Licensed under the MIT license.

(function() {
	"use strict";

	var doT = {
		version: '1.0.0',
		templateSettings: {
			evaluate:    /\{\{([\s\S]+?\}?)\}\}/g,
			interpolate: /\{\{=([\s\S]+?)\}\}/g,
			encode:      /\{\{!([\s\S]+?)\}\}/g,
			use:         /\{\{#([\s\S]+?)\}\}/g,
			useParams:   /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
			define:      /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
			defineParams:/^\s*([\w$]+):([\s\S]+)/,
			conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
			iterate:     /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
			varname:	'it',
			strip:		true,
			append:		true,
			selfcontained: false
		},
		template: undefined, //fn, compile template
		compile:  undefined  //fn, for express
	};

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = doT;
	} else if (typeof define === 'function' && define.amd) {
		define(function(){return doT;});
	} else {
		(function(){ return this || (0,eval)('this'); }()).doT = doT;
	}

	function encodeHTMLSource() {
		var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;' },
			matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
		return function() {
			return this ? this.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : this;
		};
	}
	String.prototype.encodeHTML = encodeHTMLSource();

	var startend = {
		append: { start: "'+(",      end: ")+'",      endencode: "||'').toString().encodeHTML()+'" },
		split:  { start: "';out+=(", end: ");out+='", endencode: "||'').toString().encodeHTML();out+='"}
	}, skip = /$^/;

	function resolveDefs(c, block, def) {
		return ((typeof block === 'string') ? block : block.toString())
		.replace(c.define || skip, function(m, code, assign, value) {
			if (code.indexOf('def.') === 0) {
				code = code.substring(4);
			}
			if (!(code in def)) {
				if (assign === ':') {
					if (c.defineParams) value.replace(c.defineParams, function(m, param, v) {
						def[code] = {arg: param, text: v};
					});
					if (!(code in def)) def[code]= value;
				} else {
					new Function("def", "def['"+code+"']=" + value)(def);
				}
			}
			return '';
		})
		.replace(c.use || skip, function(m, code) {
			if (c.useParams) code = code.replace(c.useParams, function(m, s, d, param) {
				if (def[d] && def[d].arg && param) {
					var rw = (d+":"+param).replace(/'|\\/g, '_');
					def.__exp = def.__exp || {};
					def.__exp[rw] = def[d].text.replace(new RegExp("(^|[^\\w$])" + def[d].arg + "([^\\w$])", "g"), "$1" + param + "$2");
					return s + "def.__exp['"+rw+"']";
				}
			});
			var v = new Function("def", "return " + code)(def);
			return v ? resolveDefs(c, v, def) : v;
		});
	}

	function unescape(code) {
		return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, ' ');
	}

	doT.template = function(tmpl, c, def) {
		c = c || doT.templateSettings;
		var cse = c.append ? startend.append : startend.split, needhtmlencode, sid = 0, indv,
			str  = (c.use || c.define) ? resolveDefs(c, tmpl, def || {}) : tmpl;

		str = ("var out='" + (c.strip ? str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g,' ')
					.replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g,''): str)
			.replace(/'|\\/g, '\\$&')
			.replace(c.interpolate || skip, function(m, code) {
				return cse.start + unescape(code) + cse.end;
			})
			.replace(c.encode || skip, function(m, code) {
				needhtmlencode = true;
				return cse.start + unescape(code) + cse.endencode;
			})
			.replace(c.conditional || skip, function(m, elsecase, code) {
				return elsecase ?
					(code ? "';}else if(" + unescape(code) + "){out+='" : "';}else{out+='") :
					(code ? "';if(" + unescape(code) + "){out+='" : "';}out+='");
			})
			.replace(c.iterate || skip, function(m, iterate, vname, iname) {
				if (!iterate) return "';} } out+='";
				sid+=1; indv=iname || "i"+sid; iterate=unescape(iterate);
				return "';var arr"+sid+"="+iterate+";if(arr"+sid+"){var "+vname+","+indv+"=-1,l"+sid+"=arr"+sid+".length-1;while("+indv+"<l"+sid+"){"
					+vname+"=arr"+sid+"["+indv+"+=1];out+='";
			})
			.replace(c.evaluate || skip, function(m, code) {
				return "';" + unescape(code) + "out+='";
			})
			+ "';return out;")
			.replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r')
			.replace(/(\s|;|\}|^|\{)out\+='';/g, '$1').replace(/\+''/g, '')
			.replace(/(\s|;|\}|^|\{)out\+=''\+/g,'$1out+=');

		if (needhtmlencode && c.selfcontained) {
			str = "String.prototype.encodeHTML=(" + encodeHTMLSource.toString() + "());" + str;
		}
		try {
			return new Function(c.varname, str);
		} catch (e) {
			if (typeof console !== 'undefined') console.log("Could not create a template function: " + str);
			throw e;
		}
	};

	doT.compile = function(tmpl, def) {
		return doT.template(tmpl, null, def);
	};
}());

},{}],27:[function(require,module,exports){
/* doT + auto-compilation of doT templates
 *
 * 2012, Laura Doktorova, https://github.com/olado/doT
 * Licensed under the MIT license
 *
 * Compiles .def, .dot, .jst files found under the specified path.
 * It ignores sub-directories.
 * Template files can have multiple extensions at the same time.
 * Files with .def extension can be included in other files via {{#def.name}}
 * Files with .dot extension are compiled into functions with the same name and
 * can be accessed as renderer.filename
 * Files with .jst extension are compiled into .js files. Produced .js file can be
 * loaded as a commonJS, AMD module, or just installed into a global variable
 * (default is set to _render). All inline defines defined in the .jst file are
 * compiled into separate functions and are available via _render.filename.definename
 *
 * Basic usage:
 * var dots = require("dot").process({path: "./views"});
 * dots.mytemplate({foo:"hello world"});
 *
 * The above snippet will:
 * 1. Compile all templates in views folder (.dot, .def, .jst)
 * 2. Place .js files compiled from .jst templates into the same folder.
 *    These files can be used with require, i.e. require("./views/mytemplate").
 * 3. Return an object with functions compiled from .dot templates as its properties.
 * 4. Render mytemplate template.
 */

var fs = require("fs"),
	doT = module.exports = require("./doT");

doT.process = function(options) {
	//path, destination, global, rendermodule, templateSettings
	return new InstallDots(options).compileAll();
};

function InstallDots(o) {
	this.__path 		= o.path || "./";
	if (this.__path[this.__path.length-1] !== '/') this.__path += '/';
	this.__destination	= o.destination || this.__path;
	if (this.__destination[this.__destination.length-1] !== '/') this.__destination += '/';
	this.__global		= o.global || "_render";
	this.__rendermodule	= o.rendermodule || {};
	this.__settings 	= o.templateSettings ? copy(o.templateSettings, copy(doT.templateSettings)) : undefined;
	this.__includes		= {};
}

InstallDots.prototype.compileToFile = function(path, template, def) {
	def = def || {};
	var modulename = path.substring(path.lastIndexOf("/")+1, path.lastIndexOf("."))
		, defs = copy(this.__includes, copy(def))
		, settings = this.__settings || doT.templateSettings
		, compileoptions = copy(settings)
		, defaultcompiled = doT.template(template, settings, defs)
		, exports = "dot:" + modulename
		, compiled = ""
		, fn;

	for (var property in defs) {
		if (defs[property] !== def[property] && defs[property] !== this.__includes[property]) {
			fn = undefined;
			if (typeof defs[property] === 'string') {
				fn = doT.template(defs[property], settings, defs);
			} else if (typeof defs[property] === 'function') {
				fn = defs[property];
			} else if (defs[property].arg) {
				compileoptions.varname = defs[property].arg;
				fn = doT.template(defs[property].text, compileoptions, defs);
			}
			if (fn) {
				compiled += fn.toString().replace('anonymous', property);
				exports += ',' + property + ":" + property;
			}
		}
	}
	compiled += defaultcompiled.toString().replace('anonymous', modulename);
	fs.writeFileSync(path, "(function(){" + compiled
		+ "var itself={" + exports
		+ "};if(typeof module!=='undefined' && module.exports) module.exports=itself;else if(typeof define==='function')define(function(){return itself;});else {"
		+ this.__global + "=" + this.__global + "||{};" + this.__global + "['" + modulename + "']=itself;}}());");
};

function copy(o, to) {
	to = to || {};
	for (var property in o) {
		to[property] = o[property];
	}
	return to;
}

function readdata(path) {
	var data = fs.readFileSync(path);
	if (data) return data.toString();
	console.log("problems with " + path);
}

InstallDots.prototype.compilePath = function(path) {
	var data = readdata(path);
	if (data) {
		return doT.template(data,
					this.__settings || doT.templateSettings,
					copy(this.__includes));
	}
};

InstallDots.prototype.compileAll = function() {
	console.log("Compiling all doT templates...");

	var defFolder = this.__path,
		sources = fs.readdirSync(defFolder),
		k, l, name;

	for( k = 0, l = sources.length; k < l; k++) {
		name = sources[k];
		if (/\.def(\.dot|\.jst)?$/.test(name)) {
			console.log("Loaded def " + name);
			this.__includes[name.substring(0, name.indexOf('.'))] = readdata(defFolder + name);
		}
	}

	for( k = 0, l = sources.length; k < l; k++) {
		name = sources[k];
		if (/\.dot(\.def|\.jst)?$/.test(name)) {
			console.log("Compiling " + name + " to function");
			this.__rendermodule[name.substring(0, name.indexOf('.'))] = this.compilePath(defFolder + name);
		}
		if (/\.jst(\.dot|\.def)?$/.test(name)) {
			console.log("Compiling " + name + " to file");
			this.compileToFile(this.__destination + name.substring(0, name.indexOf('.')) + '.js',
					readdata(defFolder + name));
		}
	}
	return this.__rendermodule;
};

},{"./doT":26,"fs":25}],28:[function(require,module,exports){
"use strict";

var Character = require('./character');

var ToolChest = require('./items');

var CELL_CHANGE_EVT = 'check_cell_for_magic';

var Player = module.exports = function (map) {
  var player = new Character({
    map: map,
    id: 'player',
    visibility: Settings.visibilityPlayer,
    speciesResponses: {
      'magic': function magic() {
        player.ouch();
      }
    },
    trailingRuts: {
      'footsteps': 1
    }
  }); // ugh, TODO clean this up
  //player.sprite.scaleTo(game.cellDims).place(game.html.characters);

  player.moveTo(Settings.playerStart); // start some grass where the player is

  map.diamondClump(player.coords, map.species.grass); // Starting inventory

  initInventory(player, {
    neutralizer: 1,
    bomb: 4,
    camera: 8,
    detector: 4
  });
  player.inventory.rendersTo(document.getElementById('game-inventory')); // Override visibility to count the cells viewable via camera

  player.isCoordsVisible = function (coords) {
    var selfVisible = this.__proto__.isCoordsVisible.call(this, coords);

    if (selfVisible) return true;

    if (game.map.items.camera) {
      for (var item_id in game.map.items.camera) {
        var item_coords = game.map.items.camera[item_id];
        var item = game.map.getCell(item_coords).getItem(item_id);
        if (item.isCoordsVisible(coords)) return true;
      }
    }

    return false;
  };

  return player;
};

function initInventory(player, inventoryCounts) {
  for (var itemType in inventoryCounts) {
    for (var i = 0; i < inventoryCounts[itemType]; i++) {
      player.gets(ToolChest.make(itemType));
    }
  }
}

},{"./character":1,"./items":10}],29:[function(require,module,exports){
"use strict";

var Views = module.exports = {
  topdown: require('./topdown'),
  phaserIso: require('./phaser')
};

},{"./phaser":34,"./topdown":47}],30:[function(require,module,exports){
"use strict";

// Tree sprites are from
// http://opengameart.org/content/tree-collection-v26-bleeds-game-art
// Bleed - http://remusprites.carbonmade.com/
var AssetData = module.exports = {
  blue: {
    url: 'images/colors/blue2.png',
    anchors: [0.5, 0.5]
  },
  red: {
    url: 'images/colors/red.png',
    anchors: [0.5, 0.5]
  },
  green: {
    url: 'images/colors/green.png',
    anchors: [0.5, 0.5]
  },
  player: {
    url: 'images/player-forward.png',
    anchors: [0.5, 1.0]
  },
  wizard: {
    url: 'images/wizard-forward.png',
    anchors: [0.5, 1.0]
  },
  neutralizer1: {
    url: 'images/neutralizer1.png',
    anchors: [0.5, 2 / 3]
  },
  neutralizer2: {
    url: 'images/neutralizer2.png',
    anchors: [0.5, 2 / 3]
  },
  neutralizer3: {
    url: 'images/neutralizer3.png',
    anchors: [0.5, 2 / 3]
  },
  magic: {
    url: 'images/magic-over-dirt.png',
    anchors: [0.5, 2 / 3]
  },
  dirt: {
    url: 'images/ground-dirt.png',
    anchors: [0.5, 2 / 3]
  },
  grass: {
    url: 'images/ground-grass.png',
    anchors: [0.5, 2 / 3]
  },
  flower: {
    // todo: do a real image for this
    url: 'images/ground-grass.png',
    anchors: [0.5, 2 / 3]
  },
  tree1: {
    url: 'images/tree_01_grass.png',
    anchors: [0.5, 2 / 3]
  },
  tree2: {
    url: 'images/tree_02_grass.png',
    anchors: [0.5, 0.75]
  },
  tree8: {
    url: 'images/tree_08_grass.png',
    anchors: [0.5, 2 / 3]
  },
  tree11: {
    url: 'images/tree_11_grass.png',
    anchors: [0.5, 2 / 3]
  },
  tree13: {
    url: 'images/tree_13_grass.png',
    anchors: [0.5, 0.75]
  }
};

},{}],31:[function(require,module,exports){
"use strict";

var SpeciesSprites = require('./data/species-sprites');

var Utils = window.Utils;

var PhaserCell = module.exports = function (cell) {
  this.cell = cell; // Cache each sprite so we're not creating them on the fly

  this.register = {};

  for (var species_id in this.cell.register) {
    this.register[species_id] = {
      sprite: null,
      // At the moment, we're only showing 1 species per cell.
      // Whichever is marked as the dominant species, via cell.species
      visible: this.cell.species.id === species_id
    };
  } // TODO: set visible=false appropriately


  this.createSprites();
  this.bindEvents();
};

PhaserCell.prototype = {};

PhaserCell.prototype.bindEvents = function () {
  var self = this;
  this.cell.on('change', 'phaserRefresh', function (data) {
    self.onChange(data.species);
  }); // Todo: if appropriate, bind createSpriteFor to 'add' event
};

PhaserCell.prototype.onChange = function (species) {
  // set sprite of this 
  this.hideAllExcept(species);
  this.showSprite(species);
};

PhaserCell.prototype.createSprites = function () {
  for (var species_id in this.register) {
    this.createSpriteFor(species_id);
  }
};

window.alls = [];

PhaserCell.prototype.createSpriteFor = function (species_id) {
  var sprite_id = SpeciesSprites[species_id].id;

  if (Utils.isArray(sprite_id)) {
    sprite_id = Utils.randomChoice(sprite_id);
  } // TODO: access game elsehow


  var reg = this.register[species_id];
  reg.sprite = window.game.addMapSprite(this.cell.coords, sprite_id);
  reg.sprite.alpha = reg.visible ? 1 : 0;
  window.alls.push(reg.sprite);
  return reg.sprite;
};

PhaserCell.prototype.showSprite = function (species) {
  //console.log('showSprite', this.cell.coords.x, this.cell.coords.y, species.id);
  var reg = this.register[species.id];
  if (!reg) return; // species is not registered yet

  if (!reg.sprite) return; // sprite not initialized...

  if (reg.sprite.alpha > 0) return; // sprite already visible

  if (SpeciesSprites[species.id].fade) {
    window.game.add.tween(reg.sprite).to({
      alpha: 1
    }, 200, Phaser.Easing.Linear.None, true, // autostart
    0, // delay
    0 // loop 
    );
  } else {
    reg.sprite.alpha = 1;
  }
};

PhaserCell.prototype.hideSprite = function (species_id) {
  var reg = this.register[species_id];
  if (!reg) return; // species is not registered yet

  if (!reg.sprite) return; // sprite is not initialized yets

  if (reg.sprite.alpha === 0) return; // sprite is already hidden

  if (SpeciesSprites[species_id].fade) {
    window.game.add.tween(reg.sprite).to({
      alpha: 0
    }, 200, Phaser.Easing.Linear.None, true, //autostart
    0, //delay
    0 //loop
    );
  } else {
    reg.sprite.alpha = 0;
  }
};

PhaserCell.prototype.hideAllExcept = function (species) {
  for (var id in this.register) {
    if (!!species.id && species.id === id) continue;
    this.hideSprite(id);
  }
};

},{"./data/species-sprites":33}],32:[function(require,module,exports){
"use strict";

var PhaserCharacter = module.exports = function (character, sprite) {
  this.character = character;
  this.sprite = sprite; //this.createSprites(); // TODO

  this.bindEvents();
};

PhaserCharacter.prototype = {};

PhaserCharacter.prototype.bindEvents = function () {
  var self = this;
  this.character.on('moveDiscrete', 'phaserMoveDiscrete', function (data) {
    self.onMoveDiscrete(data);
  });
};

PhaserCharacter.prototype.onMoveDiscrete = function () {
  // move sprite with no animation
  //this.sprite.isoX = this.character.coords.x * Settings.cellDims.x;
  //this.sprite.isoY = this.character.coords.y * Settings.cellDims.y;
  // move sprite WITH animation
  var tween = window.game.add.tween(this.sprite);
  tween.to({
    isoX: this.character.coords.x * Settings.cellDims.x - 30,
    // argh
    isoY: this.character.coords.y * Settings.cellDims.y - 23 // argh

  }, 400, Phaser.Easing.Sinusoidal.InOut, true, 0, 0);
  tween.onComplete.add(function () {// character has finished moving
  });
};

PhaserCharacter.prototype.createSprites = function () {};

},{}],33:[function(require,module,exports){
"use strict";

// Index of which sprites to show for each species.
var SpeciesSprites = module.exports = {}; // test species 

SpeciesSprites['blue'] = {
  id: 'blue'
};
SpeciesSprites['red'] = {
  id: 'red'
};
SpeciesSprites['green'] = {
  id: 'green' // actual species

};
SpeciesSprites['blank'] = {
  id: 'dirt'
};
SpeciesSprites['dirt'] = {
  id: 'dirt'
};
SpeciesSprites['neutralized'] = {
  id: ['neutralizer1', 'neutralizer2', 'neutralizer3'],
  fade: true
};
SpeciesSprites['magic'] = {
  id: 'magic',
  fade: true
};
SpeciesSprites['grass'] = {
  id: 'grass'
};
SpeciesSprites['flowers'] = {
  id: 'flower',
  fade: true
};
SpeciesSprites['trees'] = {
  id: ['tree1', 'tree8', 'tree11'],
  fade: true
};
SpeciesSprites['trees2'] = {
  id: ['tree2', 'tree13'],
  fade: true
};

},{}],34:[function(require,module,exports){
"use strict";

var phaserIso = module.exports = {};

phaserIso.load = function (Context) {
  var GameStates = require('./states');

  window.game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, 'game', null, true, false);

  for (var stateName in GameStates) {
    var state = GameStates[stateName];
    if (typeof state.setContext === 'function') state.setContext(Context);
    game.state.add(stateName, state);
  }

  game.state.start('Boot');
};

},{"./states":37}],35:[function(require,module,exports){
"use strict";

var Settings = window.Settings;

var AssetData = require('../asset_data');

var game;

var Boot = module.exports = function (_game) {
  game = _game;
};

Boot.prototype = {
  preload: function preload() {
    for (var sprite_id in AssetData) {
      game.load.image(sprite_id, AssetData[sprite_id].url);
    }

    game.time.advancedTiming = true;
    game.plugins.add(new Phaser.Plugin.Isometric(game));
    game.world.setBounds(0, 0, Settings.gameDims.x, Settings.gameDims.y);
    game.physics.startSystem(Phaser.Plugin.Isometric.ISOARCADE);
    game.iso.anchor.setTo.apply(game.iso.anchor, Settings.gameAnchor);
  },
  create: function create() {
    console.log('Game state: Boot');
    game.state.start('Menu');
  }
};

},{"../asset_data":30}],36:[function(require,module,exports){
"use strict";

var game;

var End = module.exports = function (_game) {
  game = _game;
};

End.prototype = {
  create: function create() {
    console.log('Game state: End'); // Todo :)

    game.state.start('Menu');
  }
};

},{}],37:[function(require,module,exports){
"use strict";

var GameStates = module.exports = {
  Boot: require('./boot.js'),
  Menu: require('./menu.js'),
  Play: require('./play.js'),
  End: require('./end.js')
};

},{"./boot.js":35,"./end.js":36,"./menu.js":38,"./play.js":39}],38:[function(require,module,exports){
"use strict";

var game;

var Menu = module.exports = function (_game) {
  game = _game;
};

Menu.prototype = {
  create: function create() {
    console.log('Game state: Menu'); // Todo :)

    game.state.start('Play');
  }
};

},{}],39:[function(require,module,exports){
"use strict";

var XY = window.XY;
var Settings = window.Settings;

var AssetData = require('../asset_data');

var game; // this holds player, wizard, etc

var Context;

var PhaserCell = require('../cell.js');

var PhaserCharacter = require('../character.js');

var Play = module.exports = function (_game) {
  game = _game;
};

Play.setContext = function (newContext) {
  console.assert(!!newContext.Map);
  console.assert(!!newContext.GamePlayModes);
  console.assert(!!newContext.Player);
  console.assert(!!newContext.Wizard);
  Context = newContext;
};

Play.prototype = {
  preload: function preload() {
    // TODO clean this up, find better homes for these methods
    game.addMapSprite = function (gameCoords, sprite_id) {
      // use for the map sprites, not character sprites
      var sprite = game.add.isoSprite(gameCoords.x * Settings.cellDims.x, gameCoords.y * Settings.cellDims.y, 0, sprite_id, 0, game.mapGroup);
      sprite.anchor.set.apply(sprite.anchor, AssetData[sprite_id].anchors);
      return sprite;
    };

    game.map = Context.Map;
    game.map.init({
      size: Settings.mapSize
    });
    game.playModes = Context.GamePlayModes;
    game.playModes.init(game);
  },
  create: function create() {
    console.log('Game state: Play');
    game.cursor = null;
    game.mapGroup = game.add.group();
    game.physics.isoArcade.gravity.setTo(0, 0, 0);
    game.map.generate();
    var phaserCells = [];
    game.map.forEach(function (coords, cell) {
      phaserCells.push(new PhaserCell(cell));
    });
    game.iso.simpleSort(game.mapGroup);
    game.cursor = new Phaser.Plugin.Isometric.Point3();
    game.input.onUp.add(onTap, this); // PLAYER
    // ** Sprite is completely independent from the player object
    // (Unlike the cell objs, who own their sprites)

    game.playerSprite = game.add.isoSprite(Settings.playerStart.x * Settings.cellDims.x, Settings.playerStart.y * Settings.cellDims.y, 2, 'player', 0, game.mapGroup);
    game.playerSprite.anchor.set(0.5, 1.0);
    game.physics.isoArcade.enable(game.playerSprite);
    game.playerSprite.body.collideWorldBounds = true;
    game.player = Context.Player(game.map);
    var phaserPlayer = new PhaserCharacter(game.player, game.playerSprite); // TODO: this sprite issue is a huge mess; clean it up

    game.wizardSprite = game.add.isoSprite(Settings.wizardStart.x * Settings.cellDims.x, Settings.wizardStart.y * Settings.cellDims.y, 2, 'wizard', 0, game.mapGroup);
    game.wizard = Context.Wizard(game.map, game.wizardSprite);
    var phaserWizard = new PhaserCharacter(game.wizard, game.wizardSprite); // CAMERA

    game.camera.follow(game.playerSprite); //var center = XY(game.playerSprite.x, game.playerSprite.y) 
    //var center = game.playerSprite;

    var center = XY(game.width / 2, game.height / 2);
    var deadzone = XY(game.camera.width * Settings.cameraDeadzone, game.camera.height * Settings.cameraDeadzone);
    game.camera.deadzone = new Phaser.Rectangle(center.x - deadzone.x / 2, center.y - deadzone.y / 2, deadzone.x, deadzone.y);
    bindInventoryEvents(); // SPIN UP THE MAP

    game.map.startIteration();
  },
  update: function update() {
    game.iso.unproject(game.input.activePointer.position, game.cursor);
    handleMovement(); // Which cell is the player on? send game coords to player obj

    var spriteCoords = getGameCoords(game.playerSprite.isoX, game.playerSprite.isoY);

    if (!game.player.isAt(spriteCoords)) {
      game.player.moveTo(spriteCoords);
    }
  },
  render: function render() {
    debugText();
  }
}; // Misc floating helpers
// TODO: refactor after decisions are made / stuff is stable

function debugText() {
  var cursor = getGameCoords(game.cursor.x, game.cursor.y);
  var lines = ['GAME', '  mode:     ' + game.playModes.get(), '  cursor:   ' + xyStr(cursor), '  last tap: ' + (!!game.lastTap ? xyStr(game.lastTap) : ''), 'PLAYER', '  coords:    ' + xyStr(game.player.coords), '  health:    ' + game.player.health, '  speed:     ' + game.player.speed, '  underfoot: ' + Context.Map.getCell(game.player.coords).species.id];
  var color = "#CDE6BB";
  var lineheight = 14;
  var line = 1;

  for (var line = 0; line < lines.length; line++) {
    game.debug.text(lines[line], 2, (line + 1) * lineheight, color);
  }
}

function xyStr(xy) {
  return xy.x + ' ' + xy.y;
}

function getGameCoords(isoX, isoY) {
  return XY(Math.round(isoX / Settings.cellDims.x), Math.round(isoY / Settings.cellDims.y));
}

var stop = function stop() {
  game.playerSprite.body.velocity.setTo(0, 0);
};

function handleMovement() {
  var spriteCoords = getGameCoords(game.playerSprite.isoX, game.playerSprite.isoY);
  var cursorCoords = getGameCoords(game.cursor.x, game.cursor.y);

  if (spriteCoords.x === cursorCoords.x && spriteCoords.y === cursorCoords.y) {
    stop();
    return;
  }

  if (game.input.activePointer.isDown && game.playModes.get() === 'idle') {
    game.physics.isoArcade.moveToPointer(game.playerSprite, game.player.speed);
  } else {
    stop();
  }
}

function bindInventoryEvents() {
  // This is vanilla html, not phaser. TODO: see if there is a better way
  var inventoryHtml = document.getElementById('game-inventory');
  var slots = Array.apply(Array, inventoryHtml.getElementsByClassName('slot'));
  slots.forEach(function (slotHtml) {
    slotHtml.onclick = function (evt) {
      evt.stopPropagation(); // don't send it to the phaser game canvas

      console.log('Clicked:', slotHtml.dataset.itemId);
      game.playModes.advance({
        item: slotHtml.dataset.itemId
      });
    };
  });
}

function onTap(pointer, doubleTap) {
  game.lastTap = getGameCoords(game.cursor.x, game.cursor.y); // Taps signify possible mode changes

  game.playModes.advance({
    coords: game.lastTap
  }); // todo: place inventory item
}

},{"../asset_data":30,"../cell.js":31,"../character.js":32}],40:[function(require,module,exports){
"use strict";

// Tree sprites are from
// http://opengameart.org/content/tree-collection-v26-bleeds-game-art
// Bleed - http://remusprites.carbonmade.com/
var AssetData = module.exports = {
  blue: {
    symbol: '~',
    color: '#00B'
  },
  red: {
    symbol: '~',
    color: '#B00'
  },
  green: {
    symbol: '~',
    color: '#0B0'
  },
  blank: {
    symbol: '~',
    color: '#5F4F29'
  },
  neutralized: {
    symbol: 'x',
    color: '#422121'
  },
  magic: {
    symbol: '&#8960;',
    color: '#4C24A3',
    color2: '#a2a5e6'
  },
  dirt: {
    symbol: '&#8960;',
    color: '#616831'
  },
  grass: {
    symbol: '&#8756;',
    color: '#46CF46'
  },
  flowers: {
    symbol: '&#9880;',
    color: '#E46511',
    color2: '#991900'
  },
  trees: {
    symbol: '&psi;',
    color: '#174925'
  },
  trees2: {
    symbol: '&psi;',
    color: '#1f5214',
    color2: '#457b1e'
  },
  // TODO: this is a rut ID. Should it be separate from the species IDS?
  footsteps: {
    symbol: '&#x1F463;'
  }
};

},{}],41:[function(require,module,exports){
"use strict";

var BaseRenderer = module.exports = function () {};

BaseRenderer.prototype = {};

BaseRenderer.prototype.init = function (view, params) {
  this.view = view;
  this.dims = params.dims;
  this.viewParams = params;
  this.onInit(params);
};

BaseRenderer.prototype.onInit = function (params) {};

BaseRenderer.prototype.refresh = function () {};

BaseRenderer.prototype.render = function () {};

BaseRenderer.prototype.onRecenter = function () {};

},{}],42:[function(require,module,exports){
"use strict";

var Sprite = require('./sprite');

var SpriteData = require('./data/sprites');

var BaseRenderer = require('./base-renderer');

var CharacterRenderer = module.exports = function (spriteId, character) {
  this.character = character;
  var spriteData = SpriteData[spriteId];
  console.assert(!!spriteData, "spriteId doesn't exist: " + spriteId);
  this.sprite = new Sprite(spriteData).setFrame(Object.keys(spriteData.frames)[0]);
};

CharacterRenderer.prototype = new BaseRenderer();

CharacterRenderer.prototype.onInit = function (params) {
  this.sprite.scaleTo(params.dims).place(params.html.characters);
  this.bindEvents();
  this.moveTo(this.character.coords);
};

CharacterRenderer.prototype.moveTo = function (coords) {
  var pixelPosition = this.view.getPixelsFromCoords(coords, {
    cellAnchor: 'middle'
  });
  this.sprite.moveTo(pixelPosition);
};

CharacterRenderer.prototype.bindEvents = function () {
  var self = this;
  this.character.on('refresh', 'topdownRefresh', function (data) {
    self.refresh(data);
  });
};

CharacterRenderer.prototype.refresh = function () {
  this.render(); // ???
};

CharacterRenderer.prototype.render = function () {
  this.moveTo(this.character.coords);
};

},{"./base-renderer":41,"./data/sprites":45,"./sprite":50}],43:[function(require,module,exports){
"use strict";

var AssetData = require('../asset-data');

var Cell = module.exports = {}; // Settings

var cellClass = 'cell';
var cellIdDelimiter = '_';
var cellIdPrefix = cellClass + cellIdDelimiter;

var Cell = module.exports = function (cellObject, renderer, options) {
  this.renderer = renderer;
  this.object = cellObject;
  this.options = options || {};
  this.create();
  this.refresh();
};

Cell.prototype = {};

Cell.prototype.create = function () {
  this.element = document.createElement('div');
  this.element.setAttribute('class', cellClass);
  this.element.cell = this;
};

Cell.prototype.refresh = function () {
  // styling
  var assetData = AssetData[this.object.species.id];
  this.element.style.width = this.renderer.dims.x + 'px';
  this.element.style.height = this.renderer.dims.y + 'px';
  this.element.style.lineHeight = this.renderer.dims.y + 'px';
  this.element.style.backgroundColor = assetData.color;
  this.element.style.color = assetData.color2 || "";
  if (this.object.species.id == 'magic') this.element.style.animation = "magic-colors 10s linear ".concat(Math.random() * 10, "s infinite");else this.element.style.animation = '';
  this.element.innerHTML = assetData.symbol; // highlight ruts

  var rut_color = '#1f1816';

  if (Object.keys(this.object.ruts).length > 0) {
    this.element.style.border = "1px solid ".concat(rut_color);
    this.element.style.width = this.renderer.dims.x - 2 + 'px';
    this.element.style.height = this.renderer.dims.y - 2 + 'px';
    var rut_string = '';

    for (var r in this.object.getActiveRuts()) {
      var rutAssetData = AssetData[r];

      if (rutAssetData && rutAssetData.symbol) {
        rut_string += rutAssetData.symbol;
      } else {
        rut_string += r[0].toUpperCase();
      }
    }

    this.element.innerHTML = rut_string;
    this.element.style.color = rut_color;
  } // items


  if (this.object.items.length > 0) {
    // TODO: rendering multiple items?
    var url = "./images/items/" + this.object.items[0].type_id + '.png';
    var img = document.createElement('img');
    img.setAttribute('src', url);
    this.element.appendChild(img);
  } else if (this.element.children.length > 0) {
    for (var i = 0; i < this.element.children.length; i++) {
      this.element.children[i].remove();
    }
  } // positioning


  this.element.setAttribute('id', Cell.coordsToId(this.object.coords));

  if (!this.options.noPositioning) {
    var position = this.renderer.view.getPixelsFromCoords(this.object.coords);
    this.element.style.left = position.x + 'px';
    this.element.style.top = position.y + 'px';
  } else {
    // ugh
    this.element.style.position = 'initial';
    this.element.style.margin = '1rem auto';
  }
};

Cell.coordsToId = function (coords) {
  return cellIdPrefix + coords.x + cellIdDelimiter + coords.y;
};

Cell.idToCoords = function (id) {
  var coordArray = id.slice(cellIdPrefix.length).split(cellIdDelimiter);
  return {
    x: coordArray[0],
    y: coordArray[1]
  };
};

},{"../asset-data":40}],44:[function(require,module,exports){
"use strict";

var Controls = module.exports = {};
var game;

Controls.init = function (gameInstance, params) {
  game = gameInstance;
  this.html = params.html;
  this.bindEvents();
};

Controls.bindEvents = function () {
  this.html.mouseOverlay.onclick = function (evt) {
    evt.stopPropagation();
    var offset = game.view.getPixelOffset();
    var mousePos = {
      x: evt.clientX - offset.x - game.view.bbox.left,
      y: evt.clientY - offset.y - game.view.bbox.top
    };
    var coords = game.view.getCoordsFromPixels(mousePos);
    game.state.advance({
      inspector: true,
      coords: coords,
      visible: game.player.isCoordsVisible(coords)
    });
  };

  document.body.onclick = function () {
    game.state.advance({});
  };

  this.bindInventory();
  this.bindKeyboard();
};

Controls.bindKeyboard = function () {
  var keyboardCallbacks = {
    37: Controls.handlers.left,
    39: Controls.handlers.right,
    38: Controls.handlers.up,
    40: Controls.handlers.down,
    27: Controls.handlers.escape
  };
  window.addEventListener('keydown', function (event) {
    var keycode = event.fake || window.event ? event.keyCode : event.which;
    if (keycode in keyboardCallbacks) keyboardCallbacks[keycode]();
  });
};

Controls.bindInventory = function () {
  var self = this;
  var slots = Array.apply(Array, this.html.inventory.getElementsByClassName('slot'));
  slots.forEach(function (slotHtml) {
    slotHtml.onclick = function (evt) {
      evt.stopPropagation();
      self.handlers.inventory(slotHtml.dataset.itemId);
    };
  });
};

Controls.handlers = {}; // INVENTORY

Controls.handlers.inventory = function (itemId) {
  game.state.advance({
    item: itemId
  });
}; // MOVEMENT


Controls.handlers.left = function () {
  game.player.move(Utils.dirs['w']);
  game.refreshView();
}, Controls.handlers.right = function () {
  game.player.move(Utils.dirs['e']);
  game.refreshView();
}, Controls.handlers.up = function () {
  game.player.move(Utils.dirs['n']);
  game.refreshView();
}, Controls.handlers.down = function () {
  game.player.move(Utils.dirs['s']);
  game.refreshView();
}; // MISC

Controls.handlers.escape = function () {
  game.state.advance({
    escape: true
  });
};

},{}],45:[function(require,module,exports){
"use strict";

var SpriteData = module.exports = {};
SpriteData.player = {
  name: 'player',
  url: 'images/player.png',
  frame_size: {
    x: 80,
    y: 180
  },
  frame_origin: {
    x: 40,
    y: 90
  },
  frames: {
    'n': {
      x: 0,
      y: 0
    },
    's': {
      x: 1,
      y: 0
    },
    'w': {
      x: 2,
      y: 0
    },
    'e': {
      x: 3,
      y: 0
    }
  }
};
SpriteData.wizard = {
  name: 'wizard',
  url: 'images/wizard.png',
  frame_size: {
    x: 80,
    y: 180
  },
  frame_origin: {
    x: 40,
    y: 90
  },
  frames: {
    'n': {
      x: 0,
      y: 0
    },
    's': {
      x: 1,
      y: 0
    },
    'w': {
      x: 2,
      y: 0
    },
    'e': {
      x: 3,
      y: 0
    }
  }
};

},{}],46:[function(require,module,exports){
"use strict";

var BaseRenderer = require('./base-renderer');

var FogRenderer = module.exports = function (game) {
  this.game = game;
};

FogRenderer.prototype = new BaseRenderer();

FogRenderer.prototype.onInit = function (params) {
  this.html = params.html.fog;
  this.ctx = this.html.getContext('2d');
  this.render();
  this.bindEvents();
};

FogRenderer.prototype.bindEvents = function () {
  var _this = this;

  this.game.player.on('refresh', 'visibilityUpdate', function () {
    _this.render();
  });
};

FogRenderer.prototype.refresh = function () {
  this.render(); // ???
};

FogRenderer.prototype.render = function () {
  var _this2 = this;

  var size = XY(game.size.x * game.cellDims.x, game.size.y * game.cellDims.y);
  this.ctx.clearRect(0, 0, size.x, size.y);
  var visBoxes = this.getVisibilityBoxes(); // If all cells are visible, don't bother with the extra operations.

  var completeVisibilities = visBoxes.filter(function (visibilityBbox) {
    return visibilityBbox.x1 === 0 && visibilityBbox.y1 === 0 && visibilityBbox.x2 === game.size.x && visibilityBbox.y2 === game.size.y;
  });
  if (completeVisibilities.length > 0) return;
  this.ctx.globalCompositeOperation = 'source-over';
  this.ctx.filter = 'none';
  this.ctx.fillStyle = "#0C1416";
  this.ctx.fillRect(0, 0, size.x, size.y);
  visBoxes.forEach(function (visibilityBbox) {
    _this2.ctx.globalCompositeOperation = 'destination-out';
    _this2.ctx.filter = 'blur(' + 10 * game.view.zoom + 'px)'; // note: this isn't compatible w/ all browsers

    _this2.ctx.fillRect(visibilityBbox.x1 * game.cellDims.x, visibilityBbox.y1 * game.cellDims.y, (visibilityBbox.x2 - visibilityBbox.x1) * game.cellDims.x, (visibilityBbox.y2 - visibilityBbox.y1) * game.cellDims.y);
  });
};

FogRenderer.prototype.getVisibilityBoxes = function () {
  var visBoxes = []; // TODO: this called every time the player moves. Would be nice to know
  // whether we need to refresh the camera visibility boxes or not.
  // Player visibility

  visBoxes.push(game.player.getVisibility()); // Areas of visibility around cameras

  if (game.map.items.camera) {
    for (var item_id in this.game.map.items.camera) {
      var coords = this.game.map.items.camera[item_id];
      var item = this.game.map.getCell(coords).getItem(item_id);
      visBoxes.push(item.getVisibility());
    }
  }

  return visBoxes;
};

},{"./base-renderer":41}],47:[function(require,module,exports){
"use strict";

// OLD PROTOTYPE CODE
// WARNING: SUPER MESSY
var Utils = window.Utils;
var Settings = window.Settings;
window.UI = require('./ui');

var Controls = require('./controls');

var TopDownView = require('./top-down-view');

var MapRenderer = require('./map-renderer');

var FogRenderer = require('./fog-renderer');

var CharacterRenderer = require('./character-renderer');

var InspectorRenderer = require('./inspector-renderer');

var game = window.game;
var Context = null;
var ToolChest, Wizard, Player; // these will get instantiated in setContext()

var topdown = module.exports = {};

topdown.load = function (globalContext) {
  setContext(globalContext);
  configGame(window.game);
  init();
};

function setContext(newContext) {
  Context = newContext;
  ToolChest = Context.Items;
  Wizard = Context.Wizard;
  Player = Context.Player;
  var game = window.game;
  game.state = Context.GamePlayModes; // NOT THE SAME AS IT WAS BEFORE

  game.map = Context.Map; //game.size = Settings.gameSize; 

  game.size = Settings.mapSize;
  game.cellDims = Settings.cellDims;
  window.TC = ToolChest;
}

var init = UI.infoWrap('loading...', function () {
  var game = window.game; // Map

  game.map.init({
    size: game.size
  });
  game.map.generate(); // Characters

  game.wizard = Wizard(game.map);
  game.player = Player(game.map); // Views

  game.viewParams = {
    window: 10,
    size: game.size,
    dims: game.cellDims,
    margin: 2,
    html: {
      container: document.getElementById('board-layers'),
      board: document.getElementById('game'),
      characters: document.getElementById('game-characters'),
      items: document.getElementById('game-items'),
      inventory: document.getElementById('game-inventory'),
      mouseOverlay: document.getElementById('mouse-overlay'),
      fog: document.getElementById('fog')
    }
  };
  game.views = {}; // Main map view

  game.view = new TopDownView(game.viewParams);
  game.views.main = game.view;
  game.view.addRenderer(new MapRenderer(game.map));
  game.view.addRenderer(new FogRenderer(game));
  game.view.addRenderer(new CharacterRenderer('wizard', game.wizard));
  game.view.addRenderer(new CharacterRenderer('player', game.player));
  game.view.init();
  game.views.cellInspector = new TopDownView({
    dims: XY(game.cellDims.x * 2, game.cellDims.y * 2),
    size: XY(1, 1),
    html: {
      container: document.getElementById('inspector'),
      cell: document.getElementById('inspector-cell'),
      text: document.getElementById('inspector-text')
    }
  });
  game.views.cellInspector.addRenderer(new InspectorRenderer());
  game.views.cellInspector.hidden(true);
  game.views.cellInspector.init();
  game.state.init(game);
  Controls.init(game, game.viewParams);
  game.view.render(); // Todo: find better home for this

  game.player.on('inspect-cell', 'inspect-cell', function (data) {
    game.views.cellInspector.loadCell(game.map.getCell(data.coords));
    var currentlyHidden = game.views.cellInspector.hidden();
    game.views.cellInspector.hidden(!currentlyHidden);
  });
  game.player.on('inspect-species', 'inspect-species', function (data) {
    game.views.cellInspector.loadSpecies(data.species_id);
    game.views.cellInspector.hidden(false);
  });
  game.map.startIteration();
});

function configGame(game) {
  game.refreshView2 = function () {
    if (!game.view.isInView(game.player.coords)) {
      game.view.recenter(game.player.coords);
      game.player.refresh();
      game.wizard.refresh();
    }
  };

  game.refreshView = function () {
    var margin = Settings.margin;
    var d = game.view.getDistanceFromWindowEdge(game.player.coords);

    if (d.north < margin || d.south < margin || d.west < margin || d.east < margin) {
      if (d.north < margin) game.view.shiftView({
        x: 0,
        y: -1
      });
      if (d.south < margin) game.view.shiftView({
        x: 0,
        y: 1
      });
      if (d.west < margin) game.view.shiftView({
        x: -1,
        y: 0
      });
      if (d.east < margin) game.view.shiftView({
        x: 1,
        y: 0
      });
      game.player.refresh();
      game.wizard.refresh();
    }
  };

  game.recenter = function () {
    if (!game.view.isInView(game.player.coords)) {
      game.view.recenter(game.player.coords);
    }
  };
}

},{"./character-renderer":42,"./controls":44,"./fog-renderer":46,"./inspector-renderer":48,"./map-renderer":49,"./top-down-view":51,"./ui":52}],48:[function(require,module,exports){
"use strict";

var BaseRenderer = require('./base-renderer');

var Cell = require('./components/cell');

var doT = require('dot');



var Catalogue = require('../../map/catalogue');

var CellObject = require('../../map/cell');

var speciesTemplate = doT.compile("<h2>{{=it.species.description.plural.capitalize()}}</h2>\n\n<div>{{=it.species.description.singular.capitalize()}} {{=it.species.rules.default.description}}.</div>\n\n<hr>\n\n{{~ it.species.rules.lifespan :rule}}\n    <div>\n        After age {{=rule.min_age}}, it {{=rule.rules.description}}.\n    </div>\n{{~}}\n\n<hr>\n\n{{~ it.species.rules.conditional :rule}}\n    <div>\n        It {{=rule.rules.description}} when {{=it.catalogue.species[rule.species_id].description.singular}} is nearby.\n    </div>\n{{~}}\n\n<hr>\n\n{{~ it.species.rules.ruts :rut}}\n    <div>\n        When {{=it.catalogue.ruts[rut.rut_id].description}}, it {{=rut.rules.description}}.\n    </div>\n{{~}}\n\n<div class=\"back\" onclick=\"game.state.advance({navigate: 'back'})\">BACK</div>");
var cellTemplate = doT.compile("<h2>Coordinates: ({{=it.cell.coords.x}}, {{=it.cell.coords.y}})</h2>\n\n{{~ it.ruts :rut_id}}\n    <div style=\"font-size: smaller\">{{=it.catalogue.ruts[rut_id].description.capitalize()}}.</div>\n{{~}}\n\n{{~ it.register :reg}}\n    <div class=\"species-row\" onclick=\"game.state.advance({inspector: true, species_id: '{{=reg.species.id}}'});\">\n        <!-- <p></p> -->\n        <h4>{{=it.catalogue.species[reg.species.id].description.plural.toUpperCase() + (reg.is_dominant ? \" (Dominant)\" : \"\")}}</h4>\n        <p>strength: {{=reg.strength}}</p>\n        <p>age: {{=reg.age}}</p>\n    </div>\n{{~}}");

var InspectorRenderer = module.exports = function () {};

InspectorRenderer.prototype = new BaseRenderer();

InspectorRenderer.prototype.onInit = function (params) {
  var _this = this;

  this.html = params.html; // ugh, bad code

  this.view.loadCell = function (cell) {
    if (!cell) return;

    _this.view.recenter(cell.coords);

    var cellHtml = new Cell(cell, _this, {
      noPositioning: true
    });

    if (_this.html.cell.firstChild) {
      _this.html.cell.removeChild(_this.html.cell.firstChild);
    }

    _this.html.cell.appendChild(cellHtml.element);

    _this.html.text.innerHTML = cellTemplate({
      cell: cell,
      register: cell.getRegister(),
      ruts: cell.getRuts(),
      catalogue: Catalogue
    });
  };

  this.view.loadSpecies = function (species_id) {
    var species = Catalogue.species[species_id]; // Create a fake cell object to show the species

    var cell = new CellObject('', XY(0, 0));
    cell.add(species);
    var cellHtml = new Cell(cell, _this, {
      noPositioning: true
    }); // this could be more concise

    if (_this.html.cell.firstChild) {
      _this.html.cell.removeChild(_this.html.cell.firstChild);
    }

    _this.html.cell.appendChild(cellHtml.element);

    _this.html.text.innerHTML = speciesTemplate({
      species: species,
      catalogue: Catalogue
    });
  }; // more bad code


  this.view.getPixelsFromCoords = function () {
    return XY(0, 0);
  };
};

InspectorRenderer.prototype.refresh = function () {};

InspectorRenderer.prototype.render = function () {};

},{"../../map/catalogue":14,"../../map/cell":15,"./base-renderer":41,"./components/cell":43,"dot":27}],49:[function(require,module,exports){
"use strict";

var AssetData = require('./asset-data');

var BaseRenderer = require('./base-renderer');

var Cell = require('./components/cell');

var MapRenderer = module.exports = function (map) {
  this.map = map;
};

MapRenderer.prototype = new BaseRenderer();

MapRenderer.prototype.onInit = function (params) {
  this.window = params.window;
  this.html = params.html.board;
  this.view.recenter(this.map.center);
};

MapRenderer.prototype.bindCellEvents = function (cellObject) {
  var self = this;
  cellObject.on('change', 'cell-change', function (data) {
    self.refreshCell(cellObject.coords);
  });
  cellObject.on('add-item', 'cell-add-item', function (data) {
    self.refreshCell(cellObject.coords);
  });
};

MapRenderer.prototype.getCell = function (coords) {
  return document.getElementById(Cell.coordsToId(coords));
};

MapRenderer.prototype.render = function (env) {
  var _this = this;

  this.html.innerHTML = '';
  env = env || this.map.env;
  env.range().forEach(function (coords) {
    var cellObject = env.get(coords);

    _this.bindCellEvents(cellObject);

    var cell = new Cell(cellObject, _this);

    _this.html.appendChild(cell.element);
  });
}; // Todo: what is the difference between refresh and render ???


MapRenderer.prototype.refresh = function (env, fullRefresh) {
  console.log('refreshing');
  var self = this;
  env = env || this.map.env;
  var coordsToRefresh = env.range(); // TODO: this is super buggy with cells that used to be in view but aren't anymore
  //if (!fullRefresh) coordsToRefresh = coordsToRefresh.filter(function(crd) { return self.view.isInView(crd); });

  coordsToRefresh.forEach(function (coords) {
    self.refreshCoords(env, coords);
  });
  return this;
};

MapRenderer.prototype.refreshCoords = function (env, coords) {
  env = env || this.map.env;
  var cellElement = document.getElementById(Cell.coordsToId(coords));
  cellElement.cell.refresh();
  return this;
};

MapRenderer.prototype.refreshCell = function (coords, forceRefresh) {
  if (!forceRefresh && !this.view.isInView(coords)) return this;
  this.refreshCoords(this.map.env, coords);
};

MapRenderer.prototype.isInWindow = function (coords) {
  var distance = Math.max(Math.abs(coords.x - this.map.center.x), Math.abs(coords.y - this.map.center.y));
  console.log('is in window?', coords, distance < this.window, distance, this.window);
  return distance < this.window;
};

},{"./asset-data":40,"./base-renderer":41,"./components/cell":43}],50:[function(require,module,exports){
"use strict";

// warning, messy code
var Sprite = module.exports = function (data) {
  this.data = data;
  this.scale = 1; // determine total image size

  this.size = {
    x: 0,
    y: 0
  };

  for (var frame in this.data.frames) {
    var f = this.data.frames[frame];
    this.size.x = Math.max(this.size.x, f.x);
    this.size.y = Math.max(this.size.y, f.y);
  }

  this.size.x += 1;
  this.size.y += 1;
  this.size.x *= this.data.frame_size.x;
  this.size.y *= this.data.frame_size.y; // position of sprite in the game

  this.position = {
    x: 0,
    y: 0
  };
  this.init();
};

Sprite.prototype = {};

Sprite.prototype.init = function () {
  this.html = document.createElement('div');
  this.html.setAttribute('id', 'sprite-' + this.data.name);
  this.html.setAttribute('class', 'sprite');
  this.html.style.backgroundImage = 'url("' + this.data.url + '")';
  this.frame = Object.keys(this.data.frames)[0];
  this.refresh();
  return this;
};

Sprite.prototype.refresh = function () {
  this.refreshScale();
  this.refreshFrame();
  this.refreshPosition();
  return this;
};

Sprite.prototype.refreshScale = function () {
  // size of the background, including all frames
  var bgSize = {
    x: this.size.x * this.scale,
    y: this.size.y * this.scale // size of the sprite's html element (width, height)

  };
  var spriteSize = {
    x: this.data.frame_size.x * this.scale,
    y: this.data.frame_size.y * this.scale // set html

  };
  this.html.style.backgroundSize = bgSize.x + 'px ' + bgSize.y + 'px';
  this.html.style.width = spriteSize.x + 'px';
  this.html.style.height = spriteSize.y + 'px';
  return this;
};

Sprite.prototype.refreshFrame = function () {
  // position of the background (to get the proper frame)
  var bgPos = {
    x: -this.data.frame_size.x * this.data.frames[this.frame].x * this.scale,
    y: -this.data.frame_size.y * this.data.frames[this.frame].y * this.scale
  };
  this.html.style.backgroundPosition = bgPos.x + 'px ' + bgPos.y + 'px';
  return this;
};

Sprite.prototype.refreshPosition = function () {
  // adjust the sprite until its origin is lined up with its position
  var posOffset = {
    x: -this.data.frame_origin.x * this.scale,
    y: -this.data.frame_origin.y * this.scale
  };
  this.html.style.left = posOffset.x + this.position.x + 'px';
  this.html.style.top = posOffset.y + this.position.y + 'px';
  return this;
};

Sprite.prototype.setFrame = function (frame) {
  console.assert(frame in this.data.frames, 'Sprite sheet does not contain frame "' + frame + '"');
  if (this.frame === frame) return this; // no need to redo stuff

  this.frame = frame;
  this.refreshFrame();
  return this;
};

Sprite.prototype.scaleBy = function (factor) {
  this.scale *= factor;
  this.refreshScale();
  return this;
};

Sprite.prototype.scaleTo = function (size) {
  // scales by size.y, since scale is scalar
  this.scale = size.y / this.data.frame_size.y;
  this.refreshScale();
  return this;
};

Sprite.prototype.place = function (container) {
  container.appendChild(this.html);
  return this;
};

Sprite.prototype.move = function (change) {
  this.position.x += change.x;
  this.position.y += change.y;
  this.refreshPosition();
  return this;
};

Sprite.prototype.moveTo = function (position) {
  this.position.x = position.x;
  this.position.y = position.y;
  this.refreshPosition();
  return this;
};

},{}],51:[function(require,module,exports){
"use strict";

var TopDownView = module.exports = function (params) {
  var _this = this;

  if (!params.html.container) throw new Error('there should be a container for a view');
  this.params = params;
  this.renderers = [];
  this.html = params.html;
  this.size = params.size;
  this.dims = params.dims || {
    x: 1,
    y: 1
  };
  this.centerCoords = {
    x: 0,
    y: 0
  };
  this.zoom = 1;
  this.worldLayers = Object.keys(this.html).map(function (key) {
    return _this.html[key];
  }).filter(function (html) {
    return html.dataset.worldRelative == 'true';
  });
  this.refresh();
};

TopDownView.prototype = {};

TopDownView.prototype.addRenderer = function (renderer) {
  this.renderers.push(renderer);
};

TopDownView.prototype.init = function () {
  var _this2 = this;

  window.addEventListener("resize", function () {
    _this2.onScreenResize();
  }, false);
  this.renderers.forEach(function (renderer) {
    renderer.init(_this2, _this2.params);
  });
};

TopDownView.prototype.hidden = function (newHiddenState) {
  if (typeof newHiddenState == 'undefined') {
    return this.html.container.style.display == 'none';
  } else {
    this.html.container.style.display = newHiddenState ? 'none' : '';
  }
};

TopDownView.prototype.resizeLayers = function () {
  var w = this.size.x * this.dims.x + 'px';
  var h = this.size.y * this.dims.y + 'px';
  this.worldLayers.forEach(function (html) {
    html.style.width = w;
    html.style.height = h; // The canvas will clear itself when resized, so only do this when necessary

    if (html.tagName.toLowerCase() == 'canvas' && (w !== html.getAttribute('width') || h !== html.getAttribute('height'))) {
      html.setAttribute('width', w);
      html.setAttribute('height', h);
    }
  }); // todo: the static layers should resize to this.viewSize
};

TopDownView.prototype.refresh = function () {
  this.bbox = this.html.container.getBoundingClientRect();
  this.centerPx = {
    x: this.bbox.width / 2,
    y: this.bbox.height / 2 // in coords

  };
  this.viewSize = {
    x: this.bbox.width / this.dims.x,
    y: this.bbox.height / this.dims.y
  };
  this.zoomFactor = 2;
  this.resizeLayers();
};

TopDownView.prototype.render = function () {
  this.renderers.forEach(function (renderer) {
    renderer.render();
  });
};

TopDownView.prototype.rerender = function () {
  this.refresh();
  this.renderers.forEach(function (renderer) {
    renderer.refresh();
  });
}; // more ugh. Pixels should be relative to the top left corner of the map itself, not the html element


TopDownView.prototype.getCoordsFromPixels = function (pixels, options) {
  options = options || {};

  if (options.absolute) {
    return {
      x: Math.floor((pixels.x - this.centerPx.x) / this.dims.x),
      y: Math.floor((pixels.y - this.centerPx.y) / this.dims.y)
    };
  } else {
    return {
      x: Math.floor(pixels.x / this.dims.x),
      y: Math.floor(pixels.y / this.dims.y)
    };
  }
};

TopDownView.prototype.getPixelsFromCoords = function (coords, options) {
  options = options || {};
  var pixels;

  if (options.absolute) {
    pixels = {
      x: this.centerPx.x + (-this.centerCoords.x + coords.x) * this.dims.x,
      y: this.centerPx.y + (-this.centerCoords.y + coords.y) * this.dims.y
    };
  } else {
    pixels = {
      x: coords.x * this.dims.x,
      y: coords.y * this.dims.y
    };
  }

  switch (options.cellAnchor) {
    case 'middle':
      pixels.x += this.dims.x / 2;
      pixels.y += this.dims.y / 2;
      break;

    default:
      break;
  }

  return pixels;
};

TopDownView.prototype.positionHtml = function (html, coords, options) {
  var pixels = {
    x: this.centerPx.x - this.centerCoords.x * this.dims.x,
    y: this.centerPx.y - this.centerCoords.y * this.dims.y
  };
  html.style.left = pixels.x + 'px';
  html.style.top = pixels.y + 'px';
};

TopDownView.prototype.recenter = function (coords) {
  var _this3 = this;

  var self = this;
  this.centerCoords.x = coords.x;
  this.centerCoords.y = coords.y;
  this.refresh();
  this.worldLayers.forEach(function (html) {
    _this3.positionHtml(html);
  });
  this.renderers.forEach(function (renderer) {
    renderer.onRecenter(coords);
  });
  return this;
};

TopDownView.prototype.shiftView = function (dCoords) {
  this.recenter({
    x: this.centerCoords.x + dCoords.x,
    y: this.centerCoords.y + dCoords.y
  });
  return this;
}; // what is this point of this function??


TopDownView.prototype.rescale = function () {
  throw new Error('what is the point of this function'); // argh

  this.viewSize = {
    x: this.bbox.width / this.dims.x,
    y: this.bbox.height / this.dims.y
  };
  return this;
}; // Returns the number of pixels between the html's NW corner and the map's NW corner (at 0,0) 


TopDownView.prototype.getPixelOffset = function () {
  return {
    x: this.centerPx.x + -this.centerCoords.x * this.dims.x,
    y: this.centerPx.y + -this.centerCoords.y * this.dims.y
  };
}; // Returns cell coords, not pixels


TopDownView.prototype.getViewBbox = function () {
  return {
    x1: this.centerCoords.x - this.viewSize.x / 2,
    x2: this.centerCoords.x + this.viewSize.x / 2,
    y1: this.centerCoords.y - this.viewSize.y / 2,
    y2: this.centerCoords.y + this.viewSize.y / 2
  };
}; // Returns whether a cell coords is in view or not


TopDownView.prototype.isInView = function (coords) {
  var bbox = this.getViewBbox();
  return coords.x > bbox.x1 && coords.x < bbox.x2 && coords.y > bbox.y1 && coords.y < bbox.y2;
};

TopDownView.prototype.zoomOut = function () {
  this.zoom /= this.zoomFactor;
  this.dims.x /= this.zoomFactor;
  this.dims.y /= this.zoomFactor;
  this.params.window *= this.zoomFactor;
  this.recenter(this.centerCoords);
  this.renderers.forEach(function (renderer) {
    renderer.refresh();
  });
  return this;
};

TopDownView.prototype.zoomIn = function () {
  this.zoom *= this.zoomFactor;
  this.dims.x *= this.zoomFactor;
  this.dims.y *= this.zoomFactor;
  this.params.window /= this.zoomFactor;
  this.recenter(this.centerCoords);
  this.renderers.forEach(function (renderer) {
    renderer.refresh();
  });
  return this;
};

TopDownView.prototype.getWindowEdges = function () {
  return {
    north: this.centerCoords.y - this.viewSize.y / 2,
    west: this.centerCoords.x - this.viewSize.x / 2,
    south: this.centerCoords.y + this.viewSize.y / 2,
    east: this.centerCoords.x + this.viewSize.x / 2
  };
};

TopDownView.prototype.getDistanceFromWindowEdge = function (coords) {
  var distances = this.getWindowEdges();
  distances.east = distances.east - coords.x;
  distances.west = -distances.west + coords.x;
  distances.south = distances.south - coords.y;
  distances.north = -distances.north + coords.y;
  return distances;
};

var resizeTimeout;

TopDownView.prototype.onScreenResize = function () {
  var _this4 = this;

  if (!resizeTimeout) {
    resizeTimeout = setTimeout(function () {
      resizeTimeout = null;

      _this4.refresh();

      _this4.recenter(_this4.centerCoords);
    }, 60);
  }
};

},{}],52:[function(require,module,exports){
"use strict";

// UI/HUD
var UI = module.exports = {};
UI.infoTimeout = null; // Display info text for the specified lifetime
// If lifetime isn't specified, then the text will stay up forever (until something else is shown)

UI.info = function (text, lifetime) {
  document.getElementById('info').textContent = text;
  clearTimeout(UI.infoTimeout);

  if (typeof lifetime === 'number') {
    UI.infoTimeout = setTimeout(function () {
      UI.info('', false);
    }, lifetime);
  }
}; // Display info text only while the given function is executing


UI.infoWrap = function (text, fn) {
  return function () {
    UI.info(text);
    setTimeout(function () {
      fn();
      UI.info('');
    }, 0);
  };
}; // TODO: should these live elsewhere?
// Note: using game.recenter() after zooming is a little redundant/less efficient,
// but the simplest for now


UI.zoomOut = UI.infoWrap('zooming...', function () {
  game.view.zoomOut();
  game.recenter();
});
UI.zoomIn = UI.infoWrap('zooming...', function () {
  game.view.zoomIn();
  game.recenter();
});
UI.fogOff = UI.infoWrap('unfogging...', function () {
  game.player.visibility = -1;
  game.view.rerender();
});
UI.fogOn = UI.infoWrap('fogging...', function () {
  game.player.visibility = Settings.visibilityPlayer;
  game.view.rerender();
});

},{}],53:[function(require,module,exports){
"use strict";

var Utils = window.Utils;

var Character = require('./character');

var Walking = require('./character/walking');

var Wizard = module.exports = function (map) {
  var wizard = new Character({
    map: map,
    id: 'wizard',
    speciesResponses: {
      'neutralized': function neutralized() {
        wizard.ouch();
      }
    },
    trailingRuts: {//            'magic': 1
    }
  });
  Events.init(wizard); // make sure wizard is beyond a certain point
  //var startingCoords = {x: -1, y: -1};
  //while (startingCoords.x < Settings.wizardMin.x && startingCoords.y < Settings.wizardMin.y) {
  //    startingCoords = game.map.env.randomCoords();
  //}

  var startingCoords = Settings.wizardStart; // ugh, TODO clean this up

  wizard.moveTo(startingCoords);
  window.wizard = wizard; // start magic where the wizard is
  //map.diamondClump(wizard.coords, map.species.magic)
  // have the wizard amble randomly

  wizard.getSomewhatRandomDir = function () {
    // 33% chance to walk in the same direction as last step
    if (!!this.lastStep && Math.random() < 1 / 3) {
      return this.lastStep;
    }

    return Utils.dirs[Utils.randomChoice(Utils.dirs)];
  };

  wizard.walk = new Walking(wizard, function getNextDir() {
    return wizard.getSomewhatRandomDir();
  }, function onStep(dir) {
    //wizard.faceDirection(dir);
    // Note for the Phaser view: this movement happens before the animation, so it looks a bit
    // janky. The magic appears on the next tile before the wizard appears to arrive on the tile.
    // Maybe the phaser view could send a 'finished moving' signal back?
    // But it's hard to keep different views decoupled, in that case.
    wizard.emit('moveDiscrete', {});
    wizard.map.env.set(wizard.coords, wizard.map.species.magic);
    wizard.map.getCell(wizard.coords).refreshTimeout(); // make sure the wizard trails magic

    wizard.lastStep = dir;
  });
  wizard.walk.start();
  return wizard;
};

},{"./character":1,"./character/walking":3}]},{},[4]);
