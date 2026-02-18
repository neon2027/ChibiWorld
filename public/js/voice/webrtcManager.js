import { getSocket } from '../socket.js';

const STUN_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turns:chibi-world.duckdns.org:5349',
            username: 'chibi',
            credential: 'yourpassword'
        },
        {
            urls: 'turn:chibi-world.duckdns.org:3478',
            username: 'chibi',
            credential: 'yourpassword'
        }
    ]
};

const VAD_THRESHOLD = 0.008;   // RMS threshold (0–1 float PCM) to consider speaking
const VAD_HOLD_MS = 400;       // hold speaking state this many ms after going silent

export class WebRTCManager {
    constructor(userId, onSpeakingChange, onMicLevel) {
        this._userId = userId;
        this._onSpeakingChange = onSpeakingChange; // (userId, speaking) => void
        this._onMicLevel = onMicLevel;             // (level: 0-1) => void  [optional]
        this._peers = new Map();      // userId -> RTCPeerConnection
        this._remoteAudio = new Map(); // userId -> <audio> element
        this._localStream = null;
        this._audioCtx = null;
        this._processor = null;
        this._speaking = false;
        this._speakingHoldTimer = null;
        this._muted = false;
        this._inVoice = false;
        this._socket = getSocket();

        this._bindSocketEvents();
    }

    get inVoice() { return this._inVoice; }
    get muted() { return this._muted; }
    get speaking() { return this._speaking; }

    async join() {
        if (this._inVoice) return;
        try {
            console.log('[Voice] Requesting microphone...');
            this._localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            console.log('[Voice] Mic granted, tracks:', this._localStream.getAudioTracks().map(t => t.label));
            this._inVoice = true;
            this._setupVAD();
            this._socket.emit('voice:join');
        } catch (err) {
            console.error('[Voice] Mic access denied:', err);
            throw err;
        }
    }

    leave() {
        if (!this._inVoice) return;
        this._socket.emit('voice:leave');
        this._cleanup();
    }

    setMuted(muted) {
        this._muted = muted;
        if (this._localStream) {
            for (const track of this._localStream.getAudioTracks()) {
                track.enabled = !muted;
            }
        }
        if (muted && this._speaking) {
            this._speaking = false;
            this._onSpeakingChange(this._userId, false);
            this._socket.emit('voice:speaking', { speaking: false });
        }
    }

    // === Voice Activity Detection ===
    async _setupVAD() {
        this._audioCtx = new AudioContext();
        console.log('[VAD] AudioContext created, state:', this._audioCtx.state);

        if (this._audioCtx.state !== 'running') {
            await this._audioCtx.resume();
            console.log('[VAD] AudioContext resumed, state now:', this._audioCtx.state);
        }

        const source = this._audioCtx.createMediaStreamSource(this._localStream);

        // ScriptProcessorNode fires onaudioprocess with real float PCM samples.
        // Unlike AnalyserNode, it doesn't need a destination connection trick —
        // it processes data as long as source → processor → destination is wired.
        const processor = this._audioCtx.createScriptProcessor(2048, 1, 1);
        this._processor = processor;

        source.connect(processor);
        processor.connect(this._audioCtx.destination); // required for onaudioprocess to fire

        console.log('[VAD] ScriptProcessorNode ready');

        let _logThrottle = 0;

        processor.onaudioprocess = (e) => {
            const data = e.inputBuffer.getChannelData(0); // Float32Array, values -1 to 1

            // RMS amplitude
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
            const rms = Math.sqrt(sum / data.length); // 0–1

            _logThrottle++;
            if (_logThrottle % 20 === 0) {
                console.log(`[VAD] rms=${rms.toFixed(4)} muted=${this._muted} speaking=${this._speaking}`);
            }

            if (this._onMicLevel) {
                this._onMicLevel(this._muted ? 0 : Math.min(rms / 0.1, 1));
            }

            if (this._muted) return;

            if (rms > VAD_THRESHOLD) {
                clearTimeout(this._speakingHoldTimer);
                if (!this._speaking) {
                    this._speaking = true;
                    this._onSpeakingChange(this._userId, true);
                    this._socket.emit('voice:speaking', { speaking: true });
                }
            } else if (this._speaking) {
                clearTimeout(this._speakingHoldTimer);
                this._speakingHoldTimer = setTimeout(() => {
                    this._speaking = false;
                    this._onSpeakingChange(this._userId, false);
                    this._socket.emit('voice:speaking', { speaking: false });
                }, VAD_HOLD_MS);
            }
        };
    }

