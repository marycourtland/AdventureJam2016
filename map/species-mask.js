// THE POINT OF THIS MODULE IS....
//
//    ... To take a cell object and decide whether it has a species in it.
//    :D

var masks = {
    true: 1,
    false: 0
}

module.exports = SpeciesMask = function(species) {
    return function(cell) {
        if (!cell || !cell.species) return masks[false];
        return masks[cell.species.id === species.id];
    }
}
