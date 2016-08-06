var Settings = window.Settings;
var Env = require('./environment');
var Species = require('./species');
//var Renderer = require('./renderer')
var SpeciesData = require('./data/species') 

module.exports = Map = {};

// initialize species based on the data
Map.species = {};
SpeciesData.forEach(function(s) {
    Map.species[s.id] = new Species(s);
})


Map.init = function(params) {
    this.size = params.size;
    this.center = {x: Math.floor(this.size.x/2), y: Math.floor(this.size.y/2)} // use Map.setCenter to change this
    this.env = new Env(this.size, this.species.blank);

    // Unused prototype stuff
    //this.dims = params.dims;
    //this.window = params.window; // what radius of tiles should comprise the camera window?
    //this.renderer = new Renderer(params.html, this.dims, this.center);
    //this.render();
}

Map.startIteration = function() {
    // this is just the first timeout
    function getTimeout(){
        // flat distribution because it's the first iteration
        return Math.random() * Settings.mapIterationTimeout
    }

    this.forEach(function(coords, cell) {
        setTimeout(function() { cell.iterate(); }, getTimeout());
    })
}

Map.generateTest = function() {
    var self = this;
    // register involved species with all of the cells
    self.forEach(function(coords, cell) {
        cell.add(self.species.trees2);
        cell.add(self.species.grass);
        cell.add(self.species.magic);
        cell.add(self.species.trees);
    })

    //self.sow(self.species.trees2, 0.6);

    /*
    var rut_cells = [
        {x: 1, y: 3},
        {x: 2, y: 3},
    ]
    
    rut_cells.forEach(function(coords) {
        var cell = self.env.get(coords);
        cell.rut('footsteps', 1);
    })
   */

    //self.env.set({x:1,y:1}, self.species.trees)

    self.rect(self.species.trees, {x:0, y:0}, {x:7, y:0});
    //self.rect(self.species.trees2, {x:0, y:7}, {x:7, y:7});


    self.rect(self.species.magic, {x:4, y:4}, {x:8, y:8});

    this.env.advance(1);
}


Map.generate = function() {
    if (Settings.mode === 'test') return this.generateTest();

    var self = this;

    // register involved species with all of the cells
    self.forEach(function(coords, cell) {
        cell.add(self.species.magic);
        cell.add(self.species.grass);
        cell.add(self.species.trees);
        cell.add(self.species.trees2);
        cell.add(self.species.neutralized);
    })

    self.sow(self.species.grass, 1/10);
    self.sow(self.species.flowers, 1/50)
    self.sow(self.species.trees, 1/30);
    self.sow(self.species.trees2, 1/40);
    self.env.advance(10);

    // empty spot in the 0,0 corner
    self.rect(self.species.grass, {x:0, y:0}, {x:10, y:10});
    self.rect(self.species.magic, {x:2, y:2}, {x:4, y:4});

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

Map.rect = function(species, from, to) {
    var clump = [];
    for (var x = from.x; x <= to.x; x++) {
        for (var y = from.y; y <= to.y; y++) {
            clump.push({x:x, y:y});
        }
    }
    return this.clump(from, clump, species);
}

// randomly set cells as the species
Map.sow = function(species, frequency) {
    var self = this;

    self.forEach(function(coords, cell) {
        if (Math.random() > frequency) return;
        self.env.set(coords, species);
    })
/*
    var numSeeds = self.size.x * self.size.y * frequency;

    // Pick some places to seed
    var seeds = [];
    for (var i = 0; i < numSeeds; i++) {
        seeds.push(self.env.randomCoords());
    }

    seeds.forEach(function(coords) { self.env.set(coords, species); })
*/
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

Map.log = function() {
    // For debugging purposes
    var ascii = Utils.transpose(this.env.cells).map(function (r) {
        return r.map(function(cell) {
            return cell.species.id === 'blank' ? ' ' : cell.species.id[0];
        }).join(' ');
    }).join('\n');
    console.log(ascii);
}
