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
