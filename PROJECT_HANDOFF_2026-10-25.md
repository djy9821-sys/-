# 古书派项目交接总结 (PROJECT_HANDOFF_2026-10-25)

> 分支：`feat/bazi-liuri-liushi`（PR #1，尚未合并到 main）
> 原则不变：合并到 main 即上线，需用户明确同意。

## 本次完成

### 八字模块（`src/components/BaziDivination.jsx`）
- **流月 · 流日 · 流时**：新板块「肆」，组件在 `src/components/bazi/BaziFlowPanel.jsx`，计算在 `src/utils/baziFlow.js`。
- **合冲刑害**：`src/utils/baziRelations.js`，天干五合/四冲，地支六合/六冲/三合半合/三会/刑/自刑/害/破，伏吟、反吟。同类关系合并；反吟不重复列单冲。
- **专业对照表**：可对照到流年/流月/流日/流时；控件是一条吸顶工具栏。
- **真太阳时**：`src/utils/trueSolarTime.js`（经度时差、USNO 均时差、1986–1991 夏令时）、`src/utils/birthPlaces.js`（地级市经度表）。`buildBaziChart` 新增 `timeMode: 'exact'` 输入，返回 `timeInfo`（含时辰交界提示 `boundary`）。
- **命例存档**：`src/utils/baziRecord.js`，档案记录 `type: 'bazi'`，与紫微共用 `calendarType / birthDate / timeHour / isLeapMonth`，八字特有设置放在 `data`。`ArchiveView` 可打开八字记录，`App.jsx` 通过 `baziRecord` 状态传给 `BaziDivination initialRecord`。
- 输入页改用卷首页配色（墨绿 #020b0c、金 #dcb471、朱砂 #8e231d）；小字最小 10–11px。

### 全局
- `.app-shell` 增加 `overflow-x: clip`（保留 hidden 作为旧浏览器回退），否则页面内 `position: sticky` 无效。
- `ProfessionalChart` 改为 lazy 加载。
- `vite.config.js` 去掉 `Date.now()` 文件名；`vercel.json` 给 `/assets/*` 加 immutable 长缓存。

## 测试
- `node --test test/*.test.js`：新增 `bazi-flow`、`bazi-relations`、`true-solar-time`、`bazi-record`。
- 本次开发环境无法安装 npm 依赖，**没有跑过 `npm run lint` / `npm run build`**，接手后请先在本地跑一遍。

## 下一步可做
- 流日格子加黄历宜忌（lunar-javascript 自带 `getDayYi / getDayJi`）。
- 首页与紫微页面的视觉统一检查。

---

## 2026-10-26 更新（尚未上线）

改动分三层叠放，依次合并即可：

| 分支 | PR | 内容 |
|---|---|---|
| `feat/bazi-ai-prompt` | #2 | 八字：导出给 AI、神煞、自坐、胎元命宫身宫、小运、旺衰喜用、黄历宜忌、记住上次命盘 |
| `feat/site-polish` | #3 | 首页「八字 · 今日」、`#/bazi` 等地址路由与返回键、离线缓存、关于与隐私、SEO |
| `claude/site-next` | #4 | 紫微库按需加载（首次打开约 120 KB）、今日卡片切换命盘、手势模型同域名、图片 WebP、清理 |

要点：

- **路由**：`App.jsx` 里 `VIEW_ROUTES` 把页面映射到 `#/...`；返回首页时用 `history.go(-depth)` 回到起点，避免历史堆叠。
- **离线缓存**：`public/sw.js` 对页面导航先走网络（4 秒超时才用缓存），`/assets/` 缓存优先。旧版 Workbox 是缓存优先，曾导致长期显示旧版本，所以不要改回缓存优先。
- **按需加载**：首页不静态引入 iztro / lunar-javascript。`loadZiweiLib()` 在紫微录入、紫微命盘或首页有紫微档案时才加载。`vite.config.js` 只手动拆 `vendor-react`（含 CommonJS 辅助函数），其他库别加进 `manualChunks`，否则首页会被迫预加载。
- **手势模型**：构建时把 `node_modules/@mediapipe/hands` 复制到 `/mediapipe/hands@版本/`，运行时先用自己的文件，失败再试 jsdelivr。
- **八字今日**：`utils/baziToday.js` 负责计算，`components/bazi/HomeBaziToday.jsx` 负责显示。默认显示档案中「自己」的八字，选择记在 `gushupai-home-bazi-profile`。
- **预览部署**：Vercel 的 Git 连接断了（GitHub 改名后），需要在 ziwei-app → Settings → Git 点 Reconnect；在此之前用 Deployments → Create Deployment 填提交链接手动建预览。

仍待决定：英语学习已删除；课程视频（`VideoLessons`）保留代码但不开放地址；国内访客统计建议开启 Vercel Web Analytics。

---

## 2026-10-26 第二轮（追加在 PR #4，尚未上线）

- **离线缓存**：只拦截 `/`、`/index.html` 的页面导航，且只把 `text/html` 存成首页；打开 `/sitemap.xml` 等地址不再污染缓存（`test/sw-offline.test.js`）。
- **按需加载兜底**：`main.jsx` 监听 `vite:preloadError`，下载失败时自动刷新一次（10 秒内不重复）；根组件外包 `ErrorBoundary`，提示改成通用说明。
- **虚岁**：lunar-javascript 按公历年份算岁数，`baziChart.js` 用 `lunar.getSolar().getYear() - lunar.getYear()` 补差值。元旦到春节之间出生的人，大运、流年、小运的虚岁都多一岁（1998-01-02 出生：2026 年 30 虚岁）。
- **八字返回键**：卷首、录入、结果三步写入 `history.state.baziStep`，`BaziDivination.jsx` 里的 `pushStep` / `goBackTo` 负责前进和后退；从别的页面返回时恢复离开前的步骤。
- **存档去重**：`findSameBaziRecord`（同名、同一张盘）命中时更新原记录，不再重复保存。
- **其他**：卷首页清除上次的命盘可撤销；档案列表显示钟表时间且不拆行；调候用五行字标记；顶部标题改为「古书派」；紫微库下载失败时首页可「重新加载」；金钱卦标签改为「加密级随机」；乾、坤、屯、井卦辞校对（`test/hexagram-text.test.js`）。

