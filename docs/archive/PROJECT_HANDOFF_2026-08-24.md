# 古书派紫微项目交接总结 (PROJECT_HANDOFF_2026-08-24)

> 交接时间：2026-08-24 08:15（UTC+7）  
> 交接对象：下一位接手开发与验收的 AI  
> 核心原则：必须本地先审查，未取得用户明确许可不得提交/部署。

---

## 1. 当前一句话状态

- **仓库地址**：`https://github.com/yangxi520/-.git`
- **线上域名**：`https://www.gushupaiapp.online/`
- **当前 HEAD**：`e9531f2` (已同时推送到 `main` 和 `dev` 分支)
- **代码库健康度**：所有测试 (79/79) 通过，ESLint 零 Error，Vite 构建一次性成功，工作区完全干净。

---

## 2. 本次对话（08-24）完成的核心改进

根据用户的要求，我们完成了“手势八卦”与“金钱卦”的解耦，并将其打造成了一个**独立的 3D 全息手势起卦工具**：

### ① 功能解耦 (Decoupling)
- **金钱卦 (`MoneyDivination.jsx`)**：恢复为纯净的摇铜钱起卦模式，移除了所有的手势相关代码。
- **手势八卦 (`BaguaDivination.jsx`)**：在 App 首页“更多术数工具”板块与手机端“更多”菜单中新增了独立的「3D 手势八卦」全屏入口。

### ② 6次握拳起卦 (Interactive 6-Fist Divination)
- 用户伸出食指唤醒 3D 八卦阵后，对着摄像头**连续握拳 6 次**。
- 每次握拳，3D 阵法在空间中呼吸折叠/展开，伴随空灵音效，并在**屏幕正中央/中下方**浮现一爻水墨卦爻。
- 满 6 爻后全屏居中弹出生卦解析卡片。
- 针对无摄像头设备或手势识别延迟，增加了底部 **「✊ 模拟握拳生爻」** 手动点击起卦备用按钮。

### ③ 关键 Bug 修复
- 修复了 `FullBaguaExperience.jsx` 漏传 `onFist` 属性导致 React 无法接收手势信号的问题。
- 修复了 `initExperience.js` 底层只有在特定 3D 状态下才触发手势的限制，现在**任何状态下的有效握拳均可成功生爻**。
- 修复了 `fetchQuantumUtils` 返回布尔数组时在组件中按 `'heads'` 字符串过滤导致的阴阳爻错误。

---

## 3. 重要文件结构与模块关系

```
src/
├── App.jsx                       # 主路由与视图切换 (新增 'bagua' 视图入口)
├── components/
│   ├── MoneyDivination.jsx       # 纯净版传统金钱卦 (3D 铜钱摇卦)
│   ├── BaguaDivination.jsx       # 独立全息手势起卦 (6次握拳居中成卦 UI)
│   └── BaguaBackground/
│       ├── FullBaguaExperience.jsx # Vanilla 3D 引擎 React 包装层
│       ├── initExperience.js     # 手势检测与 3D 状态机入口 (触发 onFist)
│       └── scene.js              # Three.js 8层八卦阵粒子与模型渲染
└── utils/
    ├── quantumRandom.js          # 随机数 / 真正量子随机数 API (ANU QRNG)
    └── hexagramLogic.js          # 64卦及动爻逻辑判定
```

---

## 4. 下一位 AI 接手注意事项与规范

1. **内存限制**：
   - 用户电脑内存为 16GB。运行 ESLint 或 Vite 构建时，**必须**带上 `NODE_OPTIONS=--max-old-space-size=512` 或 `1024`，切勿并行启动消耗大内存的任务。
2. **部署规范**：
   - 本地改动完成后，先运行 `npm run lint` 和 `npm run build` 进行无错验证。
   - 提交代码时，需同步推送到 `main` 和 `dev` 分支（`git push origin main && git push origin main:dev`），以确保用户的自定义域名 `gushupaiapp.online` 部署最新代码。
3. **架构保持**：
   - `MoneyDivination` 与 `BaguaDivination` 目前保持独立。若用户提出新的界面调整要求，请保持两者模块清晰解耦。

---
*文档已生成完毕，工作区干净，随时可以进行下一阶段开发。*
