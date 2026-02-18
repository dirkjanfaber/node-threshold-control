module.exports = function (RED) {
  'use strict'

  const { isValidThreshold, shouldCancelCountDown, getNextTransition } = require('../../lib/threshold-logic')

  function ThresholdControl (config) {
    RED.nodes.createNode(this, config)

    const node = this
    node.config = config
    let sendOutput = false
    let countDown = false
    let counter = 0
    let desiredState = 'unknown'
    let State = desiredState
    let fill = 'yellow'

    // Resolved threshold values — updated from context on each input for dynamic types
    let onThreshold = null
    let offThreshold = null
    const onThresholdType = config.onThresholdType || 'num'
    const offThresholdType = config.offThresholdType || 'num'
    let onDelay = Math.round(Number(config.onDelay))
    let offDelay = Math.round(Number(config.offDelay))

    // For static 'num' type, resolve once at startup
    if (onThresholdType === 'num') {
      onThreshold = Number(config.onThreshold)
    }
    if (offThresholdType === 'num') {
      offThreshold = Number(config.offThreshold)
    }

    const intervalId = setInterval(function () {
      if (countDown) {
        if (counter % 2 === 0) {
          node.status({
            fill: 'yellow',
            shape: 'dot',
            text: `Switching ${desiredState} in ${counter} sec`
          })
        } else {
          node.status({
            fill: 'yellow',
            shape: 'ring',
            text: `Switching ${desiredState} in ${counter} sec`
          })
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
              payload: RED.util.evaluateNodeProperty(node.config.onPayload, node.config.payloadOnType, node)
            })
          }
          if (desiredState === 'off' && node.config.payloadOffType !== 'nul') {
            node.send({
              payload: RED.util.evaluateNodeProperty(node.config.offPayload, node.config.payloadOffType, node)
            })
          }
          sendOutput = false
          countDown = false
          if (desiredState === 'on') {
            fill = 'green'
          }
          if (desiredState === 'off') {
            fill = 'red'
          }
          node.status({
            fill,
            shape: 'dot',
            text: `${desiredState}`
          })
          State = desiredState
        }
      }
    }, 1000)

    node.on('input', function (msg) {
      // Allow overriding thresholds and delays via message properties (backward compat)
      const onOverrideFromMsg = msg.onThreshold && Number(msg.onThreshold)
      const offOverrideFromMsg = msg.offThreshold && Number(msg.offThreshold)

      if (onOverrideFromMsg) {
        onThreshold = msg.onThreshold
      }
      if (offOverrideFromMsg) {
        offThreshold = msg.offThreshold
      }
      if (msg.onDelay === 0 || Number(msg.onDelay)) {
        onDelay = Math.round(msg.onDelay)
      }
      if (msg.offDelay === 0 || Number(msg.offDelay)) {
        offDelay = Math.round(msg.offDelay)
      }

      // Resolve onThreshold from its configured type unless overridden by msg
      const resolveOn = (done) => {
        if (onOverrideFromMsg) return done()
        RED.util.evaluateNodeProperty(config.onThreshold, onThresholdType, node, msg, function (err, val) {
          if (!err && val !== undefined) {
            onThreshold = val
          }
          done()
        })
      }

      // Resolve offThreshold from its configured type unless overridden by msg
      const resolveOff = (done) => {
        if (offOverrideFromMsg) return done()
        RED.util.evaluateNodeProperty(config.offThreshold, offThresholdType, node, msg, function (err, val) {
          if (!err && val !== undefined) {
            offThreshold = val
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

    function processInput (msg) {
      if (msg.payload && !Number(msg.payload)) {
        node.status({
          fill: 'red',
          shape: 'dot',
          text: 'Non-numerical input'
        })
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

      msg.topic = 'Threshold control'

      if (countDown && shouldCancelCountDown(msg.payload, Number(onThreshold), Number(offThreshold), desiredState)) {
        desiredState = State
        countDown = false
        counter = 0
      }

      if (!countDown) {
        node.status({ fill, shape: 'dot', text: `${desiredState}` })
      }

      const transition = getNextTransition(msg.payload, Number(onThreshold), Number(offThreshold), desiredState, counter)
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
