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
