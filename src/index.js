

/*
 * 
 *      class export and API 
 * 
*/

export default class Visualizer {

    constructor(ctx, canvas, inputNode, fps, mode) {
        // API
        this.paused = false
        this.mode = mode || 0

        this.minDb = -96
        this.maxDb = -15
        this.minFreq = 150
        this.maxFreq = 15000

        // internals
        this._ctx = ctx
        this._canvasCtx = canvas.getContext('2d')
        this._analyser = ctx.createAnalyser()
        this._input = null
        this._lastMode = -1

        // init
        this.setInput(inputNode)
        fps = fps || 30
        if (fps >= 60) {
            var r = () => {
                this.render()
                requestAnimationFrame(r)
            }
            requestAnimationFrame(r)
        } else {
            setInterval(() => this.render(), 1000 / fps)
        }
    }

    setInput(node) {
        if (this._input) this._input.disconnect(this._analyser)
        node.connect(this._analyser)
        this._input = node
    }

    render() {
        if (this.paused) return
        if (this._ctx.state !== 'running') return
        if (this.mode === 0) drawFreqBars(this)
        if (this.mode === 1) drawWaveform(this)
        if (this.mode === 2) drawSpectrograph(this, this.mode !== this._lastMode)
        this._lastMode = this.mode
    }

    clear(color) {
        var w = this._canvasCtx.canvas.width
        var h = this._canvasCtx.canvas.height
        this._canvasCtx.fillStyle = color || makeColor(0)
        this._canvasCtx.fillRect(0, 0, w, h)
    }

}





/*
 * 
 *      single way to map [0..1] to a css color
 * 
*/

function makeColor(val) {
    if (val === 0) return '#000'
    var h = Math.round(-80 + 130 * val)
    var s = 100
    var l = Math.round(20 + 50 * val)
    if (val > 0.99) l += 30
    return `hsl(${h},${s}%,${l}%)`
}







/*
 * 
 *      equalizer-style frequency bars
 * 
*/


var freqFFTsize = 1024
var freqDataArray = null

function drawFreqBars(viz) {
    var analyser = viz._analyser
    var canvasCtx = viz._canvasCtx

    // audio data
    analyser.fftSize = freqFFTsize
    var bufferLength = analyser.frequencyBinCount
    if (!freqDataArray) freqDataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(freqDataArray)
    var dataArray = freqDataArray

    // canvas
    viz.clear()
    var w = canvasCtx.canvas.width
    var h = canvasCtx.canvas.height

    var logHi = Math.log2(viz.maxFreq)
    var logLo = Math.log2(viz.minFreq)
    var nyquist = viz._ctx.sampleRate / 2
    var bins = analyser.frequencyBinCount

    for (var x = 0; x < w; x++) {
        var frac = x / (w - 1)
        // map frac [0..1] logarythmically to [fmin..fmax]
        var freq = Math.pow(2, logLo + frac * (logHi - logLo))
        // map freq to dataArray index
        var index = Math.round(freq / nyquist * bins)
        var data = dataArray[index] / 255
        var y = data * h

        canvasCtx.fillStyle = makeColor(data)
        canvasCtx.fillRect(x, h - y, 1, y)
    }
}










/*
 * 
 *      oscilloscope-style waveform
 * 
*/

var waveFFTsize = 4096
var waveDataArray = null


function drawWaveform(viz) {
    var analyser = viz._analyser
    var canvasCtx = viz._canvasCtx

    // audio data
    analyser.fftSize = waveFFTsize
    analyser.minDecibels = viz.minDb
    analyser.maxDecibels = viz.maxDb
    var bufferLength = analyser.frequencyBinCount
    if (!waveDataArray) waveDataArray = new Float32Array(bufferLength)
    analyser.getFloatTimeDomainData(waveDataArray)
    var dataArray = waveDataArray

    // canvas
    viz.clear()
    var w = canvasCtx.canvas.width
    var h = canvasCtx.canvas.height

    // find a good starting point
    var start = findStartingPoint(dataArray)

    // draw
    canvasCtx.lineWidth = 2
    canvasCtx.beginPath()
    canvasCtx.moveTo(0, h / 2)
    var span = bufferLength / 2
    var maxVal = 0
    for (var i = 0; i < span; i++) {
        var ix = i + start
        var val = (ix < bufferLength) ? waveDataArray[ix] : 0
        if (val > maxVal) maxVal = val
        var data = (val + 1) * 0.5
        var x = w * i / span
        var y = h * data
        canvasCtx.lineTo(x, h - y)
    }
    canvasCtx.strokeStyle = makeColor(Math.max(0.2, maxVal))
    canvasCtx.stroke()
}

// overly magical ad-hoc routine to choose where to start drawing data
function findStartingPoint(data) {
    var pts = []
    var pt = 0
    while (pts.length < 8 && pt >= 0) {
        pt = findUpwardsZeroCrossing(data, pt, data.length / 2)
        if (pt > 0) pts.push(pt)
    }
    if (pts.length < 2) return pts[0] || 0
    // try to find a starting point similar to the previous one
    pt = 0
    var bestScore = 999999.9
    pts.forEach(np => {
        var score = scorePoint(np, data)
        if (score > bestScore) return
        bestScore = score * 0.95 - 1
        pt = np
    })
    wavePrevVals = waveOffsets.map(off => data[off + pt])
    return pt
}
function scorePoint(pt, data) {
    return waveOffsets.reduce((acc, off, i) => {
        var val = data[pt + off]
        return acc + Math.abs(val - wavePrevVals[i])
    }, 0)
}

var waveOffsets = [30, 40, 50, 80, 100, 105, 110, 150, 160]
var wavePrevVals = waveOffsets.map(v => 0)

function findUpwardsZeroCrossing(data, start, end) {
    for (var ct = 0, i = start; i < end; i++) {
        if (data[i] < 0) ct++
        if (data[i] > 0 && ct > 5) return i
    }
    return -1
}










/*
 * 
 *      spectrograph that shows changes over time
 * 
*/

var specFFTsize = 1024
var specDataArray = null

function drawSpectrograph(viz, clearFirst) {
    var analyser = viz._analyser
    var canvasCtx = viz._canvasCtx

    // audio data
    analyser.fftSize = specFFTsize
    analyser.smoothingTimeConstant = 0.3
    analyser.minDecibels = viz.minDb
    analyser.maxDecibels = viz.maxDb
    var bufferLength = analyser.frequencyBinCount
    if (!specDataArray) specDataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(specDataArray)
    var dataArray = specDataArray

    // canvas
    var w = canvasCtx.canvas.width
    var h = canvasCtx.canvas.height
    if (clearFirst) {
        canvasCtx.fillStyle = makeColor(0)
        canvasCtx.fillRect(0, 0, w, h)
    } else {
        canvasCtx.drawImage(canvasCtx.canvas, -1, 0, w, h)
    }

    var logHi = Math.log2(viz.maxFreq)
    var logLo = Math.log2(viz.minFreq)
    var nyquist = viz._ctx.sampleRate / 2
    var bins = analyser.frequencyBinCount

    for (var y = 0; y < h; y++) {
        var frac = (h - 1 - y) / (h - 1)
        var freq = Math.pow(2, logLo + frac * (logHi - logLo))
        var index = Math.round(freq / nyquist * bins)
        var data = dataArray[index] / 255
        canvasCtx.fillStyle = makeColor(data)
        canvasCtx.fillRect(w - 1, y, 1, 1)
    }
}



