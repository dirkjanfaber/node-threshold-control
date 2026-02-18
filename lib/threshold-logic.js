'use strict'

/**
 * Returns true if the value can be used as a numeric threshold.
 * @param {*} value
 * @returns {boolean}
 */
function isValidThreshold (value) {
  return value !== undefined && value !== null && value !== '' && !isNaN(Number(value))
}

/**
 * Returns true if an active countdown should be cancelled based on current payload.
 * The caller is responsible for only calling this when countDown is active.
 * @param {number} payload
 * @param {number} onThreshold
 * @param {number} offThreshold
 * @param {string} desiredState - 'on' or 'off'
 * @returns {boolean}
 */
function shouldCancelCountDown (payload, onThreshold, offThreshold, desiredState) {
  if (desiredState === 'on' && payload < onThreshold) return true
  if (desiredState === 'off' && payload > offThreshold) return true
  return false
}

/**
 * Returns the next state transition if the payload crosses a threshold, or null.
 * @param {number} payload
 * @param {number} onThreshold
 * @param {number} offThreshold
 * @param {string} desiredState - current desired state
 * @param {number} counter - current countdown value (0 means idle)
 * @returns {{ desiredState: string, startCountDown: boolean } | null}
 */
function getNextTransition (payload, onThreshold, offThreshold, desiredState, counter) {
  if (payload >= onThreshold && desiredState !== 'on' && counter === 0) {
    return { desiredState: 'on', startCountDown: true }
  }
  if (payload <= offThreshold && desiredState !== 'off' && counter === 0) {
    return { desiredState: 'off', startCountDown: true }
  }
  return null
}

/**
 * Determines the initial state from the first received payload.
 * @param {number} payload
 * @param {number} onThreshold
 * @param {number} offThreshold
 * @returns {'on' | 'off' | 'unknown'}
 */
function getInitialState (payload, onThreshold, offThreshold) {
  if (payload >= onThreshold) return 'on'
  if (payload <= offThreshold) return 'off'
  return 'unknown'
}

module.exports = {
  isValidThreshold,
  shouldCancelCountDown,
  getNextTransition,
  getInitialState
}
