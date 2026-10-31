# side-01 《紫微斗数全书》原文录入与白话

先读 `docs/AI协作手册.md` 与 `src/data/classics/README.md`。

## 目标

把《紫微斗数全书》里论星曜、论格局、论富贵贫贱的篇章做成古籍库条目：原文、白话、注释、适用条件。将来客户在 App 里点任何一颗星、任何一个格局，都能看到原书怎么说，并且看得懂。

## 范围与批次（一批一个 PR）

| 批次 | 篇目 | 文件 | id 前缀 | 预计条目 |
| --- | --- | --- | --- | --- |
| 1 | 卷一·诸星问答论（紫微至破军十四主星，及文昌文曲、左辅右弼、禄存、天魁天钺、擎羊陀罗、火星铃星、地空地劫等辅佐煞曜的问答） | `src/data/classics/ziwei/quanshu-zhuxing-wenda.json`（已有示例条目，在其后续录） | `ziwei.quanshu.zhuxing.` | 30–40 |
| 2 | 太微赋、形性赋、骨髓赋、女命骨髓赋 | `quanshu-taiwei-fu.json`、`quanshu-xingxing-fu.json`、`quanshu-gusui-fu.json`、`quanshu-nvming-gusui-fu.json` | `ziwei.quanshu.taiwei.` 等 | 每赋按句群拆 20–60 条 |
| 3 | 星垣论、斗数准绳、斗数发微论、定富贵贫贱十等论、十二宫诸星得地合格定局、十二宫诸星失陷破格 | 一篇一文件，命名同上 | `ziwei.quanshu.<篇名拼音>.` | 60–100 |
| 4 | 运限诸篇（论大限十年祸福、论小限、论流年太岁、论二限太岁吉凶等）与格局诸篇（定富局、定贵局、定贫贱局、定杂局），另加论诸星同垣各司所主 | 一篇一文件，命名同上；分支 `side/01-ziwei-quanshu-b4` | `ziwei.quanshu.<篇名拼音>.` | 50–100 |
| 5 | 论诸星同垣各司所宜分别富贵贫贱夭寿（重录，PR #28） | `quanshu-lun-zhuxing-tongyuan.json`；分支 `side/01-ziwei-quanshu-b5` | `ziwei.quanshu.tongyuan.` | 264 |
| 6 | 十二宫诸篇：论命宫、兄弟、夫妻、子女、财帛、疾厄、迁移、奴仆、官禄、田宅、福德、父母（各宫诸星吉凶） | 一宫一文件 `quanshu-gong-<宫名拼音>.json`（如 `quanshu-gong-fuqi.json`）；分支 `side/01-ziwei-quanshu-b6`，从 `origin/claude/round8-collab` 开（PR 里只含本批文件） | `ziwei.quanshu.gong<宫名拼音>.` | 每宫 15–40 |

篇目名称与分卷以你所据版本为准，不同版本篇名略异时在 `edition` 说明。

第 6 批的 `applies`：一句讲一宫里的星，写 `palace`（用 README 里的宫名：兄弟、夫妻、子女、财帛、疾厄、迁移、仆役、官禄、田宅、福德、父母，命宫写「命宫」）加 `star`；原文点了庙旺落陷、地支、四化的，加 `brightness`、`branches`、`mutagen`；几颗星同宫写 `allStars`，夹的写 `jia`。底本没有某一宫专篇的跳过，在 PR 里列出。篇名以所据版本为准。

第 4 批的 `applies`：讲大限的条件写 `limit: "大限"`，讲流年、太岁的写 `limit: "流年"`（程序按此刻所行大限、流年的命宫去匹配）；讲小限的程序还没有，不写 `limit`，只写星曜等条件并在 `note` 写「小限」。格局名只能用 `src/data/classics/patternNames.js` 紫微格局表里认得的名字，表里没有的改写成星曜 + 宫位等条件，或只写 `note`。

### 补星曜条件（前三批的修正）

原文点了坐在本宫的星，`applies` 却只写宫位、地支的条目，会对命宫在该支的每张盘都出现，不管宫里是什么星。`node scripts/applies-coverage.mjs` 末尾的「命中太宽」会列出原文写了星曜全称的这类条目；原文用简称的（「机梁」「紫府」「日月」「杀」「阴星」）也一并检查。做法：

