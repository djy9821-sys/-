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
