export type DesiredState = 'on' | 'off' | 'unknown'

export interface TransitionResult {
  desiredState: DesiredState
  startCountDown: boolean
}

export function isValidThreshold (value: unknown): boolean {
  return value !== undefined && value !== null && value !== '' && !isNaN(Number(value))
}

/**
 * Returns true if an active countdown should be cancelled based on current payload.
 * The caller is responsible for only calling this when countDown is active.
 */
export function shouldCancelCountDown (
  payload: number,
  onThreshold: number,
  offThreshold: number,
  desiredState: DesiredState
): boolean {
  if (desiredState === 'on' && payload < onThreshold) return true
  if (desiredState === 'off' && payload > offThreshold) return true
  return false
}

/**
 * Returns the next state transition if the payload crosses a threshold, or null.
 */
export function getNextTransition (
  payload: number,
  onThreshold: number,
  offThreshold: number,
  desiredState: DesiredState,
  counter: number
): TransitionResult | null {
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
 */
export function getInitialState (
  payload: number,
  onThreshold: number,
  offThreshold: number
): DesiredState {
  if (payload >= onThreshold) return 'on'
  if (payload <= offThreshold) return 'off'
  return 'unknown'
}
