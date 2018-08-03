// not included in browserify bundle
window.Settings = {};

// ok this could go in a lib somewhere
function getUrlParam(key) {
    var match = window.location.search.match(new RegExp(key + '=([^?&]*)', 'i'));
    if (match && match[1]) return match[1];
    else return null;
}

Settings.view = getUrlParam('view') || 'phaserIso';
Settings.mode = getUrlParam('mode') || 'default';

// === Game settings
Settings.mapSize = {x: 60, y:60}; // measured in game cells
Settings.gameAnchor = [0.5, -0.5];
Settings.gameAnchor = [0.5, 0.5];
Settings.gameDims = {x: 4000, y: 4000}; // pixels
Settings.cellDims = {x: 24, y:24}; // isometric pixels per cell
Settings.cameraDeadzone = 0.4;

// TEST SETTINGS - smaller map etc
if (Settings.mode === 'test') {
    Settings.mapSize = {x: 20, y:20};
    Settings.gameAnchor = [0.5, 0.2];
    Settings.gameDims = {x: 1000, y: 1000};
}


// === Map iteration
// if the randomize switch is on, it only makes sense to do timeout at least 10sec, if not 20
Settings.mapIterationTimeout    = 200; // millis between map updates. Use 0 to disable automatic updates
Settings.randomizeCellIteration = true;
Settings.clockInterval = 50;

// === Characters
Settings.maxHealth = 10;
Settings.playerStart = {x: 30, y: 30};
Settings.wizardMin = {x: 35, y: 35};
Settings.wizardStart = {x: 3, y: 5};
Settings.defaultSpeed = 500;

if (Settings.mode === 'test') {
    Settings.playerStart = {x: 8, y: 1};
    Settings.wizardStart = {x: 8, y: 9};
}


// === Items
Settings.itemUsageRadii = {
    // How far away from yourself can you place these items?
    neutralizer: 6,
    bomb: 3,
    camera: 1.5,
    detector: 1.5
}

Settings.margin = 6;
Settings.visibilityPlayer = 6;
Settings.visibilityCamera = 3;
