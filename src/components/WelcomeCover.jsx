import { useEffect, useRef } from 'react';
import { CLASSICS_TOTAL_LINE } from '../data/classicsTotal';
import { createInkFluid } from './cover/inkFluid';
import './WelcomeCover.css';

// 封面只留两扇门：问命（进首页排盘）与藏经阁（读原典）。
const DOORS = Object.freeze([
  Object.freeze({
    key: 'ask',
    title: '问命',
    caption: '排盘，按古籍逐条批',
    note: '紫微 · 八字 · 六爻 · 九星',
    action: 'home',
  }),
  Object.freeze({
    key: 'library',
    title: '藏经阁',
    caption: '原文与白话逐句对照',
    note: CLASSICS_TOTAL_LINE,
    action: 'cangjing',
  }),
]);

// 罗盘三圈：二十八宿、二十四山（子起北，顺行）、后天八卦（自北顺行：坎艮震巽离坤兑乾）。
const XIU = [...'角亢氐房心尾箕斗牛女虚危室壁奎娄胃昴毕觜参井鬼柳星张翼轸'];
const SHAN = [...'子癸丑艮寅甲卯乙辰巽巳丙午丁未坤申庚酉辛戌乾亥壬'];
// 每卦自上爻到初爻，1 阳 0 阴；初爻朝向盘心。
const GUA = ['010', '100', '001', '110', '101', '000', '011', '111'];

const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const BACK = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

function Ring({ kind, items, children }) {
  return (
    <div className={`welcome-cover__ring welcome-cover__ring--${kind}`}>
      {items.map((item, index) => (
        <b key={index} style={{ transform: `rotate(${(360 / items.length) * index}deg)` }}>{children(item)}</b>
      ))}
    </div>
  );
}

