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
- `movingLines` 自初爻起 1–6；无动爻写 `[]`。有动爻必须写 `changed`（之卦），而且动爻要正好是本卦、之卦不同的那几爻——校验脚本会算。

六爻占例另有两项（主线拿来做断卦回归，务必按原书填）：

```json
{
  "source": { "classic": "zengshan", "section": "天时章", "entry": "zengshan.zhanfa.015" },
  "expected": { "yongShen": "子孙", "verdict": "晴", "timing": "午时", "outcome": "日午时之后，满天红日无云" }
}
```

- `source.entry`：这条占例在古籍库里的条目 id（`src/data/classics/liuyao/*.json`），没有就不写。
- `expected.yongShen`：原书明说取的用神，只能是 父母 / 兄弟 / 子孙 / 妻财 / 官鬼 / 世爻 / 应爻；原书没明说的不填，不要替作者推断。
- `expected.verdict`：原书对所问之事的断语归类。人事写 吉（成、有、愈、平安、得）/ 凶（不成、无、危、失）/ 平（成而有损、迟成等吉凶参半）；天时写 晴 / 雨 / 阴 / 多云 / 风，有先后的写「先雨后晴」这类，雨晴各应其时的写「晴雨各有其时」。拿不准就不填，写进 `notes`。
- `expected.timing`：原书说的应期原样摘几个字，如「酉日」「巳年」「午时」；没有不填。
- `expected.outcome`：原书记的应验结果原文摘句，如「果于酉日大晴」；没有不填。
- 同一占例里接连占了几卦（「又占」「再占」）的，每一卦各录一条（`id` 连号，`name` 后面写「（再占）」），各自的月日、卦、动爻照原文或卦图；断语只针对合起来说的，`expected` 写在最后一卦，前几卦只填 `cast`。

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

## 第二批：《增删卜易》占例转命例（六爻）

古籍库里已录《增删卜易》占例 162 条（总论 81、分类占法前半 50、后半 31，id 见 `zengshan-zonglun.json`、`zengshan-zhanfa-1.json`、`zengshan-zhanfa-2.json`，标题都以「占例·」开头）。逐条转成 `src/data/cases/liuyao.json` 的命例：`id` 用 `liuyao.zengshan.001` 起连号，`original` 抄起卦、断语与应验的原文（太长可节录，完整原文由 `source.entry` 指向），`vernacular` 可沿用古籍条目的白话。只有月支日支、没有完整干支的照原文写 `date` 与 `dayGanZhi`。分支 `side/05-cases-liuyao`，从当前集成基准分支新开；每 30 条左右提交一次，跑 `node scripts/validate-data.mjs`。

## 第三批：《滴天髓阐微》任铁樵命例（八字）

任铁樵在《滴天髓阐微》各篇注后举了几百个命造，四柱齐全、旺衰与用神说得明白，是检验程序「日主旺衰、喜用」的最好材料。本批录 60–100 造，写进 `src/data/cases/bazi.json`（在示例条目之后续录），分支 `side/05-cases-bazi`，从当前集成基准分支新开。

- `id`：`bazi.ditian.001` 起连号；`name` 写「《滴天髓阐微》某造（篇名）」，如「《滴天髓阐微》某造（通神论·衰旺）」。
- `source`：`{ "classic": "ditian", "section": "通神论·衰旺" }`，篇名按所据版本；`notes` 写所据底本与页码。
- `birth`：任注命造大多只有四柱，写 `{ "calendar": "unknown", "gender": "male" }`（女命写 female）；不要按干支去推年份。
- `pillars`：照原书四柱。校验脚本会核对**月干合不合年上起月、时干合不合日上起时、每柱是不是六十甲子**；报错先回原书扫描页核对，抄错的改正；原书确实这样印的照录，在 `notes` 写明「自检」两字和情况，校验就放行。
- `original`：抄四柱与任氏论这一造的原文（论到旺衰、用神、行运、结局的部分）；太长可节录，节录处用「……」。
- `vernacular`：逐句直译，不加原文没有的话（白话不得超过原文 3.5 倍，校验会查）。
- `expected`（主线拿来做旺衰、用神的回归，**只填原书明说的**，拿不准不填、写进 `notes`）：
  - `strength`：原书说日主旺、强、有余写「旺」，衰、弱、不足写「弱」，明说中和、停匀写「中和」；从格照下一项写格局，旺衰按从强（旺）、从弱（弱）填。
  - `pattern`：原书明说成从格、化格、专旺时才写，用程序认得的名字：从财格、从杀格、从儿格、从势格、从强格、曲直格、炎上格、稼穑格、从革格、润下格、化气格（见 `src/data/classics/patternNames.js`）；正格不写。
  - `useGod`：原书明说的用神（及喜神），写五行（木火土金水）或十神（比劫、印、食伤、财、官杀，或正官、七杀、正印、偏印、食神、伤官、正财、偏财、比肩、劫财），几个的写数组，如 `["水", "印"]`。
  - `outcome`：原书记的结局原文摘句，如「科甲出身，仕至观察」「破耗异常，刑妻克子」。

