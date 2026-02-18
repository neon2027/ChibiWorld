import { WebRTCManager } from './webrtcManager.js';
import { showToast } from '../ui/toast.js';

export class VoiceUI {
    constructor(container, userId, onSpeakingChange) {
        this._container = container;
        this._userId = userId;
        this._onSpeakingChange = onSpeakingChange;
        this._rtc = null;
        this._render();
    }

    _render() {
        const el = document.createElement('div');
        el.className = 'voice-bar';
        el.innerHTML = `
            <button class="voice-join-btn" id="voiceJoinBtn" title="Join Voice Chat">
                <span class="voice-icon">🎙️</span>
                <span class="voice-label">Voice</span>
            </button>
            <button class="voice-mute-btn hidden" id="voiceMuteBtn" title="Mute / Unmute">🎤</button>
            <div class="mic-meter hidden" id="voiceMicMeter" title="Mic level">
                <div class="mic-meter-fill" id="voiceMicFill"></div>
            </div>
            <button class="voice-leave-btn hidden" id="voiceLeaveBtn" title="Leave Voice">📵</button>
            <div class="voice-participants" id="voiceParticipants"></div>
        `;
        this._container.appendChild(el);
        this._el = el;
        this._joinBtn  = el.querySelector('#voiceJoinBtn');
        this._muteBtn  = el.querySelector('#voiceMuteBtn');
        this._leaveBtn = el.querySelector('#voiceLeaveBtn');
        this._partList = el.querySelector('#voiceParticipants');
        this._micMeter = el.querySelector('#voiceMicMeter');
        this._micFill  = el.querySelector('#voiceMicFill');

        this._joinBtn.addEventListener('click', () => this._join());
        this._muteBtn.addEventListener('click', () => this._toggleMute());
        this._leaveBtn.addEventListener('click', () => this._leave());
    }

    async _join() {
        try {
            this._rtc = new WebRTCManager(
                this._userId,
                (uid, speaking) => {
                    this._onSpeakingChange(uid, speaking);
                    this._updateParticipantSpeaking(uid, speaking);
                    if (uid === this._userId) {
                        this._muteBtn.classList.toggle('speaking', speaking);
                    }
                },
                (level) => this._updateMicLevel(level)
            );
            await this._rtc.join();
            this._joinBtn.classList.add('hidden');
            this._muteBtn.classList.remove('hidden');
            this._micMeter.classList.remove('hidden');
            this._leaveBtn.classList.remove('hidden');
            this._addParticipant(this._userId, '(you)');
            showToast('Voice Chat', 'Joined voice chat!', 'success');
        } catch (err) {
            showToast('Voice Chat', 'Microphone access denied.', 'warning');
        }
    }

    _toggleMute() {
        if (!this._rtc) return;
        const nowMuted = !this._rtc.muted;
        this._rtc.setMuted(nowMuted);
        this._muteBtn.textContent = nowMuted ? '🔇' : '🎤';
        this._muteBtn.title = nowMuted ? 'Unmute' : 'Mute';
        this._muteBtn.classList.toggle('muted', nowMuted);
        if (nowMuted) this._muteBtn.classList.remove('speaking');
    }

    _updateMicLevel(level) {
        // level is 0–1; map to a min visible floor so bar is always visible when joined
        const pct = Math.round(level * 100);
        this._micFill.style.height = `${pct}%`;

        // Color: green → yellow → red based on level
        const h = Math.round(120 - level * 100); // 120=green, 20=red
        this._micFill.style.background = `hsl(${h}, 80%, 50%)`;
    }

    _leave() {
        this._rtc?.destroy();
        this._rtc = null;
        this._joinBtn.classList.remove('hidden');
        this._muteBtn.classList.add('hidden');
        this._micMeter.classList.add('hidden');
        this._leaveBtn.classList.add('hidden');
        this._muteBtn.textContent = '🎤';
        this._muteBtn.classList.remove('muted', 'speaking');
        this._micFill.style.height = '0%';
        this._partList.innerHTML = '';
        this._onSpeakingChange(this._userId, false);
        showToast('Voice Chat', 'Left voice chat.', 'info');
    }

    _addParticipant(userId, label) {
        const dot = document.createElement('div');
        dot.className = 'voice-dot';
        dot.dataset.uid = userId;
        dot.title = label;
        dot.textContent = '🎤';
        this._partList.appendChild(dot);
    }

    _updateParticipantSpeaking(userId, speaking) {
        const dot = this._partList.querySelector(`[data-uid="${userId}"]`);
        if (dot) dot.classList.toggle('speaking', speaking);
    }

    destroy() {
        this._rtc?.destroy();
        this._el.remove();
    }
}
