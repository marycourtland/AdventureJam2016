var t = 0;
var dt = 200;

var min_dt = 10;
var max_dt = 10000;

var onmessage = function(e) {
    if (typeof e.data !== 'object') return;
    var new_dt;
    if (e.data.message == 'set-dt') {
        new_dt = parseInt(e.data.dt);
    }
    if (e.data.message == 'increase-dt') {
        new_dt = dt + parseInt(e.data.dt);
    }
    if (e.data.message == 'decrease-dt') {
        new_dt = dt - parseInt(e.data.dt);
    }
    if (!isNaN(new_dt)) {
        dt = Math.max(min_dt, Math.min(max_dt, new_dt));
    }
    console.log('new interval:', dt)
}

var tick = function() {
    postMessage(t)
    t += 1;
    setTimeout(tick, dt);
}

tick();