# webaudio-viz

Minimally draws some web audio data to a canvas

[Live demo page](https://andyhall.github.io/webaudio-viz/)

![Animated demo image](docs/demo.gif)

## Install

Install via npm: 

```sh
npm i --save webaudio-viz
```

To build or run the local demo use the npm scripts. If you 
don't have webpack installed globally, you'll need to do 
`npm i -D webpack webpack-cli webpack-dev-server` first.


## Usage

```js
import { Viz } from 'webaudio-viz'

var viz = new Viz(ctx, canvas, inputAudioNode, fps, mode)
viz.paused = false

// three draw modes
viz.mode = 0        // frequency bars
viz.mode = 1        // oscilloscope-style waveform
viz.mode = 2        // spectrogram animated over time

// other settings
viz.minDb = -96
viz.maxDb = -15
viz.minFreq = 150
viz.maxFreq = 15000
```

----

### By

Made with 🍺 by [Andy Hall](https://twitter.com/fenomas). License is ISC.


