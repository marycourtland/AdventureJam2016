var Clock = module.exports = function() {
    this.t = 0;
    this.scheduled_events = {};
    this.worker = new Worker('clock-worker.js');
    this.worker.postMessage({message: 'set-dt', dt: Settings.clockInterval});
    this.worker.onmessage = (e) => {
        this.tick(e.data)
    }
}

Clock.prototype = {};

Clock.prototype.tick = function(t) {
    this.t = t;
    if (typeof this.t == 'undefined') {
        throw '???'
    }
    var events = this.scheduled_events[t] || [];
    events.forEach((e) => e(t));
    delete this.scheduled_events[t];
}

// Priority is first-come first-served
Clock.prototype.schedule = function(dt, callback) {
    var t = this.t + Math.ceil(dt);
    if (isNaN(t)) throw new Error('oh no')
    if (!(t in this.scheduled_events)) this.scheduled_events[t] = [];
    this.scheduled_events[t].push(callback);
}

Clock.prototype.setClockInterval = function(dt) {
    this.worker.postMessage({message: 'set-dt', dt: dt});
}

Clock.prototype.increaseClockInterval = function(dt) {
    this.worker.postMessage({message: 'increase-dt', dt: dt});
}

Clock.prototype.decreaseClockInterval = function(dt) {
    this.worker.postMessage({message: 'decrease-dt', dt: dt});
}