    // === Peer Connection Management ===
    async _createPeer(remoteUserId, isInitiator) {
        const pc = new RTCPeerConnection(STUN_SERVERS);
        this._peers.set(remoteUserId, pc);

        // Add local tracks
        if (this._localStream) {
            for (const track of this._localStream.getTracks()) {
                pc.addTrack(track, this._localStream);
            }
        }

        // Remote audio
        pc.ontrack = (event) => {
            this._attachRemoteAudio(remoteUserId, event.streams[0]);
        };

        pc.onconnectionstatechange = () => {
            console.log(`[RTC] peer ${remoteUserId} connectionState: ${pc.connectionState}`);
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                this._closePeer(remoteUserId);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`[RTC] peer ${remoteUserId} iceConnectionState: ${pc.iceConnectionState}`);
        };

        pc.onicegatheringstatechange = () => {
            console.log(`[RTC] peer ${remoteUserId} iceGatheringState: ${pc.iceGatheringState}`);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`[RTC] ICE candidate for ${remoteUserId}: ${event.candidate.type} ${event.candidate.protocol}`);
                this._socket.emit('voice:ice', { toUserId: remoteUserId, candidate: event.candidate });
            } else {
                console.log(`[RTC] ICE gathering complete for peer ${remoteUserId}`);
            }
        };

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this._socket.emit('voice:offer', { toUserId: remoteUserId, sdp: pc.localDescription });
        }

        return pc;
    }

    _attachRemoteAudio(userId, stream) {
        // Remove old if exists
        this._remoteAudio.get(userId)?.remove();

        const audio = document.createElement('audio');
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.volume = 1;
        document.body.appendChild(audio);
        this._remoteAudio.set(userId, audio);
    }

    _closePeer(userId) {
        this._peers.get(userId)?.close();
        this._peers.delete(userId);
        this._remoteAudio.get(userId)?.remove();
        this._remoteAudio.delete(userId);
    }

    // === Socket Event Bindings ===
    _bindSocketEvents() {
        const s = this._socket;

        // Server tells us who is already in voice — we initiate to each
        s.on('voice:existingMembers', async ({ members }) => {
            for (const memberId of members) {
                if (!this._peers.has(memberId)) {
                    await this._createPeer(memberId, true);
                }
            }
        });

        // Someone joined voice — they'll send us an offer, nothing to do yet
        s.on('voice:userJoined', () => {
            // Initiator role handled by the joiner via voice:existingMembers
        });

        s.on('voice:userLeft', ({ userId }) => {
            this._closePeer(userId);
            this._onSpeakingChange(userId, false);
        });

        s.on('voice:offer', async ({ fromUserId, sdp }) => {
            if (this._peers.has(fromUserId)) this._closePeer(fromUserId);
            const pc = await this._createPeer(fromUserId, false);
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            s.emit('voice:answer', { toUserId: fromUserId, sdp: pc.localDescription });
        });

        s.on('voice:answer', async ({ fromUserId, sdp }) => {
            const pc = this._peers.get(fromUserId);
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        });

        s.on('voice:ice', async ({ fromUserId, candidate }) => {
            const pc = this._peers.get(fromUserId);
            if (pc && candidate) {
                try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
            }
        });

        s.on('voice:speakingUpdate', ({ userId, speaking }) => {
            this._onSpeakingChange(userId, speaking);
        });
    }

    _cleanup() {
        clearTimeout(this._speakingHoldTimer);

        if (this._processor) {
            this._processor.onaudioprocess = null;
            this._processor.disconnect();
            this._processor = null;
        }

        if (this._audioCtx) {
            this._audioCtx.close();
            this._audioCtx = null;
        }

        for (const userId of [...this._peers.keys()]) this._closePeer(userId);

        if (this._localStream) {
            for (const track of this._localStream.getTracks()) track.stop();
            this._localStream = null;
        }

        this._speaking = false;
        this._inVoice = false;
    }

    destroy() {
        this.leave();
        // Remove socket listeners
        const s = this._socket;
        s.off('voice:existingMembers');
        s.off('voice:userJoined');
        s.off('voice:userLeft');
        s.off('voice:offer');
        s.off('voice:answer');
        s.off('voice:ice');
        s.off('voice:speakingUpdate');
    }
}
