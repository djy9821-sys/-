import { astro } from 'iztro';

const testCases = [
    { date: "2025-12-5", hour: 10, name: "User Screenshot Case (Hour 10)" },
    { date: "2025-12-5", hour: 22, name: "Potential Bug Case (Hour 22)" },
    { date: "1998-1-2", hour: 6, name: "User Text Case" }
];

testCases.forEach(test => {
    console.log(`\n-- - Testing ${test.name}: ${test.date} Hour: ${test.hour} --- `);
    try {
        const horoscope = astro.bySolar(test.date, test.hour, '男', true);
        console.log("Chinese Date Type:", typeof horoscope.chineseDate);
        console.log("Chinese Date Value:", horoscope.chineseDate);

        if (typeof horoscope.chineseDate === 'string') {
            const parts = horoscope.chineseDate.split(/\s+/); // Test regex split
            console.log("Regex Split parts:", parts);

            const simpleParts = horoscope.chineseDate.split(' ');
            console.log("Simple Split parts:", simpleParts);
        }
    } catch (e) {
        console.error("Error:", e);
    }
});