- 坐在本宫的星补进 `star`（数组表示任一颗在宫就算）；原文说几颗星同宫、同守的（「紫府同宫」「武贪同度」），以及「武曲贪狼」「廉贞七杀」「武曲会擎羊」「火铃相遇」这类要几颗同在才成立的断语，写 `allStars`（几颗都要在）——写成 `stars` 的话，只坐一颗星的盘也会出这条断语；`stars` 只留给原文本意就是任一颗的（「四煞守身命」）。一句里说了几种组合、吉凶不同的，拆成几个条件，`applies` 数组各写一条。
- 左右两邻「夹」的写 `jia`（「昌曲夹命」写 `palace: 命宫, jia: [文昌, 文曲]`；「羊陀夹忌」再加 `mutagen: 忌`；「权禄夹」写 `jia: [化权, 化禄]`）；「拱」「朝」「照」「会」来的星不坐本宫，不补进 `star`，写 `meet` / `meetAll`（见第 7 批）；原文没有点星名的保持原样。
- 改完的分支跑 `node scripts/validate-data.mjs` 与 `node scripts/applies-coverage.mjs`（「重试仍未命中」「命中太宽」「任一颗写法」都应为 0，或在 PR 里逐条说明为什么不改）。

### 第 7 批：三方四正、空宫、生年干支的条件回填（Codex，额度恢复后做）

程序的紫微条件新加了几个键（见 `src/data/classics/README.md`「适用条件」表）：`meet` / `meetAll`（本宫连三方四正——对宫与两个三合宫——里有某星，对应原文的「会」「拱」「照」「朝」「冲」），`empty: "无正曜"`（宫里没有主星才命中），`yearGan` / `yearZhi`（生年干支，「壬甲生人」「寅午戌生人」），`mutagenAll` / `meetMutagen` / `meetMutagenAll`（几化同宫、三方四正见某化）。主线已改了诸星同垣、十二宫得地合格定局里的三十来条，余下的按这几条规矩过一遍全部紫微文件。粗筛（原文含「会」「拱」「照」「朝」「冲」「生人」而条件里还没有 `meet` / `yearGan`）约有一百八十条，其中不少是别的意思（「会」作「能够」、「冲」作「冲破」），要逐条读原文判断；诸星同垣剩下的四十四条、诸星问答二十九条、命宫篇二十五条、骨髓赋十四条优先，其次太微赋、形性赋、斗数发微论、斗数准绳、定富贵贫贱诸局、十二宫其余各篇：

