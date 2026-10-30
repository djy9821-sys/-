import {
  FORTUNE_HOUR_OPTIONS,
  FORTUNE_LAYER_LABELS,
  formatFortuneTime,
} from './fortuneContext.js';
import { ziweiDoujunPalace } from '../data/classics/library.js';


/**
 * 紫微「AI 分析」的提示词模板。性情与婚恋一则以《紫微斗数全书》为据（排盘时另附命宫、身宫、夫妻宫、福德宫
 * 星曜的原书原文，见 ProfessionalChart 的 classicsSectionsFor）：只说命盘显示的倾向，不贴标签、不打分、不下断语。
 */
export const CHARACTER_PROMPT_TEMPLATE = `**--- 紫微斗数性情与婚恋分析 ---**
**说明：本分析以《紫微斗数全书》为据，由「古书派」排盘并附上原书原文。语气平实，只说命盘显示的倾向，不给人贴标签、不打分、不下断语。**

你是一位熟读《紫微斗数全书》的命理师。下面给出一张命盘的十二宫数据（已排好，不要重排），以及古籍库里与这张盘的命宫、身宫、夫妻宫、福德宫星曜相关的原文。请只依据这些数据与原文，按下面的结构分析这个人的性情与婚恋态度。

**### 1. 性情大体（命宫、身宫）**
- 先说命宫主星与庙旺，再看身宫与会照的辅煞（左辅、右弼、文昌、文曲、天魁、天钺为吉，擎羊、陀罗、火星、铃星、地空、地劫为煞）。
- 依《形性赋》《太微赋》与「论诸星同垣」所述星性，说这个人的气质、处事方式、长处与易犯的毛病。
- 命宫无主星的，按对宫（迁移宫）借星论，并说明是借星。

**### 2. 心性与福分（福德宫）**
- 福德宫主星与吉煞，照《全书》卷二论福德所述，说此人内心所求、能否安享、是否劳心。

**### 3. 对感情的态度与婚姻情形（夫妻宫）**
- 夫妻宫主星、庙陷与吉煞，照《全书》卷二论妻妾所述，说配偶大致情形、感情是早是迟、宜顺宜忌。
- 女命另参《女命骨髓赋》。
- 桃花诸曜（贪狼、廉贞、天姚、咸池、红鸾、天喜）在命宫、夫妻宫、福德宫的，照原书说其所主，不渲染。

**### 4. 四化与格局**
- 生年四化落在哪几宫，化禄、化权、化科、化忌各主何事；化忌落命宫、夫妻宫、福德宫的，说其所忌何在。
- 命盘数据里程序认出的格局（如有），对照原书定局所述说其高下。

**### 5. 当前大限与近年**
- 数据里有大限、流年的，说当前大限的宫位与星曜对感情、心性的影响；没有的略过。

**### 6. 小结与相处之道**
- 用三五句话概括：这个人的性情底色、在感情里的长处与需要留意之处，相处时怎样配合为宜。
- 命盘只显示倾向，不能断定一个人的品行；有利与不利两面都要如实写，不下「好人」「坏人」一类的结论。

**规则：**
- 每一条判断都落到具体宫位、星曜与原书说法上；引用原文注明篇目（如《全书》卷二「论妻妾」）。
- 所附原文与命盘数据对不上的，说明差异，不硬套；拿不准的写「存疑」。
- 不用贬损、嘲讽的词，不给人打分、分类、定性；不编造原书没有的说法；不涉及风水、改运。
- 分析对象可能是提问者本人，也可能是提问者关心的人，按文末「补充情况」里的说明来；没写就按本人论。
`;

/** 性情与婚恋提示词的结尾：留给提问者补充这张盘是谁的、想了解什么。 */
export const CHARACTER_PROMPT_TAIL = `**--- 补充情况（可选）---**
这张盘是谁的、想了解什么，请在此补充：
`;

