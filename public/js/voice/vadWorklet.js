// AudioWorklet processor — runs on the dedicated audio thread.
// Receives raw PCM float samples directly from the mic, calculates RMS,
// and posts it back to the main thread.
class VadProcessor extends AudioWorkletProcessor {
    process(inputs) {
        const channel = inputs[0]?.[0];
        if (!channel || channel.length === 0) return true;
        let sum = 0;
        for (let i = 0; i < channel.length; i++) sum += channel[i] * channel[i];
        this.port.postMessage(Math.sqrt(sum / channel.length));
        return true; // keep processor alive
    }
}
registerProcessor('vad-processor', VadProcessor);