```json
{
  "id": "bazi.ditian.001",
  "name": "《滴天髓阐微》某造（通神论·衰旺）",
  "source": { "classic": "ditian", "section": "通神论·衰旺" },
  "birth": { "calendar": "unknown", "gender": "male" },
  "pillars": ["庚子", "庚辰", "甲寅", "戊辰"],
  "expected": { "strength": "弱", "useGod": ["水", "印"], "outcome": "原书结局摘句" },
  "original": "四柱与任注原文……",
  "vernacular": "白话……",
  "notes": "底本与页码。",
  "status": "translated"
}
```

每 20–30 造提交一次，跑 `node scripts/validate-data.mjs`；做完开 PR。只收原书命造，不收后人附会的名人八字。

## 第四批：《滴天髓阐微》通神论后半命例（八字）

第三批录到通神论「伤官」为止（`bazi.ditian.001–094`，PR #24）。本批接着录通神论「清气」「浊气」「真神」「假神」「刚柔」「顺逆」「寒暖」「燥湿」「隐显」「众寡」「震兑」「坎离」各篇任氏所举的全部命造，`id` 从 `bazi.ditian.095` 续。

- 分支：从 `origin/side/05-cases-bazi`（第三批的分支）开出 `side/05-cases-bazi-b2`，在第三批之后续录，两批不会冲突；PR 的 base 选当前集成基准分支，说明里写「依赖 PR #24，#24 合并后本 PR 只剩第四批」。
- 底本、页码、格式与 `expected` 口径同第三批，只填原书明说的。
- 「寒暖」「燥湿」两篇常说「用丙火暖局」「以水润土」之类，这是调候取用：原书明说的照填 `useGod`，并在 `notes` 写「调候」二字，主线据此区分扶抑取用与调候取用。
- 「真神」「假神」篇原书说的真神、假神是哪个五行或十神，写进 `notes`。

## 第五批：《滴天髓阐微》六亲论格局气势诸篇命例（八字）

第四批录到通神论「坎离」（`bazi.ditian.095–136`，PR #25）。本批录六亲论「从象」「化象」「假从」「假化」「顺局」「反局」「战局」「合局」「君象」「臣象」「母象」「子象」各篇任氏所举的全部命造，`id` 从 `bazi.ditian.137` 续；底本没有的篇跳过，在 PR 里列出。

- 分支：从 `origin/side/05-cases-bazi-b2`（第四批的分支）开出 `side/05-cases-bazi-b3`；PR 说明写「依赖 PR #24、#25」。
- 格式与口径同第三、四批。本批 `expected.pattern` 用得多：原书明说从财、从杀（从煞）、从儿、从势、从强（从旺）、化象（填「化气格」）、曲直、炎上、稼穑、从革、润下的，用 `src/data/classics/patternNames.js` 里程序认得的名字；假从也填对应的从格名、在 `notes` 写「假从」，假化填「化气格」、在 `notes` 写「假化」。从格的 `strength` 按前面的口径（从强、专旺填旺，其余从格填弱）。只说「顺局」「反局」而没点名格局的，不填 `pattern`。

## 第六批：《滴天髓阐微》六亲论前半命例（八字）

第五批录了六亲论「从象」至「子象」（`bazi.ditian.137–210`，PR #27）。本批回头录六亲论前半「夫妻」「子女」「父母」「兄弟」「何知章」「女命章」「小儿」「才德」「奋郁」「恩怨」「闲神」「羁绊」各篇任氏所举的全部命造，`id` 从 `bazi.ditian.211` 续；底本没有的篇跳过，在 PR 里列出。