export const WEALTH_PROMPT_TEMPLATE = `**--- 💰 紫微斗数深度财运分析报告 💰 ---**
**声明：本报告基于紫微斗数专业排盘生成，旨在分析命主财运格局、财富来源及发财时机。风格严肃、客观、专业。**

你是一位**资深紫微斗数命理师**，擅长通过星盘分析个人的财富格局与事业运势。请根据提供的星盘数据，为命主进行深度的财运分析。

请严格按以下结构输出报告：

**### 1. 【先天财运格局分析】**
*   **核心定性：** 命主的财富格局层次（富贵/小康/波动/辛苦）。
*   **命理依据：：** 重点分析**财帛宫**、**命宫**、**田宅宫**的主星与煞星组合。
    *   是否有“火贪格/铃贪格”（爆发横财）？
    *   是否有“禄马交驰”（动中求财）？
    *   是否有“财荫夹印”或“双禄交流”？

**### 2. 【财富来源与求财方向】**
*   **正财vs偏财：** 适合上班领薪（正财）还是创业/投资（偏财）？
*   **行业建议：** 根据**官禄宫**星曜，推荐最适合发展的行业（如：紫微-管理、天机-策划/技术、太阳-公职/传播、武曲-金融/实业）。

**### 3. 【发财时机与流年运势】**
*   **大限运势：** 分析目前及未来十年的大限财运走势。
*   **关键流年：** 预测未来3-5年内，哪一年财运最旺？哪一年需要避坑漏财？
    *   *重点寻找：* 流年禄存、化禄飞入财帛/命宫的年份。

**### 4. 【风险提示与建议】**
*   **漏财陷阱：** 分析星盘中的“破财点”（如地劫/地空/化忌在财帛宫）。
*   **行事建议：** 按星盘所示的长短处给出求财、守财上的建议；不涉及风水、改运之说。

**规则：** 每一条判断都落到具体宫位、星曜与所附《紫微斗数全书》原文上，引用时注明篇目；原文与命盘数据对不上的说明差异，拿不准的写「存疑」。

**--- 命主星盘数据 ---**
`;

export const MARRIAGE_PROMPT_TEMPLATE = `**--- 💍 紫微斗数深度姻缘分析报告 💍 ---**
**声明：本报告基于紫微斗数专业排盘生成，旨在分析命主正缘特征、婚运时机及婚姻质量。风格严肃、客观、温暖。**

你是一位**资深紫微斗数情感专家**，擅长分析婚恋运势与正缘特征。请根据提供的星盘数据，为命主进行深度的姻缘分析。

请严格按以下结构输出报告：

**### 1. 【先天婚姻体质分析】**
*   **感情观：** 命主对待感情的态度（如：天梁-保守照顾、贪狼-浪漫多情、七杀-敢爱敢恨）。
*   **婚姻质量预测：** 分析**夫妻宫**星曜，判断婚姻是和谐美满，还是多有争吵/波折？

**### 2. 【正缘特征画像】**
*   **另一半特征：** 详细描述未来伴侣的形象、性格、职业特征。
    *   *外貌：* 高矮胖瘦、气质类型。
    *   *性格：* 强势/温柔、开朗/内向。
    *   *能力/家境：* 对方的经济状况与社会地位。

**### 3. 【红鸾天喜与婚运时机】**
*   **遇见时机：** 预测何时能遇到正缘？（分析流年红鸾/天喜/夫妻宫化禄）。
*   **结婚时机：** 预测未来3-5年内，哪一年最适合结婚？

**### 4. 【经营建议与避坑指南】**
*   **潜在危机：** 指出星盘中可能影响婚姻的负面因素（如：寡宿、化忌、桃花煞）。
*   **相处之道：** 给出一对一的感情经营建议，如何化解矛盾，长久维系。

**规则：** 每一条判断都落到具体宫位、星曜与所附《紫微斗数全书》原文上，引用时注明篇目；原文与命盘数据对不上的说明差异，拿不准的写「存疑」；不用贬损的词，不涉及风水、改运之说。

**--- 命主星盘数据 ---**
`;

