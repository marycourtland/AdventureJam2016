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
    if (!(species.id in this.allSpecies)) {
        this.allSpecies[species.id] = species;
    }

    // make sure there's a dominant species
    if (Object.keys(this.allSpecies).length === 1 || !this.species) {
        this.species = species;
    }
    return this;
}



},{"./species-battle":6}],3:[function(require,module,exports){
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
    if (numTimes === 'undefined') numTimes = 1;

    for (var t = 0; t < numTimes; t++) { Advancerator(this); }

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
var Env = require('./environment');
var Species= require('./species');

module.exports = Map = {};

// TODO: The game should be responsible for these species, not the map
var speciesData = [
    { id: 'blank',     symbol: '' },
    { id: 'character', symbol: '😃' },
    { id: 'alien',     symbol: '😵' },

    // previous symbol: ∴
    { id: 'grass',     symbol: '',     color: 'green',
        rules: {
            stateMap: {
                0: [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
                1: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            },
            weights: [
                [1, 2, 1],
                [2, 0, 2],
                [1, 2, 1]
            ]
        }
    },
    
    { id: 'flowers',   symbol: '✨',     color: 'red' },
    { id: 'tree',      symbol: '&psi;', color: 'green', passable: false },
    { id: 'zap',       symbol: '⚡' }
]

Map.species = {};

speciesData.forEach(function(s) {
    Map.species[s.id] = new Species(s);
})


Map.init = function(size, dims, htmlElement) {
    this.html = htmlElement;
    this.size = size;
    this.dims = dims;

    this.env = new Env(this.size, this.species.blank);

    this.generate();
    this.render();
}


Map.generate = function() {
    var self = this;

    // register grass with all of the cells
    self.env.range().forEach(function(coords) {
        self.env.get(coords).add(self.species.grass);
    })

    self.sow(self.species.grass, 1/10);

    self.env.advance(6);
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
}


// RENDERING

Map.render = function() {
    var dims = this.dims;
    var html = this.html;
    var env = this.env;

    html.innerHTML = '';

    env.range().forEach(function(coords) {
        renderCell(coords, env.get(coords));
    })

    function renderCell(coords, cell) {
        var cell_element = document.createElement('div');

        cell_element.setAttribute('class', 'cell')
        cell_element.style.left = (coords.x * dims.x) + 'px';
        cell_element.style.top = (coords.y * dims.y) + 'px';
        cell_element.style.width = dims.x + 'px';
        cell_element.style.height = dims.y + 'px';
        cell_element.style.lineHeight = dims.y + 'px';
        cell_element.style.backgroundColor = cell.species.getColor();
        cell_element.innerHTML= cell.species.getSymbol();

        html.appendChild(cell_element);
    }
}

},{"./environment":3,"./species":8}],5:[function(require,module,exports){
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

    // TODO: validate that neighbors has the correct structure?
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

},{}],6:[function(require,module,exports){
// This module is for deciding the winning species in a cell!
// 
// For now, it's just 'which species is higher in the pecking order'

module.exports = SpeciesBattle = {
    peckingOrder: [
        // sorted from low to high
        'blank',
        'grass',
        'flowers',
        'tree',
        'zap',
        'explode'
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

},{}],7:[function(require,module,exports){
// THE POINT OF THIS MODULE IS....
//
//    ... To take a cell object and decide whether it has a species in it.
//    :D

var masks = {
    true: 1,
    false: 0
}

module.exports = SpeciesMask = function(species) {
    return function(cell) {
        if (!cell || !cell.species) return masks[false];
        return masks[cell.species.id === species.id];
    }
}

},{}],8:[function(require,module,exports){
var RuleSet = require('./ruleset');
var SpeciesMask = require('./species-mask');

module.exports = Species = function(params) {
    this.id = params.id || 'species' + Math.floor(Math.random()*1e8);
    this.symbol = params.symbol || '';
    this.color = params.color || 'black';

    // behavior
    this.passable = params.passable || true;

    this.ruleSet = new RuleSet(params.rules);

    // This is a function to decide whether a cell hosts this species or not
    this.mask = SpeciesMask(this);
}

Species.prototype = {};

Species.prototype.getSymbol = function() { return this.symbol; }
Species.prototype.getColor = function() { return this.color; }

// Returns 1 or 0, depending on whether the next iteration should include this species
Species.prototype.nextState = function(cell, neighbors) {
    // turn these things into arrays of 1s and 0s (or whatever)
    var self = this;
    var maskedCell = this.mask(cell);
    var maskedNeighbors = neighbors.map(function(coordmap) {
        // return another coordmap
        return {coords: coordmap.coords, value: self.mask(coordmap.value)};
    });

    return this.ruleSet.transform(maskedCell, maskedNeighbors);
}



},{"./ruleset":5,"./species-mask":7}],9:[function(require,module,exports){
var Map = require('./map');

var game = {};
game.size = {x:50, y:50}; // cells
game.cellDims = {x:10, y:10}; // pixels


var boardElement;

window.onload = initGame;

function initGame() {
    boardElement = document.getElementById('game');

    Map.init(game.size, game.cellDims, boardElement);
}


},{"./map":4}]},{},[9]);