预览（分支别名，需登录 Vercel）：https://ziwei-app-git-claude-site-next-djs-projects-b34d7833.vercel.app

下一轮：金钱卦与手势八卦合并为六爻起卦，补变卦、爻辞、纳甲；紫微改用真太阳时并重做手机排版；首页八字、紫微并列为主入口。

---

## 2026-10-26 第三轮（分支 `claude/liuyao-ziwei-time`，PR #5，尚未上线）

- **六爻起卦**（`#/liuyao`）：金钱卦与手势八卦合并为一个入口。`components/LiuYaoDivination.jsx` 负责 问事 → 起卦方式 → 结果 三步；`MoneyDivination` / `BaguaDivination` 保留原动画，加了 `onComplete(values)`，六爻齐后把爻值（初爻在前，6 老阴 / 7 少阳 / 8 少阴 / 9 老阳）交回，不再自己显示卦象。旧地址 `#/money`、`#/bagua` 自动跳到 `#/liuyao` 并预选对应的起卦方式（`LEGACY_ROUTES`）。
- **装卦**：`utils/liuyao.js`，京房纳甲，八宫世应、六亲、六神（按日干）、伏神（本宫首卦同位）、旬空 / 月破 / 日冲、变卦、互卦、用九用六；爻辞在 `data/yaoci.js`（64 卦 384 爻 + 用九用六，按通行本校对）。结果页 `components/LiuYaoResult.jsx`：装卦表、起卦四柱、卦辞爻辞、存入档案、复制给 AI（`buildLiuYaoPrompt`）。
- **卦例档案**：记录 `type: 'liuyao'`，`data` 里存爻值与起卦时间（`utils/liuyaoRecord.js`），打开时重新装卦；`ArchiveView` 显示「本卦 → 变卦 · 起卦时间 · 日辰」。
- **所在地与此刻**：`utils/currentPlace.js` 保存所在地（localStorage `gushupai-current-place`），`toLocalSolarNow()` 把设备时间换成所在地真太阳时；首页「八字 · 今日」、八字流时的「此刻」、六爻起卦时间都用它。设置入口是 `components/common/PlaceSetting.jsx`。
- **紫微真太阳时**：紫微录入页新增「精确到分钟」：钟表时间 + 出生地（省市 / 经度 / 时区 / 夏令时），`utils/ziweiTime.js` 复用八字的 `resolveExactBirth` 换算出时辰与公历日期再排盘；档案 `data.timeMode = 'exact'` 保存设置，打开时重新换算；专业盘中宫「真太阳时」显示换算结果，离时辰交界近时提示另一可能。
- **测试**：新增 `liuyao`、`liuyao-record`、`current-place`、`ziwei-time`；`gesture-bagua`、`welcome-cover`、`professional-chart-ui` 随改动更新。本次环境仍装不上 npm 依赖，lint / build 以 GitHub CI 为准。

---

## 2026-10-26 第四轮（分支 `claude/round4-insights`，基于 `claude/liuyao-ziwei-time`，PR #6，尚未上线）

- **错误上报与使用统计**：`utils/analytics.js` 的 `track(name, params)` 只把事件名与少量参数交给页面里已有的 gtag，没有 gtag 时静默；参数只收字符串 / 数字 / 布尔，字符串截到 100 字（GA4 限制），不含姓名、生辰、卦问。`reportError` 只报错误类型与一句信息；`main.jsx` 装了全局 `error` / `unhandledrejection` 监听，`ErrorBoundary` 的 `componentDidCatch` 也上报（`app_error`，`error_source` 区分 window / promise / boundary），`vite:preloadError` 记 `chunk_load_failed`。已打点的事件：`tool_view`、`ziwei_chart`、`bazi_chart`、`liuyao_cast`、`archive_save` / `archive_open` / `archive_prefill` / `archive_export` / `archive_import` / `archive_delete`、`ai_export`（kind：ziwei / bazi / bazi_today / liuyao）、`fortune_share`、`place_set` / `place_clear`、`pwa_install`。GA 里要先把 `app_route`、`record_type`、`kind` 等注册成自定义维度才会出现在标准报表里。
- **一个命主两套盘**：首页「八字 · 今日」的候选档案加入紫微档案（`recordToBaziForm` 本来就能读紫微记录），同名同盘的八字记录优先、紫微记录只在没有对应八字记录时列出（标「· 紫微」）；「看今日详情」一律按八字打开（`openBaziToday`），八字页从紫微记录直接出结果。紫微录入页新增「从档案带入」（八字与紫微档案都能带，精确时间设置一并带入）。
- **六爻断卦辅助**：`utils/liuyaoJudge.js` 的 `judgeLiuYao(reading)`：按问事类别（`LIUYAO_TOPICS`，感情按性别取妻财 / 官鬼）取用神，两现取动爻 → 空破 → 临世应 → 在上者，不上卦取伏神并看飞神；`assessStrength` 按月建、日辰算旺衰（临月建 / 月破 / 月合、日辰生克 / 暗动 / 日破 / 日合、真空假空）；再看用神变爻（回头生克、进退神、入墓、伏吟反吟、化空化破）、其他动爻生克冲合、世应关系、六冲六合卦、游魂归魂，计分得倾向（偏吉 / 平 / 偏弱）与应期提示，整理成 `points`。结果页新增「断卦要点」卡，可在结果页换类别重看；`buildLiuYaoPrompt(reading, judge)` 把初判附进 AI 提示词。规则是通行口诀的简化版，计分阈值在 `assessStrength` 与 `verdictOf` 里，调整时请同步 `test/liuyao-judge.test.js`。
- **新增起卦方式**：`utils/liuyaoCast.js`：手动录卦（`components/liuyao/ManualCast.jsx`，按背面数录入）、时间起卦（梅花易数：农历年支数 + 月 + 日取上卦，加时辰数取下卦，总和除 6 取动爻）、报数起卦（两个数分别除 8 取上下卦，和除 6 取动爻）。档案 `data` 新增 `topic`、`gender`、`castNote`（起卦参数说明），`method` 支持 coins / gesture / manual / time / number，不认识的值回退（`liuyaoRecord.js`）。
- **文案**：`index.html` 描述 / 关键词 / OG、`manifest.json` 描述与「六爻起卦」快捷方式、关于页的统计说明。
- **测试**：新增 `analytics`、`liuyao-judge`（含 64 卦 × 12 类别 × 3 种性别全覆盖）、`liuyao-cast`；`liuyao-record` 随字段更新。

