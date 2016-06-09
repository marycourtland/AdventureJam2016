// not included in browserify bundle
window.Settings = {};

// Feature flags

// advance all the cells at the same time, periodically
Settings.advanceAllCells = false;

// Game settings
Settings.gameAnchor = [0.5, -0.5]
Settings.gameAnchor = [0.5,0.2]
Settings.gameDims = {x: 1000, y: 1000}; // usually 5k
Settings.gameSize = {x: 10, y:10}; // cells
Settings.cellDims = {x: 38, y:38}; // pixels per cell (isometric)
Settings.cameraDeadzone = 0.6;  


// Map iteration
// if the randomize switch is on, it only makes sense to do timeout at least 10sec, if not 20
Settings.mapIterationTimeout    = 10000; // millis between map updates. Use 0 to disable automatic updates
Settings.randomizeCellIteration = true;

// Characters
Settings.maxHealth = 10;
Settings.playerStart = {x: 7, y: 7};
Settings.wizardMin = {x: 35, y: 35};
Settings.defaultSpeed = 500;

// Items
Settings.itemUsageRadii = {
    // How far away from yourself can you place these items?
    neutralizer: 6,
    bomb: 3,
    camera: 1.5,
    detector: 1.5
}
