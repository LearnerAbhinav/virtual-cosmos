class SpatialHashGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map(); // key format "x,y" => Set of clientIds
    this.clientPositions = new Map(); // clientId => {x, y}
  }

  _getKey(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  insertClient(clientId, x, y) {
    const key = this._getKey(x, y);
    if (!this.cells.has(key)) {
      this.cells.set(key, new Set());
    }
    this.cells.get(key).add(clientId);
    this.clientPositions.set(clientId, key);
  }

  updateClient(clientId, x, y) {
    const oldKey = this.clientPositions.get(clientId);
    const newKey = this._getKey(x, y);
    
    if (oldKey !== newKey) {
       this.removeClient(clientId);
       this.insertClient(clientId, x, y);
    }
  }

  removeClient(clientId) {
    const key = this.clientPositions.get(clientId);
    if (key && this.cells.has(key)) {
      this.cells.get(key).delete(clientId);
      if (this.cells.get(key).size === 0) {
        this.cells.delete(key);
      }
    }
    this.clientPositions.delete(clientId);
  }

  findNear(x, y, radius) {
    const result = new Set();
    // bounding box cells
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = `${cx},${cy}`;
        if (this.cells.has(key)) {
          const clients = this.cells.get(key);
          for (const c of clients) {
            result.add(c);
          }
        }
      }
    }
    return result;
  }
}

module.exports = SpatialHashGrid;