---

## 2026-10-26 第五轮（分支 `claude/round5-bazi-insight`，基于 `claude/round4-insights`，PR #7，尚未上线）

- **格局与命局组合**：`utils/baziPattern.js` 的 `judgeBaziPattern(chart, strength)`：按月令取格（禄位建禄格、阳干刃位羊刃格、阴干劫财月劫格，其余看月支藏干谁透干，本气优先，辰戌丑未不透本气取中余气标「杂气」）；同党比例极端时提示疑似从格 / 专旺 / 从强 / 化气，只标「疑似」；按透干十神与五行力量识别常见组合（官杀混杂、伤官见官、食神制杀、枭神夺食、伤官配印、官印相生、财官相生、羊刃驾杀、财多身弱、杀重身轻、比劫争财、印重身强、食伤泄秀、身旺无依、印星护身、日坐十神）；`analyzeWuxingGap` 区分「八个字里没有」与「藏干里也没有」，并按喜忌提示缺的是否该补。结果页新增「格局与命局组合」一节（`components/bazi/BaziPatternPanel.jsx`），摘要卡加格局 chip 与五行缺失一句；`buildBaziPrompt` 加【格局与组合（程序初判）】。阈值都在 `detectTraits` / `detectSpecialPattern` 里，改动请同步 `test/bazi-pattern.test.js`。
- **太岁与喜忌标注**：`utils/baziYearMarks.js`：值 / 冲 / 刑 / 害 / 破太岁、伏吟 / 反吟日柱、冲日支、岁运并临 / 岁运反吟，以及天干地支对日主的喜忌（`elementToneOf` 移到 `baziStrength.js` 共用）。大运卡片底边两段色条（左天干右地支），流年按钮右上角喜忌圆点 + 太岁小标签，所选流年下方一句说明；首页「八字 · 今日」流年后面也标太岁；提示词【所选运限】加「流年标注」。
- **原局合冲刑害**：基本命盘下直接列原局四柱之间的关系；专业细盘里收在「原局内部的合冲刑害」折叠块。术语说明加「合化」「太岁」。
- **神煞补全**：国印贵人、天医、金舆、灾煞、孤辰、寡宿、魁罡、阴差阳错、十恶大败（后三者只看日柱，`target.key === 'day'`）；`SHENSHA_NOTES` 给每个神煞一句简释。
- **时辰不详**：`buildBaziChart` 接受 `timeMode: 'unknown'`：按正午排年月日三柱，时柱为占位（`unknown: true`，各字段空），命宫 / 身宫不排，`yun.estimated = true`（起运按正午估算，误差约两个月）。表格、旺衰、关系、神煞、今日卡都能处理空时柱；档案 `data.timeMode = 'unknown'`、`timeHour = null`（`recordToBaziForm` 识别；紫微「从档案带入」排除这类记录；档案列表显示「时辰不详」）。顺手修了 `recordToBaziForm` 把 `timeHour: null` 当成 0（早子时）的问题。
- **带生辰参数的链接**：`utils/baziLink.js`：`#/bazi?cal=s&d=1998-1-2&h=4&g=m&n=…`（精确模式 `c=07:30&lon=&tz=&prov=&city=&dst=1&tst=0`，时辰不详 `h=x`，晚子换日 `sect=1`）。`App.jsx` 的 `routeFromHash` 只看问号前面，`baziRecordFromHash` 把参数解成临时记录交给 `BaziDivination initialRecord`（首次同步会把地址改回 `#/bazi`）。结果页新增「分享链接」（有分享面板就分享，否则复制），事件 `bazi_link_share`。
- **所在地「用当前定位」**：`currentPlace.js` 的 `locateCurrentPlace()`：浏览器定位取经度，时区取设备时区（`deviceTimezone`），只保存经度、时区与 `source: 'geo'`，不保存坐标；`placeDisplayName` 统一显示名（城市 / 省份 / 「当前定位 东经 x°」）。`PlaceSetting.jsx` 加按钮，拒绝 / 超时 / 不支持各有提示，事件 `place_set`（`source: geo | manual`）、`place_locate_failed`。时区下拉在定位得到常用列表之外的时区时补一项。
- **测试**：新增 `bazi-pattern`、`bazi-year-marks`、`bazi-unknown-hour`、`bazi-link`；`current-place`、`bazi-shensha` 随改动更新。环境仍装不上 npm 依赖，lint / build 以 GitHub CI 为准。

