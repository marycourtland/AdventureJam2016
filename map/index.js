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

// MARGINS / CAMERA
Map.isInWindow = function(coords) {
    // Right now there's a circular window
    var distance = Math.sqrt(Math.pow((coords.x - this.center.x), 2) + Math.pow((coords.y - this.center.y), 2));
    return distance < this.window;
}


// RENDERING
Map.render = function() { this.renderer.render(this.env); return this; }
Map.refresh = function() { this.renderer.refresh(this.env); return this; }

Map.zoomFactor = 2;

Map.zoomIn = function() {
    this.dims.x *= Map.zoomFactor;
    this.dims.y *= Map.zoomFactor;
    this.window /= Map.zoomFactor;
    this.refresh();
    return this;
}

Map.zoomOut = function() {
    this.dims.x /= Map.zoomFactor;
    this.dims.y /= Map.zoomFactor;
    this.window *= Map.zoomFactor;
    this.refresh();
    return this;
}

Map.recenter = function(coords) {
    this.center.x = coords.x;
    this.center.y = coords.y;
    this.refresh();
    return this;
}

// ugh
Map.getOffset = function() {
    return this.renderer.getPixelOffset();
}


// clump all this stuff together in a renderer
Map.renderer = require('./renderer')
