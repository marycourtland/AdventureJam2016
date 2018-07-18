// This is the procedure which executes the advancing of the environment species
// from one iteration to the next.
//
// Takes an environment and advances it to its next iteration.


var Advancerator = module.exports = function(env) {
    var range = env.shuffledRange();

    // compute the next iteration 
    range.forEach(function(coords) {
        var cell = env.get(coords);
        var neighbors = env.neighbors(coords);
        cell.next(neighbors);
    })
    
    // now set them all
    range.forEach(function(coords) {
        env.get(coords).flush();
    })
}
