// not included in browserify bundle
window.Settings = {};

// Feature flags

// advance all the cells at the same time, periodically
Settings.advanceAllCells = false;

// Game settings
Settings.gameSize = {x: 50, y:50}; // cells
Settings.cellDims = {x: 30, y:30}; // pixels per cell


// Map iteration
// if the randomize switch is on, it only makes sense to do timeout at least 10sec, if not 20
Settings.mapIterationTimeout    = 10000; // millis between map updates. Use 0 to disable automatic updates
Settings.randomizeCellIteration = true;

// Characters
Settings.maxHealth = 10;
Settings.playerStart = {x: 10, y: 10}
Settings.wizardMin = {x: 35, y: 35}
