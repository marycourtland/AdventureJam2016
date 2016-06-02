var Env = require('./environment');
var Species = require('./species');
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
    return this.clump(coords, [
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

Map.getCell = function(coords) {
    return this.env.get(coords);
}


// iterates over a coordmap
Map.forEach = function(fn) {
    var self = this;
    self.env.range().forEach(function(coords) {
        fn(coords, self.env.get(coords));
    });
    return this;
}

Map.advance = function(n) {
    if (typeof n === 'undefined') n = 1;
    this.env.advance(n);
    return this;
}

// MARGINS / CAMERA
Map.isInWindow = function(coords) {
    var distance = Math.max(
        Math.abs(coords.x - this.center.x),
        Math.abs(coords.y - this.center.y)
    )
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

// more ugh. Pixels should be relative to the top left corner of the map itself, not the html element
Map.getCoordsFromPixels = function(pixels) {
    return {
        x: Math.floor(pixels.x / this.dims.x),
        y: Math.floor(pixels.y / this.dims.y),
    }
}

// clump all this stuff together in a renderer
Map.renderer = require('./renderer')