/** 庙旺七等的全称（排盘库用单字）：《全书》作庙、旺、得地、利益、平和、不得地、陷。 */
const BRIGHTNESS_TEXT = { 庙: '庙', 旺: '旺', 得: '得地', 利: '利益', 平: '平和', 不: '不得地', 陷: '陷' };

/** 一颗星连庙旺、四化一起写：紫微(旺)、天机(陷，化忌)、左辅(化科)。 */
const starLabel = (star) => {
  const marks = [BRIGHTNESS_TEXT[star.brightness] ?? star.brightness, star.mutagen ? `化${star.mutagen}` : ''].filter(Boolean);
  return marks.length ? `${star.name}(${marks.join('，')})` : star.name;
};

const OPPOSITE_BRANCH = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
/**
 * 空宫（没有主星）写成「无主星（借对宫子女·申：太阳(得地，化禄)、巨门(庙)）」：排盘习惯「无正曜借对宫论」，
 * 把借的是哪一宫、哪几颗星写清楚，AI 才能按原书论借来的星；对宫也空的只写「无主星（对宫亦无主星）」。
 */
const majorStarsText = (palace, palaces = []) => {
  if (palace?.majorStars?.length) return palace.majorStars.map(starLabel).join('、');
  const opposite = (palaces ?? []).find((item) => item?.earthlyBranch === OPPOSITE_BRANCH[palace?.earthlyBranch]);
  if (!opposite?.majorStars?.length) return '无主星（对宫亦无主星）';
  return `无主星（借对宫${opposite.name}·${opposite.earthlyBranch}：${opposite.majorStars.map(starLabel).join('、')}）`;
};

const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬']);
const YIN_STEMS = new Set(['乙', '丁', '己', '辛', '癸']);
/**
 * 生年干支一行：「生年干支：庚午（农历一九九〇年四月廿六，午时）；阳男」。
 * 《全书》论星常按「壬甲生人」「六癸生人」分吉凶，论行限分南北斗按阳男阴女定应期，AI 要有年干才能照办；排盘库的年柱按农历年。
 */
export const natalYearText = (horoscope, gender = null) => {
  const yearly = horoscope?.rawDates?.chineseDate?.yearly;
  const ganzhi = Array.isArray(yearly) && yearly.length === 2
    ? yearly.join('')
    : (typeof horoscope?.chineseDate === 'string' ? horoscope.chineseDate.trim().split(/\s+/)[0] : '') || '';
  if (!ganzhi) return '';
  const when = [horoscope?.lunarDate ? `农历${horoscope.lunarDate}` : '', horoscope?.time || ''].filter(Boolean).join('，');
  const genderText = gender === 'male' || gender === '男' ? '男' : gender === 'female' || gender === '女' ? '女' : '';
  const yinYang = YANG_STEMS.has(ganzhi[0]) ? '阳' : YIN_STEMS.has(ganzhi[0]) ? '阴' : '';
  const kind = genderText ? `${yinYang}${genderText}` : '';
  return `生年干支：${ganzhi}${when ? `（${when}）` : ''}${kind ? `；${kind}` : ''}`;
};

/**
 * 程序认出的格局一行（ziweiPatterns.js 的结果）：
 * 「程序认出的格局：日月并明格（《紫微斗数全书》卷三·论诸星同垣；原书：定贵局「日月并明：见前批注」……）；杀破狼星系（星系观察，不等同古典吉格）」。
 * 只列完整命中、能回溯原书的格，并带原书那一句，AI 对照定局说高下时有据可查；一个没认出的写明「不代表别无格局」，免得 AI 据此断「无格」。
 * @param {Array<{ name: string, category?: string, source?: { title?: string, rule?: string } }>} patterns
 */
export const patternsText = (patterns = []) => {
  const list = (Array.isArray(patterns) ? patterns : []).filter((item) => item?.name);
  if (!list.length) return '程序认出的格局：未认出已收录的格（程序只核对定义明白、能回溯原书的几十种格，不代表别无格局）';
  const items = list.map((item) => {
    if (item.category === 'star-system') return `${item.name}（星系观察，不等同古典吉格）`;
    const where = item.source?.title || '';
    const rule = item.source?.rule ? `原书：${item.source.rule}` : '';
    const detail = [where, rule].filter(Boolean).join('；');
    return detail ? `${item.name}（${detail}）` : item.name;
  });
  return `程序认出的格局：${items.join('；')}`;
};

