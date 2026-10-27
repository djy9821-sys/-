# side-05 经典命例与占例收集

先读 `docs/AI协作手册.md`。

## 目标

收集古籍里有生辰、有断语的命例和占例，做成结构化数据。主线会把它们变成回归测试：程序排出来的四柱 / 命盘 / 装卦必须和书上一致，程序的断法要点要能对得上原书的断语。这是「按古籍批命」能否成立的试金石。

## 产出文件

- `src/data/cases/bazi.json`（已有 1 条示例，格式见下）
- `src/data/cases/ziwei.json`
- `src/data/cases/liuyao.json`

## 格式

八字 / 紫微命例：

```json
{
  "id": "bazi.ditian.001",
  "name": "《滴天髓阐微》某造",
  "source": { "classic": "ditian", "section": "通神论·天道（任注命例）" },
  "birth": { "calendar": "lunar", "year": 1720, "month": 3, "day": 15, "hourIndex": 4, "isLeapMonth": false, "gender": "male" },
  "pillars": ["庚子", "庚辰", "甲寅", "戊辰"],
  "original": "原书所列四柱与断语原文……",
  "vernacular": "白话……",
  "notes": "原书只列四柱未列生年，生年据干支与大运起法推定，存疑。",
  "status": "translated"
}
```

- `birth.calendar`：`lunar`（古籍命例绝大多数是农历）/ `solar` / `unknown`（只知四柱、不知年月日时的写 unknown，并在 `pillars` 填四柱）。
- `birth.hourIndex`：0 早子 … 11 亥，12 晚子；不知写 `null`。
- `pillars`：原书四柱，时柱不详写「不详」。
- `source.classic` 用登记表 key；登记表里没有的书（如《清史稿》《古今图书集成》）写 `source.title`。

六爻占例：

```json
{
  "id": "liuyao.zengshan.001",
  "name": "《增删卜易》占例：占求财",
  "source": { "classic": "zengshan", "section": "求财章" },
  "cast": { "date": "辰月癸亥日", "monthGanZhi": "戊辰", "dayGanZhi": "癸亥", "hexagram": "地天泰", "changed": "地泽临", "movingLines": [3], "topic": "求财" },
  "original": "原书占例原文……",
  "vernacular": "白话……",
  "status": "translated"
}
```

- `cast.monthGanZhi` / `dayGanZhi` 原书有则填；只有月支日支的填 `date`，干支留空。
- `movingLines` 自初爻起 1–6；无动爻写 `[]`。

`node scripts/validate-data.mjs` 会校验格式。

## 范围（第一批）

| 来源 | 目标 | 预计 |
| --- | --- | --- |
| 《滴天髓阐微》任铁樵注中的命例 | 有明确四柱与断语的 | 60–100 |
| 《三命通会》《渊海子平》所列命例 | 有四柱与断语的 | 30–50 |
| 《紫微斗数全书》卷末命例（如有）与各赋所引命例 | 有生辰或命宫主星配置的 | 20–40 |
| 《增删卜易》占例 | 有月日、卦、动爻、断语、应验的 | 80–150 |
| 历史人物公开记载的生辰（《清史稿》《明史》等正史） | 有年月日时的帝王将相 | 20–40 |

## 规则

- **只收历史人物与古籍命例**；不收任何在世的人，不收网络上流传的「某明星八字」。
- 原书只有四柱没有年份的，`birth.calendar` 写 `unknown`，不要硬猜年份；能根据大运与行文推定的写在 `notes` 并说明推定依据。
- 原书断语抄原文到 `original`，自己的白话写 `vernacular`，不要混。
- 同一人多书记载不一致的，各录一条，`notes` 互相注明。

## 步骤 / 验收 / 禁止

分支 `side/05-cases`；按来源分 PR。校验脚本与 CI 通过；抽查 10% 核对四柱与原书一致、来源可查。只产出 JSON，不碰代码，不改金样（金样由主线从这些命例生成）。
