import { getSocket } from '../socket.js';

const STUN_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

const VAD_INTERVAL = 80;       // ms between voice activity checks
const VAD_THRESHOLD = 12;      // RMS threshold (0-255) to consider speaking
const VAD_HOLD_MS = 400;       // hold speaking state this many ms after going silent

export class WebRTCManager {
    constructor(userId, onSpeakingChange) {
        this._userId = userId;
        this._onSpeakingChange = onSpeakingChange; // (userId, speaking) => void
        this._peers = new Map();      // userId -> RTCPeerConnection
        this._remoteAudio = new Map(); // userId -> <audio> element
        this._localStream = null;
        this._audioCtx = null;
        this._analyser = null;
        this._vadTimer = null;
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
            this._localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
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
    _setupVAD() {
        this._audioCtx = new AudioContext();
        const source = this._audioCtx.createMediaStreamSource(this._localStream);
        this._analyser = this._audioCtx.createAnalyser();
        this._analyser.fftSize = 256;
        this._analyser.smoothingTimeConstant = 0.4;
        source.connect(this._analyser);

        const buf = new Uint8Array(this._analyser.frequencyBinCount);

        this._vadTimer = setInterval(() => {
            if (!this._analyser || this._muted) return;
            this._analyser.getByteFrequencyData(buf);
            // RMS of frequency data
            let sum = 0;
            for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
            const rms = Math.sqrt(sum / buf.length);

            if (rms > VAD_THRESHOLD) {
                clearTimeout(this._speakingHoldTimer);
                if (!this._speaking) {
                    this._speaking = true;
                    this._onSpeakingChange(this._userId, true);
                    this._socket.emit('voice:speaking', { speaking: true });
                }
            } else if (this._speaking) {
                // Hold before marking silent
                clearTimeout(this._speakingHoldTimer);
                this._speakingHoldTimer = setTimeout(() => {
                    this._speaking = false;
                    this._onSpeakingChange(this._userId, false);
                    this._socket.emit('voice:speaking', { speaking: false });
                }, VAD_HOLD_MS);
            }
        }, VAD_INTERVAL);
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

        // ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this._socket.emit('voice:ice', { toUserId: remoteUserId, candidate: event.candidate });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                this._closePeer(remoteUserId);
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
        s.on('voice:userJoined', ({ userId }) => {
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
        clearInterval(this._vadTimer);
        clearTimeout(this._speakingHoldTimer);
        this._vadTimer = null;

        for (const userId of [...this._peers.keys()]) this._closePeer(userId);

        if (this._localStream) {
            for (const track of this._localStream.getTracks()) track.stop();
            this._localStream = null;
        }

        if (this._audioCtx) {
            this._audioCtx.close();
            this._audioCtx = null;
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