export default function WelcomeCover({ onEnter, onNavigate }) {
  const coverRef = useRef(null);
  const inkRef = useRef(null);
  const starsRef = useRef(null);
  const discRef = useRef(null);
  const needleRef = useRef(null);
  const sealRef = useRef(null);

  const handleDoor = (action) => {
    if (action === 'home') {
      onEnter?.();
      return;
    }
    onNavigate?.(action);
  };

  useEffect(() => {
    const cover = coverRef.current;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const timers = [];
    let frame = 0;
    let disposed = false;

    // 水墨：显卡不支持、设备太慢或用户要求减少动态时，退回静态底色。
    const ink = reduced ? null : createInkFluid(inkRef.current, {
      onStill: () => cover.classList.add('welcome-cover--still'),
      onLost: () => cover.classList.add('welcome-cover--plain'),
    });
    if (ink) ink.start();
    else cover.classList.add('welcome-cover--plain');

    // 星点
    const canvas = starsRef.current;
    const ctx = canvas.getContext('2d');
    let stars = [];
    let width = 0;
    let height = 0;
    const view = { x: 0, y: 0, aimX: 0, aimY: 0 };
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(Math.min(130, Math.max(64, (width * height) / 9000)));
      stars = Array.from({ length: count }, () => ({
        x: Math.random(), y: Math.random() ** 1.35 * 0.94, depth: 0.3 + Math.random() * 0.7,
        size: 0.5 + Math.random() * 1.1, alpha: 0.22 + Math.random() * 0.6, speed: 0.4 + Math.random() * 1.6, phase: Math.random() * 6.283,
      }));
    };
    const drawStars = (time) => {
      ctx.clearRect(0, 0, width, height);
      view.x += (view.aimX - view.x) * 0.06;
      view.y += (view.aimY - view.y) * 0.06;
      for (const star of stars) {
        const twinkle = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(time * 0.001 * star.speed + star.phase);
        ctx.globalAlpha = star.alpha * twinkle;
        ctx.fillStyle = star.depth > 0.8 ? '#fbf3dc' : '#e5c783';
        ctx.beginPath();
        ctx.arc(star.x * width + view.x * star.depth * 14, star.y * height + view.y * star.depth * 10, star.size * (0.6 + star.depth * 0.6), 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    // 罗盘：磁针像真罗盘那样晃几下再定住，手一划就再晃；盘面跟着指针略微倾侧。
    const compass = { angle: 38, speed: 0, tiltX: 0, tiltY: 0 };
    const moveCompass = () => {
      compass.speed += -compass.angle * 0.012 - compass.speed * 0.05;
      compass.angle += compass.speed;
      needleRef.current.style.transform = `rotate(${compass.angle.toFixed(2)}deg)`;
      compass.tiltX += (view.aimX * 7 - compass.tiltX) * 0.07;
      compass.tiltY += (view.aimY * -5 - compass.tiltY) * 0.07;
      discRef.current.style.transform = `translate(-50%, -50%) rotateX(${(58 + compass.tiltY).toFixed(2)}deg) rotateZ(${compass.tiltX.toFixed(2)}deg)`;
    };

    let ticks = 0;
    const tick = (time) => {
      if (disposed) return;
      frame = requestAnimationFrame(tick);
      if (document.hidden) return;
      if (!reduced) moveCompass();
      if ((ticks++ & 1) === 0) drawStars(time);
    };

    let lastX = null;
    let lastY = null;
    const onMove = (event) => {
      const rect = cover.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      if (lastX !== null) {
        const dx = (event.clientX - lastX) / rect.width;
        const dy = (event.clientY - lastY) / rect.height;
        if (dx || dy) {
          ink?.drag(x, 1 - y, dx, -dy);
          compass.speed += Math.max(-2.2, Math.min(2.2, dx * 46));
        }
      }
      lastX = event.clientX;
      lastY = event.clientY;
      view.aimX = x - 0.5;
      view.aimY = y - 0.5;
    };
    const onRelease = () => { lastX = null; lastY = null; };
    const onVisibility = () => { if (document.hidden) ink?.stop(); else ink?.start(); };

    // 开场：三个字依次显出来，印章盖下去（朱砂从印的位置晕开），然后是罗盘和两扇门。
    // 每段动画放完就交还给样式表，终点帧就是平常的样子；不支持动画的浏览器直接显示。
    const animate = (node, frames, options) => {
      if (reduced || !node?.animate) return;
      node.animate(frames, { easing: EASE, fill: 'backwards', ...options });
    };
    const rise = (distance) => [{ opacity: 0, transform: `translateY(${distance}px)` }, { opacity: 1, transform: 'none' }];
    const sealSplash = () => {
      if (!ink || disposed) return;
      const rect = cover.getBoundingClientRect();
      const seal = sealRef.current.getBoundingClientRect();
      const x = (seal.left + seal.width / 2 - rect.left) / rect.width;
      const y = 1 - (seal.top + seal.height / 2 - rect.top) / rect.height;
      ink.splash(x, y, 240, -110, [0.34, 0.09, 0.06]);
      ink.splash(x, y, -170, -190, [0.22, 0.06, 0.04]);
      ink.splash(x + 0.04, y - 0.02, 110, 200, [0.26, 0.2, 0.1]);
    };
    if (reduced || document.hidden) {
      sealSplash();
    } else {
      cover.querySelectorAll('.welcome-cover__title span').forEach((node, index) => animate(node, [
        { opacity: 0, transform: 'translateY(16px)', filter: 'blur(10px)' },
        { opacity: 1, transform: 'none', filter: 'blur(0px)' },
      ], { duration: 800, delay: 150 + index * 200 }));
      animate(sealRef.current, [{ opacity: 0, transform: 'rotate(-18deg) scale(1.7)' }, { opacity: 1, transform: 'rotate(-4deg) scale(1)' }], { duration: 420, delay: 950, easing: BACK });
      timers.push(setTimeout(sealSplash, 1000));
      animate(cover.querySelector('.welcome-cover__promise'), rise(10), { duration: 700, delay: 1150 });
      animate(cover.querySelector('.welcome-cover__luopan'), [{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'none' }], { duration: 1100, delay: 1050 });
      cover.querySelectorAll('.welcome-cover__door').forEach((node, index) => animate(node, rise(22), { duration: 700, delay: 1550 + index * 120 }));
    }

    resize();
    drawStars(0);
    moveCompass();
    frame = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    cover.addEventListener('pointermove', onMove, { passive: true });
    cover.addEventListener('pointerup', onRelease, { passive: true });
    cover.addEventListener('pointercancel', onRelease, { passive: true });
    cover.addEventListener('pointerleave', onRelease, { passive: true });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      cover.removeEventListener('pointermove', onMove);
      cover.removeEventListener('pointerup', onRelease);
      cover.removeEventListener('pointercancel', onRelease);
      cover.removeEventListener('pointerleave', onRelease);
      ink?.destroy();
    };
  }, []);

  return (
    <section className="welcome-cover" aria-labelledby="welcome-cover-title" ref={coverRef}>
      <canvas className="welcome-cover__ink" ref={inkRef} aria-hidden="true" />
      <canvas className="welcome-cover__stars" ref={starsRef} aria-hidden="true" />

      <header className="welcome-cover__brand">
        <div className="welcome-cover__title-row">
          <span className="welcome-cover__seal" ref={sealRef} aria-hidden="true">古</span>
          <h1 id="welcome-cover-title" className="welcome-cover__title" aria-label="古书派"><span>古</span><span>书</span><span>派</span></h1>
        </div>
        <p className="welcome-cover__promise">以古籍原文批命<small>每一句批语，都能翻到出处</small></p>
      </header>

      <div className="welcome-cover__luopan" aria-hidden="true">
        <div className="welcome-cover__disc" ref={discRef}>
          <Ring kind="xiu" items={XIU}>{(name) => <i>{name}</i>}</Ring>
          <Ring kind="shan" items={SHAN}>{(name) => <i>{name}</i>}</Ring>
          <Ring kind="gua" items={GUA}>{(lines) => <i className="welcome-cover__gua">{[...lines].map((bit, index) => <u key={index} className={bit === '1' ? undefined : 'is-yin'} />)}</i>}</Ring>
          <div className="welcome-cover__pool"><div className="welcome-cover__needle" ref={needleRef} /></div>
        </div>
      </div>

      <nav className="welcome-cover__doors" aria-label="古书派的两个入口">
        {DOORS.map((door) => (
          <button
            key={door.key}
            type="button"
            className="welcome-cover__door"
            onClick={() => handleDoor(door.action)}
            aria-label={`${door.title}：${door.caption}`}
          >
            <strong>{door.title}</strong>
            <span>{door.caption}</span>
            <em>{door.note}</em>
          </button>
        ))}
      </nav>

      <p className="welcome-cover__foot">在屏幕上划一划，墨会跟着手走。</p>
    </section>
  );
}
