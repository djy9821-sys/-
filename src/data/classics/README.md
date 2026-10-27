# 古籍库条目格式

古籍原文、白话与适用条件按「一篇一文件」存成 JSON，放在本目录下按书分的子目录里：

```
src/data/classics/
  ziwei/   《紫微斗数全书》            例：quanshu-zhuxing-wenda.json（诸星问答论）
  bazi/    《渊海子平》《三命通会》《滴天髓》《子平真诠》《穷通宝鉴》
  liuyao/  《增删卜易》《卜筮正宗》《京氏易传》《梅花易数》
```

文件名用小写拼音加短横，格式：`<书名简称>-<篇名拼音>.json`。书的 key 必须是 `src/data/classics.js` 登记表里的（`ziwei`、`sanming`、`yuanhai`、`ditian`、`ziping`、`xieji`、`jingfang`、`bushi`、`zengshan`、`meihua`）；要录登记表里没有的书，先在 PR 里说明，由主线加登记。

提交前运行 `node scripts/validate-data.mjs`，CI 上也会跑同样的检查（`test/data-files.test.js`）。

## 文件结构

```json
{
  "classic": "ziwei",
  "volume": "卷一",
  "section": "诸星问答论",
  "edition": "所据版本与来源说明，例如：据明万历刻本影印本录入，参校通行本；文字来源 ctext.org",
  "contributor": "codex",
  "entries": [ … ]
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `classic` | 是 | 登记表里的书 key |
| `volume` | 否 | 卷次 |
| `section` | 是 | 篇名，照原书 |
| `edition` | 是 | 所据版本、文字来源、是否参校，写清楚 |
| `contributor` | 否 | 谁录的（codex / antigravity / 人名） |
| `entries` | 是 | 条目数组，至少一条 |

## 条目结构

```json
{
  "id": "ziwei.quanshu.zhuxing.001",
  "title": "紫微星",
  "original": "问紫微所主若何？答曰：紫微属土，乃中天之尊星，为帝座，主掌造化枢机，人生主宰。",
  "vernacular": "问：紫微星主管什么？答：紫微五行属土，是中天最尊贵的星……",
  "notes": "「造化枢机」指天地化育万物的关键所在。",
  "doubts": ["「仗五行育万物」一句各本有异文。"],
  "applies": [{ "module": "ziwei", "star": "紫微" }],
  "tags": ["星曜", "主星"],
  "status": "translated"
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 全库唯一；`书key.篇.小节.序号`，小写字母、数字、点、短横；序号三位 |
| `title` | 是 | 条目标题（星名、格局名、章节小题） |
| `original` | 是 | 原文。简体、全角标点，句读按通行本；段内换行用 `\n`；不改字、不删句、不加字 |
| `vernacular` | status 非 draft 时必填 | 白话。逐句对应，忠实原意，不夸张、不做现代化附会、不加原文没有的判断 |
| `notes` | 否 | 注释：生僻词、典故、与程序口径的关系 |
| `doubts` | 否 | 存疑之处：异文、拿不准的句子，一条一句 |
| `applies` | 否 | 机器可读的适用条件，见下 |
| `tags` | 否 | 分类标签 |
| `status` | 是 | `draft`（只有原文）→ `translated`（有白话，待审）→ `reviewed`（主线审过） |

支线提交时 status 最多到 `translated`；`reviewed` 由主线审核后改。

## 适用条件 `applies`

每个条件是一个对象，必须带 `module`；不同模块允许的键和取值：

| 模块 | 键 | 取值 |
| --- | --- | --- |
| 通用 | `note` | 自由文字，用于无法编码的条件 |
| 通用 | `gender` | 男 / 女 |
| `ziwei` | `star` / `stars` | 星名（紫微、天机……擎羊、陀罗……见 schema.js 的 ZIWEI_STARS） |
| `ziwei` | `palace` | 命宫、身宫、兄弟、夫妻、子女、财帛、疾厄、迁移、仆役（交友）、官禄（事业）、田宅、福德、父母 |
| `ziwei` | `branches` | 地支数组 |
| `ziwei` | `brightness` | 庙 / 旺 / 得 / 利 / 平 / 不 / 陷 |
| `ziwei` | `mutagen` | 禄 / 权 / 科 / 忌 |
| `ziwei` | `pattern` | 格局名，自由文字 |
| `ziwei` | `limit` | 本命 / 大限 / 流年 / 流月 / 流日 |
| `bazi` | `dayGan` / `dayGans` | 日干 |
| `bazi` | `monthZhi` / `monthZhis` | 月支 |
| `bazi` | `tenGod` / `tenGods` | 十神名 |
| `bazi` | `pattern` / `shensha` / `relation` | 格局名、神煞名、合冲刑害，自由文字 |
| `bazi` | `strength` | 极弱 / 偏弱 / 中和 / 偏强 / 极强 |
| `bazi` | `season` | 春 / 夏 / 秋 / 冬 / 四季 |
| `liuyao` | `hexagram` / `hexagrams` | 六十四卦全名（乾为天、水雷屯……） |
| `liuyao` | `line` | 1–6 |
| `liuyao` | `relation` | 六冲 / 六合 |
| `liuyao` | `sixRelative` | 父母 / 兄弟 / 子孙 / 妻财 / 官鬼 |
| `liuyao` | `sixGod` | 青龙 / 朱雀 / 勾陈 / 螣蛇 / 白虎 / 玄武 |
| `liuyao` | `topic` | 问事类别，自由文字 |
| `liuyao` | `movingLines` | 无 / 一 / 多 |

一条原文可以配多个条件（数组里多项，视为「任一满足」）。条件编不出来就只写 `note`，不要硬编。

## 程序怎么用这些条件

`src/data/classics/library.js` 把所有文件合成索引，页面按当前命盘 / 卦的上下文找条目（八字页「肆 · 古籍原文」已接入；紫微、六爻页随数据跟进）：

- 一个条件里的每个键都要满足（`module` 必须相同）；键值是数组时「任一」满足即可；`stars`/`tenGods`/`dayGans`/`monthZhis`/`hexagrams` 与单数键同义。
- 八字上下文里有：日干、月令、十神（透干与藏干都算）、神煞、格局（含同义名：正财格也算财格，羊刃格也算阳刃格、刃格，建禄格 / 月劫格也算建禄月劫，杂气正财格也算正财格）、季节（辰戌丑未月同时算「四季」）、旺衰、合冲刑害（写 `冲`、`子午冲`、`三合` 这类都能对上）、性别。
- 上下文里没有的键一律算不满足；只写 `note` 的条件不会被程序匹配，只给人看。所以能编出条件的一定要编，`pattern` / `shensha` 写程序里的名称（正官格、七杀格、羊刃格、建禄格、月劫格、天乙贵人、文昌贵人……），让客户在自己的盘上能看到这条。
- 命中的条目按条件具体程度排序（命中的键越多越靠前），同样具体时 `reviewed` > `translated` > `draft`。

## 内容规范

- 原文来自公版古籍，择善本，注明来源；繁体文本要统一转简体后逐字校对（转换容易出错的字：云/雲、后/後、干/幹、里/裏、发/發、余/餘、系/係、几/幾、制/製、征/徵、斗/鬥、谷/穀、适/適）。
- 白话必须自己写，不得抄录任何现代校注本、今译本或网络译文。
- 一条控制在原文 300 字以内，长篇按自然段拆条，`id` 序号递增。
- 不加原文没有的内容；拿不准的句子写进 `doubts`，不要猜着翻。
- 涉及人名、朝代、官职的，白话保留原词并在 `notes` 简释。
