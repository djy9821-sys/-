/**
 * First Principles Hexagram Logic
 * 
 * 1. Atoms: 0 (Yin), 1 (Yang)
 * 2. Trigrams: 3-bit binary (Bottom-to-Top)
 * 3. Hexagrams: 6-bit binary (Bottom-to-Top) = Upper Trigram + Lower Trigram
 */

// 1. Define Trigrams (Binary Value: Bottom is LSB, Top is MSB)
// 乾 Qian (Heaven): 111 (7)
// 兑 Dui (Lake): 110 (Bottom 1, Mid 1, Top 0) -> Binary 011 (3)
// 离 Li (Fire): 101 (Bottom 1, Mid 0, Top 1) -> Binary 101 (5)
// 震 Zhen (Thunder): 100 (Bottom 1, Mid 0, Top 0) -> Binary 001 (1)
// 巽 Xun (Wind): 011 (Bottom 0, Mid 1, Top 1) -> Binary 110 (6)
// 坎 Kan (Water): 010 (Bottom 0, Mid 1, Top 0) -> Binary 010 (2)
// 艮 Gen (Mountain): 001 (Bottom 0, Mid 0, Top 1) -> Binary 100 (4)
// 坤 Kun (Earth): 000 (0)

const TRIGRAMS = {
    'Heaven': { name: '乾', binary: '111' },
    'Earth': { name: '坤', binary: '000' },
    'Thunder': { name: '震', binary: '001' }, // Bottom line is Yang
    'Water': { name: '坎', binary: '010' },
    'Mountain': { name: '艮', binary: '100' }, // Top line is Yang
    'Wind': { name: '巽', binary: '110' }, // Bottom broken, top two solid
    'Lake': { name: '兑', binary: '011' }, // Top broken, bottom two solid
    'Fire': { name: '离', binary: '101' }
};

