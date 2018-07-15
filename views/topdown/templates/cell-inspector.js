class CellInspectorTemplate {
    constructor(cell) { this.cell = cell; }

    render() {
        return `
        Coords: (${this.cell.coords.x}, ${this.cell.coords.y})
    
        Species:
    
        ${this.cell.getRegister().map(this.renderCellSpecies).join('\n')}
        `
    }

    renderCellSpecies = (reg) => {
        var is_dominant = reg.species.id == this.cell.species.id;
        
        return `${reg.species.id.toUpperCase() + (is_dominant ? " (Dominant)" : "")}
        -- strength: ${reg.strength}
        -- age: ${reg.age}
        `
    }
}

module.exports = CellInspectorTemplate;