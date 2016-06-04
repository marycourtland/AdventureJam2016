// not included in browserify bundle
window.Settings = {};

// Feature flags

// advance all the cells at the same time, periodically
Settings.advanceAllCells = false;

// Game settings
Settings.gameAnchor = [0.5, -0.5]
Settings.gameSize = {x: 60, y:60}; // cells
Settings.cellDims = {x: 38, y:38}; // pixels per cell (isometric)


// Map iteration
// if the randomize switch is on, it only makes sense to do timeout at least 10sec, if not 20
Settings.mapIterationTimeout    = 100000; // millis between map updates. Use 0 to disable automatic updates
Settings.randomizeCellIteration = true;

// Characters
Settings.maxHealth = 10;
Settings.playerStart = {x: 20, y: 20}
Settings.wizardMin = {x: 35, y: 35}


// Items
Settings.itemUsageRadii = {
    // How far away from yourself can you place these items?
    neutralizer: 6,
    bomb: 3,
    camera: 1.5,
    detector: 1.5
}
