import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// FBX units are typically centimetres (Maya/Max/Mixamo default).
// 0.015 makes a 170 cm character ≈ 2.55 Three.js world units tall.
const FBX_SCALE = 0.015;

/**
 * Loads /assets/Character.fbx into `containerGroup` asynchronously.
 * The container handles world position/rotation; the FBX mesh is a child.
 */
export function loadFBXCharacter(containerGroup) {
    const loader = new FBXLoader();
    loader.load(
        '/assets/Character.fbx',
        (fbx) => {
            fbx.scale.setScalar(FBX_SCALE);
            fbx.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = false;
                }
            });
            containerGroup.add(fbx);

            const mixer = new THREE.AnimationMixer(fbx);
            const clips  = fbx.animations;

            containerGroup._mixer         = mixer;
            containerGroup._fbx           = fbx;
            containerGroup._actions       = null;
            containerGroup._currentAction = null;

            if (clips.length === 0) {
                console.warn('[characterLoader] FBX has no animation clips.');
                return;
            }

            // Log available clips so the scale/name can be verified in devtools.
            console.log('[characterLoader] clips:', clips.map(c => c.name));

            const find = (...kw) =>
                clips.find(c => kw.some(k => c.name.toLowerCase().includes(k)));

            const idleClip = find('idle', 'stand', 'breathing', 't-pose') ?? clips[0];
            const walkClip = find('walk') ?? clips[Math.min(1, clips.length - 1)];
            const runClip  = find('run', 'sprint', 'jog') ?? walkClip;

            // mixer.clipAction() returns the same cached object for the same clip,
            // so idle === walk when there is only one clip in the FBX.
            const idle = mixer.clipAction(idleClip);
            const walk = mixer.clipAction(walkClip);
            const run  = mixer.clipAction(runClip);

            [idle, walk, run].forEach(a => { a.loop = THREE.LoopRepeat; });

            containerGroup._actions = { idle, walk, run };

            // Only autoplay a distinct idle; if there's just one clip we wait
            // for movement so the character starts in rest/bind pose.
            if (idle !== walk) {
                _setAction(containerGroup, idle, 0);
            }
        },
        undefined,
        (err) => console.error('[characterLoader] FBX load failed:', err)
    );
}

/**
 * Drive animation each frame.
 *
 * Single-clip FBX (idle === walk):
 *   moving  → play clip (walk speed)
 *   stopped → fade out, character returns to bind/rest pose
 *
 * Multi-clip FBX:
 *   moving  → crossfade to walk or run
 *   stopped → crossfade to idle
 */
export function updateFBXAnimation(group, isMoving, dt, isRunning) {
    if (!group._mixer || !group._actions) return;

    const { idle, walk, run } = group._actions;

    // Detect whether we have a real separate idle clip.
    const hasDistinctIdle = idle !== walk;

    let target;
    if (isMoving) {
        target = (isRunning && run !== walk) ? run : walk;
    } else {
        // Single-clip case: null signals "stop everything → rest pose"
        target = hasDistinctIdle ? idle : null;
    }

    if (target !== group._currentAction) {
        _setAction(group, target, 0.25);
    }

    // Adjust playback speed
    if (group._currentAction) {
        group._currentAction.timeScale = (group._currentAction === run) ? 1.4 : 1.0;
    }

    group._mixer.update(dt);
}

// ── helpers ───────────────────────────────────────────────────────────────────

function _setAction(group, next, fadeDuration = 0.25) {
    const prev = group._currentAction;
    if (prev === next) return;

    group._currentAction = next; // update first to avoid re-entry

    if (prev) {
        if (next) {
            // Smooth crossfade between two animations
            prev.fadeOut(fadeDuration);
        } else {
            // Stopping entirely: stop() deactivates the action so the mixer
            // returns the mesh to its bind/rest pose on the next update.
            prev.stop();
        }
    }

    if (next) {
        next.reset().fadeIn(fadeDuration).play();
    }
}
