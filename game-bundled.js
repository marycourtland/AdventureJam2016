(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Sprite = require('./sprite');
var SpriteData = require('./sprite-data');
var Utils = require('./utils');

module.exports = Character = function(params) {
    params.id = params.id || '';
    params.sprite= params.sprite || '';

    console.assert(params.sprite in SpriteData, "spriteId doesn't exist: " + params.sprite);

    this.map= params.map;
    this.id = params.id;
    this.sprite = new Sprite(SpriteData[params.sprite]).setFrame(Object.keys(SpriteData[params.sprite].frames)[0]);
    this.coords = {x:0, y:0};

}

Character.prototype = {};


Character.prototype.moveTo = function(coords) {
    this.coords.x = coords.x;
    this.coords.y = coords.y;

    // move sprite
    var pos = {
        x: this.coords.x * this.map.dims.x,
        y: this.coords.y * this.map.dims.y,
    }

    var offset = this.map.getOffset();
    this.sprite.moveTo({x: pos.x + offset.x, y: pos.y + offset.y});

    // put the sprite in the center of the tile
    this.sprite.move({x: this.map.dims.x / 2, y: this.map.dims.y / 2});

    // TODO: make sure it doesn't go off the map... or handle that case or something

    return this;
}

Character.prototype.move = function(diff) {
    console.assert(Math.abs(diff.x) + Math.abs(diff.y) === 1, 'character should only move 1 step at a time')

    this.moveTo({x: this.coords.x + diff.x, y: this.coords.y + diff.y});
    this.faceDirection(diff);
    return this;
}


Character.prototype.faceDirection = function(dir) {
    var scaledDir = {
        x: dir.x / (dir.x === 0 ? 1 : Math.abs(dir.x)),
        y: dir.y / (dir.y === 0 ? 1 : Math.abs(dir.y))
    };

    var frame;
    for (var dirFrame in Utils.dirs) {
        if (scaledDir.x === Utils.dirs[dirFrame].x && scaledDir.y === Utils.dirs[dirFrame].y) {
            frame = dirFrame;
            break;
        }
    }

    this.sprite.setFrame(frame);
    return this;
}

Character.prototype.refresh = function() {
    this.moveTo(this.coords);
    this.sprite.refreshPosition();
}

},{"./sprite":15,"./sprite-data":14,"./utils":17}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
// A cell (location on the grid) can have multiple species living in it.
// But one of them is dominant (which will be displayed)
//
// ^ that might change :)
// like if, instead of having a dominant species, we had a function to take
// all the species and compute which one is dominant

var SpeciesBattle = require('./species-battle')

module.exports = Cell = function(blank) {
    this.species = null;
    this.register = {}; // indexed by id
    this.set(blank || '');


    // the 'next' slot is just a holding pattern until the current iteration is finalized
    // use cell.next(species), then cell.flush() to set it
    this.nextSpecies = null;
};

Cell.prototype = {};

// convenience, to get the species object
Cell.prototype.get = function(species_id) {
    if (!(species_id in this.register)) return null;

    return this.register[species_id].species;
}

// get the age of the current dominant species
Cell.prototype.getAge = function() {
    if (!this.species) return null;
    
    return this.register[this.species.id].age;
}

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
    for (var id in this.register) {
        nextStates[id] = this.get(id).nextState(this, neighbors);
    }

    // Which species are contenders for dominance in this cell?
    var contenders = Object.keys(nextStates).filter(function(id) { return nextStates[id].state === 1; }) 

    // THE SPECIES BATTLE IT OUT...
    this.nextSpecies = this.get(SpeciesBattle.decide(contenders));

    // Update age
    if (this.nextSpecies)
    this.register[this.nextSpecies.id].age = nextStates[this.nextSpecies.id].age;
    
}

Cell.prototype.flush = function() {
    // increment age?
    var previousSpeciesId = this.species ? this.species.id : null;

    if (!!this.nextSpecies) { 
        // if the species is incumbent, increment its age.
        if (previousSpeciesId === this.nextSpecies.id) {
            this.register[this.nextSpecies.id].age += 1;
        }
        else if (!!previousSpeciesId) {
            // reset of the age of the newly-dead species to 0
            this.register[previousSpeciesId].age = 0;
        }
    }

    this.set(this.nextSpecies);
}

