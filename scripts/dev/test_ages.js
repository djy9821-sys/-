
import { astro } from 'iztro';

// Create a chart for a person born in 1990 (Horse year)
// 2025 (Snake year) would be age 36 (approx).
// Let's see what 'ages' are in the 'Snake' (Si) palace vs 'Horse' (Wu) palace.
// And see if 'ages' corresponds to Small Limit.

const horoscope = astro.bySolar('1990-01-01', 0, '男', true, 'zh-CN');

console.log('--- Palace Ages (Xiao Xian?) ---');
horoscope.palaces.forEach((p, idx) => {
    // Only print first few palaces to keep it short
    if (idx < 4) {
        console.log(`Palace [${p.name}] (${p.earthlyBranch}): Ages: ${p.ages.join(', ')}`);
    }
});

// Logic Test for Liu Nian (Flow Year)
// Liu Nian is simply determined by the Year's Branch.
// If Current Year is 'Zi' (Rat), then the Rat Palace is the Liu Nian Palace.
// The "Age" corresponding to that year is simply CurrentYear - BirthYear + 1.
// So for a generic "Liu Nian" list in a palace, we are asking:
// "When the year is [Branch of this Palace], how old will I be?"
// The answer is: Ages where (Age - 1 + BirthYearBranchIndex) % 12 === PalaceBranchIndex.

const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// Wait, iztro zodiac might be character?
// 1990 is Geng Wu (Horse).
console.log(`Birth Zodiac: ${horoscope.zodiac} (Should be Horse/Wu)`);

// Let's verify standard Liu Nian calculation
// If born in Horse year (index 6).
// In Horse year (index 6): Age 1 (xu sui), 13, 25...
// In Goat year (index 7): Age 2, 14, 26...
// ...
// So in a Palace with branch P_Branch:
// The ages are those where: (age + birthBranchIndex - 1) % 12 === palaceBranchIndex

const myLiuNianLogic = (palaceBranchIndex, birthBranchIndex) => {
    const ages = [];
    const diff = (palaceBranchIndex - birthBranchIndex + 12) % 12;
    // Age 1 is at birthBranchIndex.
    // So Age 1 + diff corresponds to palaceBranchIndex?
    // Let's test:
    // Palace = Horse (6), Birth = Horse (6). Diff = 0.
    // We want Age 1.
    // Formula: Age = 1 + diff + 12*k
    for (let k = 0; k < 10; k++) {
        let age = 1 + diff + (12 * k);
        if (age > 0) ages.push(age);
    }
    return ages;
};

console.log('--- Calculated Liu Nian Ages (My Logic) ---');
horoscope.palaces.forEach((p, idx) => {
    if (idx < 4) {
        const pIndex = EARTHLY_BRANCHES.indexOf(p.earthlyBranch);
        // We need birth branch index.
        // 1990 is Horse (Wu). Wu is index 6 in standard list?
        // Standard: Zi(0), Chou(1)... Wu(6). Yes.
        // But need to confirm horoscope.zodiac returns 'Horse' or '午'?
        // Assuming Iztro returns Chinese Zodiac char '马'? Or Branch '午'?
        // Let's rely on calculating 1990 -> Wu manually if needed.
        const birthIndex = 6; // Fix for 1990
        const ages = myLiuNianLogic(pIndex, birthIndex);
        console.log(`Palace [${p.earthlyBranch}] Liu Nian Ages: ${ages.join(', ')}`);
    }
});
