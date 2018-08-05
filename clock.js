var Clock = module.exports = function() {
    this.t = 0;
    this.dt = Settings.clockInterval;
    this.long_tick = 1;
    this.scheduled_events = {};
    this.worker = new Worker('clock-worker.js');
    this.worker.postMessage({message: 'set-dt', dt: this.dt});
    this.worker.onmessage = (e) => {
        this.tick(e.data)
    }
}

Clock.prototype = {};

Clock.prototype.tick = function(t) {
    if (typeof this.t == 'undefined') {
        return;
    }
    this.t = t;
    var is_long_tick = this.long_tick == 1 ? undefined : t % this.long_tick === 0;

    var events = this.scheduled_events[t] || {};
    // console.log('tick', t, 'scheduled:' + num_scheduled, 'events:' + Object.keys(events).length, 'is_long_tick:'+is_long_tick)
    num_scheduled = 0;

    Object.keys(events).forEach((e) => {
        if (typeof events[e] === 'function') events[e](t, is_long_tick)
    });
    delete this.scheduled_events[t];
}

var num_scheduled = 0; // just for logging

// Priority is first-come first-served
Clock.prototype.schedule = function(dt, callback, label) {
    var t = this.t + Math.ceil(dt);

    if (!(t in this.scheduled_events)) this.scheduled_events[t] = [];

    label = label || 'callback_' + Object.keys(this.scheduled_events[t]).length;
    this.scheduled_events[t][label] = callback;

    num_scheduled += 1;

    return [t, label];
}

Clock.prototype.cancel = function(t, callback_label) {
    if (!t || !(t in this.scheduled_events)) return;
    delete this.scheduled_events[t][callback_label];
}

Clock.prototype.setClockInterval = function(dt) {
    this.dt = dt;
    this.worker.postMessage({message: 'set-dt', dt: dt});
    this.checkForTimeAggregation();
}

Clock.prototype.increaseClockInterval = function(dt) {
    this.setClockInterval(this.dt + dt);
}

Clock.prototype.decreaseClockInterval = function(dt) {
    this.setClockInterval(this.dt - dt);
}

Clock.prototype.checkForTimeAggregation = function() {
    this.long_tick = (this.dt <= Settings.longTickLimit) ? Settings.longTick : 1;
}