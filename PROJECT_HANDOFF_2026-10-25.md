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
