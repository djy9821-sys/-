import { astro } from 'iztro';

const year = 2025;
const month = 1;
const day = 1;
const hour = 0; // Zi Shi

console.log(`Testing byLunar: ${year}-${month}-${day} Hour: ${hour}`);

try {
    // byLunar(dateStr, hourIndex, gender, isLeapMonth, fixLeap)
    // dateStr format: "YYYY-M-D"
    const horoscope = astro.byLunar(`${year}-${month}-${day}`, hour, '男', false, true);

    console.log("Chinese Date:", horoscope.chineseDate);

    if (typeof horoscope.chineseDate === 'string') {
        const parts = horoscope.chineseDate.trim().split(/\s+/);
        console.log("Parts:", parts);
        console.log("Monthly Stem:", parts[1] ? parts[1][0] : 'N/A');
    }
} catch (e) {
    console.error("Error:", e);
}