Cell.prototype.add = function(species) {
    if (!species) {
        // this happens when a species dies
        species = this.get('blank'); // this SHOULD be one of the registered species
    }

    if (!(species.id in this.register)) {
        this.register[species.id] = {
            species: species,
            age: 0
        }
    }

    // make sure there's a dominant species
    if (Object.keys(this.register).length === 1 || !this.species) {
        this.species = species;
    }
    return this;
}



},{"./species-battle":10}],4:[function(require,module,exports){
module.exports = GrowthRules = {
    magic: {
        stateMap: {
            0: [0.001, 0.1, 0, 1, 1, 1, 1, 1, 0],
            1: [0, 0, 0, 1, 0, 1, 1, 0, 0]
        },
        weights: [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1]
        ]
    },

    // When plants are old enough, they become stable - less likely to grow, slightly likely to die
    plantsStable: {
        stateMap: {
            0: [  0,   0,   0, 0,   0, 0.1, 0.1, 1, 1, 1, 1,    1],
            1: [0.9, 0.9, 0.8, 1,   1,   1,   1, 1, 1, 1, 1, 0.95]
        },
        weights: [
            [1, 2, 1],
            [2, 0, 2],
            [1, 2, 1]
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
var GrowthRules = require('./growth-rules')

// Conditional growth rules are sorted by priority, low > high.

module.exports = speciesData = [
    { id: 'blank',     symbol: '~',             color: '#5F4F29'},
    { id: 'character', symbol: '&#9786;' },
    { id: 'alien',     symbol: '&#128565;' },

    { id: 'magic',     symbol: '&#8960;',      color: '#923B9E',
        rules: {
            default: GrowthRules.magic
        }
    },

    { id: 'grass',     symbol: '&#8756;',      color: '#46CF46', 
        rules: {
            default: GrowthRules.plants,
            conditional: [
                {
                    min_neighbors: 1,
                    species_id: 'magic',
                    rules: GrowthRules.plantsDying
                }
            ]
        }
    },

    { id: 'flowers',   symbol: '&#9880;',     color: '#E46511',
        rules: {
            default: GrowthRules.plants,
            conditional: [
                {
                    min_neighbors: 1,
                    species_id: 'magic',
                    rules: GrowthRules.plantsDying
                }
            ]
        }
    },

    { id: 'trees',     symbol: '&psi;', color: '#174925', passable: false,
        rules: {
            default: GrowthRules.plants,
            conditional: [
                // the presence of grass catalyzes tree growth
                {
                    species_id: 'grass',
                    min_neighbors: 4,
                    rules: GrowthRules.plantsCatalyzed
                },

                // tree growth stabilizes when the trees are old
                {
                    species_id: 'trees',
                    min_age: 3,
                    rules: GrowthRules.plantsStable
                },

                {
                    min_neighbors: 1,
                    species_id: 'magic',
                    rules: GrowthRules.plantsDying
                }
            ]
        }
    },

]

},{"./growth-rules":4}],6:[function(require,module,exports){
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

    for (var t = 0; t < numTimes; t+=1){
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

},{"./advancerator.js":2,"./cell.js":3}],7:[function(require,module,exports){
var Env = require('./environment');
var Species= require('./species');
var Renderer = require('./renderer')
var SpeciesData = require('./data/species') 

module.exports = Map = {};

// initialize species based on the data
Map.species = {};
SpeciesData.forEach(function(s) {
    Map.species[s.id] = new Species(s);
})


Map.init = function(params) {
    this.size = params.size;
    this.dims = params.dims;
    this.window = params.window; // what radius of tiles should comprise the camera window?

    this.center = {x: Math.floor(this.size.x/2), y: Math.floor(this.size.y/2)} // use Map.setCenter to change this

    this.renderer = new Renderer(params.html, this.dims, this.center);

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


    self.sow(self.species.grass, 1/10);
    self.sow(self.species.flowers, 1/50)
    self.sow(self.species.trees, 1/30);

    self.env.advance(4);

    self.env.advance(1);
}

Map.diamondClump = function(coords, species) {
    this.clump(coords, [
        {x:  0, y:  0},
        {x:  1, y:  1},
        {x: -1, y:  1},
        {x:  1, y: -1},
        {x: -1, y: -1},
        {x:  0, y: -1},
        {x:  0, y:  1},
        {x: -1, y:  0},
        {x:  1, y:  0},
    ], species)
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

Map.set = function(coords, species) {
    this.env.set(coords, species);
}

// iterates over a coordmap
Map.forEach = function(fn) {
    var self = this;
    self.env.range().forEach(function(coords) {
        fn(coords, self.env.get(coords));
    });
    return this;
}

Map.advance = function() {
    this.env.advance();
    return this;
}

// MARGINS / CAMERA
Map.isInWindow = function(coords) {
    // Right now there's a circular window
    var distance = Math.sqrt(Math.pow((coords.x - this.center.x), 2) + Math.pow((coords.y - this.center.y), 2));
    return distance < this.window;
}

// Different than isInWindow. Uses the rectangular renderer view
Map.isInView = function(coords) {
    return this.renderer.isInView(coords);
}


// RENDERING
Map.render = function() { this.renderer.render(this.env); return this; }
Map.refresh = function() { this.renderer.refresh(this.env); return this; }
Map.refreshFull = function() { this.renderer.refresh(this.env, true); return this; }

Map.refreshCell = function(coords, forceRefresh) {
    if (!forceRefresh && !this.isInView(coords)) return this;
    this.renderer.refreshCoords(this.env, coords);
}

Map.zoomFactor = 2;

Map.zoomIn = function() {
    this.dims.x *= Map.zoomFactor;
    this.dims.y *= Map.zoomFactor;
    this.window /= Map.zoomFactor;
    this.refreshFull();
    return this;
}

Map.zoomOut = function() {
    this.dims.x /= Map.zoomFactor;
    this.dims.y /= Map.zoomFactor;
    this.window *= Map.zoomFactor;
    this.refreshFull();
    return this;
}

Map.recenter = function(coords) {
    this.center.x = coords.x;
    this.center.y = coords.y;
    this.refreshFull();
    return this;
}

// ugh
Map.getOffset = function() {
    return this.renderer.getPixelOffset();
}


// clump all this stuff together in a renderer
Map.renderer = require('./renderer')

},{"./data/species":5,"./environment":6,"./renderer":8,"./species":12}],8:[function(require,module,exports){
module.exports = Renderer = function(html, dims, center) {
    // Direct references. So the parent should not overwrite them.
    this.html = html;
    this.dims = dims;
    this.centerCoords = center;
    this.bbox = html.getBoundingClientRect();
    this.centerPx = {
        x: this.bbox.width / 2,
        y: this.bbox.height / 2
    }
    this.viewsize = {
        x: this.bbox.width / this.dims.x,
        y: this.bbox.height / this.dims.y
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
    this.styleCell(cellElement, cellObject);
    return cellElement;
}

Renderer.prototype.styleCell = function(cellElement, cellObject) {
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

    self.rescale();

    self.html.innerHTML = '';

    env.range().forEach(function(coords) {
        var cellElement = self.createCell(env.get(coords));
        self.positionCell(cellElement, coords);
        self.html.appendChild(cellElement);
    })
}

Renderer.prototype.refresh = function(env, fullRefresh) {
    var self = this;

    self.rescale();

    var coordsToRefresh = env.range();

    // TODO: this is super buggy with cells that used to be in view but aren't anymore
    if (!fullRefresh) coordsToRefresh = coordsToRefresh.filter(function(crd) { return self.isInView(crd); });
 
    coordsToRefresh.forEach(function(coords) { self.refreshCoords(env, coords); })
    return this;
}

Renderer.prototype.refreshCoords = function(env, coords) {
    var cellObject = env.get(coords);
    var cellElement = document.getElementById(this.coordsToId(coords));
    this.styleCell(cellElement, cellObject)
    this.positionCell(cellElement, coords);
    return this;
}

Renderer.prototype.rescale = function() {
    // argh
    this.viewSize = {
        x: this.bbox.width / this.dims.x,
        y: this.bbox.height / this.dims.y
    };
    return this;
}

// Returns the number of pixels between the html's NW corner and the map's NW corner (at 0,0) 
Renderer.prototype.getPixelOffset = function() {
    return {
        x: this.centerPx.x + -this.centerCoords.x * this.dims.x,
        y: this.centerPx.y + -this.centerCoords.y * this.dims.y
    }
}

// Returns cell coords, not pixels
Renderer.prototype.getViewBbox = function() {
    return {
        x1: this.centerCoords.x - this.viewSize.x/2,
        x2: this.centerCoords.x + this.viewSize.x/2,
        y1: this.centerCoords.y - this.viewSize.y/2,
        y2: this.centerCoords.y + this.viewSize.y/2,
    }
}

// Returns whether a cell coords is in view or not
Renderer.prototype.isInView = function(coords) {
    var bbox = this.getViewBbox();
    return coords.x > bbox.x1
        && coords.x < bbox.x2
        && coords.y > bbox.y1
        && coords.y < bbox.y2;
}

},{}],9:[function(require,module,exports){
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

    return this.probabilisticState(this.stateMap[state][sum]);
}

// Input 0.3 for a 30% chance at getting a 1 (versus a 0)
RuleSet.prototype.probabilisticState = function(state) {
   if (state === 0 || state === 1) return state;
   return Math.random() < state ? 1 : 0;
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

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

    var nextState = ruleset.transform(maskedCell, maskedNeighbors);

    // propagate age (this will only be used if nextState is 1)
    // TODO: make a way to compose things together (like self.mask and cell.getAge)
    var maskedAges = mapCoordmap(neighbors, function(cell) { return !!cell ? self.mask(cell) * cell.getAge() : 0 });
    var age = Math.ceil(coordmapAvg(maskedAges));
    
    return {state: nextState, age: age};
}


Species.prototype.decideRuleset = function(cell, neighbors) {
    var winningRuleset = this.rules.default;

    if (this.rules.conditional.length === 0) return winningRuleset;

    // Conditional rules are sorted from lowest priority to highest.

    this.rules.conditional.forEach(function(condition) {
        var maskedNeighbors = mapCoordmap(neighbors, condition.mask);
        var count = coordmapSum(maskedNeighbors);

        // the number of neighbors has to meet the neighbor threshhold
        if (condition.min_neighbors && count < condition.min_neighbors) return;

        // the cell age has to meet the age threshhold
        if (condition.min_age && cell.getAge() < condition.min_age) return;

        winningRuleset = condition.rules;
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

function coordmapAvg(coordmap) {
    return coordmapSum(coordmap) / coordmap.length;
}

},{"./ruleset":9,"./species-mask":11}],13:[function(require,module,exports){
var Map = require('./map');
var Sprite = require('./sprite');
var Character = require('./character')
var SpriteData = require('./sprite-data');
var Utils = require('./utils');
var Walker = require('./walker');
 
var Settings = window.Settings;

var game = {};
game.size = Settings.gameSize; 
game.cellDims = Settings.cellDims;

window.game = game;

var player, wizard;

function initGame() {
    boardElement = document.getElementById('game');
    charElement = document.getElementById('game-characters')

    Map.init({
        size: game.size,
        dims: game.cellDims,
        window: 7,
        html: boardElement
    });

    player = new Character({
        map: Map,
        id: 'player',
        sprite: 'player'
    })

    wizard = new Character({
        map: Map,
        id: 'wizard',
        sprite: 'wizard'
    })



    // ugh, TODO clean this up
    player.sprite.scaleTo(game.cellDims).place(charElement);
    player.moveTo(Map.center)
    window.pl = player;

    wizard.sprite.scaleTo(game.cellDims).place(charElement);
    wizard.moveTo(Map.env.randomCoords());
    window.wizard = wizard;

    // start magic where the wizard is
    Map.diamondClump(wizard.coords, Map.species.magic)


    // have the wizard amble randomly
    wizard.getSomewhatRandomDir = function() {
        // 33% chance to walk in the same direction as last step
        if (!!this.lastStep && Math.random() < 1/3) {
            return this.lastStep;
        }
        return Utils.dirs[Utils.randomChoice(Utils.dirs)];
    }

    wizard.walker = new Walker(wizard,
        function() {
            return wizard.getSomewhatRandomDir();
        },
        function onStep(dir) {
            wizard.faceDirection(dir);
            wizard.refresh();

            // make sure the wizard trails magic
            Map.set(wizard.coords, Map.species.magic);
            Map.refreshCell(wizard.coords);

            wizard.lastStep = dir;
        }
    )
    wizard.walker.start();

    bindEvents();
    iterateMap();
}

function bindEvents() {
    var mouseOverlay = document.getElementById('mouse-overlay');

    mouseOverlay.onclick = function() {
        Map.advance();
        Map.refresh();
    }

    var keyboardCallbacks = {
        37: function goLeft(evt) {
            player.move(Utils.dirs['w']);
            refreshCamera();
        },

        39: function goRight(evt) {
            player.move(Utils.dirs['e']);
            refreshCamera();
        },

        38: function goUp(evt) {
            player.move(Utils.dirs['n']);
            refreshCamera();
        },

        40: function goDown(evt) {
            player.move(Utils.dirs['s']);
            refreshCamera();
        }
    }

    window.addEventListener('keyup', function(event) {
        var keycode = event.fake || window.event ? event.keyCode : event.which;
        if (keycode in keyboardCallbacks) keyboardCallbacks[keycode]();
    });

}

function refreshCamera() {
    if (!Map.isInWindow(player.coords)) {
        Map.recenter(player.coords);
        player.refresh();
        wizard.refresh();
    }
}

// TODO: maybe things would be nicer if this was demoted to a worker
game.iterationTimeout = null;
window.iterateMap = function() {
    if (Settings.mapIterationTimeout <= 0) return;

    Map.advance();

    if (!Settings.randomizeCellIteration) {
        Map.refresh();
        if (window.doCounts) window.doCounts();
    }
    else {
        // Pick random times to show the cell update
        // TODO: the isInView call might be outdated if we change views
        Map.forEach(function(coords, cell) {
            if (!Map.isInView(coords)) return;
            setTimeout(function() {
                Map.refreshCell(coords);
            }, Math.random() * Settings.mapIterationTimeout);
        })
    }
    
    // Schedule another map iteration
    clearTimeout(game.iterationTimeout);
    game.iterationTimeout = setTimeout(function() {
        iterateMap();
    }, Settings.mapIterationTimeout)
}

// UI/HUD
window.UI = require('./ui');
window.onload = UI.infoWrap('loading...', initGame);

},{"./character":1,"./map":7,"./sprite":15,"./sprite-data":14,"./ui":16,"./utils":17,"./walker":18}],14:[function(require,module,exports){
module.exports = SpriteData = {};

SpriteData.player = {
    name: 'player',
    url: 'images/player.png',
    frame_size: {x: 80,  y:180},
    frame_origin: {x: 40, y:90},

    frames: {
        'n': {x: 0, y:0},
        's': {x: 1, y:0},
        'w': {x: 2, y:0},
        'e': {x: 3, y:0},
    }
}

SpriteData.wizard = {
    name: 'wizard',
    url: 'images/wizard.png',
    frame_size: {x: 80,  y:180},
    frame_origin: {x: 40, y:90},

    frames: {
        'n': {x: 0, y:0},
        's': {x: 1, y:0},
        'w': {x: 2, y:0},
        'e': {x: 3, y:0},
    }
}

},{}],15:[function(require,module,exports){
// warning, messy code

module.exports = Sprite = function(data) {
    this.data = data;
    this.scale = 1;

    // determine total image size
    this.size = {x:0, y:0};
    for (var frame in this.data.frames) {
        var f = this.data.frames[frame];
        this.size.x = Math.max(this.size.x, f.x);
        this.size.y = Math.max(this.size.y, f.y);
    }
    this.size.x += 1;
    this.size.y += 1;
    this.size.x *= this.data.frame_size.x;
    this.size.y *= this.data.frame_size.y;

    // position of sprite in the game
    this.position = {x:0, y:0}

    this.init();
}

Sprite.prototype = {};

Sprite.prototype.init = function() {
    this.html = document.createElement('div');
    this.html.setAttribute('id', 'sprite-' + this.data.name);
    this.html.setAttribute('class', 'sprite');
    this.html.style.backgroundImage = 'url("' + this.data.url + '")';
    this.frame = Object.keys(this.data.frames)[0];
    this.refresh();
    return this;
}


Sprite.prototype.refresh = function() {
    this.refreshScale();
    this.refreshFrame();
    this.refreshPosition();
    return this;
}

Sprite.prototype.refreshScale = function() {
    // size of the background, including all frames
    var bgSize = {
        x: this.size.x * this.scale,
        y: this.size.y * this.scale
    }

    // size of the sprite's html element (width, height)
    var spriteSize = {
        x: this.data.frame_size.x * this.scale,
        y: this.data.frame_size.y * this.scale
    }


    // set html
    this.html.style.backgroundSize = bgSize.x + 'px ' + bgSize.y + 'px';

    this.html.style.width = spriteSize.x + 'px';
    this.html.style.height = spriteSize.y + 'px';
    
    return this;
}

Sprite.prototype.refreshFrame = function() {
    // position of the background (to get the proper frame)
    var bgPos = {
        x: -this.data.frame_size.x * this.data.frames[this.frame].x * this.scale,
        y: -this.data.frame_size.y * this.data.frames[this.frame].y * this.scale
    }

    this.html.style.backgroundPosition = bgPos.x + 'px ' + bgPos.y + 'px';

    return this;
}

Sprite.prototype.refreshPosition = function() {

    // adjust the sprite until its origin is lined up with its position
    var posOffset = {
        x: -this.data.frame_origin.x * this.scale,
        y: -this.data.frame_origin.y * this.scale
    }

    this.html.style.left = (posOffset.x + this.position.x) + 'px';
    this.html.style.top = (posOffset.y + this.position.y) + 'px';

    return this;
}

Sprite.prototype.setFrame = function(frame) {
    console.assert(frame in this.data.frames, 'Sprite sheet does not contain frame "' + frame + '"')
    if (this.frame === frame) return this; // no need to redo stuff
    this.frame = frame;
    this.refreshFrame();
    return this;
}

Sprite.prototype.scaleBy = function(factor) {
    this.scale *= factor;
    this.refreshScale();
    return this;
}

Sprite.prototype.scaleTo = function(size) {
    // scales by size.y, since scale is scalar
    this.scale = size.y / this.data.frame_size.y ;
    this.refreshScale();
    return this;
}

Sprite.prototype.place = function(container) {
    container.appendChild(this.html);
    return this;
}

Sprite.prototype.move = function(change) {
    this.position.x += change.x;
    this.position.y += change.y;
    this.refreshPosition();
    return this;
}

Sprite.prototype.moveTo = function(position) {
    this.position.x = position.x;
    this.position.y = position.y;
    this.refreshPosition();
    return this;
}

},{}],16:[function(require,module,exports){
// UI/HUD

module.exports = UI = {};

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


},{}],17:[function(require,module,exports){
module.exports = Utils = {};

Utils.dirs = { 
    'n': {x: 0, y: -1},
    's': {x: 0, y: 1},
    'w': {x: -1, y:0},
    'e': {x: 1, y:0}
}

Utils.randomChoice = function(array) {
    if (typeof array === 'object') array = Object.keys(array);
    return array[Math.floor(Math.random() * array.length)];
}

},{}],18:[function(require,module,exports){
module.exports = Walker = function(char, getNextDir, onStep) {
    this.char = char;
    this.timeout = null;
    this.walking = false;
    this.getNextDir = getNextDir;
    this.onStep = typeof onStep === 'function' ? onStep : function() {};
}

Walker.prototype = {};

Walker.prototype.timeTillNextStep = function() {
    // 3-4 seconds, but once in a while stop for a bit
    var base = 3000;
    if (Math.random() < 1/10) base = 8000;
    return base +  Math.random() * 1000;
}

Walker.prototype.start = function() {
    this.walking = true;
    this.step();
}

Walker.prototype.stop = function() {
    window.clearTimeout(this.timeout);
    this.timeout = null;
    this.walking = false;
}

Walker.prototype.step = function() {
    if (!this.walking) return;
    
    var dir = this.getNextDir()
    this.char.move(dir);
    this.onStep(dir);

    var self = this;
    window.clearTimeout(this.timeout);
    this.timeout = window.setTimeout(function() {
        self.step();
    }, this.timeTillNextStep());
}

},{}]},{},[13]);
