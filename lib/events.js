// Super basic event-triggering mixin thing
window.Events = {};

Events.init = function(obj) {
    obj.on = this.on;
    obj.off = this.off;
    obj.emit = this.emit;
    obj.pauseEvent = this.pauseEvent;
    obj.resumeEvent = this.resumeEvent;
    obj.isPausedEvent = this.isPausedEvent;
    obj.paused_events = {};
    return obj;
}

Events.on = function(event, callback_id, callback) {
    if (typeof callback !== 'function') throw new Error('event listener call wants 3 arguments')
    Events._ensureEvent(this, event);
    this.callbacks[event][callback_id] = callback; 
}

Events.off = function(event, callback_id) {
    Events._ensureEvent(this, event);
    delete this.callbacks[event][callback_id];
}

Events.emit = function(event, data) {
    Events._ensureEvent(this, event);

    // TODO: event pausing should collect the data that gets sent on each emit() call
    // see comment in resume()
    if (this.paused_events[event]) return;

    if (Object.keys(this.callbacks[event]).length > 0) {
        for (var cb in this.callbacks[event]) {
            this.callbacks[event][cb](data);
        }
    }
}

Events._ensureEvent = function(obj, evt) {
    if (!obj.callbacks) obj.callbacks = {};
    if (!(evt in obj.callbacks)) {
        obj.callbacks[evt] = {};
        obj.paused_events[evt] = false;
    }
}


Events.pauseEvent = function(event) {
    this.paused_events[event] = true;
}

Events.resumeEvent = function(event) {
    this.paused_events[event] = false;

    // TODO: if it's collecting the event data during the paused period,
    // then maybe this should send the data?
    // (It's unclear how to aggregate the data in general.
    // Maybe there needs to be an aggregation function passed in.)
    this.emit(event, {});
}

Events.isPausedEvent = function(event) {
    return !!this.paused_events[event];
}