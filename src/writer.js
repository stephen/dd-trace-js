'use strict'

const platform = require('./platform')
const log = require('./log')
const format = require('./format')
const encode = require('./encode')
const tracerVersion = require('../lib/version')

class Writer {
  constructor (url, size) {
    this._queue = []
    this._url = url
    this._size = size
  }

  get length () {
    return this._queue.length
  }

  append (span) {
    const trace = span.context().trace

    if (trace.started.length === trace.finished.length) {
      const buffer = encode(trace.finished.map(format))

      if (this.length < this._size) {
        this._queue.push(buffer)
      } else {
        this._squeeze(buffer)
      }
    }
  }

  flush () {
    if (this._queue.length > 0) {
      const data = platform.msgpack.prefix(this._queue)

      platform
        .request({
          protocol: this._url.protocol,
          hostname: this._url.hostname,
          port: this._url.port,
          path: '/v0.3/traces',
          method: 'PUT',
          headers: {
            'Content-Type': 'application/msgpack',
            'Datadog-Meta-Lang': platform.name(),
            'Datadog-Meta-Lang-Version': platform.version(),
            'Datadog-Meta-Lang-Interpreter': platform.engine(),
            'Datadog-Meta-Tracer-Version': tracerVersion,
            'X-Datadog-Trace-Count': String(this._queue.length)
          },
          data
        })
        .catch(e => log.error(e))

      this._queue = []
    }
  }

  _squeeze (buffer) {
    const index = Math.floor(Math.random() * this.length)
    this._queue[index] = buffer
  }
}

module.exports = Writer
