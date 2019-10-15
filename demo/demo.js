

var playButton = document.querySelector('#play')
var canvas = document.querySelector('#viz')


/*
 * 
 *      audio context and sound
 * 
*/

var ctx = new AudioContext()

var master = ctx.createGain()
master.connect(ctx.destination)

window.ctx = ctx
window.master = master

var types = ['sine', 'square', 'triangle', 'sawtooth']
var vols = [1, 0.4, 0.9, 0.5]
var sources = types.map((type, i) => {
    var osc = ctx.createOscillator()
    osc.type = type
    var env = ctx.createGain()
    osc.connect(env)
    env.connect(master)
    var started = false
    var vol = vols[i]
    return function playSource(freq) {
        if (!started) osc.start()
        started = true
        var t = ctx.currentTime
        osc.frequency.setValueAtTime(freq, t)
        env.gain.cancelScheduledValues(t)
        env.gain.setValueAtTime(0, t)
        env.gain.linearRampToValueAtTime(vol, t + 0.05)
        env.gain.linearRampToValueAtTime(vol * 0.8, t + 0.1)
        env.gain.setTargetAtTime(0, t + 0.5, 0.1)
    }
})


function playSound() {
    if (!resumed) ctx.resume()
    resumed = true
    var fq = 200 + 2000 * Math.random() * Math.random()
    var ix = Math.floor(sources.length * Math.random())
    sources[ix](fq)
}
var resumed = false
playButton.addEventListener('click', playSound)
window.addEventListener('keydown', ev => {
    if (ev.key === ' ') {
        playSound()
        ev.preventDefault()
    }
})


function setMode(n) {
    viz.mode = (n) ? (n - 1) : (viz.mode + 1) % 3
}
canvas.addEventListener('click', ev => setMode())
window.addEventListener('keydown', ev => {
    if (ev.key === '1') setMode(1)
    if (ev.key === '2') setMode(2)
    if (ev.key === '3') setMode(3)
})




/*
 * 
 *      vizualizer setup
 * 
*/

import Viz from '..'

var fps = 30
var mode = 0
var input = master
var viz = new Viz(ctx, canvas, input, fps, mode)

viz.paused = false