- 原文说「会」「拱」「照」「朝」「冲」的星，原来写成同宫（`allStars`）或只写在 `notes` 里的，改成 `meet`（任一颗）/ `meetAll`（几颗都要有）；本宫自己的星仍写 `star` / `allStars`。例：「天梁太阳昌禄会」写 `allStars: [太阳, 天梁], meetAll: [文昌, 禄存]`；「贪狼会杀无吉曜」写 `star: 贪狼, meet: [擎羊, 陀罗, 火星, 铃星]`。
- 动手前按安星法想一想两颗星能不能落在三方四正：十四主星的位置都由紫微一颗定（「紫微逆去天机星，隔一阳武天同当，又隔二位廉贞地」：天机在紫微逆行一宫，太阳逆三、武曲逆四、天同逆五、廉贞逆八即顺四；天府与紫微以寅申为轴对称，「天府顺行有太阴，贪狼而后巨门临，随来天相天梁继，七杀空三是破军」：太阴至七杀依次在天府顺行一至六宫，破军顺行十宫）。于是两颗主星的位差要么固定，要么只取奇数；位差永远不是 0、4、6、8 的两颗星就不可能同宫也不在三方四正——太阳太阴与贪狼七杀、廉贞与巨门、紫微与日月、机梁与杀破都是这种，这类原文只留 `note` 写明「按安星法不会同宫也不在三方四正」，别硬编。辅星（昌曲、辅弼、魁钺、禄存、羊陀、火铃、空劫）与主星位置无关，可以随便配。
- 「命无正曜」「本宫无正曜」「X 单守」「空宫」写 `empty: "无正曜"`；空宫借对宫的事程序自己做，不用写。
- 原文说「二限」「大小二限」「岁限」的，大限、小限各写一条（`limit: "大限"`、`limit: "小限"`；「岁限」「太岁」还要一条 `limit: "流年"`）；程序已有今年小限这一层。
- 原文点明流曜的（「擎羊重逢流羊」「流年又遇流羊流陀」「流昌」）写 `flow` / `flowAll`（流羊、流陀、流昌、流曲、流禄、流马、流魁、流钺、流鸾、流喜；大限的叫运羊、运昌……），并同时写 `limit`；条件里一写 `flow`，同条件的 `star` / `meet` 就只算本命的星。原文只说「限逢擎羊」「岁限遇羊陀」的照常写 `star` / `meet`，看运限层时程序自动把流羊、运羊算作擎羊。
- 「斗君过度在某宫」「斗君在妻宫逢吉……」这类流年斗君的句子写 `{ "module": "ziwei", "limit": "流年", "doujun": "夫妻" }`（宫名用十二宫登记名），不要写成 `palace`——`palace` 是「这一宫里有什么星」，斗君是流年正月落在哪一宫，程序会按卷一安流年斗君诀算出来。十二宫论的 11 条已这样改好，照着写即可。
- 四化的「拱」「会」「同守」：几化同在本宫写 `mutagenAll: [科, 权]`（任一化照旧写 `mutagen`，可写数组）；化星在三方四正拱会的写 `meetMutagen`（任一化）/ `meetMutagenAll`（几化都要有）：「科权对拱」写 `palace: 命宫, meetMutagenAll: [科, 权]`，「权禄巡逢」写 `meetMutagenAll: [权, 禄]`，「合禄拱禄」写 `meet: 禄存, meetMutagen: 禄`；科权禄三化齐会命宫三方四正的直接写 `pattern: 三奇加会`。
- 赋文一段里有好几句的，一句一条，别把几句的星合成一个 `stars` 任一颗的大列表再搭一个 `pattern`（那样只在格局成立时出，其余几句永远不出；骨髓赋、太微赋主线已逐句改过，可照着写）：同宫的 `allStars`，夹的 `jia`，会照的 `meet` / `meetAll`，本意就是任一颗的（「巨破擎羊性必刚」）在 note 写「任一颗」。
- 「某某生人」：当必要条件的（「昌曲己辛壬生人限逢辰戌」）直接写进条件；当附加条件的（「甲丁己癸生人福」「丙戊生人福禄饶」）保留原条件再加一条带 `yearGan` / `yearZhi` 的，命中时排前。「六甲生人」就是甲年生人；「四墓生人」写 `yearZhi: [辰, 戌, 丑, 未]`；纳音「水生人」「火生人」程序还没有，写 `note`。
- 主线已先改过一批，不要重做：诸星同垣十九条「会」「拱」「照」（紫微居子午科权禄照、紫府全依辅弼、府相梁君臣庆会、天梁守照、机梁会合、机梁同照命身、日月照合、文科拱照、贪狼火铃四墓守照、贪狼武曲守照、贪月同杀、廉贞杀破会迁移、七杀火羊会生乡、魁钺昌曲禄存扶、左右单守照命宫、左右财官夹拱、禄权命逢、科命权朝、破军暗巨）、「火铃相遇」、骨髓赋「科权对拱」、十等论疾夭论与威勇论、得地合格子安命、失陷破格午安命、十二宫论十一条斗君。剩下的主要是论命宫、十二宫诸篇、诸星问答论里整段一条的长段落：里面「会某星」的子句要不要拆成一句一条，先在 PR 里列出打算拆的条目再动手。
- 每条改动在 PR 里列：条目 id、原文那半句、原条件、新条件。改完跑 `node scripts/validate-data.mjs`、`node scripts/applies-coverage.mjs`（「重试仍未命中」应为 0：脚本会按条件挑生年、性别、安辅弼的月份、安昌曲与命宫的时辰定向排盘重试，还命不中的多半是条件写错了）、`npm test`。
- 分支从 `origin/claude/round8-collab` 新开 `side/01-ziwei-quanshu-b7`，PR 的 base 选 `claude/round8-collab`；只改 `src/data/classics/ziwei/*.json`。

### 第 8 批：卷三论限诸篇与卷一补遗（Codex）

对照维基文库《紫微斗数全书》目录，还没录的篇目（都不长，合起来一批）：

