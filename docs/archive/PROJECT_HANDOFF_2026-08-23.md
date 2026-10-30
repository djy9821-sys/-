# 古书派紫微项目交接总结

> 交接时间：2026-08-23 22:45（UTC+7）  
> 交接对象：下一位接手开发与验收的 AI  
> 当前原则：先本地审查，未经用户明确同意不得提交到远端或部署上线。

## 1. 一句话状态

线上站点当前运行 Git 提交 `8beffca`，Vercel 部署成功；今天早些时候完成的紫微排盘和格局分析，以及刚刚完成的 **金钱卦手势交互模式与 `hui-gesture-bagua` 3D 视觉引擎全量接入**，已经推送到 `main` 分支并在生产环境生效。所有测试 (79/79) 通过，代码无 lint 报错，当前工作区已经干净。

## 2. 项目入口与仓库

| 项目 | 当前值 |
| --- | --- |
| 本地路径 | `/Users/yangxiangdong/Documents/Codex/2026-07-26/ni/work/ziwei-domain-check` |
| GitHub | `https://github.com/yangxi520/-.git` |
| 仓库可见性 | Public |
| 分支 | `main` |
| 本地/远端 HEAD | `8beffca` |
| HEAD 提交 | `feat(divination): fully integrate original bagua github repo` |
| 自定义域名 | `https://www.gushupaiapp.online/` |
| 本地验收 | `http://127.0.0.1:5177/` |

当前 GitHub `main`、`origin/main`、本地 HEAD 三者一致。工作区干净。

## 3. 用户明确要求，必须遵守

1. 所有改动先在本地内部审查，不要频繁上线；用户最终验收时再集中发布。
2. 用户电脑只有 16GB 内存：测试、lint、typecheck、开发预览都要限制 Node 内存，避免并行执行大任务。
3. 紫微斗数、四化箭头和格局必须来自真实命盘与明确规则，不能为了让页面有内容而自创判定。
4. 未取得用户明确上线许可前，不得 `git push`、不得运行 Vercel 生产部署。

## 4. 产品定位

这是一个面向手机端的中文传统术数单页应用，当前主要模块包括：

- 紫微斗数生辰录入与十二宫专业排盘；
- 三合、飞星、四化三种紫微盘式；
- 八字四柱、大运和流年专业盘；
- 首页今时、今日、今月、今年运势摘要；
- 命盘档案、JSON 导入导出；
- **金钱卦及全新的“全息 3D 手势起卦”模式**；
- AI 分析话术预览与复制。

## 5. 技术架构新增亮点

除了先前的 `iztro` 和 React 架构外，现在引入了：
- **MediaPipe Hands** (`@mediapipe/hands`, `@mediapipe/camera_utils`)，用于实时的本地手势捕捉（握拳、张掌、指点）。
- **Vanilla Three.js + GSAP 状态机包装**：我们将 `hui-gesture-bagua` 开源项目作为一个完整的 React 模块 (`FullBaguaExperience.jsx`) 嵌入，通过 `onThrow` 回调实现了 Vanilla 状态机（握拳触发 `flatten`）与 React R3F 铜钱动画的跨引擎无缝联动。

## 6. 线上已发布内容

线上当前停在 `8beffca`。2026-08-22 至 2026-08-23 已发布的主要提交：

| 提交 | 内容 |
| --- | --- |
| `8beffca` | 全量接入 `hui-gesture-bagua` 原版 github 体验（音效、界面、状态流） |
| `12227a2` | 将原版八卦 3D 视觉引擎作为金钱卦交互背景接入 |
| `3bce72f` | 金钱卦引入基于 MediaPipe 的手势起卦模式 |
| `8b1bb83` | 细化紫微专业盘布局与 UI |
| `be1f709` | 修复飞星箭头重叠和歧义问题 |
| ... | 其他 10+ 个 UI 与排盘功能迭代 |

GitHub 对 `8beffca` 的 Vercel 部署应当已经成功。

## 7. 下一阶段接手工作建议

1. 测试金钱卦中的“手势起卦”模式在不同手机（尤其是 iOS Safari 和微信内置浏览器）上的摄像头权限请求与兼容性。
2. `FullBaguaExperience` 内使用了 960x540 的硬编码视频流配置，在部分低端机型可能需要根据屏幕比例自适应。
3. `PROJECT_HANDOFF_2026-08-23.md` 原始版本里提到的“格局分析权威测试命例”仍需专业人士复核。
4. 由于工作区目前已清理干净，直接运行 `npm run dev` 即可预览线上最新效果。
