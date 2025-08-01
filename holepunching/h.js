const PING = 0
const PING_NAT = 1
const FIND_NODE = 2
const DOWN_HINT = 3



class NatSampler {
    constructor () {
      this.host = null
      this.port = 0
      this.size = 0
  
      this._a = null
      this._b = null
      this._threshold = 0
      this._top = 0
      this._samples = []
    }
  
    add (host, port) {
      const a = this._bump(host, port, 2)
      const b = this._bump(host, 0, 1)
  
      if (this._samples.length < 32) {
        this.size++
        this._threshold = this.size - (this.size < 4 ? 0 : this.size < 8 ? 1 : this.size < 12 ? 2 : 3)
        this._samples.push(a, b)
        this._top += 2
      } else {
        if (this._top === 32) this._top = 0
  
        const oa = this._samples[this._top]
        this._samples[this._top++] = a
        oa.hits--
  
        const ob = this._samples[this._top]
        this._samples[this._top++] = b
        ob.hits--
      }
  
      if (this._a === null || this._a.hits < a.hits) this._a = a
      if (this._b === null || this._b.hits < b.hits) this._b = b
  
      if (this._a.hits >= this._threshold) {
        this.host = this._a.host
        this.port = this._a.port
      } else if (this._b.hits >= this._threshold) {
        this.host = this._b.host
        this.port = 0
      } else {
        this.host = null
        this.port = 0
      }
  
      return a.hits
    }
  
    _bump (host, port, inc) {
      for (let i = 0; i < 4; i++) {
        const j = (this._top - inc - (2 * i)) & 31
        if (j >= this._samples.length) return { host, port, hits: 1 }
        const s = this._samples[j]
        if (s.port === port && s.host === host) {
          s.hits++
          return s
        }
      }
      return { host, port, hits: 1 }
    }
  }
  
async function _checkIfFirewalled (natSampler = new NatSampler()) {
    const nodes = []
    for (let node = this.nodes.latest; node && nodes.length < 5; node = node.prev) {
      nodes.push(node)
    }

    if (nodes.length < 5) await this._addBootstrapNodes(nodes)
    // if no nodes are available, including bootstrappers - bail
    if (nodes.length === 0) return true

    const hosts = new Set()
    const value = b4a.allocUnsafe(2)

    c.uint16.encode({ start: 0, end: 2, buffer: value }, this.io.serverSocket.address().port)

    // double check they actually came on the server socket...
    this.io.serverSocket.on('message', onmessage)

    const pongs = await requestAll(this, true, PING_NAT, value, nodes)

    let count = 0
    for (const res of pongs) {
      if (hosts.has(res.from.host)) {
        count++
        natSampler.add(res.to.host, res.to.port)
      }
    }

    this.io.serverSocket.removeListener('message', onmessage)

    // if we got no or very few replies, consider it a fluke
    if (count < (nodes.length >= 5 ? 3 : 1)) return true

    // check that the server socket has the same ip as the client socket
    if (natSampler.host === null || this._nat.host !== natSampler.host) return true

    // check that the local port of the server socket is the same as the remote port
    // TODO: we might want a flag to opt out of this heuristic for specific remapped port servers
    if (natSampler.port === 0 || natSampler.port !== this.io.serverSocket.address().port) return true

    return false

    function onmessage (_, { host }) {
      hosts.add(host)
    }
  }

  