| 篇目（维基文库卷次） | 文件 | id 前缀 | 预计条目 |
| --- | --- | --- | --- |
| 卷一·重补斗数彀率 | `quanshu-chongbu-doushu-goulv.json` | `ziwei.quanshu.goulv.` | 10–20 |
| 卷一·增补太微赋 | `quanshu-zengbu-taiwei-fu.json` | `ziwei.quanshu.zengbutaiwei.` | 10–20 |
| 卷一·十二宫诸星得地富贵论 | `quanshu-shiergong-dedi-fugui-lun.json` | `ziwei.quanshu.dedifugui.` | 12 |
| 卷一·十二宫诸星失陷贫贱论 | `quanshu-shiergong-shixian-pinjian-lun.json` | `ziwei.quanshu.shixianpinjian.` | 12 |
| 卷三·谈星要论 | `quanshu-tanxing-yaolun.json` | `ziwei.quanshu.tanxing.` | 5–10 |
| 卷三·论人命入格 | `quanshu-lun-renming-ruge.json` | `ziwei.quanshu.ruge.` | 6 |
| 卷三·论格星数高下 | `quanshu-lun-gexing-shu-gaoxia.json` | `ziwei.quanshu.gexingshu.` | 5–10 |
| 卷三·论男女命同异 | `quanshu-lun-nannv-ming-tongyi.json` | `ziwei.quanshu.nannvtongyi.` | 2–4 |
| 卷三·论小儿命、定小儿生时诀、论小儿克亲 | `quanshu-lun-xiaoer.json` | `ziwei.quanshu.xiaoer.` | 5–8 |
| 卷三·论人生时安命吉凶、论人生时要审的确 | `quanshu-lun-shengshi.json` | `ziwei.quanshu.shengshi.` | 2–4 |
| 卷三·论命先贫后富 | `quanshu-lun-ming-xianpin-houfu.json` | `ziwei.quanshu.xianpinhoufu.` | 2–3 |
| 卷三·论阴骘延寿 | `quanshu-lun-yinzhi-yanshou.json` | `ziwei.quanshu.yinzhi.` | 1–2 |
| 卷三·论大小限星辰过十二宫遇十二支所忌诀 | `quanshu-lun-xian-shierzhi-suoji.json` | `ziwei.quanshu.xiansuoji.` | 9（一句歌诀连它的「假如」一条） |
| 卷三·论立命行限宫歌（含后面「论太岁小限星辰庙陷遇十二宫中吉凶」子～亥十二宫各三段） | `quanshu-lun-liming-xingxian-gong-ge.json` | `ziwei.quanshu.xingxiange.` | 1 + 36 |

程序新加了两个键（见 README「适用条件」表，主线已推到 `claude/round10-ui-polish`）：`bureau`（五行局：水二局 / 木三局 / 金四局 / 土五局 / 火六局）、`hourZhi`（生时地支）。这批怎么写条件：

- 「论大小限星辰过十二宫遇十二支所忌诀」每句一条：`yearZhi` 写生年支，`limit` 按「岁限」写大限、小限、流年各一条，`branches` 写忌行的限宫地支（「子命忌寅申」写 `yearZhi: "子", limit: "大限", branches: ["寅", "申"]`，另两层同），点了星的加 `star`（「申人铃火灾殃重」加 `star: ["火星", "铃星"]`，「戌亥羊陀须避忌」加 `star: ["擎羊", "陀罗"]`）；「天罗地网」辰戌照字面写地支；末四句总歌只写 `note`。
- 「论立命行限宫歌」开头八句：`bureau` + `limit`（大限、小限两条）+ `branches`，八卦按后天方位转地支：坎＝子、离＝午、艮＝丑寅、兑＝酉、震＝卯、巽＝辰巳（「金人遇坎命须伤」写 `bureau: "金四局", limit: "大限", branches: ["子"]`）。
- 后面十二宫各三段（「子年太岁并小限到子宫入庙化吉」「……不入庙化凶」「子年太岁所值吉凶星」）：一段一条。「太岁到子宫」就是流年命宫在子，写 `limit: "流年", branches: ["子"]`，小限另写一条 `limit: "小限"`；段里「七杀破军在子宫守岁限癸庚己生人发福」拆成 `star: ["七杀", "破军"]`（任一颗，note 写明）+ `yearGan: ["癸", "庚", "己"]`，一个星组一条；「所值吉凶星」段吉星一条、凶星一条（都是任一颗，note 写明），凶星里的「忌星」「忌宿」写 `mutagen: "忌"` 另成一条。「紫微在子宫守命及岁限」这种带「守命」的另加一条 `palace: "命宫"`。
- 「论人生时安命吉凶」：`palace: "命宫", branches: [寅午戌申子辰], hourZhi: [寅午戌申子辰]` 一条，六阴支一条；「反此则少遂」写 `branches` 六阳 + `hourZhi` 六阴、及其反，各一条。「论小儿克亲」「定小儿生时诀」用 `yearZhi` + `hourZhi`、或只 `hourZhi`（任一）。「论人生时要审的确」只 `note`。
- 「十二宫诸星得地富贵论」「失陷贫贱论」照「得地合格诀」「失陷破格诀」两篇的写法：`palace: "命宫"` + `branches` + `stars`（原文列的几颗任一，note 写「任一颗」），点了生年的加 `yearGan` / `yearZhi` 另成一条。
- 谈星要论、论人命入格、论格星数高下、论男女命同异、论命先贫后富、论阴骘延寿是看法通论，照「论大限」「论二限太岁」的写法：讲运限的写 `limit`，讲命宫的写 `palace: "命宫"`，编不出的只 `note`。「论人命入格」六句里「入格」指程序认得的格局，写 `pattern` 不好点名（哪一格都算），只写 `palace: "命宫"` + `note`。
- 重补斗数彀率、增补太微赋是赋文，照太微赋、骨髓赋的写法一句一条（同宫 `allStars`，夹 `jia`，会照 `meet` / `meetAll`，先按安星法想一想会不会在三方四正）。
- 原文照维基文库录文转简体逐字校对；录文里混进的白话（如十二宫论兄弟篇廉贞条末句「兄弟感情融洽，但兄弟不多」）不进 `original`，写进 `doubts` 说明。