/**
 * 十二宫数据，附在各类提示词后面：生年干支、五行局、命主、身主、程序认出的格局，每宫的宫干支、是否身宫、主星（带庙旺、四化）、辅星、杂曜、长生、大限年岁。
 * 庙旺照《紫微斗数全书》（见 ziweiBrightness.js），AI 按原书论星先看庙陷。
 * @param {object} horoscope iztro 排盘结果
 * @param {{ gender?: string, patterns?: Array }} [options] 性别（写成阳男、阴女）；patterns 给了（哪怕是空数组）就写「程序认出的格局」一行
 */
export const generateChartDataPrompt = (horoscope, { gender = null, patterns = null } = {}) => {
  try {
    if (!horoscope || !horoscope.palaces) {
      return "--- 命盘十二宫数据 ---\n数据获取失败\n";
    }

    let chartData = "--- 命盘十二宫数据 ---\n";
    const natal = natalYearText(horoscope, gender);
    if (natal) chartData += `- ${natal}\n`;
    const header = [
      horoscope.fiveElementsClass ? `五行局：${horoscope.fiveElementsClass}` : '',
      horoscope.soul ? `命主：${horoscope.soul}` : '',
      horoscope.body ? `身主：${horoscope.body}` : '',
    ].filter(Boolean);
    if (header.length) chartData += `- ${header.join('；')}\n`;
    if (Array.isArray(patterns)) chartData += `- ${patternsText(patterns)}\n`;

    // 从命宫起按兄弟、夫妻、子女……父母的顺序列（排盘库的数组从寅宫起，命宫往前一格是兄弟宫）。
    const total = horoscope.palaces.length;
    const mingIndex = Math.max(0, horoscope.palaces.findIndex((palace) => palace?.name === '命宫'));
    const ordered = horoscope.palaces.map((_, offset) => horoscope.palaces[(((mingIndex - offset) % total) + total) % total]);
    ordered.forEach((palace, index) => {
      const palaceName = palace.name || `宫位${index}`;
      const stemBranch = `${palace.heavenlyStem}${palace.earthlyBranch}`;

      let palaceInfo = `- **${palaceName}(${stemBranch})${palace.isBodyPalace ? '·身宫' : ''}**：`;
      let parts = [];

      if (palace.majorStars && palace.majorStars.length > 0) {
        parts.push(`主星[${majorStarsText(palace)}]`);
      } else {
        parts.push(majorStarsText(palace, horoscope.palaces));
      }

      if (palace.minorStars && palace.minorStars.length > 0) {
        parts.push(`辅星[${palace.minorStars.map(starLabel).join('、')}]`);
      }

      if (palace.adjectiveStars && palace.adjectiveStars.length > 0) {
        parts.push(`杂曜[${palace.adjectiveStars.map((star) => star.name).join('、')}]`);
      }

      if (palace.changsheng12) {
        parts.push(`长生[${palace.changsheng12}]`);
      }

      if (Array.isArray(palace.decadal?.range) && palace.decadal.range.length === 2) {
        parts.push(`大限[${palace.decadal.range[0]}-${palace.decadal.range[1]}岁]`);
      }

      palaceInfo += parts.join('，');
      chartData += palaceInfo + "\n";
    });

    return chartData;
  } catch (error) {
    console.error('生成命盘数据失败:', error);
    return "--- 命盘十二宫数据 ---\n数据获取失败\n";
  }
};

