import { astro } from 'iztro';

const year = 1985;
const month = 9;
const day = 16;

console.log(`Testing byLunar: ${year}-${month}-${day}`);

try {
    const horoscope = astro.byLunar(`${year}-${month}-${day}`, 0, '男', false, true);
    console.log("Chinese Date:", horoscope.chineseDate);

    if (typeof horoscope.chineseDate === 'string') {
        const parts = horoscope.chineseDate.trim().split(/\s+/);
        console.log("Parts:", parts);
        if (parts.length >= 3) {
            console.log("Day Stem:", parts[2][0]);
        }
    }
} catch (e) {
    console.error("Error:", e);
}