---

## 2026-10-27 第六轮（分支 `claude/round6-service`，基于 `claude/round5-bazi-insight`，PR #8，尚未上线）

- **端到端测试**：`e2e/*.spec.js` + `playwright.config.js`，Playwright 在 Chromium（手机 Pixel 7 与桌面两种视口）里走主流程：首页封面与浅链接、八字录入 / 存档 / 从档案打开 / 分享链接出盘 / 择日跳流日 / 分享图片 / 时辰不详、紫微录入 / 常用功能分享链接 / 链接出盘（含精确时间真太阳时）、六爻时间起卦与报数起卦 + 存档。CI 新增 `e2e` job：`npm ci` → `npm install --no-save @playwright/test@^1.50.0`（不进 package.json / lock）→ `playwright install --with-deps chromium` → `npm run build` → `npx playwright test`（对 `vite preview` 跑），失败时上传 `playwright-report` 与 `test-results`。本地要跑：先 `npm run build`，装 `@playwright/test` 与浏览器，再 `npx playwright test`。e2e 里用 `addInitScript` 把 `navigator.clipboard.writeText` 换成记录器、去掉 `navigator.share`（`e2e/helpers.js`），复制出来的链接可以直接再打开验证。`eslint.config.js` 给 `e2e/**` 与 `playwright.config.js` 加了 Node 全局。
- **择日助手**：`utils/zeri.js` 的 `pickAuspiciousDays(chart, strength, { purpose, startDate, days })`：9 类事务（`ZERI_PURPOSES`，每类有黄历宜 / 忌关键词），逐日累加：黄历宜此事 +2 / 忌此事 −3（硬忌）/ 诸事不宜 −4（硬忌）/ 馀事勿取 −1；建除「除危定执成开」+1、闭 −1、破 −3（硬忌，即月破）；值神黄道 +1 / 黑道 −1；流日天干地支对日主喜用 +1 / 忌神 −1；与本命日支六合 +2（其他支 +1）、半合 +1、天干合日主 +1；冲日支 −3（硬忌）、天克地冲日柱 −4（硬忌）、伏吟日柱 −1、刑 / 害日支 −1、冲年支 −2、冲月 / 时支 −1；岁破 −3（硬忌）。分级：硬忌或 ≤ −3 为「忌」，≥ 4「佳」，1–3「可」，其余「平」。`formatZeriText` 生成可复制清单。结果页新增「陆 择日参考」（`components/bazi/BaziDatePicker.jsx`：事务、起始日、30 / 60 / 90 天，较宜前 6 天、需避开列表可展开，「看这天」跳到流日面板，「复制择日清单」），导出给 AI 顺延为「柒」。事件 `bazi_zeri`、`bazi_zeri_jump`、`bazi_zeri_copy`。权重都在 `evaluateDay` 里，改动请同步 `test/zeri.test.js`。
- **流年提要**：`baziYearMarks.js` 的 `describeYearSummary(liuNian, { chart, daYun, strength, marks })`：按流年天干十神（`TEN_GOD_THEMES`，分喜用 / 忌神 / 中性三种说法）、地支喜忌与藏干主气、太岁与岁运标注（`MARK_ADVICE`）合成两三句话，并给 `tone`（good / bad / mixed / neutral）与标题（标注优先：岁运并临、反吟、冲太岁、本命年……）。结果页所选流年下方显示「流年提要」卡，`buildBaziPrompt` 的【所选运限】加一行「流年提要（程序合成，供参考）」。
- **八字分享图**：`utils/baziShareCard.js`：`buildShareCardModel` 把四柱（十神、藏干、纳音、星运）、日主旺衰喜忌、格局与组合、当前大运流年、出生信息整理成数据，`drawBaziShareCard` 用 canvas 画成 1080 × 1500 竖图（像素比最多按 2），`renderBaziShareCard(canvas, model)` 一步到位。结果页新增「分享图片」：弹层（`components/bazi/BaziShareCardModal.jsx`）里显示 `<img>`，手机长按即可保存；支持 `navigator.share({ files })` 与下载。事件 `bazi_share_card`（channel：open / share / download）。
- **紫微带参数链接**：`baziLink.js` 新增 `encodeZiweiLink` / `decodeZiweiLink` / `buildZiweiShareUrl`：`#/ziwei?cal=s&d=1990-05-20&g=m&h=6&n=…`（精确模式 `c=09:05&lon=&tz=&prov=&city=&dst=1|0`，不写 dst 按年份自动判断）。`App.jsx`：`ziweiRecordFromHash` 解成紫微记录放进 `pendingZiweiLinkRef`，挂载后（`setTimeout` 0，StrictMode 重复挂载也只排一次）交给 `handleLoadRecord` 走档案打开的同一条路（精确时间重新按真太阳时换算），再 `setView('chart')`；地址栏首次同步时会改回 `#/ziwei`。专业盘「常用功能」菜单新增第九项「分享链接」（`ProfessionalChart` 的 `onShareLink` 属性），事件 `ziwei_link_open`、`ziwei_link_share`。
- **测试**：新增 `zeri`、`bazi-share-card`（用假的 2D 上下文记录画了哪些字）、`ziwei-link`；`bazi-year-marks`、`bazi-prompt`、`professional-chart-ui` 随改动更新。环境仍装不上 npm 依赖，lint / build / e2e 以 GitHub CI 为准。

