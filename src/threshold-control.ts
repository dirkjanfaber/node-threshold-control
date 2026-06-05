import type NodeRed from 'node-red'
import { type NodeDef, type Node, type NodeStatusFill, type NodeMessageInFlow } from '@node-red/registry'
import { isValidThreshold, shouldCancelCountDown, getNextTransition, type DesiredState } from './threshold-logic'

type NodeAPI = NodeRed.NodeAPI

interface ThresholdControlConfig extends NodeDef {
  onPayload: string
  payloadOnType: string
  offPayload: string
  payloadOffType: string
  onThreshold: string
  onThresholdType: string
  offThreshold: string
  offThresholdType: string
  onDelay: string
  offDelay: string
  verbose?: boolean
}

interface ThresholdControlNode extends Node {
  config: ThresholdControlConfig
}

module.exports = function (RED: NodeAPI) {
  function ThresholdControl (this: ThresholdControlNode, config: ThresholdControlConfig) {
    RED.nodes.createNode(this, config)

    const node = this
    node.config = config
    let sendOutput = false
    let countDown = false
    let counter = 0
    let desiredState: DesiredState = 'unknown'
    let State: DesiredState = desiredState
    let fill: NodeStatusFill = 'yellow'

    let onThreshold: number | null = null
    let offThreshold: number | null = null
    const onThresholdType: string = config.onThresholdType || 'num'
    const offThresholdType: string = config.offThresholdType || 'num'
    let onDelay: number = Math.round(Number(config.onDelay))
    let offDelay: number = Math.round(Number(config.offDelay))

    if (onThresholdType === 'num') {
      onThreshold = Number(config.onThreshold)
    }
    if (offThresholdType === 'num') {
      offThreshold = Number(config.offThreshold)
    }

    const intervalId = setInterval(function () {
      if (countDown) {
        if (counter % 2 === 0) {
          node.status({ fill: 'yellow', shape: 'dot', text: `Switching ${desiredState} in ${counter} sec` })
        } else {
          node.status({ fill: 'yellow', shape: 'ring', text: `Switching ${desiredState} in ${counter} sec` })
        }
        if (desiredState === 'on') {
          node.send([null, { payload: counter, blink: counter % 2 }, null])
        } else {
          node.send([null, null, { payload: counter, blink: counter % 2 }])
        }
        if (counter > 0) {
          counter--
        } else {
          sendOutput = true
        }
        if (sendOutput) {
          if (desiredState === 'on' && node.config.payloadOnType !== 'nul') {
            node.send({
              payload: RED.util.evaluateNodeProperty(node.config.onPayload, node.config.payloadOnType, node, {})
            })
          }
          if (desiredState === 'off' && node.config.payloadOffType !== 'nul') {
            node.send({
              payload: RED.util.evaluateNodeProperty(node.config.offPayload, node.config.payloadOffType, node, {})
            })
          }
          sendOutput = false
          countDown = false
          fill = desiredState === 'on' ? 'green' : 'red'
          node.status({ fill, shape: 'dot', text: `${desiredState}` })
          State = desiredState
        }
      }
    }, 1000)

    node.on('input', function (msg: NodeMessageInFlow) {
      const msgExt = msg as NodeMessageInFlow & Record<string, unknown>
      const onOverrideFromMsg = msgExt.onThreshold && Number(msgExt.onThreshold)
      const offOverrideFromMsg = msgExt.offThreshold && Number(msgExt.offThreshold)

      if (onOverrideFromMsg) {
        onThreshold = msgExt.onThreshold as number
      }
      if (offOverrideFromMsg) {
        offThreshold = msgExt.offThreshold as number
      }
      if (msgExt.onDelay === 0 || Number(msgExt.onDelay)) {
        onDelay = Math.round(msgExt.onDelay as number)
      }
      if (msgExt.offDelay === 0 || Number(msgExt.offDelay)) {
        offDelay = Math.round(msgExt.offDelay as number)
      }

      const resolveOn = (done: () => void) => {
        if (onOverrideFromMsg) return done()
        RED.util.evaluateNodeProperty(config.onThreshold, onThresholdType, node, msg, function (err: Error | null, val: unknown) {
          if (!err && val !== undefined) {
            onThreshold = val as number
          }
          done()
        })
      }

      const resolveOff = (done: () => void) => {
        if (offOverrideFromMsg) return done()
        RED.util.evaluateNodeProperty(config.offThreshold, offThresholdType, node, msg, function (err: Error | null, val: unknown) {
          if (!err && val !== undefined) {
            offThreshold = val as number
          }
          done()
        })
      }

      resolveOn(() => {
        resolveOff(() => {
          processInput(msg)
        })
      })
    })

    function processInput (msg: NodeMessageInFlow) {
      if (msg.payload && !Number(msg.payload)) {
        node.status({ fill: 'red', shape: 'dot', text: 'Non-numerical input' })
        return
      }

      if (!isValidThreshold(onThreshold)) {
        node.status({ fill: 'red', shape: 'dot', text: 'No or non-mumerical ON threshold set' })
        return
      }

      if (!isValidThreshold(offThreshold)) {
        node.status({ fill: 'red', shape: 'dot', text: 'No or non-mumerical OFF threshold set' })
        return
      }

      if (State === 'unknown') {
        fill = 'blue'
      }

      if (countDown && shouldCancelCountDown(Number(msg.payload), Number(onThreshold), Number(offThreshold), desiredState)) {
        desiredState = State
        countDown = false
        counter = 0
      }

      if (!countDown) {
        node.status({ fill, shape: 'dot', text: `${desiredState}` })
      }

      const transition = getNextTransition(Number(msg.payload), Number(onThreshold), Number(offThreshold), desiredState, counter)
      if (transition) {
        desiredState = transition.desiredState
        counter = desiredState === 'on' ? onDelay : offDelay
        countDown = true
      }
    }

    node.on('close', function () {
      clearInterval(intervalId)
    })

    if (config.verbose) {
      node.warn('verbose')
    }
  }

  RED.nodes.registerType('threshold-control', ThresholdControl)
}
