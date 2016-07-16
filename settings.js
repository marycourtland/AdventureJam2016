// not included in browserify bundle
window.Settings = {};

Settings.mode = 'default';
var modeMatch = window.location.search.match(/mode=([^?]*)/i);
if (modeMatch && modeMatch[1]) Settings.mode = modeMatch[1].toLowerCase();


// === Feature flags
Settings.advanceAllCells = false; // advance all the cells at the same time, periodically

// === Game settings
Settings.mapSize = {x: 60, y:60}; // measured in game cells
Settings.gameAnchor = [0.5, -0.5];
Settings.gameAnchor = [0.5, 0.5];
Settings.gameDims = {x: 4000, y: 4000}; // pixels
Settings.cellDims = {x: 38, y:38}; // isometric pixels per cell
Settings.cameraDeadzone = 0.4;

// TEST SETTINGS - smaller map etc
if (Settings.mode === 'test') {
    Settings.mapSize = {x: 10, y:10};
    Settings.gameAnchor = [0.5, 0.2];
    Settings.gameDims = {x: 1000, y: 1000};
}


// === Map iteration
// if the randomize switch is on, it only makes sense to do timeout at least 10sec, if not 20
Settings.mapIterationTimeout    = 20000; // millis between map updates. Use 0 to disable automatic updates
Settings.randomizeCellIteration = true;

// === Characters
Settings.maxHealth = 10;
Settings.playerStart = {x: 20, y: 10};
Settings.wizardMin = {x: 35, y: 35};
Settings.wizardStart = {x: 3, y: 5};
Settings.defaultSpeed = 500;

if (Settings.mode === 'test') {
    Settings.playerStart = {x: 8, y: 1};
    Settings.wizardStart = {x: 1, y: 8};
}


// === Items
Settings.itemUsageRadii = {
    // How far away from yourself can you place these items?
    neutralizer: 6,
    bomb: 3,
    camera: 1.5,
    detector: 1.5
}

