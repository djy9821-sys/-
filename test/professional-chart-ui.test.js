import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (relativePath) => readFile(
  new URL(`../${relativePath}`, import.meta.url),
  'utf8',
);

test('紫微命盘默认打开高密度专业盘并保留运限交互', async () => {
  const source = await readProjectFile('src/components/ProfessionalChart.jsx');

  assert.match(source, /useState\('professional'\)/);
  assert.match(source, /data-testid="ziwei-chart-title"/);
  assert.match(source, /wenmo-board relative grid grid-cols-4 grid-rows-4/);
  assert.equal((source.match(/data-direction=/g) || []).length, 4);
  assert.match(source, /wenmo-star-columns--fly/);
  assert.match(source, /wenmo-luck-table chart-timeline/);
  assert.equal((source.match(/className="wenmo-luck-row/g) || []).length, 5);
  assert.match(source, /className="wenmo-mode-bar print:hidden"/);
  assert.match(source, /className="wenmo-bottom-tabs print:hidden"/);
  assert.match(source, /handleSelection\('daxian', palace\.index\)/);
  assert.match(source, /renderSanheConnections\(\)/);
  assert.match(source, /renderFlyConnections\(\)/);
  assert.match(source, /renderSelfMutationArrows\(\)/);
  assert.match(source, /data-testid="ziwei-self-mutation-layer"/);
  assert.match(source, /data-mutation-direction=\{entry\.kind\}/);
  assert.match(source, /data-testid="ziwei-fly-layer"/);
  assert.match(source, /className="wenmo-arrow-hit-target"/);
  assert.match(source, /className="wenmo-arrow-hit-pad"/);
  assert.match(source, /data-testid="ziwei-mutation-explainer"/);
  assert.match(source, /单条飞化只表示结构关系/);
  assert.match(source, /本命宫干/);
  assert.match(source, /《紫微斗数全书》十干四化/);
  assert.match(source, /data-layer=\{badge\.key\}/);
  assert.match(source, /data-mutagen=\{badge\.type\}/);
  assert.match(source, /MUTAGEN_LAYER_META\.map/);
  assert.doesNotMatch(source, /activeSiHua\.slice\(0, 1\)/);
  assert.doesNotMatch(source, /basicInfo\.gender === 'male' \? '阳男' : '阴女'/);
  assert.match(source, /mingPalace\?\.index/);
  assert.match(source, /viewBox="0 0 400 400"/);
  assert.match(source, /markerEnd=\{`url\(#self-mutation-arrow-\$\{entry\.key\}\)`\}/);
});

test('飞星模式使用独立的宫格、十年落宫标记与完整五层时间轴', async () => {
  const source = await readProjectFile('src/components/ProfessionalChart.jsx');
  const mutations = await readProjectFile('src/utils/ziweiMutations.js');

  assert.match(source, /data-chart-mode=\{professionalToolMode\}/);
  assert.match(source, /wenmo-palace--fly/);
  assert.match(source, /data-testid="ziwei-fly-palace-meta"/);
  assert.match(source, /buildFlyYearMarkers/);
  assert.match(mutations, /yearlyPalaceIndex: fortune\?\.yearly\?\.index/);
  assert.match(source, /flyYearByPalaceIndex/);
  assert.match(source, /getFlyPalaceShortName/);
  assert.match(source, /<section className="wenmo-luck-row" aria-label="流月"/);
  assert.match(source, /<section className="wenmo-luck-row wenmo-luck-row--days" aria-label="流日"/);
  assert.match(source, /<section className="wenmo-luck-row" aria-label="流时"/);
  assert.doesNotMatch(source, /!isCompactToolMode && <section className="wenmo-luck-row" aria-label="流月"/);
  assert.match(source, /const \[flyRouteSourceIndex, setFlyRouteSourceIndex\]/);
  assert.match(source, /if \(!showConnections \|\| isSihuaMode\) return null/);
});

test('四化模式使用独立宫格、四色代码、起宫锚点与五层时间轴', async () => {
  const source = await readProjectFile('src/components/ProfessionalChart.jsx');
  const mutations = await readProjectFile('src/utils/ziweiMutations.js');

  assert.match(source, /const isSihuaMode = professionalToolMode === 'sihua'/);
  assert.match(source, /const isCompactToolMode = isFlyMode \|\| isSihuaMode/);
  assert.match(source, /wenmo-palace--sihua/);
  assert.match(source, /data-testid="ziwei-sihua-palace-meta"/);
  assert.match(source, /renderSihuaConnections\(\)/);
  assert.match(source, /data-testid="ziwei-sihua-layer"/);
  assert.match(source, /data-reference-code=\{entry\.code\}/);
  assert.match(source, /data-anchor-branch=\{entry\.anchorBranch\}/);
  assert.match(source, /className="wenmo-arrow-hit-pad wenmo-sihua-code-hit"/);
  assert.match(source, /x: geometry\.start\.x \+ outward\.x \* 5/);
  assert.match(source, /const anchorBranch = entry\.sourceBranch/);
  assert.match(source, /className="wenmo-sihua-guides"/);
  assert.match(source, /markerEnd=\{`url\(#sihua-reference-arrow-\$\{entry\.key\}\)`\}/);
  assert.match(source, /stroke=\{entry\.color\}/);
  assert.match(source, /rx="30"/);
  assert.match(source, /ry="23"/);
  assert.match(source, /className="wenmo-arrow-hit-pad wenmo-sihua-anchor"/);
  assert.match(source, /r="12"/);
  assert.match(source, /onKeyDown=\{\(event\) => \{[\s\S]*?event\.stopPropagation\(\);[\s\S]*?event\.key !== 'Enter'[\s\S]*?selectStarTransformInfo\(event/);
  assert.match(source, /const selectMutagenLegendInfo = \(meta\) =>/);
  assert.match(source, /info\.layer === 'legend'/);
  assert.match(source, /aria-label=\{`\$\{meta\.code\}代表化\$\{meta\.mutagen\}；点击查看含义`\}/);
  assert.match(source, /onClick=\{\(\) => selectMutagenLegendInfo\(meta\)\}/);
  assert.match(source, /selectMutagenLegendInfo\(meta\)[\s\S]*?onKeyDown=\{\(event\) => \{[\s\S]*?event\.key !== 'Enter'[\s\S]*?selectMutagenLegendInfo\(meta\)/);
  assert.match(source, /四化盘路径 · \$\{info\.code\}=化\$\{info\.mutagen\}/);
  assert.match(source, /A禄、B权、C科、D忌/);
  assert.match(source, /name === '仆役' \? '交友' : name/);
  assert.match(source, /timelineYearModels\[0\]\?\.decadalPalaceNames/);
  assert.match(mutations, /anchorBranch: flight\.sourceBranch/);
  assert.match(mutations, /track: flight\.kind === 'inward' \? 'source-to-center' : 'source-to-outer'/);
  assert.match(source, /本红·限绿·年蓝·月橙·日紫·时青/);
  assert.match(source, /visibleMutagenLayerKeys/);
  assert.doesNotMatch(source, /activeSiHua\.filter\(\(badge\) => badge\.key === 'origin'\)/);
});

test('箭头提供首次引导、常驻图例、逐步产生依据与选中高亮', async () => {
  const source = await readProjectFile('src/components/ProfessionalChart.jsx');
  const styles = await readProjectFile('src/index.css');

  assert.match(source, /ARROW_GUIDE_STORAGE_KEY = 'gushupai:ziwei-arrow-guide-v1'/);
  assert.match(source, /window\.localStorage\.getItem\(ARROW_GUIDE_STORAGE_KEY\)/);
  assert.match(source, /window\.localStorage\.setItem\(ARROW_GUIDE_STORAGE_KEY, 'seen'\)/);
  assert.match(source, /data-testid="ziwei-arrow-onboarding"/);
  assert.match(source, /彩色箭头是怎么产生的/);
  assert.match(source, /起宫（宫干）[\s\S]*?查十干四化表[\s\S]*?找到目标星[\s\S]*?看星所在宫/);
  assert.match(source, /朝盘外是离心自化，朝中宫是向心自化/);
  assert.match(source, /绿色 A＝禄，紫色 B＝权，蓝色 C＝科，红色 D＝忌/);
  assert.match(source, /灰色虚线只帮助定位对宫/);
  assert.match(source, /data-testid="ziwei-arrow-legend"/);
  assert.match(source, /宫干 → 四化表 → 目标星 → 所在宫/);
  assert.match(source, /外＝离心/);
  assert.match(source, /心＝向心/);
  assert.match(source, /className="wenmo-arrow-derivation"/);
  assert.match(source, /这条箭头怎么来的/);
  assert.match(source, /<dt>起宫<\/dt>/);
  assert.match(source, /<dt>宫干<\/dt>/);
  assert.match(source, /<dt>目标星<\/dt>/);
  assert.match(source, /<dt>落宫<\/dt>/);
  assert.match(source, /data-selected=\{isSelected \? 'true' : 'false'\}/);
  assert.match(source, /has-selection/);
  assert.match(styles, /\.wenmo-arrow-help-strip\s*\{/);
  assert.match(styles, /\.wenmo-arrow-guide__actions button\s*\{[\s\S]*?min-height: 44px/);
  assert.match(styles, /\.wenmo-self-mutations\.has-selection/);
  assert.match(styles, /\.wenmo-sihua-route\.is-selected \.wenmo-sihua-path/);
  assert.match(styles, /@media \(max-width: 430px\)[\s\S]*?\.wenmo-arrow-derivation ol \{ grid-template-columns: 1fr; \}/);
});

test('中宫展示可核验的出生资料并提供手机友好的完整说明', async () => {
  const source = await readProjectFile('src/components/ProfessionalChart.jsx');
  const app = await readProjectFile('src/App.jsx');
  const styles = await readProjectFile('src/index.css');

  assert.match(app, /birthTimeIndex: Number\(birthTime\)/);
  assert.match(source, /buildBaziChart/);
  assert.match(source, /data-testid="ziwei-center-summary"/);
  assert.match(source, /data-testid="ziwei-center-details"/);
  assert.match(source, /出生公历/);
  assert.match(source, /出生农历/);
  assert.match(source, /出生钟表时/);
  assert.match(source, /真太阳时/);
  // 录入页选「精确到分钟」并填出生地后显示换算结果，否则提示如何校正
  assert.match(source, /未校正：录入时选「精确到分钟」并填出生地，可按真太阳时定时辰/);
  assert.match(source, /trueSolar\?\.applied/);
  assert.match(app, /trueSolar: ziweiExact \? \{/);
  assert.match(app, /精确到分钟/);
  assert.match(source, /节气四柱（八字）/);
  assert.match(source, /命宫地支/);
  assert.match(source, /身宫地支/);
  assert.match(source, /紫微首限/);
  assert.match(source, /八字起运（另一套体系）/);
  assert.match(source, /八字十年大运/);
  assert.match(source, /八字起运与紫微大限不是同一个体系/);
  assert.match(source, /子斗[\s\S]*?尚未接入经过校验的算法/);
  assert.match(source, /当前查看层级/);
  assert.doesNotMatch(source, /!isSihuaMode && <div className="wenmo-pillar-panels"/);
  assert.match(styles, /\.wenmo-center-details-modal\s*\{/);
  assert.match(styles, /\.wenmo-center-detail-list dd\s*\{[\s\S]*?overflow-wrap: anywhere/);
  assert.match(styles, /@media \(max-width: 430px\)[\s\S]*?\.wenmo-center-details-sheet \{ width: 100%; max-height: 92dvh/);
  assert.match(styles, /@media \(max-width: 360px\)[\s\S]*?\.wenmo-center-layer-status \{ grid-template-columns: repeat\(3/);
});

test('常用功能采用左下向上展开的九项竖向菜单并接通隐私、显示开关与分享链接', async () => {
  const source = await readProjectFile('src/components/ProfessionalChart.jsx');
  const styles = await readProjectFile('src/index.css');
  const menuStart = source.indexOf('data-testid="ziwei-common-menu"');
  const menuEnd = source.indexOf('</nav>', menuStart);
  const menuSource = source.slice(menuStart, menuEnd);
  const expectedItems = ['AI 分析', '格局分析', '精简星曜', '命盘调整', '显示模式', '隐藏生辰', '截图保存', '打印分享', '分享链接'];

  assert.ok(menuStart > 0 && menuEnd > menuStart);
  expectedItems.forEach((label) => assert.match(menuSource, new RegExp(`>${label}</button>`)));
  for (let index = 1; index < expectedItems.length; index += 1) {
    assert.ok(menuSource.indexOf(`>${expectedItems[index - 1]}</button>`) < menuSource.indexOf(`>${expectedItems[index]}</button>`));
  }

  assert.match(source, /const \[compactStarView, setCompactStarView\]/);
  assert.match(source, /const \[hideBirthDetails, setHideBirthDetails\]/);
  assert.match(source, /compactStarView \? compactStars\.slice\(0, 4\)/);
  assert.match(source, /data-star-density=\{compactStarView \? 'compact' : 'full'\}/);
  assert.match(source, /data-birth-details=\{hideBirthDetails \? 'hidden' : 'visible'\}/);
  assert.match(source, /hideBirthDetails \? '已隐藏'/);
  assert.match(source, /event\.key !== 'Escape'/);
  assert.match(source, /document\.addEventListener\('pointerdown', handlePointerDown\)/);
  assert.match(source, /window\.requestAnimationFrame\(\(\) => \{[\s\S]*?querySelector\('button'\)\?\.focus\(\)/);
  assert.match(source, /setShowPatternAnalysis\(true\)/);
  assert.doesNotMatch(source, /setPromptPreview\(\{ title: '格局分析指令'/);
  assert.match(source, /handleScreenshotSave/);
  assert.match(source, /canvas\.toBlob\(resolve, 'image\/png'/);
  assert.match(source, /<button type="button" onClick=\{onSave\}>保存档案<\/button>/);
  assert.match(source, /onShareLink = null/);
  assert.match(menuSource, /\{onShareLink && \(/);

  assert.match(styles, /\.wenmo-common-anchor \{ position: relative/);
  assert.match(styles, /\.wenmo-common-menu\s*\{[\s\S]*?bottom: calc\(100% \+ 4px\);[\s\S]*?display: grid;[\s\S]*?width: clamp\(104px, 32vw, 126px\);[\s\S]*?max-height: min\(60dvh, 352px\)/);
  assert.doesNotMatch(styles, /\.wenmo-common-menu\s*\{[\s\S]*?grid-template-columns: repeat\(4/);
  assert.match(styles, /\.wenmo-common-menu button\s*\{[\s\S]*?min-height: 44px/);
  assert.match(styles, /\.wenmo-common-menu button:nth-child\(even\) \{ background: #9693cf; \}/);
});

test('格局分析区分严格格局与星系观察，并提供盘面证据和规则来源', async () => {
  const source = await readProjectFile('src/components/ProfessionalChart.jsx');
  const styles = await readProjectFile('src/index.css');

  assert.match(source, /analyzeZiweiPatterns/);
  assert.match(source, /analyzeZiweiStructures/);
  assert.match(source, /data-testid="ziwei-pattern-modal"/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby="wenmo-pattern-title"/);
  assert.match(source, /格局分析 <small>beta<\/small>/);
  assert.match(source, /data-testid="ziwei-pattern-result"/);
  assert.match(source, /data-testid="ziwei-structure-result"/);
  assert.match(source, /data-fortune=\{pattern\.fortune\}/);
  assert.match(source, /经典格局（完整命中）/);
  assert.match(source, /星系观察（不等于古典吉格）/);
  assert.match(source, /判定依据/);
  assert.match(source, /口径与限制/);
  assert.match(source, /规则来源/);
  assert.match(source, /selectedPattern\.source\.rule/);
  assert.match(source, /selectedPattern\.source\.url/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /data-testid="ziwei-pattern-disclaimer"/);
  assert.match(source, /辅助参考/);
  assert.match(source, /流派差异/);
  assert.match(source, /不把主星同宫、无正曜或部分命中结果伪装成格局/);
  assert.match(source, /暂不把本命规则直接套到大限/);
  assert.match(source, /重要决定的唯一依据/);
  assert.match(source, /if \(event\.target === event\.currentTarget\) closePatternAnalysis\(\)/);
  assert.match(source, /showPatternAnalysis[\s\S]*?event\.key !== 'Escape'/);
  assert.match(source, /反馈问题建议/);
  assert.match(source, /分享格局分析/);

  assert.match(styles, /\.wenmo-pattern-modal\s*\{/);
  assert.match(styles, /\.wenmo-pattern-sheet\s*\{[\s\S]*?grid-template-rows: minmax\(0, 1fr\) auto/);
  assert.match(styles, /\.wenmo-pattern-paper\s*\{[\s\S]*?overflow-y: auto/);
  assert.match(styles, /\.wenmo-pattern-card\s*\{[\s\S]*?min-height: 64px/);
  assert.match(styles, /\.wenmo-pattern-card\[data-fortune="established"\]/);
  assert.match(styles, /\.wenmo-pattern-card\[data-fortune="observed"\]/);
  assert.match(styles, /\.wenmo-pattern-source\s*\{/);
  assert.match(styles, /\.wenmo-pattern-actions button\s*\{[\s\S]*?min-height: 48px/);
  assert.match(styles, /@media \(max-width: 430px\)[\s\S]*?\.wenmo-pattern-sheet \{ width: calc\(100vw - 16px\)/);
  assert.match(styles, /@media \(max-width: 360px\)[\s\S]*?\.wenmo-pattern-actions \{ grid-template-columns: 1\.2fr 44px 1\.35fr/);
});

test('专业盘使用连续纸面网格、竖排星曜与五层运限', async () => {
  const styles = await readProjectFile('src/index.css');

  assert.match(styles, /\.wenmo-board\s*\{[\s\S]*?aspect-ratio: 1 \/ 1\.29/);
  assert.match(styles, /\.wenmo-grid-cell,[\s\S]*?\.wenmo-center/);
  assert.match(styles, /\.wenmo-star-column b\s*\{[\s\S]*?writing-mode: vertical-rl/);
  assert.match(styles, /\.wenmo-day-grid\s*\{[\s\S]*?grid-template-columns: repeat\(10/);
  assert.match(styles, /\.wenmo-luck-cell\.is-active/);
  assert.match(styles, /\.chart-action-bar \{ display: none !important; \}/);
  assert.match(styles, /\.wenmo-fly-path\s*\{[\s\S]*?animation: wenmo-fly-flow/);
  assert.match(styles, /\.wenmo-arrow-hit-target\s*\{[\s\S]*?stroke-width: 18px/);
  assert.match(styles, /\.wenmo-arrow-hit-pad\s*\{[\s\S]*?pointer-events: all/);
  assert.match(styles, /\.wenmo-arrow-explainer\s*\{/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /@media print[\s\S]*?\.wenmo-board \{ aspect-ratio: 1 \/ 1 !important; \}/);
});

test('飞星盘视觉规则与三合盘隔离', async () => {
  const styles = await readProjectFile('src/index.css');

  assert.match(styles, /\.wenmo-chart\[data-chart-mode="fly"\]/);
  assert.match(styles, /\.wenmo-star-columns--fly\s*\{[\s\S]*?flex-wrap: wrap/);
  assert.match(styles, /\.wenmo-palace--fly \.wenmo-star-column b\s*\{[\s\S]*?font-size: clamp\(14px/);
  assert.match(styles, /\.wenmo-fly-palace-meta\s*\{/);
  assert.match(styles, /\.wenmo-center-info--fly\s*\{/);
  assert.match(styles, /\.wenmo-luck-table--fly \.wenmo-luck-row/);
});

test('四化盘视觉规则隔离并采用四色箭头、六层方章与手机点击区', async () => {
  const styles = await readProjectFile('src/index.css');

  assert.match(styles, /\.wenmo-chart\[data-chart-mode="sihua"\]/);
  assert.match(styles, /\.wenmo-star-columns--sihua\s*\{/);
  assert.match(styles, /\.wenmo-palace--sihua \.wenmo-star-column b\s*\{[\s\S]*?color: #4a4a4a/);
  assert.match(styles, /\.wenmo-sihua-palace-meta\s*\{[\s\S]*?grid-template-columns: 0\.65fr 1\.35fr 0\.72fr/);
  assert.match(styles, /\.wenmo-sihua-path\s*\{[\s\S]*?stroke: var\(--route-color, currentColor\)/);
  assert.match(styles, /\.wenmo-sihua-guides line\s*\{[\s\S]*?stroke-dasharray: 4 4/);
  assert.match(styles, /\.wenmo-sihua-route \.wenmo-arrow-hit-target \{ stroke-width: 32px; \}/);
  assert.match(styles, /\.wenmo-palace--sihua \.wenmo-star-transform\s*\{[\s\S]*?width: clamp\(14px, 3\.8vw, 18px\);[\s\S]*?height: clamp\(16px, 4\.2vw, 20px\);/);
  assert.match(styles, /\.wenmo-star-columns--sihua\s*\{[\s\S]*?z-index: auto;/);
  assert.match(styles, /\.wenmo-palace--sihua \.wenmo-star-transform\s*\{[\s\S]*?z-index: 42;/);
  assert.match(styles, /\.wenmo-palace--sihua \.wenmo-star-transform::before\s*\{[\s\S]*?inset: -1px;/);
  assert.match(styles, /\.wenmo-chart\[data-chart-mode="sihua"\] \.wenmo-center \{ z-index: auto; \}/);
  assert.match(styles, /\.wenmo-sihua-code-legend > button\s*\{[\s\S]*?min-height: 28px;/);
  assert.match(styles, /\.wenmo-sihua-code-legend > button::before\s*\{[\s\S]*?inset: -4px 0;/);
  assert.match(styles, /\.wenmo-sihua-layer-legend\s*\{[\s\S]*?grid-template-columns: repeat\(6/);
  assert.match(styles, /\.wenmo-sihua-layer-legend > button\s*\{[\s\S]*?background: var\(--layer-color\)/);
  assert.match(styles, /@media \(max-width: 430px\)[\s\S]*?\.wenmo-arrow-explainer > dl \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(styles, /\.wenmo-center-info--sihua\s*\{/);
  assert.match(styles, /\.wenmo-luck-table--sihua \.wenmo-luck-row/);
});

test('专业盘时间轴：年份按出生农历年排，手动选的各层干支与「今」运势同一口径', async () => {
  const source = await readProjectFile('src/components/ProfessionalChart.jsx');

  assert.match(source, /birthLunarYearOf\(horoscope\)/);
  assert.match(source, /getTimelineFortune\(horoscope, selection\)/);
  assert.match(source, /year === currentFlowYear \? 'is-current'/);
  assert.doesNotMatch(source, /new Date\(basicInfo\.birthday\)\.getFullYear\(\)/);
  assert.doesNotMatch(source, /astro\.byLunar/);
});

test('双人起居注算完自动复制被拒时，指令留在弹窗里可再点复制（手机浏览器只认点击当下的复制）', async () => {
  const source = await readProjectFile('src/components/ProfessionalChart.jsx');
  const selector = await readProjectFile('src/utils/babySelector.js');

  assert.match(source, /setBabyPrompt\(prompt\)/);
  assert.match(source, /data-testid="baby-prompt-fallback"/);
  assert.match(source, /onClick=\{\(\) => copyToClipboard\(babyPrompt\)\}/);
  assert.doesNotMatch(source, /alert\('复制失败，请手动复制。'\)/);
  // 遍历八十多张紫微盘时每算完一天让出一次，转圈不会卡死。
  assert.match(selector, /await new Promise\(\(resolve\) => setTimeout\(resolve, 0\)\)/);
});