---

## 2026-10-27 第七轮「准」（分支 `claude/round7-accuracy`，基于 `claude/round6-service`，PR #10，尚未上线）

这一轮不加功能，专做准确性：三个模块各按古籍口诀另写一份独立核算，与程序逐盘对照，查出的偏差一律修掉，并开始给口诀、神煞标「出处」。

- **八字核算**（`test/bazi-accuracy.test.js`、`test/bazi-shensha-classic.test.js`）：日柱按儒略日公式（1949-10-01 甲子、2000-01-01 戊午两个锚点）逐日核对 1900–2100；二十四节气时刻与香港天文台 2015 / 2016 公布值对照（≤ 2 分钟）；每个节前后 ±2 分钟年柱、月柱必须翻转；乾隆、孙中山、蒋介石、毛泽东四个公开命例的四柱；起运顺逆与三日一年的折算；均时差极值与零点；真太阳时跨日；纳音、旬空、十二长生、藏干、十神全部按口诀重算；29 种神煞逐条按《三命通会》等口诀独立编码对照（天乙贵人取「六辛逢马虎」版，《渊海子平》「庚辛逢马虎」为流派差异已注明）。**结论：八字核心没有发现偏差。**
- **六爻核算**（`test/liuyao-classic.test.js`）：按《卜筮正宗》八宫卦序生成 64 卦（卦名、《周易》卦序号、宫位、世应），京房纳甲 384 爻、六亲、伏神（与《卜筮正宗》伏神例相符）、六神按六十甲子日逐日核对、旬空 / 月破 / 日冲独立核算、六冲十卦与六合八卦按三对爻地支判定、《梅花易数》观梅占与牡丹占的年月日时起例、报数起卦取余、铜钱口诀、起卦时间的年月口径与晚子时处理。**修掉两处偏差：** ① `liuyaoJudge.js` 的六合卦名单漏了雷地豫、地雷复——改为 `liuyao.js` 的 `hexagramRelationOf(bits)` 按纳甲算（`hexagram.relation` / `changed.relation` 为 '六冲' | '六合' | ''），结果页与提示词也标出「六合卦 / 六冲卦」；② 虚拟铜钱把有字的一面当阳面，与《增删卜易》「一背为单、二背为拆、三背为重、三字为交」及本应用手动录卦的说明相反——`MoneyDivination.jsx` 改为背面（满文面）朝上为阳，`coinsToLineValue(yangFaces)` 注释同步改。
- **紫微核算**（`test/ziwei-classic.test.js`）：按《紫微斗数全书·安星诀》另写一套安星：安命身、五虎遁与纳音定五行局、起紫微天府、十四主星、昌曲辅弼魁钺禄羊陀火铃空劫马、天刑天姚天巫天月阴煞解神三台八座恩光天贵台辅封诰、天官天福天厨截路空亡旬空、华盖咸池红鸾天喜天哭天虚龙池凤阁孤辰寡宿天空天德月德年解蜚廉破碎天才天寿天伤天使、长生 / 博士 / 将前 / 岁前十二神、大限小限、十干四化、命主身主、十二宫名与宫干；1900–2050 年 320 个随机生辰逐盘与排盘库（iztro 2.5.3，《全书》算法）对照，加《全书》例盘、闰月前后半月、立春与正月初一之间。**排盘库本身与口诀一致；修掉一处边界偏差：** 晚子时（23 时后）排盘库默认「算次日」却只把日数加一、月份不变，廿九 / 三十的晚子时会用上月安命、用下月初一起紫微。`ziweiBirth.js` 改为整体换到次日早子时再排（录入的出生日期、农历、「晚子时」保留给显示，运限按次日算），并新增流派开关 `lateZiMode`：`next`（晚子换次日，默认，通行做法）/ `same`（晚子不换日：当天子时安星，日柱当天、时柱次日之子，与八字模块同口径）。录入页时辰落在晚子时（含精确模式换算后）时显示「晚子换次日 / 晚子不换日」切换；档案存 `data.lateZi`，分享链接不换日时带 `zi=s`；配偶盘与首页运势走同一入口；完整排盘资料里多一行「晚子时」说明。本地已能跑 iztro（vendor 编译），这些测试在本地与 CI 都会跑。
- **金样回归**（`scripts/golden-cases.mjs`、`scripts/update-golden.mjs`、`test/golden.test.js`、`test/golden/*.json`）：八字 12 例（名人盘、立春前后、真太阳时跨日、晚子两派、闰月、不知时辰、夏令时、阳年女命）、六爻 8 例（静卦、动卦、六爻皆动、伏神、六合六冲、梅花时间与报数起卦）、紫微 10 例（《全书》例盘、闰月前后、立春后正月前、晚子两派、早子时、甲子年、癸亥年）的排盘摘要存成 JSON，任何输出变化都会被测出；确认是有意改动后 `node scripts/update-golden.mjs` 更新。
- **出处（正本清源的第一步）**：`src/data/classics.js` 登记十本源头古籍（《三命通会》《渊海子平》《滴天髓》《子平真诠》《协纪辨方书》《紫微斗数全书》《京氏易传》《卜筮正宗》《增删卜易》《梅花易数》），`cite(key, section)` 组出处。`baziShensha.js` 新增 `SHENSHA_SOURCES`：29 种神煞各有古籍篇章、查法复述、有把握的原文口诀与流派差异；八字专业细盘「术语说明」下新增「神煞查法与出处」（本命所见的先列），`buildBaziPrompt` 新增【神煞查法出处】段，让 AI 按原书法则解释。`src/data/liuyaoSources.js`：六爻装卦、起卦、断法 13 条规则各自的古籍出处，结果页断卦卡新增「口诀出处」折叠，提示词新增【依据】段。紫微完整排盘资料加一行安星与四化的依据说明（格局早已带 `source`）。后续把原文接进来时按 `CLASSICS` 的 key 对应。
- **流派口径备忘**（都已在界面或代码注明）：八字年柱、月柱以节气为界，晚子时默认不换日；紫微年干支以立春为界（排盘库 `yearDivide: 'exact'`，与《全书》时代按正月初一的做法不同，之后可做成开关）、闰月十五以后按下月、晚子时默认换次日；六爻月建按节气、年柱按立春、晚子时日柱不换日、时柱用次日之子；四化取《全书》歌诀（庚：阳武阴同，壬：梁紫左武）。
- **测试**：新增 `bazi-accuracy`、`bazi-shensha-classic`、`liuyao-classic`、`ziwei-classic`、`classics`、`golden`；`liuyao`、`ziwei-link` 随改动更新。本地 `npm test` 现在 233 项全部通过（iztro 已从 GitHub 源码编译进 vendor），lint / build / e2e 以 GitHub CI 为准。

