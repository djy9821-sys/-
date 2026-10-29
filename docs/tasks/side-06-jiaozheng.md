# side-06 古籍原文校正：按影印底本逐字核对、改正

先读 `docs/AI协作手册.md` 与 `src/data/classics/README.md`。

## 为什么有这张卡

主线拿维基文库等录文逐段比对各支线的原文，发现有的条目里有底本没有的字句（改写、续写）、有截断、有意思改反。能对上维基文库的已经由主线改好（PR #12、#21、#23、#30、#34），剩下的几处维基文库本身 OCR 错字太多，不能当底本，要按影印本逐字核。这张卡就是做这件事，一批一个 PR。原来派给 Antigravity 的支线（PR #33、#36、#38）都转到这里，由你接手。

## 通则（每批都适用）

- **底本是影印本**：每条都对着扫描页核，`notes` 写扫描页码（PDF 页 + 书内卷页）。
- **只改不对的字**：底本与条目一致的不动；不一致的按底本改 `original`。底本字形清楚、意思说得通的照录（哪怕与通行本不同），写进 `doubts`（「底本作某，通行本作某」）。
- **底本讹字出校**：明显是印刷讹字、字形变体或避讳字，照字形录下来意思不通，而维基文库本等他本与文意一致的（如「半」印得像「牛」、「夭」印得像「天」、避康熙讳「玄」作「元」），`original` 写正字，`doubts` 记「底本字形作某，据文意及某本改」。字形看不清（墨团、糊字）的，从他本与上下文，`doubts` 记底本字迹。异体字按规范字归并（「勗」作「勖」）。
- **改过原文的条目**：`status` 改为 `draft`，删掉 `vernacular`（旧白话是照错的原文翻的，以后统一重译），`doubts` 写明改了什么（「原录『午之党少』，底本作『午之党多』」）。
- **没改的条目也要核**：PR 描述附「逐条核对表」：id、扫描页、结论（一致 / 已改 / 存疑）。
- **标题**：统一「夫妻·其一」「夫妻·其二」，不用「其1」。
- **拆分的条目**：前一条末尾与后一条开头要在底本里紧接，不能丢字、不能重复。
- 禁区照旧：`src/utils/**`、`src/App.jsx`、`test/golden`、CI、`package.json`、各种配置不碰；不新增依赖；不录现代校注、白话本；不写真实客户生辰。账号 `djy9821-sys`。
- 每批跑 `node scripts/validate-data.mjs`、`npm test` 后再推送。

## 第 1 批：《子平真诠·论用神成败救应》（主线示例 4 条）

- 文件：`src/data/classics/bazi/ziping-chengbai.json`（主线早先写的示例 4 条，凭记忆录入，没对过底本）。
- 底本：你做 #14、#16 时用的《秘本子平真诠》影印本（上海世界图书馆发行，Wikimedia Commons PDF）。
- 做法：4 条逐字对照改正；这一章底本里还有的段落，按 #14 的体例补齐整章（一段一条，`title` 用「论用神成败救应·其一」，id 续 `ziping.chengbai.005` 起）。新补的条目照常写白话（逐句直译）、`status` 写 `translated`；改过原文的旧条目按通则改成 `draft`。
- 分支：从 `origin/claude/round8-collab` 新开 `side/06-ziping-chengbai`，PR 的 base 选 `claude/round8-collab`。

## 第 2 批：《滴天髓》六亲论（PR #33）与任注六亲五篇（PR #36）

- 文件：`side/02-ditian-liuqin` 分支的 `src/data/classics/bazi/ditian-liuqin.json`（66 条，原文 + 原注）；`side/02-ditian-renzhu` 分支的 `src/data/classics/bazi/ditian-renzhu-liuqin.json`（15 条，任氏曰）。两份是 Antigravity 录的。
- 已知问题（不止这些，要逐条核）：
  - 有续写、截断：001、048、052、061、063、066，可能还有 025；063 的「午之党多 / 少」意思反了。
  - 任注那份 002、004、007、014 是拆开的长段，检查衔接。
  - 标题有「性情·其1」这类写法。
