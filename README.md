# 古书派 · 紫微斗数 / 八字 / 六爻

按源头古籍做的中文玄学 Web App：排盘准确、每条规则有出处、客户看得懂。正式站 https://www.gushupaiapp.online

- 参与开发（人或 AI）先读 **[docs/AI协作手册.md](docs/AI协作手册.md)**：项目原则、目录、分支流程、禁区、内容规范、验收标准。
- 支线任务卡在 [docs/tasks/](docs/tasks/)；古籍库条目格式在 [src/data/classics/README.md](src/data/classics/README.md)。
- 每一轮的工作日志与交接说明在 `PROJECT_HANDOFF_*.md`（最新一轮在文件最下面）。

## 跑起来

```bash
npm ci                         # Node 22
npm run dev                    # http://localhost:5173
npm run lint                   # ESLint
npm test                       # 单元测试：引擎对照、金样回归、数据文件校验
npm run build                  # 构建
node scripts/validate-data.mjs # 校验古籍 / 词典 / 命例数据
node scripts/update-golden.mjs # 引擎口径有意变更后更新金样
```

端到端测试（Playwright）只在 CI 里跑，见 `.github/workflows/ci.yml` 与 `e2e/`。

## 分支

| 分支 | 用途 |
| --- | --- |
| `main` | 正式站。只有老板说「确认合并上线」才合并 |
| `dev` | 集成分支，所有 PR 的最终目标 |
| `claude/roundN-*` | 主线每一轮的工作分支 |
| `side/<卡号>-<slug>` | 支线任务分支 |

技术栈：React 19 + Vite 7 + Tailwind 4，lunar-javascript（历法）、iztro（紫微排盘）、three.js（铜钱）、MediaPipe（手势）。