- 分支：从 `origin/side/05-cases-bazi-b3`（第五批的分支）开出 `side/05-cases-bazi-b4`；PR 说明写「依赖 PR #24、#25、#27」。
- 格式与 `expected` 口径同第三至五批，只填原书明说的。
- 「女命章」的命造 `birth.gender` 写 `female`；别的篇原书点明是女命的也写 `female`。「小儿」篇原书说的夭、寿、病照摘进 `outcome`。
- 「夫妻」「子女」「父母」「兄弟」篇任氏常说「财为妻星」「官杀为子星」之类：这是六亲星，不是用神，不要填进 `useGod`；原书论到妻、子、父母、兄弟吉凶的句子摘进 `outcome`（如「妻贤子孝」「刑妻克子」）。
- 「闲神」「羁绊」篇原书点名哪个字是闲神、哪两个字相合羁绊的，写进 `notes`。

## 第七批：《滴天髓阐微》性情至贞元诸篇命例（八字）

第六批录完六亲论前半（`bazi.ditian.211–309`，PR #29）。本批录底本最后几篇「性情」「疾病」「出身」「地位」「岁运」「贞元」任氏所举的全部命造，`id` 从 `bazi.ditian.310` 续；底本没有的篇跳过，在 PR 里列出。录完后《滴天髓阐微》的任氏命造就全了，PR 里附一张全书各篇造数总表（第三至七批合计）。

- 分支：从 `origin/side/05-cases-bazi-b4`（第六批的分支）开出 `side/05-cases-bazi-b5`；PR 说明写「依赖 PR #24、#25、#27、#29」。
- 格式与 `expected` 口径同第三至六批，只填原书明说的。
- 「性情」篇原书说的性情（「刚暴」「仁慈」之类）、「疾病」篇说的病（照录原书病名，不改成现代病名）、「出身」「地位」篇说的出身与官位，都照摘进 `outcome`。
- 「岁运」篇的命造常按某运某年论吉凶：这些运、年照留在 `original` 的任论里，`outcome` 摘原书已验的那句（「某年某运如何」），不从干支推公历年份。
- 疾病、夭寿只照录原书，不加任何医学判断。

## 第八批：给《滴天髓阐微》命造补岁运（expected.yun）

任注论造多半按大运、流年断吉凶（「至癸巳运，连登甲第」「丑运生金泄火，刑克异常」）。主线要拿这些校准大运流年的喜忌标注（`node scripts/bazi-cases.mjs` 的「岁运」一行）。本批不录新造，只给已录的全部《滴天髓阐微》命造补 `expected.yun`：

```json
"expected": {
  "yun": [
    { "ganZhi": "癸巳", "kind": "大运", "verdict": "吉", "quote": "至癸巳运，连登甲第" },
    { "ganZhi": "丑", "kind": "大运", "verdict": "凶", "quote": "丑运生金泄火，刑克异常" },
    { "ganZhi": "癸酉", "kind": "流年", "verdict": "吉", "quote": "癸酉年登科" }
  ]
}
```

- 只收原书明说吉凶的运、年：登科、发财、升迁、获利、平安顺遂等记「吉」；破耗、刑丧、落职、官非、病、不禄等记「凶」；同一运里有吉有凶、或原书说「平平」「无咎」的记「平」。说不清的不收，写进 `notes`。
- `ganZhi`：原书写全干支的照写；只说「丑运」「辛运」的写一个字；「己巳戊辰，土旺之地」这类连说两运的拆成两条，各摘同一句。只说「南方火地」「西北金水」而不点干支的不收。
- `kind`：大运写「大运」，某一年写「流年」。`quote` 摘原书说这一运（年）的那句，不改字。
- 已有 `expected` 的在里面加 `yun`；没有的新建 `"expected": { "yun": [...] }`。四柱、`original`、`vernacular`、其余字段一律不动。
- 分支：从第七批的分支开出 `side/05-cases-bazi-b6`，先 `git merge origin/claude/round8-collab`（校验脚本要认得 `expected.yun`）；每 50 造左右提交一次，跑 `node scripts/validate-data.mjs` 与 `node scripts/bazi-cases.mjs`。PR 说明写依赖哪些 PR，附表：各篇补了多少条吉、凶、平。

## 第九批：给《滴天髓阐微》命造补六亲（expected.liuqin）