export const generateFortunePromptText = (layerKey, selection, activeStems, basicInfo, horoscope, palaces, SI_HUA_MAP, fortuneContext = null, { patterns = null } = {}) => {
  const targetScope = fortuneContext?.fortune?.[layerKey];
  const stem = targetScope?.heavenlyStem || activeStems[layerKey];
  if (!stem) return null;

  const fallbackMap = SI_HUA_MAP[stem];
  const mutagens = targetScope?.mutagen?.length >= 4
    ? targetScope.mutagen
    : fallbackMap
      ? [fallbackMap.lu, fallbackMap.quan, fallbackMap.ke, fallbackMap.ji]
      : [];
  if (mutagens.length < 4) return null;

  const [lu, quan, ke, ji] = mutagens;
  const layerName = FORTUNE_LAYER_LABELS[layerKey] || '运势';

  const selectedHour = FORTUNE_HOUR_OPTIONS.find((item) => item.index === selection.hour);
  const timeInfo = fortuneContext
    ? formatFortuneTime(layerKey, fortuneContext)
    : layerKey === 'yearly' ? `${selection.year}年` :
      layerKey === 'monthly' ? `${selection.year}年${selection.month}月` :
        layerKey === 'daily' ? `${selection.year}年${selection.month}月${selection.day}日` :
          `${selection.year}年${selection.month}月${selection.day}日 ${selectedHour?.name || ''} ${selectedHour?.range || ''}`;

  let prompt = `你是一位精通紫微斗数的命理大师。请根据以下命盘数据和${layerName}四化，为命主进行${layerName}运势分析。\n\n`;

  prompt += `【基本信息】\n`;
  prompt += `性别：${basicInfo.gender === 'male' ? '男' : '女'}\n`;
  const natal = natalYearText(horoscope, basicInfo.gender);
  if (natal) prompt += `${natal}\n`;
  prompt += `五行局：${horoscope.fiveElementsClass}\n`;
  prompt += `命主：${horoscope.soul}  身主：${horoscope.body}\n`;
  if (Array.isArray(patterns)) prompt += `${patternsText(patterns)}\n`;
  prompt += `\n`;

  prompt += `【${layerName}信息】\n`;
  prompt += `时间：${timeInfo}\n`;
  prompt += `干支：${stem}${targetScope?.earthlyBranch || ''}\n`;
  prompt += `四化：\n`;
  prompt += `  - 禄：${lu}\n`;
  prompt += `  - 权：${quan}\n`;
  prompt += `  - 科：${ke}\n`;
  prompt += `  - 忌：${ji}\n\n`;

  if (fortuneContext) {
    const { fortune, scopeKeys, solarDate, lunarDate, dayBoundaryNote } = fortuneContext;
    prompt += `【自动定位的真实运限】\n`;
    prompt += `阳历：${solarDate}\n`;
    prompt += `农历：${lunarDate}\n`;
    if (dayBoundaryNote) prompt += `换日规则：${dayBoundaryNote}\n`;
    prompt += `虚岁：${fortune.age?.nominalAge ?? '未知'}岁\n`;
    // 小限（《全书》论运限多以大小二限并举）：干支与落在本命哪一宫。
    const age = fortune.age;
    const agePalace = Number.isInteger(age?.index) ? palaces[age.index] : null;
    if (agePalace) prompt += `小限：${age.heavenlyStem ?? ''}${age.earthlyBranch ?? ''}，命宫落点：本命${agePalace.name || '未知宫'}（${agePalace.heavenlyStem || ''}${agePalace.earthlyBranch || ''}）${age.mutagen?.length >= 4 ? `，四化：禄-${age.mutagen[0]}、权-${age.mutagen[1]}、科-${age.mutagen[2]}、忌-${age.mutagen[3]}` : ''}\n`;
    prompt += `\n`;

    scopeKeys.forEach((scopeKey) => {
      const scope = fortune[scopeKey];
      if (!scope) return;

      const scopeName = FORTUNE_LAYER_LABELS[scopeKey] || scope.name;
      const natalPalace = palaces[scope.index];
      const scopeMutagens = scope.mutagen || [];
      const decadalRange = scopeKey === 'decadal' && natalPalace?.decadal?.range
        ? `，年龄范围 ${natalPalace.decadal.range[0]}-${natalPalace.decadal.range[1]}岁`
        : '';

      prompt += `【${scopeName}盘】\n`;
      prompt += `干支：${scope.heavenlyStem}${scope.earthlyBranch}${decadalRange}\n`;
      prompt += `命宫落点：本命${natalPalace?.name || '未知宫'}（${natalPalace?.heavenlyStem || ''}${natalPalace?.earthlyBranch || ''}）\n`;
      // 流年斗君：《全书》卷一安流年斗君诀所定的流年正月起处，古籍论流年常以「斗君过度在某宫」起论。
      const doujun = scopeKey === 'yearly' ? ziweiDoujunPalace(horoscope, palaces, scope.index) : null;
      if (doujun) prompt += `流年斗君（正月）：本命${doujun.name || '未知宫'}（${doujun.heavenlyStem || ''}${doujun.earthlyBranch || ''}）\n`;
      if (scopeMutagens.length >= 4) {
        prompt += `四化：禄-${scopeMutagens[0]}、权-${scopeMutagens[1]}、科-${scopeMutagens[2]}、忌-${scopeMutagens[3]}\n`;
      }

      const palaceOverlay = (scope.palaceNames || []).map((name, index) => {
        const natal = palaces[index];
        return `${name}→${natal?.name || '未知宫'}(${natal?.earthlyBranch || '-'})`;
      }).join('；');
      if (palaceOverlay) prompt += `十二宫叠盘：${palaceOverlay}\n`;

      const movingStars = (scope.stars || []).flatMap((stars, index) => {
        if (!stars?.length) return [];
        const natal = palaces[index];
        return [`${natal?.earthlyBranch || index}宫：${stars.map((star) => star.name).join('、')}`];
      });
      if (movingStars.length) prompt += `流耀落宫：${movingStars.join('；')}\n`;
      prompt += `\n`;
    });
  }

  // 主星带庙旺（全书七等全称）与生年四化；排盘库没给庙旺的（左右魁钺等）不标，不要默认成「平」。
  prompt += `【命盘十二宫位分布】\n`;
  palaces.forEach(p => {
    const major = majorStarsText(p, palaces);
    const minor = (p.minorStars || []).map(starLabel).join('、') || '无';
    prompt += `- ${p.name}${p.isBodyPalace ? '·身宫' : ''} (${p.heavenlyStem}${p.earthlyBranch})：${major} | ${minor}\n`;
  });

  prompt += `\n【分析要求】\n`;
  prompt += `1. 结合本命盘格局与${layerName}四化的引动，分析${layerName}的整体运势走向。\n`;
  prompt += `2. 重点分析【事业】、【财运】、【感情】三个维度的吉凶变化。\n`;
  prompt += `3. 针对“忌”星所在的宫位和冲照宫位，给出具体的避坑建议。\n`;
  prompt += `4. 针对“禄”星所在的宫位，给出具体的把握机会建议。\n`;
  prompt += `5. 语气专业、客观、富有同理心，不要使用过于宿命论的词汇。\n`;
  prompt += `6. 后面附有《紫微斗数全书》论本命星曜与论大限、流年的原文：每一条判断落到具体宫位、星曜与原文上，引用时注明篇目；原文与命盘数据对不上的说明差异，拿不准的写「存疑」；不涉及风水、改运之说。\n`;

  return prompt;
};

