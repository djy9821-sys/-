import { useEffect, useRef } from 'react';
import { initBaguaExperience } from './initExperience.js';
import './BaguaExperience.css';

export default function FullBaguaExperience({ onFist, onClose }) {
  const containerRef = useRef(null);
  // 握拳回调放在 ref 里：父组件每生成一爻都会重新渲染，
  // 如果把回调放进依赖，整个手势引擎会被拆掉重建，摄像头也随之关闭。
  const onFistRef = useRef(onFist);

  useEffect(() => {
    onFistRef.current = onFist;
  }, [onFist]);

  useEffect(() => {
    const cleanup = initBaguaExperience({
      onFist: () => onFistRef.current?.()
    });
    return () => cleanup?.();
  }, []);

  // 手势页铺满全屏，打开期间锁住页面滚动，离开时恢复。
  // 不能写在样式表里：按需加载的样式离开后不会卸下，整个网站都会滚不动。
  useEffect(() => {
    const { documentElement, body } = document;
    const previousHtml = documentElement.style.overflow;
    const previousBody = body.style.overflow;
    documentElement.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      documentElement.style.overflow = previousHtml;
      body.style.overflow = previousBody;
    };
  }, []);

  return (
    <div ref={containerRef} className="full-bagua-experience w-full h-full absolute inset-0 z-0">
      <video id="camera" autoPlay muted playsInline aria-hidden="true" style={{ position: 'fixed', left: '-9999px', width: '960px', height: '540px' }}></video>
      <canvas id="stage" aria-label="Generative Bagua interaction canvas" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', cursor: 'crosshair' }}></canvas>

      <section className="gate" id="gate" aria-labelledby="project-title">
        <div className="gate__frame" aria-hidden="true"></div>
        <p className="eyebrow">HUI · GESTURE BAGUA</p>
        <h1 id="project-title"><span>回</span>手势八卦</h1>
        <p className="byline">科技回锅肉 · 2026</p>

        <div className="gesture-sequence" aria-label="Point, close fist, open palm">
          <span>☝</span><i>→</i><span>✊</span><i>→</i><span>🖐</span>
        </div>

        <p className="intro">
          用一只手，唤醒、展开并引导一座变化之阵。<br />
          <span>Use one hand to awaken, unfold and guide a field of change.</span>
        </p>

        <div className="gate__actions">
          <button className="primary" id="enable-camera" type="button">
            启用摄像头 <small>ENABLE CAMERA</small>
          </button>
          <button className="secondary" id="manual-mode" type="button">
            手动体验 <small>MANUAL MODE</small>
          </button>
        </div>

        <p className="privacy-note">
          摄像头画面仅在设备本地处理，不上传、不录制。<br />
          <span>Camera frames stay on your device and are never uploaded or recorded.</span>
        </p>
        
        {onClose && (
          <button type="button" onClick={onClose} className="gate__back">
            返回 <small>BACK</small>
          </button>
        )}
      </section>

      <section className="hud" id="hud" hidden>
        <div className="status">
          <span className="status__icon" id="status-icon">☝</span>
          <div>
            <strong id="status-zh">伸出食指 · 唤醒阵眼</strong>
            <small id="status-en">POINT · AWAKEN THE CENTER</small>
          </div>
        </div>

        <div className="controls">
          <span className="camera-live" id="camera-live" hidden>● CAMERA LOCAL</span>
          <button id="reset" type="button" title="Restart">↺</button>
          <button id="mute" type="button" title="Mute">♪</button>
          <button id="stop-camera" type="button" title="Stop camera" hidden>◉</button>
          {onClose && (
            <button type="button" title="Close" onClick={onClose}>✕</button>
          )}
        </div>
      </section>

      <aside className="manual-help" id="manual-help" hidden>
        CLICK · ADVANCE MOVE · GUIDE WHEEL · SCALE V · VORTEX R · RESET
      </aside>

      <div className="error" id="error" role="status" hidden></div>
    </div>
  );
}
