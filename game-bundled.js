(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// This is the procedure which executes the advancing of the environment species
// from one iteration to the next.
//
// Takes an environment and advances it to its next iteration.


module.exports = Advancerator = function(env) {
    var range = env.range();

    // compute the next iteration 
    range.forEach(function(coords) {
        var cell = env.get(coords);
        var neighbors = env.neighbors(coords);
        cell.next(neighbors);
    })
    
    // now set them all
    range.forEach(function(coords) {
        env.get(coords).flush();
    })
}

},{}],2:[function(require,module,exports){
// A cell (location on the grid) can have multiple species living in it.
// But one of them is dominant (which will be displayed)
//
// ^ that might change :)
// like if, instead of having a dominant species, we had a function to take
// all the species and compute which one is dominant

var SpeciesBattle = require('./species-battle')

module.exports = Cell = function(blank) {
    this.species = null;
    this.allSpecies = {}; // indexed by id
    this.set(blank || '');

    // the 'next' slot is just a holding pattern until the current iteration is finalized
    // use cell.next(species), then cell.flush() to set it
    this.nextSpecies = null;
};

Cell.prototype = {};

// sets the dominant species
Cell.prototype.set = function(species) {
    this.species = species;
    this.add(species); // just in case it's not already set
    return this;
}

// decide which species to be next
// ** each registered species does its own computation
Cell.prototype.next = function(neighbors) {
    var nextStates = {};
    for (var id in this.allSpecies) {
        nextStates[id] = this.allSpecies[id].nextState(this, neighbors);
    }

    // Which species are contenders for dominance in this cell?
    var contenders = Object.keys(nextStates).filter(function(id) { return nextStates[id] === 1; }) 
    //console.log('  ' + Object.keys(nextStates).join(','))
    //console.log('  ' + Object.keys(nextStates).map(function(id) { return id + '_' + nextStates[id]; }).join(','))

    // THE SPECIES BATTLE IT OUT...
    this.nextSpecies = this.allSpecies[SpeciesBattle.decide(contenders)];
}

Cell.prototype.flush = function() {
    this.set(this.nextSpecies);
}

Cell.prototype.add = function(species) {
    if (!species) {
        // this happens when a species dies
        species = this.allSpecies.blank; // this SHOULD be one of the registered species
    }

    if (!(species.id in this.allSpecies)) {
        this.allSpecies[species.id] = species;
    }

    // make sure there's a dominant species
    if (Object.keys(this.allSpecies).length === 1 || !this.species) {
        this.species = species;
    }
    return this;
}



},{"./species-battle":8}],3:[function(require,module,exports){
// Example:
// env = new Env({x:30, y:30});

var Cell = require('./cell.js')
var Advancerator = require('./advancerator.js');

module.exports = Env = function(size, blank_cell) {
    this.size = size;
    this.init(blank_cell);
};

Env.prototype = {};

Env.prototype.init = function(blank_cell) {
    this.cells = [];
    for (var x = 0; x < this.size.x; x++) {
        this.cells.push([]);
        for (var y = 0; y < this.size.y; y++) {
            this.cells[x][y] = new Cell(blank_cell);
        }
    }

    return this;
}

Env.prototype.advance = function(numTimes) {
    if (typeof numTimes === 'undefined') numTimes = 1;

    for (var t = 0; t <= numTimes; t+=1){
        Advancerator(this);
    }

    return this;
}

Env.prototype.OOB = function(coords) {
    return coords.x < 0 || coords.y < 0 || coords.x >= this.size.x || coords.y >= this.size.y
}

Env.prototype.get = function(coords) {
    if (this.OOB(coords)) return null;
    return this.cells[coords.x][coords.y];
}

Env.prototype.set = function(coords, value) {
    var cell = this.get(coords);
    if (!cell) return false;
    return cell.set(value);
}

// Returns a list of all possible coordinates
Env.prototype.range = function() {
    var coords = [];
    for (var x=0; x < this.size.x; x++) {
        for (var y=0; y < this.size.y; y++) {
            coords.push({x:x, y:y});
        }
    }
    return coords;
}

Env.prototype.neighbors = function(coords) {
    var neighbors = [
        {x:-1, y:-1},
        {x:-1, y:0},
        {x:-1, y:1},
        {x:0, y:-1},
        {x:0, y:0},  // <-- yes, I know this isn't a neighbor, but
        {x:0, y:1},  //     it's nice and clean to include it 
        {x:1, y:-1},
        {x:1, y:0},
        {x:1, y:1}
    ]

    var self = this;

    return neighbors.map(function(crds) {
        // get absolute coordinates
        var coordsAbsolute = {x: crds.x + coords.x, y: crds.y + coords.y};

        // structure it in a coord-map array
        return {coords: crds, value: self.get(coordsAbsolute)};
    })
}

Env.prototype.randomCoords = function() {
    return {
        x: Math.floor(Math.random() * this.size.x),
        y: Math.floor(Math.random() * this.size.y)
    }
}

},{"./advancerator.js":1,"./cell.js":2}],4:[function(require,module,exports){
module.exports = GrowthRules = {
    magic: {
        stateMap: {
            0: [0, 0, 0, 1, 1, 1, 1, 1, 0],
            1: [0, 0, 1, 1, 0, 1, 1, 0, 0]
        },
        weights: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    },

   plants: {
        stateMap: {
            0: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
            1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        },
        weights: [
            [1, 2, 1],
            [2, 0, 2],
            [1, 2, 1]
        ]
    },

    plantsCatalyzed: {
        stateMap: {
            0: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        },
        weights: [
            [1, 2, 1],
            [2, 0, 2],
            [1, 2, 1]
        ]
    },
    plantsDying: {
        stateMap: {
            0: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            1: [0, 0, 0, 0, 0, 1, 1, 1, 1]
        },
        weights: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    },
    completeDeath: {
        stateMap: {
            0: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            1: [0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
    }
}

},{}],5:[function(require,module,exports){
var Env = require('./environment');
var Species= require('./species');
var GrowthRules = require('./growth-rules')
var Renderer = require('./renderer')

module.exports = Map = {};

// TODO: The game should be responsible for these species, not the map
var speciesData = [
    { id: 'blank',     symbol: '' },
    { id: 'character', symbol: '😃' },
    { id: 'alien',     symbol: '😵' },

    { id: 'magic',     symbol: '⚡',      color: 'purple',
        rules: {
            default: GrowthRules.magic
        }
    },

    { id: 'grass',     symbol: '∴',      color: 'lightgreen', 
        rules: {
            default: GrowthRules.plants,
            conditional: [
                {
                    species_id: 'magic',
                    rules: GrowthRules.plantsDying
                }
            ]
        }
    },

    { id: 'flowers',   symbol: '✨',     color: 'orange',
        rules: {
            default: GrowthRules.plants,
            conditional: [
                {
                    species_id: 'magic',
                    rules: GrowthRules.plantsDying
                }
            ]
        }
    },

    { id: 'trees',     symbol: '&psi;', color: 'green', passable: false,
        rules: {
            default: GrowthRules.plants,
            conditional: [
                // the presence of grass catalyzes tree growth
                // threshhold indicates the number of grass neighbors
                // that are needed in order to trigger this set of rules
                {
                    species_id: 'grass',
                    threshhold: 4, // number of neighbors to trigger this conditional
                    rules: GrowthRules.plantsCatalyzed
                },
                {
                    species_id: 'magic',
                    rules: GrowthRules.plantsDying
                }
            ]
        }
    },

]

Map.species = {};

speciesData.forEach(function(s) {
    Map.species[s.id] = new Species(s);
})


Map.init = function(size, dims, htmlElement) {
    this.size = size;
    this.dims = dims;

    this.center = {x: Math.floor(size.x/2), y: Math.floor(size.y/2)} // use Map.setCenter to change this

    this.renderer = new Renderer(htmlElement, this.dims, this.center);

    this.env = new Env(this.size, this.species.blank);

    this.generate();
    this.render();
}


Map.generate = function() {
    var self = this;

    // register involved species with all of the cells
    self.env.range().forEach(function(coords) {
        self.env.get(coords).add(self.species.magic)
        self.env.get(coords).add(self.species.grass);
        self.env.get(coords).add(self.species.trees);
    })


    //self.sow(self.species.magic, 1/20)

    self.sow(self.species.grass, 1/10);
    self.sow(self.species.flowers, 1/50)
    self.sow(self.species.trees, 1/30);

    self.env.advance(4);

    self.clump(self.env.randomCoords(), [
        {x:  0, y:  0},
        {x:  1, y:  1},
        {x: -1, y:  1},
        {x:  1, y: -1},
        {x: -1, y: -1},
        {x:  0, y: -1},
        {x:  0, y:  1},
        {x: -1, y:  0},
        {x:  1, y:  0},
    ], self.species.magic)

    self.env.advance(1);
}

// randomly set cells as the species
Map.sow = function(species, frequency) {
    var self = this;
    var numSeeds = self.size.x * self.size.y * frequency;

    // Pick some places to seed
    var seeds = [];
    for (var i = 0; i < numSeeds; i++) {
        seeds.push(self.env.randomCoords());
    }

    seeds.forEach(function(coords) { self.env.set(coords, species); })

    return this
}

// paste the clump at the designated center
Map.clump = function(center, coordClump, species) {
    var self = this;
    
    coordClump.forEach(function(coords) {
        var targetCoords = {x: coords.x + center.x, y: coords.y + center.y};
        self.env.set(targetCoords, species);
    })

    return this
}

Map.advance = function() {
    this.env.advance();
    return this;
}


// RENDERING
Map.render = function() { this.renderer.render(this.env); return this; }
Map.refresh = function() { this.renderer.refresh(this.env); return this; }

Map.zoomFactor = 2;

Map.zoomIn = function() {
    this.dims.x *= Map.zoomFactor;
    this.dims.y *= Map.zoomFactor;
    this.refresh();
    return this;
}

Map.zoomOut = function() {
    this.dims.x /= Map.zoomFactor;
    this.dims.y /= Map.zoomFactor;
    this.refresh();
    return this;
}

Map.recenter = function(x, y) {
    this.center.x = x;
    this.center.y = y;
    this.refresh();
    return this;
}


// clump all this stuff together in a renderer
Map.renderer = require('./renderer')

},{"./environment":3,"./growth-rules":4,"./renderer":6,"./species":10}],6:[function(require,module,exports){
module.exports = Renderer = function(html, dims, center) {
    // Direct references. So the parent should not overwrite them.
    this.html = html;
    this.dims = dims;
    this.centerCoords = center;
    this.centerPx = {
        x: html.getBoundingClientRect().width / 2,
        y: html.getBoundingClientRect().height / 2
    }
}


// Settings
cellClass = 'cell'
cellIdDelimiter = '_'
cellIdPrefix = cellClass + cellIdDelimiter;


// Methods

Renderer.prototype = {};

Renderer.prototype.coordsToId = function(coords) {
    return cellIdPrefix + coords.x + cellIdDelimiter + coords.y
}
Renderer.prototype.idToCoords = function(id) {
    var coordArray = id.slice(cellIdPrefix.length).split(cellIdDelimiter);
    return {x: coordArray[0], y: coordArray[1] }
}

Renderer.prototype.createCell = function(cellObject) {
    var cellElement = document.createElement('div');
    cellElement.setAttribute('class', cellClass);
    this.refreshCell(cellElement, cellObject);
    return cellElement;
}

Renderer.prototype.refreshCell = function(cellElement, cellObject) {
    cellElement.style.width = this.dims.x + 'px';
    cellElement.style.height = this.dims.y + 'px';
    cellElement.style.lineHeight = this.dims.y + 'px';
    cellElement.style.backgroundColor = cellObject.species.getColor();
    cellElement.innerHTML = cellObject.species.getSymbol();
}

Renderer.prototype.positionCell = function(cellElement, coords) {
    cellElement.setAttribute('id',  this.coordsToId(coords));

    var position = {
        x: this.centerPx.x + (-this.centerCoords.x + coords.x) * this.dims.x,
        y: this.centerPx.y + (-this.centerCoords.y + coords.y) * this.dims.y
    }

    cellElement.style.left = position.x + 'px';
    cellElement.style.top = position.y + 'px';
    return cellElement;
}

Renderer.prototype.render = function(env) {
    var self = this;

    self.html.innerHTML = '';

    env.range().forEach(function(coords) {
        var cellElement = self.createCell(env.get(coords));
        self.positionCell(cellElement, coords);
        self.html.appendChild(cellElement);
    })
}

Renderer.prototype.refresh = function(env) {
    var self = this;
 
    env.range().forEach(function(coords) {
        var cellObject = env.get(coords);
        var cellElement = document.getElementById(self.coordsToId(coords));
        self.refreshCell(cellElement, cellObject)
        self.positionCell(cellElement, coords)
    })
}




},{}],7:[function(require,module,exports){
// EXAMPLE:
//
// var ruleset = new RuleSet({
//  stateMap: {
//      0: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
//      1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
//  },
//  weights: [
//      [1, 2, 1],
//      [2, 0, 2],
//      [1, 2, 1]
//   ]
//  })
//
//  ruleset.transform(0, [[1,1,1],[0,0,0],[0,0,0]]) => 1


module.exports = RuleSet = function(ruleParams) {
    ruleParams = ruleParams || {};

    this.stateMap = ruleParams.stateMap || {};

    // TODO: this should really be a coordmap...
    this.weights = indexWeights(ruleParams.weights || [
        [1, 1, 1],
        [1, 0, 1],
        [1, 1, 1]
    ]);
}

RuleSet.prototype = {};

RuleSet.prototype.transform = function(state, neighbors) {
    // If we try to transform anything unknown, things will just stay constant.
    if (!(state in this.stateMap)) { return state; }

    var sum = deepWeightedSum(neighbors, this.weights);

    if (sum >= this.stateMap[state].length) { return state; }

    return this.stateMap[state][sum];
}

// neighbors should be a coord-map, like:
// [{coords:{x:0,y:0}, value:'whatever}, {coords:{x:1,y:1}, value:'whatever'}, ... ]
function deepWeightedSum(neighbors, weights) {
    var sum = 0;

    neighbors.forEach(function(neighbor) {
        var coords = neighbor.coords;
        sum += neighbor.value * weights[coords.x][coords.y];
    })

    return sum;
}


// This is janky.
// Turns a nested array into a fake nested array, so that you can
// access things like weights[-1][-1]
function indexWeights(deepArray) {
    console.assert(deepArray.length === 3); // sanity check
    console.assert(deepArray[0].length === 3);

    // ugh, ugh, ugh. Fake array.
    var range = [-1, 0, 1];
    var output = {};
    range.forEach(function(i) {
        output[i] = {};
        range.forEach(function(j) {
            output[i][j] = deepArray[i+1][j+1];
        })
    })

    return output;
}

},{}],8:[function(require,module,exports){
// This module is for deciding the winning species in a cell!
// 
// For now, it's just 'which species is higher in the pecking order'

module.exports = SpeciesBattle = {
    peckingOrder: [
        // sorted from low to high
        'blank',
        'grass',
        'flowers',
        'trees',
        'magic',
    ],

    decide: function(ids) {
        if (ids.length === 0) return null;
        if (ids.length === 1) return ids[0];

        var self = this;
        ids.sort(function(id1, id2) {
            return self.peckingOrder.indexOf(id2) - self.peckingOrder.indexOf(id1);
        })
        return ids[0];
    }
}

},{}],9:[function(require,module,exports){
// THE POINT OF THIS MODULE IS....
//
//    ... To take a cell object and decide whether it has a species in it.
//    :D

var masks = {
    true: 1,
    false: 0
}

module.exports = SpeciesMask = function(species_id) {
    return function(cell) {
        if (!cell || !cell.species) return masks[false];
        return masks[cell.species.id === species_id];
    }
}

},{}],10:[function(require,module,exports){
var RuleSet = require('./ruleset');
var SpeciesMask = require('./species-mask');

module.exports = Species = function(params) {
    this.id = params.id || 'species' + Math.floor(Math.random()*1e8);
    this.symbol = params.symbol || '';
    this.color = params.color || 'black';

    // behavior
    this.passable = params.passable || true;

    this.initRules(params.rules);

    //this.ruleSet = new RuleSet(params.rules);

    // This is a function to decide whether a cell hosts this species or not
    this.mask = SpeciesMask(this.id);
}

Species.prototype = {};

// this is sort of messy; it populates stuff in the rules object
Species.prototype.initRules = function(rules) {
    this.rules = rules || {};

    // The default rules govern how the species spreads based on its own presence
    this.rules.default = new RuleSet(this.rules.default)   

    // Conditional rules are based on other species
    this.rules.conditional = this.rules.conditional || [];

    this.rules.conditional.forEach(function(condition) {
        condition.mask = SpeciesMask(condition.species_id);
        condition.rules = new RuleSet(condition.rules);
    })
}

Species.prototype.getSymbol = function() { return this.symbol; }
Species.prototype.getColor = function() { return this.color; }

// Returns 1 or 0, depending on whether the next iteration should include this species
Species.prototype.nextState = function(cell, neighbors) {
    // turn these things into arrays of 1s and 0s (or whatever)
    var self = this;

    // these are the rules to use.
    var ruleset = this.decideRuleset(cell, neighbors)
    
    // these are masked by THIS species, not a foreign species returned by decideRuleset
    var maskedCell = this.mask(cell);
    var maskedNeighbors = mapCoordmap(neighbors, self.mask);

    return ruleset.transform(maskedCell, maskedNeighbors);
}


Species.prototype.decideRuleset = function(cell, neighbors) {
    var winningRuleset = this.rules.default;

    if (this.rules.conditional.length === 0) return winningRuleset;

    var winningCount = 0; // the winning conditional species will be the one with the most neighbors. **Not weighted
    this.rules.conditional.forEach(function(condition) {
        var maskedNeighbors = mapCoordmap(neighbors, condition.mask);
        var count = coordmapSum(maskedNeighbors);

        // the number of neighbors has to be larger than the threshhold
        if (condition.threshhold && count < condition.threshhold) return;

        if (count > winningCount) {
            winningRuleset = condition.rules;
            winningCount = count;
        }
    })

    return winningRuleset;
}

// TODO make a coordmap object type...
function mapCoordmap(coordmap, mapFunction) {
    return coordmap.map(function(coordmapItem) {
        return {coords: coordmapItem.coords, value: mapFunction(coordmapItem.value)};
    })
}

function coordmapSum(coordmap) {
    var sum = 0
    coordmap.forEach(function(coordmapItem) {
        sum += coordmapItem.value;
    })
    return sum;
}

},{"./ruleset":7,"./species-mask":9}],11:[function(require,module,exports){
var Map = require('./map');

var game = {};
game.size = {x:50, y:50}; // cells
game.cellDims = {x:50, y:50}; // pixels
window.game = game;

function initGame() {
    boardElement = document.getElementById('game');

    Map.init(game.size, game.cellDims, boardElement);
    bindEvents();
}

function bindEvents() {
    var mouseOverlay = document.getElementById('mouse-overlay');

    mouseOverlay.onclick = function() {
        Map.advance();
        Map.render();
    }

    var keyboardCallbacks = {
        37: function goLeft(evt) {
            Map.recenter(Map.center.x - 1, Map.center.y);
        },

        39: function goRight(evt) {
            Map.recenter(Map.center.x + 1, Map.center.y);
        },

        38: function goUp(evt) {
            Map.recenter(Map.center.x, Map.center.y - 1);
        },

        40: function goDown(evt) {
            Map.recenter(Map.center.x, Map.center.y + 1);
        }
    }

    window.addEventListener('keyup', function(event) {
        var keycode = event.fake || window.event ? event.keyCode : event.which;
        if (keycode in keyboardCallbacks) keyboardCallbacks[keycode]();
    });

}


// UI/HUD

window.UI = {};

UI.infoTimeout = null;

// Display info text for the specified lifetime
// If lifetime isn't specified, then the text will stay up forever (until something else is shown)
UI.info = function(text, lifetime) {

    document.getElementById('info').textContent = text;

    clearTimeout(UI.infoTimeout);
    if (typeof lifetime === 'number') {
        UI.infoTimeout = setTimeout(function() {
            UI.info('', false);
        }, lifetime)
    }
}

// Display info text only while the given function is executing
UI.infoWrap = function(text, fn) {
    return function() {
        UI.info(text);

        setTimeout(function() {
            fn();
            UI.info('');
        }, 0)
    }
}

UI.zoomOut = UI.infoWrap('zooming...', function() { Map.zoomOut(); })
UI.zoomIn = UI.infoWrap('zooming...', function() { Map.zoomIn(); })

window.onload = UI.infoWrap('loading...', initGame);

},{"./map":5}]},{},[11]);