// 2. Define 64 Hexagrams by Composition (Upper, Lower)
// Source: Standard I Ching Table
const HEXAGRAM_DEFINITIONS = [
    { number: 1, name: '乾为天', upper: 'Heaven', lower: 'Heaven', desc: '元亨利贞。' },
    { number: 2, name: '坤为地', upper: 'Earth', lower: 'Earth', desc: '元亨，利牝马之贞。君子有攸往，先迷后得主，利。西南得朋，东北丧朋。安贞吉。' },
    { number: 3, name: '水雷屯', upper: 'Water', lower: 'Thunder', desc: '元亨利贞。勿用有攸往，利建侯。' },
    { number: 4, name: '山水蒙', upper: 'Mountain', lower: 'Water', desc: '亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。' },
    { number: 5, name: '水天需', upper: 'Water', lower: 'Heaven', desc: '有孚，光亨，贞吉。利涉大川。' },
    { number: 6, name: '天水讼', upper: 'Heaven', lower: 'Water', desc: '有孚，窒。惕中吉。终凶。利见大人，不利涉大川。' },
    { number: 7, name: '地水师', upper: 'Earth', lower: 'Water', desc: '贞，丈人，吉无咎。' },
    { number: 8, name: '水地比', upper: 'Water', lower: 'Earth', desc: '吉。原筮元永贞，无咎。不宁方来，后夫凶。' },
    { number: 9, name: '风天小畜', upper: 'Wind', lower: 'Heaven', desc: '亨。密云不雨，自我西郊。' },
    { number: 10, name: '天泽履', upper: 'Heaven', lower: 'Lake', desc: '履虎尾，不咥人，亨。' },
    { number: 11, name: '地天泰', upper: 'Earth', lower: 'Heaven', desc: '小往大来，吉亨。' },
    { number: 12, name: '天地否', upper: 'Heaven', lower: 'Earth', desc: '否之匪人，不利君子贞，大往小来。' },
    { number: 13, name: '天火同人', upper: 'Heaven', lower: 'Fire', desc: '同人于野，亨。利涉大川，利君子贞。' },
    { number: 14, name: '火天大有', upper: 'Fire', lower: 'Heaven', desc: '元亨。' },
    { number: 15, name: '地山谦', upper: 'Earth', lower: 'Mountain', desc: '亨，君子有终。' },
    { number: 16, name: '雷地豫', upper: 'Thunder', lower: 'Earth', desc: '利建侯行师。' },
    { number: 17, name: '泽雷随', upper: 'Lake', lower: 'Thunder', desc: '元亨利贞，无咎。' },
    { number: 18, name: '山风蛊', upper: 'Mountain', lower: 'Wind', desc: '元亨，利涉大川。先甲三日，后甲三日。' },
    { number: 19, name: '地泽临', upper: 'Earth', lower: 'Lake', desc: '元亨利贞。至于八月有凶。' },
    { number: 20, name: '风地观', upper: 'Wind', lower: 'Earth', desc: '盥而不荐，有孚颙若。' },
    { number: 21, name: '火雷噬嗑', upper: 'Fire', lower: 'Thunder', desc: '亨。利用狱。' },
    { number: 22, name: '山火贲', upper: 'Mountain', lower: 'Fire', desc: '亨。小利有攸往。' },
    { number: 23, name: '山地剥', upper: 'Mountain', lower: 'Earth', desc: '不利有攸往。' },
    { number: 24, name: '地雷复', upper: 'Earth', lower: 'Thunder', desc: '亨。出入无疾，朋来无咎。反复其道，七日来复，利有攸往。' },
    { number: 25, name: '天雷无妄', upper: 'Heaven', lower: 'Thunder', desc: '元亨利贞。其匪正有眚，不利有攸往。' },
    { number: 26, name: '山天大畜', upper: 'Mountain', lower: 'Heaven', desc: '利贞，不家食吉，利涉大川。' },
    { number: 27, name: '山雷颐', upper: 'Mountain', lower: 'Thunder', desc: '贞吉。观颐，自求口实。' },
    { number: 28, name: '泽风大过', upper: 'Lake', lower: 'Wind', desc: '栋桡，利有攸往，亨。' },
    { number: 29, name: '坎为水', upper: 'Water', lower: 'Water', desc: '习坎，有孚，维心亨，行有尚。' },
    { number: 30, name: '离为火', upper: 'Fire', lower: 'Fire', desc: '利贞，亨。畜牝牛，吉。' },
    { number: 31, name: '泽山咸', upper: 'Lake', lower: 'Mountain', desc: '亨，利贞，取女吉。' },
    { number: 32, name: '雷风恒', upper: 'Thunder', lower: 'Wind', desc: '亨，无咎，利贞，利有攸往。' },
    { number: 33, name: '天山遁', upper: 'Heaven', lower: 'Mountain', desc: '亨，小利贞。' },
    { number: 34, name: '雷天大壮', upper: 'Thunder', lower: 'Heaven', desc: '利贞。' },
    { number: 35, name: '火地晋', upper: 'Fire', lower: 'Earth', desc: '康侯用锡马蕃庶，昼日三接。' },
    { number: 36, name: '地火明夷', upper: 'Earth', lower: 'Fire', desc: '利艰贞。' },
    { number: 37, name: '风火家人', upper: 'Wind', lower: 'Fire', desc: '利女贞。' },
    { number: 38, name: '火泽睽', upper: 'Fire', lower: 'Lake', desc: '小事吉。' },
    { number: 39, name: '水山蹇', upper: 'Water', lower: 'Mountain', desc: '利西南，不利东北；利见大人，贞吉。' },
    { number: 40, name: '雷水解', upper: 'Thunder', lower: 'Water', desc: '利西南，无所往，其来复吉。有攸往，夙吉。' },
    { number: 41, name: '山泽损', upper: 'Mountain', lower: 'Lake', desc: '有孚，元吉，无咎，可贞，利有攸往。曷之用，二簋可用享。' },
    { number: 42, name: '风雷益', upper: 'Wind', lower: 'Thunder', desc: '利有攸往，利涉大川。' },
    { number: 43, name: '泽天夬', upper: 'Lake', lower: 'Heaven', desc: '扬于王庭，孚号，有厉，告自邑，不利即戎，利有攸往。' },
    { number: 44, name: '天风姤', upper: 'Heaven', lower: 'Wind', desc: '女壮，勿用取女。' },
    { number: 45, name: '泽地萃', upper: 'Lake', lower: 'Earth', desc: '亨。王假有庙，利见大人，亨，利贞。用大牲吉，利有攸往。' },
    { number: 46, name: '地风升', upper: 'Earth', lower: 'Wind', desc: '元亨，用见大人，勿恤，南征吉。' },
    { number: 47, name: '泽水困', upper: 'Lake', lower: 'Water', desc: '亨，贞，大人吉，无咎，有言不信。' },
    { number: 48, name: '水风井', upper: 'Water', lower: 'Wind', desc: '改邑不改井，无丧无得，往来井井。汔至亦未繘井，羸其瓶，凶。' },
    { number: 49, name: '泽火革', upper: 'Lake', lower: 'Fire', desc: '巳日乃孚，元亨利贞，悔亡。' },
    { number: 50, name: '火风鼎', upper: 'Fire', lower: 'Wind', desc: '元吉，亨。' },
    { number: 51, name: '震为雷', upper: 'Thunder', lower: 'Thunder', desc: '亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。' },
    { number: 52, name: '艮为山', upper: 'Mountain', lower: 'Mountain', desc: '艮其背，不获其身，行其庭，不见其人，无咎。' },
    { number: 53, name: '风山渐', upper: 'Wind', lower: 'Mountain', desc: '女归吉，利贞。' },
    { number: 54, name: '雷泽归妹', upper: 'Thunder', lower: 'Lake', desc: '征凶，无攸利。' },
    { number: 55, name: '雷火丰', upper: 'Thunder', lower: 'Fire', desc: '亨，王假之，勿忧，宜日中。' },
    { number: 56, name: '火山旅', upper: 'Fire', lower: 'Mountain', desc: '小亨，旅贞吉。' },
    { number: 57, name: '巽为风', upper: 'Wind', lower: 'Wind', desc: '小亨，利有攸往，利见大人。' },
    { number: 58, name: '兑为泽', upper: 'Lake', lower: 'Lake', desc: '亨，利贞。' },
    { number: 59, name: '风水涣', upper: 'Wind', lower: 'Water', desc: '亨。王假有庙，利涉大川，利贞。' },
    { number: 60, name: '水泽节', upper: 'Water', lower: 'Lake', desc: '亨。苦节不可贞。' },
    { number: 61, name: '风泽中孚', upper: 'Wind', lower: 'Lake', desc: '豚鱼吉，利涉大川，利贞。' },
    { number: 62, name: '雷山小过', upper: 'Thunder', lower: 'Mountain', desc: '亨，利贞。可小事，不可大事。飞鸟遗之音，不宜上，宜下，大吉。' },
    { number: 63, name: '水火既济', upper: 'Water', lower: 'Fire', desc: '亨，小利贞，初吉终乱。' },
    { number: 64, name: '火水未济', upper: 'Fire', lower: 'Water', desc: '亨，小狐汔济，濡其尾，无攸利。' }
];