任注常顺带说到六亲：「刑妻克子」「妻贤子肖」「早年丧父」「兄弟无靠」。主线结果页新增了「六亲宫星」（妻或夫、子女、父母、兄弟各看星与宫），要拿这些校准（`node scripts/bazi-cases.mjs` 的「六亲」一行）。本批同样不录新造，只给已录的全部《滴天髓阐微》命造补 `expected.liuqin`：

```json
"expected": {
  "liuqin": [
    { "kind": "妻", "verdict": "凶", "quote": "刑妻克子" },
    { "kind": "子女", "verdict": "凶", "quote": "刑妻克子" },
    { "kind": "父", "verdict": "吉", "quote": "父荫甚厚" }
  ]
}
```

- `kind`：妻、夫（女命）、子女、父、母、父母（父母并说的）、兄弟。只收原书明说的；「六亲无靠」这类泛说的拆成父母、兄弟两条，各摘同一句。
- `verdict`：得力、贤、多、荫庇、和睦、发达等记「吉」；刑、克、丧、亡、无、不和、无靠、拖累等记「凶」；先吉后凶、或原书说「平平」的记「平」。说不清的不收，写进 `notes`。
- 坤造（女命）确认 `birth.gender` 写的是 `"female"`，没写的补上：程序按它定夫星、子女星。
- `quote` 摘原句，不改字。已有 `expected` 的在里面加 `liuqin`；四柱、`original`、`vernacular`、其余字段一律不动。
- 分支：第八批做完、PR 开好之后，在同一分支 `side/05-cases-bazi-b6` 接着做。先 `git merge origin/claude/round8-collab`（校验脚本要认得 `expected.liuqin`），每 50 造左右提交一次，跑 `node scripts/validate-data.mjs` 与 `node scripts/bazi-cases.mjs`。推送后在第八批的 PR 里补一张表：各篇补了多少条妻（夫）、子女、父、母、兄弟。

## 第十批：《滴天髓阐微》通神论前半命例（八字）

第三、四批收了通神论体用以后诸篇和任注命造，前半（天道至八格、生时）还没收。本批按第三批的口径录这些篇的任注命造，连同 `expected.yun`、`expected.liuqin`（第八、九批口径）一起写：

- 编号接着 `bazi.ditian.423` 往下；`source.section` 写「通神论·人道」这样的篇名，方局上下篇统一写「通神论·方局」，notes 注明上下篇与卷页。
- 任氏泛举的同柱命式（「四戊午……甚多」）按命式录，`birth.gender` 写 `unknown`，不补个人后验，不计入人物。
- 原书只说「生时」片段、没有完整四柱的不收，也不补年月。
- 分支：从第九批的分支开出 `side/05-cases-bazi-b7`，先 merge `origin/claude/round8-collab`；每三十造左右提交一次。PR 附表：各篇造数、岁运条数、六亲条数。

## 第十一批：给六亲回填应运（expected.liuqin[].yun）

六亲回归要分开原局定论与运中应事：任注说「刑妻克子」，多半是「一交丙运，刑妻克子」——应在那步运上，看的是岁运，不全是原局的六亲宫星。主线的回归脚本现在先看条目写没写 `yun`，没写才按原句猜（`scripts/lib/baziCases.mjs` 的 `liuqinScopeOf`）。本批把它写实：

```json
{ "kind": "妻", "verdict": "凶", "quote": "一交丙运，刑妻克子", "yun": "丙" }
```

- 给全部《滴天髓阐微》命造的 `expected.liuqin` 回填 `yun`：原书明说应在某步运、某个流年的，写那步运或那年的干支；原书只说「丙运」「丑运」的写单字；连说两运的写更靠近这句的那一步；原局定论（「其不刑妻者，无财之妙也」）不写。
- 每条只加 `yun` 这一个字段，`kind`、`verdict`、`quote` 与其余字段一律不动。
- 分支：从第十批的分支开出 `side/05-cases-bazi-b8`，先 merge `origin/claude/round8-collab`；每一百造提交一次，跑 `node scripts/validate-data.mjs` 与 `node scripts/bazi-cases.mjs`（「六亲（原局）」「六亲（运中应事）」两行）。PR 附表：各篇回填了多少条。

## 步骤 / 验收 / 禁止

分支 `side/05-cases`；按来源分 PR。校验脚本与 CI 通过；抽查 10% 核对四柱与原书一致、来源可查。只产出 JSON，不碰代码，不改金样（金样由主线从这些命例生成）。
