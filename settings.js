// not included in browserify bundle
window.Settings = {};

// Game settings
Settings.gameSize = {x: 50, y:50}; // cells
Settings.cellDims = {x: 30, y:30}; // pixels per cell


// Map iteration
Settings.mapIterationTimeout    = 5000; // millis between map updates. Use 0 to disable automatic updates
Settings.randomizeCellIteration = true;
