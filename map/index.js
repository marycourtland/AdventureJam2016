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

    this.renderer = new Renderer(this.dims);

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

    self.env.advance(5);

    self.clump({x: 20, y:20}, [
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
}


// RENDERING
Map.render = function() { this.renderer.render(this.env, this.html); }
Map.refresh = function() { this.renderer.refresh(this.env); }

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
Map.renderer = require('./renderer')
