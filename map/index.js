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