// 3. Build the Truth Table (Map)
export const HEXAGRAM_MAP = {};

HEXAGRAM_DEFINITIONS.forEach(def => {
    const upperBinary = TRIGRAMS[def.upper].binary;
    const lowerBinary = TRIGRAMS[def.lower].binary;
    // Key = Upper (Top 3) + Lower (Bottom 3)
    // Note: Our binary strings are LSB-first in logic, but represented as string.
    // Wait, if "Heaven" is '111', does that mean Bottom=1, Mid=1, Top=1? Yes.
    // If we concatenate strings: '111' + '111' = '111111'.
    // If we want the key to be [Top...Bottom] or [Bottom...Top]?
    // User requested: "初爻为二进制最低位 (LSB)".
    // If we use string "101011" where left is MSB (Top) and right is LSB (Bottom).
    // Then Key = UpperBinary + LowerBinary.
    // Example: Fire over Lake (Kui).
    // Upper Fire (Li): 101 (Top=1, Mid=0, Bot=1).
    // Lower Lake (Dui): 011 (Top=0, Mid=1, Bot=1).
    // Key = 101 + 011 = 101011.
    // This matches the user's example: 101011 -> 火泽睽.

    const key = upperBinary + lowerBinary;
    HEXAGRAM_MAP[key] = {
        name: def.name,
        desc: def.desc,
        upper: def.upper,
        lower: def.lower,
        number: def.number
    };
});

/**
 * Get Hexagram from Yao Array
 * @param {Array<number>} yaos - Array of 6 numbers (0 or 1), from Bottom (index 0) to Top (index 5)
 * @returns {Object} Hexagram info
 */
export const getHexagram = (yaos) => {
    if (!yaos || yaos.length !== 6) return null;

    // Convert array to binary string (Top to Bottom)
    // yaos: [y1, y2, y3, y4, y5, y6] (Bottom -> Top)
    // We want: y6 y5 y4 y3 y2 y1
    const binaryKey = [...yaos].reverse().join('');

    return HEXAGRAM_MAP[binaryKey] || { name: '未知卦', desc: '无法解析' };
};

// Self-Correction / Verification
const testKui = [1, 1, 0, 1, 0, 1]; // Bottom -> Top: Lake (110->011), Fire (101->101)
// Lake (011) is Bottom. Fire (101) is Top.
// Array: [1, 1, 0, 1, 0, 1]
// Reverse: [1, 0, 1, 0, 1, 1] -> "101011"
// Map["101011"] should be "火泽睽".

const result = getHexagram(testKui);
if (result.name !== '火泽睽') {
    console.error('CRITICAL ERROR: Self-correction failed for 火泽睽');
    console.error('Expected: 火泽睽, Got:', result.name);
} else {
    console.log('Self-correction passed: 火泽睽 verified.');
}
