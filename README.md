# Threshold control

With the treshold control you can enable or disable a delayed output when the input
passes the on or off threshold. 

## Configuration

There are a few values that need configuration before the node can be used:

* On threshold - As soon as this threshold gets passed by `msg.payload`, the _onDelay_ counter counts down to zero. If that hass passed, a "on" `msg.payload` gets send to the first output._
* Off threshold - As soon as this threshold gets passed by `msg.payload`, the _offDelay_ counter counts down to zero. If that hass passed, a "off" `msg.payload` gets send to the first output.
* On delay - the delay in seconds that is waited before the output gets send after the input passes the on threshold.
* Off delay - the delay in seconds that is waited before the output gets send after the input passes the off threshold.

The on threshold should be higher than the off threshold.

## Input

By default the node listens to `msg.payload` as input.

It also listens to different messages, which can change the configured values:

* `msg.onThreshold` - The on threshold
* `msg.offThreshold` - The off threshold
* `msg.onDelay` - The on delay in seconds
* `msg.offDelay` - The off delay in seconds

