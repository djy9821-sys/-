# side-03 《增删卜易》原文录入与白话

先读 `docs/AI协作手册.md` 与 `src/data/classics/README.md`。

## 目标

把《增删卜易》的总论各章与分类占法做成古籍库条目。六爻模块的断卦要点（用神、旬空、月破、暗动、六冲六合、进退神、回头生克、入墓、反吟伏吟、应期）都标注了出自本书哪一章，这批条目让客户能点开看原文和白话。

## 范围与批次（一批一个 PR）

| 批次 | 篇目 | 文件 | id 前缀 | 预计条目 |
| --- | --- | --- | --- | --- |
| 1 | 总论：八卦章、六十四卦名、八宫、六亲、世应、动变、用神章、用神两现章、原神忌神仇神章、月建章、日辰章、旬空章、月破章、暗动章、飞伏章、进神退神章、反吟伏吟章、三刑章、三合章、六合章、六冲章、随鬼入墓章、独发章、尽发章、回头生克章、四时旺相章、生旺墓绝章、应期章 | `src/data/classics/liuyao/zengshan-zonglun.json` | `zengshan.zonglun.` | 80–120 |
| 2 | 分类占法前半：天时、年时、身命、婚姻、胎孕、子嗣、求财、求名、仕宦 | `zengshan-zhanfa-1.json` | `zengshan.zhanfa.` | 60–100 |
| 3 | 分类占法后半：出行、行人、疾病、医药、词讼、失物、田土、宅舍、坟墓、避乱等 | `zengshan-zhanfa-2.json` | `zengshan.zhanfa.` | 60–100 |

章名以所据版本为准（野鹤老人原著、李文辉增删本）。书中大量「占例」（某年某月某日占某事得某卦）**也要录**，它们是验证程序断法的材料：占例作为独立条目，`title` 写「占例·占求财得某卦」，并同时登记到 side-05 的六爻命例格式（可在 PR 里说明，由主线转录）。

## 来源

公版古籍文本（维基文库、国学导航、国家图书馆公版影印本等；ctext.org 声明禁止抓取，不要用），繁转简逐字校对，`edition` 写明。**不得使用现代白话本或网文译文。**

## 条目怎么拆

- 每章按自然段拆；章首的总纲一条，其后各段各一条。
- `applies`：论某卦的写 `hexagram`；论六冲六合的写 `relation`；论某六亲为用神的写 `sixRelative`；论动爻多少的写 `movingLines`；分类占法写 `topic`（求财、婚姻、疾病……）。
- 占例条目 `applies` 写 `hexagram`（本卦）和 `topic`；有动爻的写 `line`（原文「得某之某」两卦不同的那几爻，一爻不多一爻不少）。推送前跑 `node scripts/check-zhanli.mjs`，报错必须为 0（见协作手册第 4 步）。

## 白话要求

- 六爻术语（用神、原神、忌神、仇神、旬空、月破、暗动、伏神、飞神、进神、退神、回头生、回头克、入墓、反吟、伏吟、应期）保留原词。
- 占例的白话要把「何时占、何事、得何卦、哪几爻动、作者怎么断、后来应验如何」翻完整。
- 翻不准写 `doubts`。

## 步骤 / 验收 / 禁止

同 side-01：分支 `side/03-liuyao-zengshan`，每十条跑校验，lint/test/build 全过再提 PR；抽查 10% 逐句对照；只产出 JSON，不碰代码。发现程序断法与书不一致，写在 PR「待确认」里，不改程序。

## 第4批：补齐卷四、卷五未录各章，占例转命例（2026-10-31 派给 Codex）

前三批（`zengshan-zonglun.json`、`zengshan-zhanfa-1.json`、`zengshan-zhanfa-2.json`）录了卷一、卷二总论，卷三天时章，卷四身命、子嗣、求名、升选、在任诸章，卷五求财、婚姻、胎孕至行人诸章，卷六全卷；各文件 `edition` 里逐章列了已录的 PDF 页与书内页。卷四、卷五还有不少章没录（身命章之后到子嗣章之前、子嗣章到求名章之间、求名章之后到升选候补章之前、在任吉凶章之后、求财章前后、婚姻章到胎孕章之间等），里面的占例是六爻断法回归最缺的材料。

- 底本、规矩同前三批：国图藏民国十四年（1925）文明书局影印本（Wikimedia Commons `NLC416-12jh005345-45344_增刪卜易.pdf`），只据底本核字、繁转简、占例单列、连续占例超过 300 字也不拆；不用现代白话本和网络增订本。
- 先对照底本目录与三个文件的 `edition`，列一张「未录章节表」（章名、PDF 页、书内页）放进 PR 说明，以底本目录为准。
- 这些章的正文与占例全录进新文件 `src/data/classics/liuyao/zengshan-zhanfa-3.json`，id 接 `zengshan.zhanfa.392` 之后从 `393` 起；`applies` 照前两批（分类占法写 `topic`，占例写 `hexagram`、`topic`、`line`）。
- 占例同时转成六爻命例，追加到 `src/data/cases/liuyao.json` 末尾，id 从 `liuyao.zengshan.185` 起；`cast`、`expected`、`original`、`vernacular`、`notes` 照 `liuyao.zengshan.001–184` 的写法，`expected` 只填原书明说的吉凶与应验。主线再把新命例接进 `test/liuyao-cases.test.js` 做断卦回归。
- 卷三「增删黄金策千金赋章」全章（第5批）与卷一、卷二第一批按范围没录的章（占卦法、浑天甲子、六神、动散、各门类题头总注、归魂游魂、星煞等，第6批）留给后两批。
- 分支从 `origin/claude/round10-ui-polish` 开 `side/03-zengshan-b4`，PR 的 base 选 `claude/round10-ui-polish`；每 30 条左右提交一次，推送前跑 `node scripts/check-zhanli.mjs`（报错须为 0）、`node scripts/validate-data.mjs`、`npm test`。PR 附未录章节表、各章条数、占例数、转出的命例数。只改数据 JSON。
