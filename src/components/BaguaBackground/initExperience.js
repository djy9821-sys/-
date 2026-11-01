import './BaguaExperience.css';
import { classifyHand } from './gestures.js';
import { createBaguaExperience } from './scene.js';
import { createSoundscape } from './audio.js';


export function initBaguaExperience(callbacks = {}) {

  const canvas = document.querySelector('#stage');
  if (!canvas) return () => {};

  // 所有事件监听都挂在同一个 signal 上，离开页面时一次性移除。
  const listeners = new AbortController();
  const { signal } = listeners;
  let disposed = false;

const video = document.querySelector('#camera');
const gate = document.querySelector('#gate');
const hud = document.querySelector('#hud');
const manualHelp = document.querySelector('#manual-help');
const errorBox = document.querySelector('#error');
const cameraLive = document.querySelector('#camera-live');
const stopCameraButton = document.querySelector('#stop-camera');
const muteButton = document.querySelector('#mute');

const statusCopy = {
  hidden: ['☝', '伸出食指 · 唤醒阵眼', 'POINT · AWAKEN THE CENTER'],
  seed: ['✊', '握拳 · 展开平面', 'CLOSE YOUR FIST · UNFOLD THE FIELD'],
  flat: ['🖐', '张开手掌 · 进入立体', 'OPEN YOUR PALM · ENTER THREE DIMENSIONS'],
  rising: ['◌', '展开中', 'UNFOLDING'],
  risen: ['🖐', '转动掌心 · 控制方向', 'TURN YOUR PALM · GUIDE THE FIELD'],
  vortex: ['↻', '旋涡已激活', 'VORTEX ACTIVE']
};

function setStatus(state, vortex = false) {
  const copy = vortex ? statusCopy.vortex : statusCopy[state] || statusCopy.hidden;
  document.querySelector('#status-icon').textContent = copy[0];
  document.querySelector('#status-zh').textContent = copy[1];
  document.querySelector('#status-en').textContent = copy[2];
}

const sound = createSoundscape();
// 没有 WebGL（老手机、浏览器关了硬件加速）时 three.js 建不出画布：别让整页报错，
// 提示一句，起卦仍可用下方「点击生一爻」。
const noop = () => false;
const FALLBACK_EXPERIENCE = Object.freeze({
  dispose() {}, state: 'hidden', vortex: false,
  summon: noop, flatten: noop, rise: noop, flattenBack: noop, reset: noop, toggleVortex: noop,
  moveSeed() {}, setSeedIntensity() {}, guide() {}, manualGuide() {}, scaleBy() {},
  screenToWorld: () => ({ x: 0, y: 0 }),
});
let experience = FALLBACK_EXPERIENCE;
try {
  experience = createBaguaExperience(canvas, (state, vortex) => {
    setStatus(state, vortex);
  });
} catch (error) {
  console.warn('[bagua] 3D 画面初始化失败', error);
  showError('这台设备暂时显示不了 3D 画面，仍可点下方「点击生一爻」起卦。');
}

let mediaPipeCamera = null;
let hands = null;
let mode = 'idle';
let fistFrames = 0;
let palmFrames = 0;
let missingFrames = 0;
let fistReady = true;
let neutralPalm = null;
let previousPalmX = null;
let previousTime = 0;
let lastFastSwipe = 0;
let swipeCooldown = 0;

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = '';
}

function enterExperience(nextMode) {
  mode = nextMode;
  sound.resume();
  gate.classList.add('is-leaving');
  hud.hidden = false;
  manualHelp.hidden = nextMode !== 'manual';
  window.setTimeout(() => {
    gate.hidden = true;
  }, 650);
  setStatus('hidden');
}

