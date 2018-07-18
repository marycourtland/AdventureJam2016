// Super hacky way to reference everything

var Catalogue = module.exports = {
    species: {},
    ruts: {},
    rules: {},
    add: (type, obj) => {
        if (!(type in Catalogue)) return;
        if (!obj.id) return;
        if (!(obj.id in Catalogue[type])) {
            Catalogue[type][obj.id] = obj;
        }
    }
}

window.catalogue = Catalogue;