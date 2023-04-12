[![Platform](https://img.shields.io/badge/platform-Node--RED-red)](https://nodered.org)
[![NPM](https://img.shields.io/npm/v/node-threshold-control?logo=npm)](https://www.npmjs.org/package/node-threshold-control)
[![Known Vulnerabilities](https://snyk.io/test/npm/node-threshold-control/badge.svg)](https://snyk.io/test/npm/node-threshold-control)
[![Downloads](https://img.shields.io/npm/dm/node-threshold-control.svg)](https://www.npmjs.com/package/node-threshold-control)
[![Total Downloads](https://img.shields.io/npm/dt/node-threshold-control.svg)](https://www.npmjs.com/package/node-threshold-control)
[![Package Quality](http://npm.packagequality.com/shield/node-threshold-control.png)](http://packagequality.com/#?package=node-threshold-control)
[![Open Issues](https://img.shields.io/github/issues-raw/dirkjanfaber/node-threshold-control.svg)](https://github.com/dirkjanfaber/node-threshold-control/issues)
[![Closed Issues](https://img.shields.io/github/issues-closed-raw/windkh/node-red-contrib-shelly.svg)](https://github.com/dirkjanfaber/node-threshold-control/issues?q=is%3Aissue+is%3Aclosed)

# Threshold control

With the treshold control you can enable or disable a delayed output when the input
passes the on or off threshold.

![Threshold control](./images/threshold-control.png)

## Configuration

There are a few values that need configuration before the node can be used:

* **On payload ** - The `msg.payload` to send when the on threshold get passed (and the counter reaches zero).
* **Off payload** - The `msg.payload` to send when the off threshold get passed (and the counter reaches zero).
* **On threshold** - As soon as this threshold gets passed by `msg.payload`, the _onDelay_ counter counts down to zero. If that hass passed, a "on" `msg.payload` gets send to the first output._
* **Off threshold** - As soon as this threshold gets passed by `msg.payload`, the _offDelay_ counter counts down to zero. If that hass passed, a "off" `msg.payload` gets send to the first output.
* **On delay** - the delay in seconds that is waited before the output gets send after the input passes the on threshold.
* **Off delay** - the delay in seconds that is waited before the output gets send after the input passes the off threshold.

The on threshold should be higher than the off threshold.

## Input

By default the node listens to `msg.payload` as input.

It also listens to different messages, which can change the configured values:

* `msg.onThreshold` - The on threshold
* `msg.offThreshold` - The off threshold
* `msg.onDelay` - The on delay in seconds
* `msg.offDelay` - The off delay in seconds

## Outputs

There are three outputs. The first one just gives "on" or "off" (after the
delay has passed).

The second output gives the state of the counter for the on delay.

The third output gives the state of the couter for the off delay.

## Status

The status node tries to show the current state. It can turn red on wrong input
and on the "off" state, green on the "on" state and yellow when the on or off
counter is running.

When you do a fresh deploy and then inject values within the hysteresis region
(between on and off thresholds) the Node status will be displayed as "unknown"
with a blue dot.
