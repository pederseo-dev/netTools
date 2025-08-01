class RoutingTable {
  /**
   * Crea una nueva tabla de ruteo.
   * @param {Buffer} localNodeId - El ID del nodo local (Buffer de bytes).
   * @param {Object} options - Opciones de configuración.
   * @param {number} options.bucketSize - Cantidad máxima de nodos por bucket (default: 20).
   */
  constructor(localNodeId, options = {}) {
    this.localNodeId = localNodeId
    this.bucketSize = options.bucketSize || 20
    this.totalNodes = 0

    // Crea un arreglo de buckets (filas) vacío. Cada fila representa un rango de distancia.
    this.buckets = new Array(localNodeId.length * 8)
  }

  /**
   * Agrega un nodo a la tabla.
   * @param {{id: Buffer}} remoteNode - Nodo remoto con su ID.
   * @returns {boolean} true si fue agregado, false si el bucket está lleno o ya existía.
   */
  addNode(remoteNode) {
    const bucketIndex = this._calculateBucketIndex(remoteNode.id)
    let bucket = this.buckets[bucketIndex]

    // Si el bucket aún no existe, se crea.
    if (!bucket) {
      bucket = this.buckets[bucketIndex] = new Bucket(this, bucketIndex)
    }

    const initialLength = bucket.nodes.length

    if (!bucket.addNode(remoteNode)) return false

    // Se incrementa el contador total si realmente se añadió un nuevo nodo.
    this.totalNodes += bucket.nodes.length - initialLength
    return true
  }

  /**
   * Elimina un nodo por su ID.
   * @param {Buffer} nodeId
   * @returns {boolean} true si fue eliminado, false si no existía.
   */
  removeNode(nodeId) {
    const bucketIndex = this._calculateBucketIndex(nodeId)
    const bucket = this.buckets[bucketIndex]
    if (!bucket) return false
    if (!bucket.removeNode(nodeId)) return false
    this.totalNodes--
    return true
  }

  /**
   * Obtiene un nodo por su ID exacto.
   * @param {Buffer} nodeId
   * @returns {{id: Buffer} | null}
   */
  getNode(nodeId) {
    const bucketIndex = this._calculateBucketIndex(nodeId)
    const bucket = this.buckets[bucketIndex]
    if (!bucket) return null
    return bucket.getNode(nodeId)
  }

  /**
   * Verifica si un nodo existe en la tabla.
   * @param {Buffer} nodeId
   * @returns {boolean}
   */
  hasNode(nodeId) {
    return this.getNode(nodeId) !== null
  }

  /**
   * Devuelve un nodo aleatorio de la tabla.
   * @returns {{id: Buffer} | null}
   */
  getRandomNode() {
    let index = (Math.random() * this.totalNodes) | 0

    for (const bucket of this.buckets) {
      if (!bucket) continue
      if (index < bucket.nodes.length) return bucket.nodes[index]
      index -= bucket.nodes.length
    }

    return null
  }

  /**
   * Devuelve los nodos más cercanos a un ID dado, usando la métrica XOR.
   * @param {Buffer} targetId - ID al que queremos acercarnos.
   * @param {number} [count] - Cuántos nodos queremos (default: tamaño de bucket).
   * @returns {Array<{id: Buffer}>}
   */
  findClosestNodes(targetId, count = this.bucketSize) {
    const result = []
    const targetBucketIndex = this._calculateBucketIndex(targetId)

    // Primero mira hacia atrás (más cercanos en teoría)
    for (let i = targetBucketIndex; i >= 0 && result.length < count; i--) {
      this._addNodesFromBucket(i, count, result)
    }

    // Luego hacia adelante si aún faltan nodos
    for (let i = targetBucketIndex + 1; i < this.buckets.length && result.length < count; i++) {
      this._addNodesFromBucket(i, count, result)
    }

    return result
  }

  /**
   * Devuelve todos los nodos ordenados por cercanía al nodo local.
   */
  toArray() {
    return this.findClosestNodes(this.localNodeId, Infinity)
  }

  /**
   * Agrega nodos de un bucket específico a un resultado acumulado.
   * @private
   */
  _addNodesFromBucket(bucketIndex, maxCount, resultList) {
    const bucket = this.buckets[bucketIndex]
    if (!bucket) return

    const remainingSlots = Math.min(maxCount - resultList.length, bucket.nodes.length)
    for (let i = 0; i < remainingSlots; i++) {
      resultList.push(bucket.nodes[i])
    }
  }

  /**
   * Calcula en qué bucket debería estar un nodo según su diferencia de ID.
   * @private
   */
  _calculateBucketIndex(nodeId) {
    for (let i = 0; i < nodeId.length; i++) {
      const a = nodeId[i]
      const b = this.localNodeId[i]
      if (a !== b) {
        return i * 8 + Math.clz32(a ^ b) - 24
      }
    }

    // Si el ID es igual, se coloca en el último bucket
    return this.buckets.length - 1
  }
}
