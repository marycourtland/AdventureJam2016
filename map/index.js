var Env = require('./environment');
var Species= require('./species');
var GrowthRules = require('./growth-rules')

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

    { id: 'flowers',   symbol: '✨',     color: 'blue',
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
    this.html = htmlElement;
    this.size = size;
    this.dims = dims;
    this.renderer.dims = this.dims; // ugh 

    this.env = new Env(this.size, this.species.blank);

    this.generate();
    this.render();
}


Map.generate = function() {
    var self = this;

    // register grass and trees with all of the cells
    self.env.range().forEach(function(coords) {
        self.env.get(coords).add(self.species.magic)
        self.env.get(coords).add(self.species.grass);
        self.env.get(coords).add(self.species.trees);
    })

    self.randomClump([
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

    //self.sow(self.species.magic, 1/20)

    self.sow(self.species.grass, 1/10);

    self.sow(self.species.flowers, 1/50)

    self.sow(self.species.trees, 1/30);

    self.env.advance(5);
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

Map.randomClump = function(coordClump, species) {
    // Pick a random spot and paste the the clump 
    var self = this;
    var center = self.env.randomCoords();
    
    coordClump.forEach(function(coords) {
        var targetCoords = {x: coords.x + center.x, y: coords.y + center.y};
        self.env.set(targetCoords, species);
    })

    return this
}

Map.advance = function() {
    this.env.advance();
}


// RENDERING
Map.render = function() { Map.renderer.render(); }
Map.refresh = function() { Map.renderer.refresh(); }

Map.zoomFactor = 2;

Map.zoomIn = function() {
    this.dims.x *= Map.zoomFactor;
    this.dims.y *= Map.zoomFactor;
    this.refresh();
}

Map.zoomOut = function() {
    this.dims.x /= Map.zoomFactor;
    this.dims.y /= Map.zoomFactor;
    this.refresh();
}


// clump all this stuff together in a renderer
Map.renderer = {};


Map.renderer.cellClass = 'cell'
Map.renderer.cellIdDelimiter = '_'
Map.renderer.cellIdPrefix = Map.renderer.cellClass + Map.renderer.cellIdDelimiter;

Map.renderer.coordsToId = function(coords) {
    return this.cellIdPrefix + coords.x + this.cellIdDelimiter + coords.y
}
Map.renderer.idToCoords = function(id) {
    var coordArray = id.slice(this.cellIdPrefix.length).split(this.cellIdDelimiter);
    return {x: coordArray[0], y: coordArray[1] }
}

Map.renderer.createCell = function(cellObject) {
    var cellElement = document.createElement('div');
    cellElement.setAttribute('class', this.cellClass);
    this.refreshCell(cellElement, cellObject);
    return cellElement;
}

Map.renderer.refreshCell = function(cellElement, cellObject) {
    cellElement.style.width = this.dims.x + 'px';
    cellElement.style.height = this.dims.y + 'px';
    cellElement.style.lineHeight = this.dims.y + 'px';
    cellElement.style.backgroundColor = cellObject.species.getColor();
    cellElement.innerHTML = cellObject.species.getSymbol();
}

Map.renderer.positionCell = function(cellElement, coords) {
    cellElement.setAttribute('id',  this.coordsToId(coords));
    cellElement.style.left = (coords.x * this.dims.x) + 'px';
    cellElement.style.top = (coords.y * this.dims.y) + 'px';
    return cellElement;
}

Map.renderer.render = function() {
    var html = Map.html;
    var env = Map.env;
    var self = this;

    html.innerHTML = '';

    env.range().forEach(function(coords) {
        var cellElement = self.createCell(env.get(coords));
        self.positionCell(cellElement, coords);
        html.appendChild(cellElement);
    })
}

Map.renderer.refresh = function() {
    var env = Map.env;
    var self = this;
 
    env.range().forEach(function(coords) {
        var cellObject = env.get(coords);
        var cellElement = document.getElementById(self.coordsToId(coords));
        self.refreshCell(cellElement, cellObject)
        self.positionCell(cellElement, coords)
    })
}