动手前先把第 7 批审查的三条小改推到 `side/01-ziwei-quanshu-b7`（PR #64 会自动更新，单独一个提交）：`tongyuan.015` 写 `palace: 命宫, star: 紫微, mutagen: [权, 禄], stars: [擎羊, 陀罗]`；`tongyuan.231` 去掉 `branches: ["子"]`；`gongxiongdi.006` 末句白话移到 `doubts`。然后从 `origin/side/01-ziwei-quanshu-b7` 开 `side/01-ziwei-quanshu-b8`，先 `git merge origin/claude/round10-ui-polish`（新键要靠它校验），只新增上表文件；PR 的 base 选 `claude/round10-ui-polish`，PR 里按篇列条目数、来源、待确认。`node scripts/validate-data.mjs`、`node scripts/applies-coverage.mjs`（「重试仍未命中」应为 0）、`npm test` 都要过。

## 来源

公版古籍。可用：维基文库、国学导航、殆知阁的《紫微斗数全书》文本（ctext.org 声明禁止抓取，不要用）；条件允许时参校明万历刻本影印或清刻本。繁体文本转简体后逐字校对。**不得使用任何现代校注本、白话本或网文的译文。**

## 条目怎么拆

- 诸星问答论：一星一问答为一条；一星之下分「论某星在某宫」的，再按宫拆条，`applies` 里写 `star` + `palace`（+`branches`）。
- 赋：按完整的意群拆，每条两到六句，原文 300 字以内；赋文里一句话点到一个格局或一组星曜的，`applies` 写 `stars` 或 `pattern`，编不出来就用 `note`。
- 条目 `title` 用「紫微星」「紫微在午宫」「太微赋·其三」这类短题。

## 白话要求

- 逐句对应，忠实原意；星曜、宫位、四化名词保留原词。
- 原文是条件句（「若…则…」「加会…」）的，白话也要把条件翻出来，不要只翻结论。
- 歌诀、赋文里的典故（如「食禄千钟」「金章紫绶」）在 `notes` 里简释，不要在白话里扩写。
- 翻不准的句子写进 `doubts`。

## 步骤

1. 从集成基准分支开 `side/01-ziwei-quanshu`。
2. 录第 1 批，每录十条跑一次 `node scripts/validate-data.mjs`。
3. `npm run lint && npm test && npm run build` 全过后提 PR，按模板写来源、条目数、待确认。
4. 主线审核通过并合并后，再开下一批分支。

## 验收

- 校验脚本与 CI 通过；条目数达到预计下限。
- 抽查 10% 条目：原文与来源文本逐字一致（句读允许按通行本），白话无错译。
- `edition` 写明版本与来源；异文与存疑都在 `doubts` 里。

## 禁止

- 不改 `src/utils/**` 和任何 `.js/.jsx` 代码文件；本卡只产出 JSON。
- 不录与程序口径有关的「安星诀」部分（卷二安星法主线已核），遇到也不要改程序。
- 不加原文没有的解释与判断。