---

## 2026-10-27 第八轮「分工」（分支 `claude/round8-collab`，基于 `claude/round7-accuracy`，PR #11，尚未上线）

老板决定让 Codex、Antigravity 等其他 AI 以「支线」身份参与，Claude 作为总工程师守主线。这一轮先把分工的地基打好：手册、数据模板、校验、任务卡。

- **协作手册** `docs/AI协作手册.md`：项目原则（准确第一、按源头古籍、不自创规则、不上线）、目录与命令、主线 / 支线分工、工作流程（领卡 → `side/<卡号>-<slug>` 分支 → 校验 → PR → CI → 主线审核合并）、硬规则与禁区（`src/utils/**`、`App.jsx`、金样、CI、依赖等支线不得改）、内容规范（原文公版善本、白话自写、不抄现代校注本、存疑标 `doubts`）、验收标准。`README.md` 改成中文入口，指向手册、任务卡与交接日志。`.github/pull_request_template.md` 统一 PR 描述。
- **古籍库数据模板** `src/data/classics/`：一篇一 JSON（`classic` 登记表 key、`section`、`edition` 来源说明、`entries`），条目字段 `id / title / original / vernacular / notes / doubts / applies / tags / status`；`applies` 是机器可读的适用条件（紫微 star / palace / branches / brightness / mutagen / limit，八字 dayGan / monthZhi / tenGod / pattern / shensha / strength / season，六爻 hexagram / line / relation / sixRelative / sixGod / topic / movingLines，通用 note / gender），将来匹配引擎按它自动把原文挑给命盘和提示词。`status` 三档 draft → translated → reviewed，支线最多到 translated。格式说明在 `src/data/classics/README.md`。另有术语词典 `src/data/glossary/*.json`（term / brief / explain / example / source / related）与经典命例 `src/data/cases/*.json`（八字紫微用 `birth` + `pillars`，六爻用 `cast`）。各放了一条示例。
- **校验** `src/data/classics/schema.js`（纯函数：`validateClassicsDoc` / `validateGlossaryDoc` / `validateCasesDoc`，星名、宫位、地支、十神、六十四卦名等都对照固定表，宫位接受交友 / 事业别名）、`scripts/lib/dataFiles.mjs`（读文件、汇总错误与统计）、`scripts/validate-data.mjs`（命令行）、`test/data-files.test.js`（CI 里跑同一套检查，并对校验函数本身做了错误用例测试）。
- **支线任务卡** `docs/tasks/`：side-01《紫微斗数全书》诸星问答 / 太微赋 / 骨髓赋等；side-02《子平真诠》用神与八格各论、《渊海子平》十神格局论；side-03《增删卜易》总论与分类占法；side-04 三模块术语白话词典；side-05 经典命例与占例收集。每张卡有范围与批次、来源、拆条办法、白话要求、步骤、验收、禁止。
- **集成分支说明**：PR #9（round6 → dev）、#10（round7 → round6）、#11（round8 → round7）需要老板在 GitHub 上依次点合并（合并后删分支，GitHub 会自动把下一个 PR 的 base 改到 dev）；在此之前支线以 `claude/round8-collab` 为基准分支，手册第 4 节注明了这一点，并入 dev 后改回 dev。
- **《穷通宝鉴》调候用神表**（`src/data/tiaohou.js`）：十日干 × 十二月令 120 格，按原书次序列出用神天干（首位为主用神），与两份独立录文逐格核对，异文取多数本；`tiaoHouOf(dayGan, monthZhi)` 给出主次用神、五行、寒暖季节、一句说明与出处。`baziStrength.js` 不再用「冬月取火、夏月取水」两条粗规则，改为查表：主用神的五行排在喜用之首并从忌神剔除（如丙火生子月原书用壬，不是火），次用神随附说明；旺衰面板与提示词显示「甲木生寅月（正月），调候用丙，次取癸。出处《穷通宝鉴》·调候用神表」。登记表新增 `qiongtong`。金样随之更新（喜忌排序与调候标记变化属预期）。
- **格局成败**（`src/utils/baziPatternSuccess.js`）：按《子平真诠·论用神成败救应》原文把八类格（正官、财、印、食神、七杀、伤官、阳刃、建禄月劫）的成格、败格、成中有败、败中有成条件逐条编码；「见」「逢」「透」一律看天干透出（不含日干），「刑冲」「会合」看月支与其余地支，「合去」看透干之间的天干五合（与日干相合不算）；原书没说的不判，标「待详辨」并列出天干透出的十神。结果 `chengBai = { group, verdict, success, failure, flaw, rescue, summary, source, quotes }` 挂在 `judgeBaziPattern` 上，要点与提示词多一行「成败（《子平真诠》·论用神成败救应）：某格成/败/成中有败/败中有成…」，格局面板多一块「成败」（含原文折叠），摘要卡格名旁多一枚「格成/格败」小标签。原文四段同时录进古籍库 `src/data/classics/bazi/ziping-chengbai.json`（status translated，待 side-02 与善本核对）。阈值：印轻以印星占比 < 20% 计，伤轻以食伤占比 < 15% 计，财轻比重以比劫占比大于财星占比且比劫透干计，改动请同步 `test/bazi-pattern-success.test.js`（每条原文条件各有一个真实日期的命例）。
- **古籍库匹配引擎与「原文 / 白话」展示**（`src/data/classics/library.js`、`index.js`、`all.js`，`src/components/bazi/BaziClassicsPanel.jsx`）：`buildLibrary` 把所有古籍 JSON 合成索引，`baziContextOf / ziweiContextOf / liuyaoContextOf` 从命盘或卦生成上下文，`matchEntries` 按 applies 匹配（条件内每键都满足、键值数组任一、复数键同义、只写 note 不命中、上下文缺键不猜；格名同义展开：正财格→财格、羊刃格→阳刃格/刃格、建禄格/月劫格→建禄月劫、杂气 X 格→X 格），按条件具体程度与状态排序；术语词典 `buildGlossary / lookupTerm / searchGlossary / termsIn`。数据块用 `import.meta.glob` 合成一个按需加载的 chunk（`loadClassicsLibrary()`），不进首屏。八字页新增「肆 · 古籍原文」（后续节号顺延到捌）：白话 / 原文 / 对照切换，每条带书名篇章、匹配依据标签、状态（已审 / 待审 / 仅原文）、注与存疑，分页「再看 8 条」；e2e 已加断言。README 补了「程序怎么用这些条件」，提醒支线 pattern / shensha 写程序里的名称。紫微、六爻页等支线数据到位后接入（上下文函数已备好）。
- **年柱分界开关**（`buildBaziChart` 的 `yearBoundary`：`lichun` 默认 / `chunjie`）：子平法以立春换年（lunar-javascript 八字默认，精确到立春时刻）；选「正月初一」时年柱改取农历年干支，年柱的十神、藏干、十二长生、旬空、纳音与由年干年支起的神煞、生肖一并重算，月日时柱不变。`chart.yearBoundary = { mode, lichun, chunjie, differs }`，`getYearBoundaryInfo(calendarType, y, m, d)` 给录入页判断是否显示开关（只有出生在立春与正月初一之间才显示，并写出两派年柱）。表单 / 档案（`data.yearBoundary`）/ 分享链接（`yb=c`）/ 提示词（「年柱分界」一行，只在两派不同时出现）贯通；缺省一律 `lichun`，金样不变。测试 `test/bazi-year-boundary.test.js`（2016-02-06 丙申 / 乙未，2017-01-30 丙申 / 丁酉）。
- **紫微页接入古籍卡**（`src/components/common/ClassicsPanel.jsx` 通用面板，`src/components/ziwei/ZiweiClassicsPanel.jsx`，`ziweiPalaceContextOf`）：古籍面板从八字页抽成通用组件（`ctx` 进、卡片出；`useClassicsLibrary(enabled)` 共用懒加载），八字页只算上下文。紫微专业盘「常用功能 → 古籍原文」打开弹层：按命盘顺序列十二宫（默认盘上高亮的宫，没有就命宫；身宫同宫标「身」），列出宫内主星 / 辅星 / 杂曜（带庙旺与四化），`ziweiPalaceContextOf(palace, { gender })` 把宫名（含身宫）、地支、星曜、庙旺、四化、性别、运限层（本命）合成上下文去匹配。支线 side-01 的《紫微斗数全书》诸星问答论条目（`star` 条件）到位后，点任一宫即能看原书怎么说这颗星；e2e 用 1990-05-20 午时（命宫亥，紫微旺七杀平）断言。
- **提示词附古籍原文**（`buildBaziPrompt({ classics })`，`PROMPT_CLASSICS_LIMIT = 6`）：八字「导出给 AI」的提示词在「神煞查法出处」之后加「古籍原文（与本命相关）」一节，只附原文不附白话，最多 6 条（说明总条数与各条状态），并要求 AI 以原文本义为据、引用注明书名篇目、与程序初判不一致时说明差异。`BaziDivination` 用 `useClassicsLibrary(Boolean(baziResult))`（`src/components/common/useClassicsLibrary.js`）懒加载古籍库、`matchEntries` 命中后传给 `BaziPromptExport`（库没加载完就先不附）。首页「今日」提示词不附。
- **紫微提示词附古籍原文**（`src/utils/classicsPrompt.js` 的 `classicsPromptLines / classicsPromptSection` 八字紫微共用；`ziweiLifePalaceHits(library, palaces, { gender })`）：专业盘「AI 分析」里的鉴渣 / 结婚 / 发财话术与今年 / 今月 / 今日 / 今时运势话术，末尾都附「古籍原文（命宫、身宫星曜）」一节：命宫与身宫（同宫只算一次）星曜命中的条目去重合并，最多 4 条，只附原文。`baziPrompt.js` 改用同一个格式化函数（输出不变）。起居注类话术走伴侣弹窗，不附。
- **紫微运限层核对与流曜金样**（`test/ziwei-fortune.test.js`）：按《全书》口诀另写一份大限（含童限「一命二财三疾厄四夫妻五福德六官禄」）、小限、流年（流曜禄羊陀魁钺昌曲马鸾喜与年解、将前 / 岁前十二神、运限宫名）、斗君流月（闰月十五以后算下月）、流日、流时与各层四化，随机生辰 × 随机目标时刻 240 组逐项对照排盘库；排盘库与口诀一致。**核出两处口径问题并在 `getZiweiFortune(astrolabe, date, timeIndex)` 里统一**（`src/utils/ziweiBirth.js`，首页运势与专业盘「今年 / 今月 / 今日 / 今时」都走它）：① 晚子时排盘库只把流日、流时的干支换到次日，流日宫位却仍按当天日数——现在默认「换次日」整体按次日早子时算（日期显示次日、时辰仍显示晚子时），命盘是「晚子不换日」的则流日按当天、流时用次日之子；② 排盘库的流月干支按节气交接时刻（八字月建口径），而紫微流月是斗君所起的农历月、专业盘时间轴也按农历月序起五虎遁——现在统一按农历月（所属农历年年干起五虎遁，闰月同本月），流月四化与月系流曜随之重算，宫位沿用斗君，节气口径的干支留在 `monthly.solarTermStem / solarTermBranch`。另记：排盘库把时辰序号 0 当作「未传」而改用 Date 的钟点，调用时 Date 与序号要一致（fortuneContext 已如此）。
- **术语白话词典面板**（`src/components/common/GlossaryPanel.jsx`，`baziGlossarySeeds / ziweiGlossarySeeds`）：八字结果页新增「玖 · 术语词典」节（导航「词典」），紫微专业盘「常用功能 → 术语词典」弹层。没有查询时先列这张盘 / 这个宫里出现的术语（八字：日主、十神、格局名、神煞、旺衰档；紫微：宫名、宫中星曜、四化），再有「浏览全部术语」折叠；搜索走 `searchGlossary`（本模块 + 通用），点相关术语跳转；每条为 `<details>`：标题行常显术语、别名、一句话解释，点开看说明、例子、出处、相关。数据来自 `src/data/glossary/*.json`（side-04 的 235 条在 PR #13，合并后自动生效；基线只有示例 2 条）。
- **支线推送通道已打通**：Mac 上用 `gh auth login`（设备码）登录 djy9821-sys 并 `gh auth setup-git`，两个本地克隆（`~/gushupai` Codex、`~/gushupai-ag` Antigravity）的 `git push` 都走钥匙串里的凭据，支线提交后自己推、自己开 PR，主线只审核。side-01 第 1 批 26 条已推送并开 PR #12（漏天相一条待补）。
- **古籍库第二步：一文件多篇、名字校验、紫微格局与六爻接入**：① `section` 可用「、」列出几篇（side-02 把《子平真诠》十二章录在一个文件里），条目 `title` 写「篇名·其N」或单写 `section`，`buildLibrary` 把每条归到自己那一篇，出处与提示词只写本篇（提示词里标题去掉重复的篇名，如「论用神配气候得失「其八」」）；归不了篇校验报错。② `src/data/classics/patternNames.js` 登记程序判得出的八字格局（含杂气、从格、专旺、化气）与紫微格局名及同义写法（`patternNamesOf` 移到这里并补上：去掉「（专旺）」注记、化气两干按序、七杀也作七煞 / 煞格、从杀也作从煞），`topicNames.js` 登记六爻问事类别与古籍叫法（求财 ↔ 财运、买卖；感情婚姻 ↔ 婚姻、姻缘；事业工作 ↔ 求名、仕宦……；天时、失物等程序还没有的类别放行但不显示）；`schema.js` 校验 `pattern` / `shensha` / `topic` 必须是这些名字，写了永远匹配不上的直接报错（提示改写成星曜、十神等条件或只写 note）。紫微格名表另有测试对照 `ziweiPatterns.js` 的 `ZIWEI_PATTERN_NAMES`，八字格名用 1500 张随机盘核对。③ 紫微：专业盘把认出的格局名（`patternEntries`）传进古籍匹配——古籍原文弹层看命宫时显示「格局」并按格局命中，话术里的命宫古籍也算格局。④ 六爻：`liuyaoReadingContextOf(reading, judge)`（本卦变卦、动爻位置与多少、六冲六合、用神六亲、动爻与用神的六神、类别展开）与 `liuyaoGlossarySeeds`；结果页加「术语词典」卡（先列世应、用神、动变、六合卦、空破等），「古籍原文」卡有命中才显示（等 side-03 数据），`buildLiuYaoPrompt(reading, judge, { classics })` 附「古籍原文（与本卦相关）」。⑤ 测试与 e2e 改成不锁死数据：支线条目陆续合并后排序会变，只断言「该命中的在」。
- **主线下一步**：PR #12（紫微全书诸星问答 37 条）、#13（术语 235 条）、#14（子平真诠 66 条）都已审、可合并；合并后看一遍线上效果。side-01 第 2 批（四赋）、side-02 第 2 批（八格各论）在做；下一批派 side-03（增删卜易总论）与 side-05（命例）。专业盘手动时间轴的流日 / 流时也接到 `getZiweiFortune`（目前 `calculateActiveStems` 自己按农历日期算干支，与它一致，但晚子时选项仍走排盘库原口径）。