export const BABY_PROMPT_TEMPLATE = `**--- 👶 紫微斗数备孕择吉（起居注） 👶 ---**
**声明：本报告基于紫微斗数反推逻辑生成，旨在寻找最有利于诞生特定天赋宝宝的受孕时间窗口。玄学仅供参考，生命的诞生充满变数，请以自然受孕和医学建议为准，保持愉悦心情最重要。**

你是一位**紫微斗数大师**兼**优生优育专家**。你的任务是根据命理学原理，反推最佳受孕时间，以期生出具有**【{{TYPE_NAME}}】**天赋的宝宝。

**### 1. 核心目标：打造【{{TYPE_NAME}}】宝宝**
*   **目标天赋：** {{TYPE_DESC}}
*   **理想命盘特征：** {{TARGET_STARS}}

**### 2. 黄金受孕窗口期推算 (程序测算结论)**
**评分标准说明 (满分50分)：**
*   ⭐⭐⭐⭐⭐ (5 Stars): Perfect Match (Score 50+) - 完美契合
*   ⭐⭐⭐⭐ (4 Stars): Excellent (Score 40+) - 非常优秀
*   ⭐⭐⭐ (3 Stars): Good (Score 30+) - 良好
*   ⭐⭐ (2 Stars): Fair (Score 20+) - 一般

经后台算法遍历未来 14 天受孕窗口，筛选出以下 Top 3 最佳受孕时机（已反推预产期命盘）：

{{BEST_DATES_LIST}}

**### 3. 亲子缘分与家庭和谐**
*   **父母缘分：** 请结合父母的星盘数据，优先选择与父母缘分深厚、利于亲子关系的时间段。避免宝宝命盘严重克泄父母。

**### 4. 备孕建议与起居注**
*   **风水助运：** 卧室床位或摆设建议。
*   **心情与饮食：** 针对该类型宝宝的备孕期特别建议。

**--- 父母星盘全量数据 (用于深度合盘) ---**
{{PARENTS_DATA}}
`;

