import { EventEmitter } from 'events'

let NodeConstructor: (this: any, config: any) => void

const RED = {
  nodes: {
    createNode (node: any, _config: any): void {
      const ee = new EventEmitter()
      node.on = ee.on.bind(ee)
      node.emit = ee.emit.bind(ee)
      node.status = jest.fn()
      node.send = jest.fn()
      node.warn = jest.fn()
    },
    registerType (_name: string, ctor: (this: any, config: any) => void): void {
      NodeConstructor = ctor
    }
  },
  util: {
    evaluateNodeProperty: jest.fn((value: unknown, type: string, _node: unknown, _msg: unknown, cb?: (err: null, val: unknown) => void) => {
      const result = type === 'num' ? Number(value) : value
      if (cb) cb(null, result)
      return result
    })
  }
}

require('../threshold-control')(RED)

const DEFAULT_CONFIG = {
  onPayload: '1',
  payloadOnType: 'num',
  offPayload: '0',
  payloadOffType: 'num',
  onThreshold: '100',
  onThresholdType: 'num',
  offThreshold: '80',
  offThresholdType: 'num',
  onDelay: '0',
  offDelay: '0'
}

function createNode (config: Record<string, unknown> = {}): any {
  const node: any = {}
  NodeConstructor.call(node, { ...DEFAULT_CONFIG, ...config })
  return node
}

function input (node: any, payload: unknown, extras: Record<string, unknown> = {}): void {
  node.emit('input', { payload, ...extras })
}

