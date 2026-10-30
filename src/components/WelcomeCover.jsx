import './WelcomeCover.css';

const COVER_ENTRANCES = Object.freeze([
  Object.freeze({
    key: 'today',
    seal: '今',
    title: '今日',
    caption: '当下运势',
    action: 'home',
  }),
  Object.freeze({
    key: 'ziwei',
    seal: '紫',
    title: '紫微',
    caption: '星曜宫位',
    action: 'input',
  }),
  Object.freeze({
    key: 'bazi',
    seal: '八',
    title: '八字',
    caption: '四柱大运',
    action: 'bazi',
  }),
  Object.freeze({
    key: 'liuyao',
    seal: '卦',
    title: '六爻',
    caption: '一事一问',
    action: 'liuyao',
  }),
  Object.freeze({
    key: 'archive',
    seal: '档',
    title: '档案',
    caption: '命盘管理',
    action: 'archive',
  }),
]);

const JOURNEY_STEPS = Object.freeze(['录生辰', '起命盘', '看运限', '存档案', '做复盘']);

export default function WelcomeCover({ onEnter, onNavigate }) {
  const handleEntrance = (action) => {
    if (action === 'home') {
      onEnter?.();
      return;
    }
    onNavigate?.(action);
  };

  return (
    <section className="welcome-cover" aria-labelledby="welcome-cover-title">
      <div className="welcome-cover__stars" aria-hidden="true" />
      <div className="welcome-cover__mountains welcome-cover__mountains--left" aria-hidden="true" />
      <div className="welcome-cover__mountains welcome-cover__mountains--right" aria-hidden="true" />

      <div className="welcome-cover__inner">
        <header className="welcome-cover__brand">
          <div className="welcome-cover__title-row">
            <span className="welcome-cover__brand-seal" aria-hidden="true">古</span>
            <h1 id="welcome-cover-title">古书派</h1>
          </div>
          <p className="welcome-cover__brand-caption">紫微 · 八字 · 六爻</p>
          <p className="welcome-cover__brand-promise">观本命&nbsp;·&nbsp;察流年&nbsp;·&nbsp;知进退</p>
        </header>

        <div className="welcome-cover__astrolabe" aria-hidden="true">
          <div className="welcome-cover__spokes" />
          <span className="welcome-cover__orbit welcome-cover__orbit--one" />
          <span className="welcome-cover__orbit welcome-cover__orbit--two" />
          <span className="welcome-cover__orbit welcome-cover__orbit--three" />
          <span className="welcome-cover__orbit welcome-cover__orbit--four" />
          <span className="welcome-cover__cardinal welcome-cover__cardinal--north" />
          <span className="welcome-cover__cardinal welcome-cover__cardinal--east" />
          <span className="welcome-cover__cardinal welcome-cover__cardinal--south" />
          <span className="welcome-cover__cardinal welcome-cover__cardinal--west" />
          <span className="welcome-cover__orbit-copy welcome-cover__orbit-copy--top">星曜宫位</span>
          <span className="welcome-cover__orbit-copy welcome-cover__orbit-copy--middle">阴阳 · 五行</span>
          <span className="welcome-cover__orbit-copy welcome-cover__orbit-copy--lower">四柱 · 干支</span>
          <span className="welcome-cover__core">命理</span>
        </div>

        <nav className="welcome-cover__entrances" aria-label="古书派主要功能">
          {COVER_ENTRANCES.map((item) => (
            <button
              key={item.key}
              type="button"
              className="welcome-cover__entrance"
              onClick={() => handleEntrance(item.action)}
              aria-label={`${item.title}：${item.caption}`}
            >
              <span className="welcome-cover__entrance-seal" aria-hidden="true">{item.seal}</span>
              <span className="welcome-cover__entrance-title">{item.title}</span>
              <span className="welcome-cover__entrance-caption">{item.caption}</span>
              <span className="welcome-cover__entrance-stamp" aria-hidden="true">古</span>
            </button>
          ))}
        </nav>

        <ol className="welcome-cover__journey" aria-label="使用流程">
          {JOURNEY_STEPS.map((step) => <li key={step}>{step}</li>)}
        </ol>

        <footer className="welcome-cover__footer">
          <button type="button" className="welcome-cover__enter" onClick={() => onEnter?.()}>
            <span>入门问道</span>
          </button>
          <p>从今日运势开始</p>
        </footer>
      </div>
    </section>
  );
}