// Helper to dump full palace data
const dumpPalaceData = (palace) => {
  const major = palace.majorStars.map(s => `${s.name}(${s.brightness})${s.mutagen ? '[' + s.mutagen + ']' : ''}`).join('、') || '无';
  const minor = palace.minorStars.map(s => s.name).join('、') || '无';
  const adjs = palace.adjectiveStars.map(s => s.name).join('、') || '无';
  return `  - ${palace.name}：主星[${major}] | 辅星[${minor}] | 杂曜[${adjs}]`;
};

const dumpHoroscope = (horoscope, label) => {
  if (!horoscope) return `${label}：数据缺失\n`;
  let dump = `${label} (${horoscope.gender === 'male' ? '男' : '女'}, 五行局: ${horoscope.fiveElementsClass})：\n`;
  horoscope.palaces.forEach(p => {
    dump += dumpPalaceData(p) + '\n';
  });
  return dump;
};

export const generateBabyPrompt = (type, basicInfo, horoscope, partnerHoroscope, bestDates) => {
  const typeName = type === 'leader' ? '帝王之命' : type === 'iq' ? '文昌魁首' : type === 'sport' ? '武曲将星' : '陶朱富豪';
  const typeDesc = type === 'leader' ? '具备领导力、决断力，适合从政或管理' : type === 'iq' ? '智商超群、学业优秀，适合科研或学术' : type === 'sport' ? '体魄强健、行动力强，适合竞技或军警' : '财运亨通、商业嗅觉敏锐，适合经商';
  const targetStars = type === 'leader' ? '紫微、天府、太阳(旺)、天相，辅以左辅右弼' : type === 'iq' ? '天机、天梁、太阴、巨门，辅以文昌文曲' : type === 'sport' ? '七杀、破军、贪狼、武曲，辅以火星铃星' : '武曲、太阴、天府、贪狼，辅以禄存化禄';

  const bestDatesList = bestDates.map((d, i) => {
    return `${i + 1}. **${d.date} ${d.timeRange}** (评分: ${d.score} ${d.stars})\n   - **格局特征：** ${d.desc}\n   - **预产期(参考)：** ${d.birthDate}`;
  }).join('\n\n');

  const parentsData = dumpHoroscope(horoscope, '父亲/母亲(本人)') + '\n' + dumpHoroscope(partnerHoroscope, '母亲/父亲(配偶)');

  return BABY_PROMPT_TEMPLATE
    .replace(/{{TYPE_NAME}}/g, typeName)
    .replace('{{TYPE_DESC}}', typeDesc)
    .replace('{{TARGET_STARS}}', targetStars)
    .replace('{{BEST_DATES_LIST}}', bestDatesList)
    .replace('{{PARENTS_DATA}}', parentsData);
};