function stopCamera() {
  mediaPipeCamera?.stop?.();
  const stream = video.srcObject;
  if (stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  video.srcObject = null;
  mediaPipeCamera = null;
  cameraLive.hidden = true;
  stopCameraButton.hidden = true;
  if (mode === 'camera') {
    mode = 'manual';
    manualHelp.hidden = false;
  }
}

function handleResults(results) {
  const landmarks = results.multiHandLandmarks?.[0];
  if (!landmarks) {
    fistFrames = 0;
    palmFrames = 0;
    previousPalmX = null;
    if (++missingFrames > 20 && experience.state !== 'hidden') {
      if (experience.reset()) sound.reset();
      missingFrames = 0;
    }
    return;
  }

  missingFrames = 0;
  const hand = classifyHand(landmarks);
  const { gesture, points, metrics } = hand;
  const now = performance.now();
  const deltaSeconds = Math.min((now - previousTime) / 1000, 0.2) || 0.016;
  previousTime = now;

  if (gesture === 'point') {
    const target = experience.screenToWorld(
      points[8].x * window.innerWidth,
      points[8].y * window.innerHeight
    );
    const intensity = Math.max(
      0.35,
      Math.min(1, (metrics.fingerLength - 0.045) / 0.13)
    );
    if (experience.state === 'hidden') {
      if (experience.summon(target.x, target.y)) sound.seed();
    } else if (experience.state === 'seed') {
      experience.moveSeed(target.x, target.y);
      experience.setSeedIntensity(intensity);
    }
  }

  if (gesture === 'fist') {
    palmFrames = 0;
    if (fistReady && ++fistFrames >= 4) {
      fistReady = false;
      fistFrames = 0;
      
      // Always notify listener (for Yao generation)
      if (callbacks.onFist) callbacks.onFist();

      // Trigger visual response according to state
      if (experience.state === 'hidden') {
        if (experience.summon(0, 0)) {
          experience.flatten();
          sound.flatten();
        }
      } else if (experience.state === 'seed') {
        if (experience.flatten()) sound.flatten();
      } else if (experience.state === 'rising' || experience.state === 'risen') {
        if (experience.flattenBack()) sound.fold();
      } else if (experience.state === 'flat') {
        sound.fold();
      }
    }
  } else {
    fistFrames = 0;
    fistReady = true;
  }

  if (gesture === 'palm') {
    if (experience.state === 'flat' && ++palmFrames >= 3) {
      palmFrames = 0;
      neutralPalm = {
        x: metrics.palm.x,
        y: metrics.palm.y,
        roll: metrics.roll
      };
      if (experience.rise()) sound.rise();
    } else if (experience.state === 'risen') {
      const neutral = neutralPalm || {
        x: metrics.palm.x,
        y: metrics.palm.y,
        roll: metrics.roll
      };
      experience.guide(metrics.palm.x, metrics.palm.y, metrics.roll, neutral);
    }

    if (previousPalmX !== null && now > swipeCooldown) {
      const velocity = (metrics.palm.x - previousPalmX) / deltaSeconds;
      if (Math.abs(velocity) > 1.5) {
        if (now - lastFastSwipe < 220) {
          lastFastSwipe = 0;
          const active = experience.toggleVortex();
          sound.vortex(active);
          swipeCooldown = now + 1500;
        } else {
          lastFastSwipe = now;
        }
      }
    }
    previousPalmX = metrics.palm.x;
  } else {
    palmFrames = 0;
    previousPalmX = null;
  }
}

// 先用网站自己提供的模型文件（构建时复制，国内也能访问），失败再试 CDN。
const MEDIAPIPE_HANDS_BASES = [
  import.meta.env.VITE_MEDIAPIPE_HANDS_BASE,
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/'
].filter(Boolean);
const MODEL_TIMEOUT_MS = 25000;

async function createHands(Hands) {
  let lastError = null;
  for (const base of MEDIAPIPE_HANDS_BASES) {
    const instance = new Hands({ locateFile: (file) => base + file });
    instance.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55
    });
    try {
      await Promise.race([
        instance.initialize(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('手势模型加载超时')), MODEL_TIMEOUT_MS);
        })
      ]);
      return instance;
    } catch (error) {
      lastError = error;
      instance.close?.();
    }
  }
  const failure = new Error('手势识别模型加载失败');
  failure.name = 'ModelUnavailableError';
  failure.cause = lastError;
  throw failure;
}