- 底本：你做命例时用的 1947 年大东书局《滴天髓阐微》扫描本（CADAL）。
- 做法：在原分支上继续提交（`git fetch` 后切到 `side/02-ditian-liuqin` / `side/02-ditian-renzhu`；不要 rebase、不要 force push）。两个分支各自提交、推送，分别在 PR #33、#36 下留言：改了几条、核对表、仍存疑的。
- 原文与原注的分法照现有体例（`original` 先写原文，换行写「原注：……」）；任注那份只录「任氏曰」正文，命造不录。

## 第 3 批：《穷通宝鉴》整批重录（接手 PR #38）

- 原来由 Antigravity 做，现交给你。规矩见 `docs/tasks/side-02-bazi-geju.md`「第 8 批返工」一节：只用维基文库本、脚本取文、`original` 必须是底本段落原样、附核对脚本输出、这一批不写白话（全部 `draft`）。
- 在 `side/02-qiongtong` 分支上提交新版本（覆盖旧文件；不要 rebase、不要 force push），完成后在 PR #38 留言。

## 第 4 批：draft 条目重译白话（已完成）

- 范围：主线按底本改过原文、改成 `draft` 的条目，以及第 1、2、3 批改成 `draft` 的。
- 要求：逐句直译，不扩写，不加原文没有的解释和例子，长度大致不超过原文的 1.3 倍（口径同 #12 返工）；术语保留原词，第一次出现在 `notes` 简释。译完 `status` 改回 `translated`。
- 已在各自分支提前做完：#33 六亲论 43 条、#38 穷通宝鉴 217 条、#36 任注 15 条、#34 通神论 18 条、#23 神煞 19 条、#21 印绶 3 条、#41 成败救应 4 条、#30 论命宫 24 条、#12 七杀问答 1 条。全库已没有 `draft`。

## 第 5 批：超长白话按逐句直译重译（一个分支，最后合并）

主线统计：全库 2180 条里有 1196 条白话超长。抽查超长的多半是扩写：加了原文没有的断语（「主人因妻得贵」）、补了原文没写的卦名爻位（「初爻和三爻动」）、把存疑写进白话（「字句有疑，暂不能给出确定的翻译」）。本批按第 4 批的规矩重译这些条目。

- **怎么算超长**：只数汉字（U+3400–U+9FFF），白话字数 > max(原文字数 × 1.3, 原文字数 + 12) 的算超长。自己写脚本列出全部超长条目，按文件统计后再动手。
- **要求**：逐句直译，不扩写；不加原文没有的解释、断语、例子；不补原文没写的卦名、爻位、星曜、宫位；术语保留原词，第一次出现在 `notes` 简释；底本疑字、拿不准的写进 `doubts`，不写进白话。原文括号里的小字注照样译在括号里。只改 `vernacular`（必要时 `notes`、`doubts`），`original`、`applies`、`status` 等一字不动。重译后每条都要在长度口径内；实在超出的（极短的诗句、术语），在 PR 里列出 id 和缘故。
- **分支**：从 `origin/claude/round8-collab` 新开 `side/06-retranslate`，先依次 merge 这些还没合的数据分支（不要 rebase）：`side/01-ziwei-quanshu`（#12）、`side/02-bazi-geju`（#14）、`side/01-ziwei-quanshu-b2`（#15）、`side/02-bazi-geju-b2`（#16）、`side/03-liuyao-zengshan`（#17）、`side/01-ziwei-quanshu-b3`（#18）、`side/03-liuyao-zengshan-b2`（#19）、`side/03-liuyao-zengshan-b3`（#20）、`side/02-bazi-yuanhai`（#21）、`side/02-bazi-sanming-shensha`（#23）、`side/01-ziwei-quanshu-b4`（#26）、`side/01-ziwei-quanshu-b5`（#28）、`side/01-ziwei-quanshu-b6`（#30）、`side/02-ditian-liuqin`（#33）、`side/02-ditian-tongshen`（#34）、`side/06-ziping-chengbai`（#41）。然后一个文件一个提交，推送前跑 `node scripts/validate-data.mjs` 和 `npm test`。
- **PR**：base 选 `claude/round8-collab`，描述第一行写「合并顺序：等 #12–#44 都合进来后再合本 PR」，附每个文件重译的条数与重译前后的长度比（中位数、最大值）。上面那些 PR 不要再推。
