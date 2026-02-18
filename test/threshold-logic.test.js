'use strict'

const {
  isValidThreshold,
  shouldCancelCountDown,
  getNextTransition,
  getInitialState
} = require('../lib/threshold-logic')

describe('threshold-logic', () => {
  describe('isValidThreshold', () => {
    it('accepts valid numbers', () => {
      expect(isValidThreshold(100)).toBe(true)
      expect(isValidThreshold('100')).toBe(true)
      expect(isValidThreshold(0)).toBe(true)
      expect(isValidThreshold(-50)).toBe(true)
      expect(isValidThreshold(1.5)).toBe(true)
    })

    it('rejects invalid values', () => {
      expect(isValidThreshold(undefined)).toBe(false)
      expect(isValidThreshold(null)).toBe(false)
      expect(isValidThreshold('')).toBe(false)
      expect(isValidThreshold('abc')).toBe(false)
      expect(isValidThreshold(NaN)).toBe(false)
    })
  })

  describe('shouldCancelCountDown', () => {
    const ON = 100
    const OFF = 80

    describe('on countdown', () => {
      it('cancels when payload drops below onThreshold', () => {
        expect(shouldCancelCountDown(90, ON, OFF, 'on')).toBe(true)
        expect(shouldCancelCountDown(99, ON, OFF, 'on')).toBe(true)
      })

      it('does not cancel when payload stays at or above onThreshold', () => {
        expect(shouldCancelCountDown(100, ON, OFF, 'on')).toBe(false)
        expect(shouldCancelCountDown(110, ON, OFF, 'on')).toBe(false)
      })
    })

    describe('off countdown', () => {
      it('cancels when payload rises above offThreshold', () => {
        expect(shouldCancelCountDown(90, ON, OFF, 'off')).toBe(true)
        expect(shouldCancelCountDown(81, ON, OFF, 'off')).toBe(true)
      })

      it('does not cancel when payload stays at or below offThreshold', () => {
        expect(shouldCancelCountDown(80, ON, OFF, 'off')).toBe(false)
        expect(shouldCancelCountDown(70, ON, OFF, 'off')).toBe(false)
      })
    })
  })

  describe('getNextTransition', () => {
    const ON = 100
    const OFF = 80

    it('triggers on transition when payload crosses onThreshold from off state', () => {
      expect(getNextTransition(110, ON, OFF, 'off', 0)).toEqual({ desiredState: 'on', startCountDown: true })
    })

    it('triggers off transition when payload drops below offThreshold from on state', () => {
      expect(getNextTransition(70, ON, OFF, 'on', 0)).toEqual({ desiredState: 'off', startCountDown: true })
    })

    it('triggers on transition at exact onThreshold value', () => {
      expect(getNextTransition(100, ON, OFF, 'off', 0)).toEqual({ desiredState: 'on', startCountDown: true })
    })

    it('triggers off transition at exact offThreshold value', () => {
      expect(getNextTransition(80, ON, OFF, 'on', 0)).toEqual({ desiredState: 'off', startCountDown: true })
    })

    it('returns null when already in desired on state', () => {
      expect(getNextTransition(110, ON, OFF, 'on', 0)).toBeNull()
    })

    it('returns null when already in desired off state', () => {
      expect(getNextTransition(70, ON, OFF, 'off', 0)).toBeNull()
    })

    it('returns null when counter is nonzero (countdown already running)', () => {
      expect(getNextTransition(110, ON, OFF, 'off', 5)).toBeNull()
      expect(getNextTransition(110, ON, OFF, 'off', 1)).toBeNull()
    })

    it('returns null when payload is between thresholds', () => {
      expect(getNextTransition(90, ON, OFF, 'off', 0)).toBeNull()
      expect(getNextTransition(90, ON, OFF, 'on', 0)).toBeNull()
    })

    it('returns null from unknown state when payload is between thresholds', () => {
      expect(getNextTransition(90, ON, OFF, 'unknown', 0)).toBeNull()
    })

    it('triggers on transition from unknown state when payload crosses onThreshold', () => {
      expect(getNextTransition(110, ON, OFF, 'unknown', 0)).toEqual({ desiredState: 'on', startCountDown: true })
    })

    it('triggers off transition from unknown state when payload drops below offThreshold', () => {
      expect(getNextTransition(70, ON, OFF, 'unknown', 0)).toEqual({ desiredState: 'off', startCountDown: true })
    })
  })

  describe('getInitialState', () => {
    const ON = 100
    const OFF = 80

    it('returns on when payload is above onThreshold', () => {
      expect(getInitialState(110, ON, OFF)).toBe('on')
    })

    it('returns on when payload equals onThreshold', () => {
      expect(getInitialState(100, ON, OFF)).toBe('on')
    })

    it('returns off when payload is below offThreshold', () => {
      expect(getInitialState(70, ON, OFF)).toBe('off')
    })

    it('returns off when payload equals offThreshold', () => {
      expect(getInitialState(80, ON, OFF)).toBe('off')
    })

    it('returns unknown when payload is between thresholds', () => {
      expect(getInitialState(90, ON, OFF)).toBe('unknown')
    })
  })
})