async function enableCamera() {
  clearError();
  enterExperience('camera');

  try {
    const [{ Hands }, { Camera }] = await Promise.all([
      import('@mediapipe/hands'),
      import('@mediapipe/camera_utils')
    ]);
    const createdHands = await createHands(Hands);
    if (disposed) {
      createdHands.close?.();
      return;
    }
    hands = createdHands;
    hands.onResults(handleResults);

    mediaPipeCamera = new Camera(video, {
      onFrame: async () => {
        if (hands && video.readyState >= 2) {
          await hands.send({ image: video });
        }
      },
      width: 960,
      height: 540,
      facingMode: 'user'
    });
    await mediaPipeCamera.start();
    if (disposed) {
      stopCamera();
      return;
    }
    cameraLive.hidden = false;
    stopCameraButton.hidden = false;
  } catch (error) {
    stopCamera();
    showError(
      error?.name === 'ModelUnavailableError'
        ? '手势识别模型没能加载（网络较慢或无法访问模型文件），已切换到手动模式，点击画面即可操作。'
        : '摄像头不可用，已切换到手动模式。Camera unavailable; manual mode is active.'
    );
    console.error(error);
  }
}

document.querySelector('#enable-camera').addEventListener('click', enableCamera, { signal });
document.querySelector('#manual-mode').addEventListener('click', () => {
  clearError();
  enterExperience('manual');
}, { signal });

document.querySelector('#reset').addEventListener('click', () => {
  if (experience.reset()) sound.reset();
}, { signal });

muteButton.addEventListener('click', () => {
  const muted = sound.toggleMute();
  muteButton.textContent = muted ? '×' : '♪';
}, { signal });

stopCameraButton.addEventListener('click', stopCamera, { signal });

canvas.addEventListener('click', (event) => {
  if (gate.hidden !== true) return;
  sound.resume();
  const point = experience.screenToWorld(event.clientX, event.clientY);
  if (experience.state === 'hidden') {
    if (experience.summon(point.x, point.y)) sound.seed();
  } else if (experience.state === 'seed') {
    if (experience.flatten()) sound.flatten();
  } else if (experience.state === 'flat') {
    if (experience.rise()) sound.rise();
  } else if (experience.state === 'rising' || experience.state === 'risen') {
    if (experience.flattenBack()) sound.fold();
  }
}, { signal });

window.addEventListener('mousemove', (event) => {
  if (mode !== 'manual' || experience.state !== 'risen') return;
  const x = event.clientX / window.innerWidth - 0.5;
  const y = event.clientY / window.innerHeight - 0.5;
  experience.manualGuide(x, y);
}, { signal });

window.addEventListener(
  'wheel',
  (event) => {
    if (gate.hidden !== true) return;
    event.preventDefault();
    experience.scaleBy(event.deltaY > 0 ? 0.94 : 1.06);
  },
  { passive: false, signal }
);

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'v') {
    const active = experience.toggleVortex();
    sound.vortex(active);
  }
  if (key === 'r' && experience.reset()) sound.reset();
  if (key === 'm') {
    const muted = sound.toggleMute();
    muteButton.textContent = muted ? '×' : '♪';
  }
  if (key === 'escape') stopCamera();
}, { signal });

window.addEventListener('pagehide', () => {
  stopCamera();
  sound.dispose();
}, { signal });

  return () => {
    // 离开页面：关摄像头、移除监听、停掉动画与声音
    disposed = true;
    listeners.abort();
    try {
      stopCamera();
      hands?.close();
      hands = null;
      sound.dispose();
      experience.dispose();
    } catch (err) {
      console.warn('Cleanup error', err);
    }
  };
}
