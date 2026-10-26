import { useEffect, useRef } from 'react';
import { ArrowLeft, ChevronRight, History, X } from 'lucide-react';
import './BaziLanding.css';

type LastChart = {
  label: string;
  onOpen: () => void;
  onForget: () => void;
};

type ForgottenChart = {
  label: string;
  onUndo: () => void;
};

type BaziLandingProps = {
  onBack: () => void;
  onStart: () => void;
  lastChart?: LastChart | null;
  forgotten?: ForgottenChart | null;
};

const PILLARS = [
  { key: 'year', name: '年柱', seal: '年', meaning: '根' },
  { key: 'month', name: '月柱', seal: '月', meaning: '苗' },
  { key: 'day', name: '日柱', seal: '日', meaning: '花' },
  { key: 'hour', name: '时柱', seal: '时', meaning: '果' },
] as const;

const CHAPTERS = [
  { key: 'pillars', seal: '柱', title: '四柱', caption: '命之基' },
  { key: 'wuxing', seal: '行', title: '五行', caption: '气之衡' },
  { key: 'ten-gods', seal: '神', title: '十神', caption: '关系之象' },
  { key: 'fortune', seal: '运', title: '运限', caption: '时之序' },
] as const;

const JOURNEY = ['录生辰', '排四柱', '明五行', '辨十神', '看运限'] as const;

export default function BaziLanding({ onBack, onStart, lastChart = null, forgotten = null }: BaziLandingProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section className="bazi-landing" aria-labelledby="bazi-landing-title">
      <div className="bazi-landing__backdrop" aria-hidden="true">
        <div className="bazi-landing__landscape" />
        <div className="bazi-landing__constellation bazi-landing__constellation--left" />
        <div className="bazi-landing__constellation bazi-landing__constellation--right" />
      </div>

      <header className="bazi-landing__header">
        <button type="button" className="bazi-landing__back" onClick={onBack} aria-label="返回古书派首页">
          <ArrowLeft aria-hidden="true" />
        </button>
        <div className="bazi-landing__lockup">
          <span className="bazi-landing__seal" aria-hidden="true">命</span>
          <span className="bazi-landing__brand-copy">
            <strong>八字 · 命之理</strong>
            <small>四柱命理 · 古法今读</small>
          </span>
        </div>
        <span className="bazi-landing__volume" aria-hidden="true">卷一</span>
      </header>

      <div className="bazi-landing__content">
        <section className="bazi-landing__hero">
          <p className="bazi-landing__eyebrow">东方术数书院 · 八字卷</p>
          <h1 ref={titleRef} id="bazi-landing-title" tabIndex={-1}>从生辰，读懂四柱</h1>
          <p className="bazi-landing__intro">排年、月、日、时四柱，循五行与十神，逐层理解命局。</p>
          <p className="bazi-landing__motto">玄而不怪 · 道而可学 · 术而可用</p>
        </section>

        <section className="bazi-landing__structure" aria-labelledby="bazi-structure-title">
          <div className="bazi-landing__cosmogram" role="img" aria-label="八字由四柱、五行与十神构成，以日主为关系中心">
            <span className="bazi-landing__orbit-label bazi-landing__orbit-label--outer">四柱</span>
            <span className="bazi-landing__orbit-label bazi-landing__orbit-label--middle">五行</span>
            <span className="bazi-landing__orbit-label bazi-landing__orbit-label--inner">十神</span>
            <span className="bazi-landing__cosmogram-core"><small>关系中心</small><strong>日主</strong></span>
          </div>

          <div className="bazi-landing__structure-heading">
            <p>结构初识</p>
            <h2 id="bazi-structure-title">年 · 月 · 日 · 时</h2>
          </div>

          <div className="bazi-landing__pillars" aria-label="四柱结构">
            {PILLARS.map((pillar) => (
              <article key={pillar.key} className={`bazi-landing__pillar bazi-landing__pillar--${pillar.key}`}>
                <span>{pillar.name}</span>
                <strong>{pillar.seal}</strong>
                <small>{pillar.meaning}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="bazi-landing__chapters" aria-labelledby="bazi-chapters-title">
          <div className="bazi-landing__section-title">
            <span aria-hidden="true">学</span>
            <div>
              <h2 id="bazi-chapters-title">循序入门</h2>
              <p>从结构到关系，再进入时间推演</p>
            </div>
          </div>

          <div className="bazi-landing__chapter-grid">
            {CHAPTERS.map((chapter) => (
              <article key={chapter.key} className="bazi-landing__chapter">
                <span aria-hidden="true">{chapter.seal}</span>
                <strong>{chapter.title}</strong>
                <small>{chapter.caption}</small>
              </article>
            ))}
          </div>
        </section>

        <ol className="bazi-landing__journey" aria-label="八字学习路径">
          {JOURNEY.map((step) => <li key={step}>{step}</li>)}
        </ol>

        <div className="bazi-landing__action">
          {lastChart && (
            <div className="bazi-landing__resume">
              <button type="button" className="bazi-landing__resume-open" onClick={lastChart.onOpen}>
                <History aria-hidden="true" />
                <span>
                  <strong>查看上次的命盘</strong>
                  <small>{lastChart.label}</small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
              <button type="button" className="bazi-landing__resume-forget" onClick={lastChart.onForget} aria-label="清除上次的命盘记录">
                <X aria-hidden="true" />
              </button>
            </div>
          )}
          {!lastChart && forgotten && (
            <div className="bazi-landing__resume" role="status">
              <span className="bazi-landing__resume-note">
                <strong>已清除上次的命盘</strong>
                <small>{forgotten.label}</small>
              </span>
              <button type="button" className="bazi-landing__resume-undo" onClick={forgotten.onUndo}>撤销</button>
            </div>
          )}
          <button type="button" className="bazi-landing__start" onClick={onStart}>
            <span>{lastChart ? '录入新的生辰' : '录入生辰 · 起命盘'}</span>
            <ChevronRight aria-hidden="true" />
          </button>
          <p><span aria-hidden="true">◆</span> 本地排盘 · 生辰资料不上传</p>
        </div>
      </div>
    </section>
  );
}