describe('threshold-control', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('input validation', () => {
    it('rejects non-numerical payload', () => {
      const node = createNode()
      input(node, 'hello')
      expect(node.status).toHaveBeenCalledWith({ fill: 'red', shape: 'dot', text: 'Non-numerical input' })
      expect(node.send).not.toHaveBeenCalled()
    })

    it('rejects invalid onThreshold', () => {
      const node = createNode({ onThreshold: 'abc' })
      input(node, 90)
      expect(node.status).toHaveBeenCalledWith(
        expect.objectContaining({ fill: 'red', text: expect.stringContaining('ON threshold') })
      )
    })

    it('rejects invalid offThreshold', () => {
      const node = createNode({ offThreshold: 'abc' })
      input(node, 90)
      expect(node.status).toHaveBeenCalledWith(
        expect.objectContaining({ fill: 'red', text: expect.stringContaining('OFF threshold') })
      )
    })
  })

  describe('initial state', () => {
    it('sets on immediately when first payload exceeds onThreshold', () => {
      const node = createNode()
      input(node, 110)
      expect(node.status).toHaveBeenCalledWith({ fill: 'green', shape: 'dot', text: 'on' })
      expect(node.send).not.toHaveBeenCalled()
    })

    it('sets off immediately when first payload is below offThreshold', () => {
      const node = createNode()
      input(node, 70)
      expect(node.status).toHaveBeenCalledWith({ fill: 'red', shape: 'dot', text: 'off' })
      expect(node.send).not.toHaveBeenCalled()
    })

    it('shows blue unknown status when first payload is between thresholds', () => {
      const node = createNode()
      input(node, 90)
      expect(node.status).toHaveBeenCalledWith({ fill: 'blue', shape: 'dot', text: 'unknown' })
    })

    it('does not start a countdown for the initial state', () => {
      const node = createNode({ onDelay: '10' })
      input(node, 110)
      jest.advanceTimersByTime(15000)
      expect(node.send).not.toHaveBeenCalled()
    })
  })

  describe('state transitions', () => {
    it('starts yellow countdown when payload crosses onThreshold', () => {
      const node = createNode({ onDelay: '5' })
      input(node, 70)   // initial: off
      input(node, 110)  // cross onThreshold; yellow status appears on first tick
      jest.advanceTimersByTime(1000)
      expect(node.status).toHaveBeenCalledWith(
        expect.objectContaining({ fill: 'yellow', text: expect.stringContaining('on') })
      )
    })

    it('sends on payload after onDelay expires', () => {
      const node = createNode({ onDelay: '2' })
      input(node, 70)   // initial: off
      input(node, 110)  // trigger countdown (counter=2)
      jest.advanceTimersByTime(3000) // 3 ticks: counter 2→1→0→fire
      expect(node.send).toHaveBeenCalledWith({ payload: 1 })
    })

    it('sends off payload after offDelay expires', () => {
      const node = createNode({ offDelay: '2' })
      input(node, 110)  // initial: on
      input(node, 70)   // trigger off countdown (counter=2)
      jest.advanceTimersByTime(3000) // 3 ticks: counter 2→1→0→fire
      expect(node.send).toHaveBeenCalledWith({ payload: 0 })
    })

    it('cancels on countdown when payload drops back below onThreshold', () => {
      const node = createNode({ onDelay: '5' })
      input(node, 70)   // initial: off
      input(node, 110)  // start on countdown
      jest.advanceTimersByTime(2000)
      input(node, 90)   // drops below onThreshold → cancel
      jest.advanceTimersByTime(5000)
      expect(node.send).not.toHaveBeenCalledWith({ payload: 1 })
    })

    it('cancels off countdown when payload rises back above offThreshold', () => {
      const node = createNode({ offDelay: '5' })
      input(node, 110)  // initial: on
      input(node, 70)   // start off countdown
      jest.advanceTimersByTime(2000)
      input(node, 90)   // rises above offThreshold → cancel
      jest.advanceTimersByTime(5000)
      expect(node.send).not.toHaveBeenCalledWith({ payload: 0 })
    })

    it('updates status to green after on transition completes', () => {
      const node = createNode()
      input(node, 70)   // initial: off
      input(node, 110)  // trigger countdown (counter=0)
      jest.advanceTimersByTime(1000) // 1 tick: counter=0 → fire
      expect(node.status).toHaveBeenCalledWith({ fill: 'green', shape: 'dot', text: 'on' })
    })

    it('updates status to red after off transition completes', () => {
      const node = createNode()
      input(node, 110)  // initial: on
      input(node, 70)   // trigger countdown (counter=0)
      jest.advanceTimersByTime(1000) // 1 tick: counter=0 → fire
      expect(node.status).toHaveBeenCalledWith({ fill: 'red', shape: 'dot', text: 'off' })
    })

    it('does not send output when payloadOnType is nul', () => {
      const node = createNode({ payloadOnType: 'nul' })
      input(node, 70)   // initial: off
      input(node, 110)  // trigger countdown
      jest.advanceTimersByTime(1000)
      expect(node.send).not.toHaveBeenCalledWith({ payload: 1 })
    })

    it('does not send output when payloadOffType is nul', () => {
      const node = createNode({ payloadOffType: 'nul' })
      input(node, 110)  // initial: on
      input(node, 70)   // trigger countdown
      jest.advanceTimersByTime(1000)
      expect(node.send).not.toHaveBeenCalledWith({ payload: 0 })
    })
  })

  describe('overrides from message', () => {
    it('uses onThreshold from message', () => {
      const node = createNode()
      input(node, 90, { onThreshold: 85 })  // 90 > 85 → initial on
      expect(node.status).toHaveBeenCalledWith({ fill: 'green', shape: 'dot', text: 'on' })
    })

    it('uses offThreshold from message', () => {
      const node = createNode()
      input(node, 110)                          // initial: on
      input(node, 110, { offThreshold: 115 })  // 110 <= 115 → off transition
      jest.advanceTimersByTime(1000)
      expect(node.send).toHaveBeenCalledWith({ payload: 0 })
    })

    it('uses onDelay from message', () => {
      const node = createNode({ onDelay: '10' })
      input(node, 70)
      input(node, 110, { onDelay: 1 })  // override to 1, so 2 ticks needed
      jest.advanceTimersByTime(2000)
      expect(node.send).toHaveBeenCalledWith({ payload: 1 })
    })

    it('uses offDelay from message', () => {
      const node = createNode({ offDelay: '10' })
      input(node, 110)
      input(node, 70, { offDelay: 1 })  // override to 1
      jest.advanceTimersByTime(2000)
      expect(node.send).toHaveBeenCalledWith({ payload: 0 })
    })
  })

  describe('node lifecycle', () => {
    it('clears the interval on close', () => {
      const spy = jest.spyOn(global, 'clearInterval')
      const node = createNode()
      node.emit('close')
      expect(spy).toHaveBeenCalled()
    })

    it('warns when verbose is enabled', () => {
      const node = createNode({ verbose: true })
      expect(node.warn).toHaveBeenCalledWith('verbose')
    })
  })
})
