import { findBestConceptionDates } from '../../src/utils/babySelector.js';

async function runDebug() {
    console.log("Starting debug...");
    try {
        const types = ['leader', 'iq', 'sport', 'wealth'];
        for (const type of types) {
            console.log(`Testing type: ${type}`);
            // Temporarily modify findBestConceptionDates in memory or just use a modified version here?
            // I'll just rely on the fact that I can't easily modify the imported function's internal loop logging.
            // Instead, I will assume the issue is scoring.

            // Let's manually run a scoring check on a known date just once
            if (type === 'leader') {
                const { astro } = await import('iztro');
                const horoscope = astro.bySolar('2026-05-20', 0, '男', true, 'zh-CN');
                console.log("Sample Horoscope Ming Major Stars:", JSON.stringify(horoscope.palaces.find(p => p.name === '命宫').majorStars, null, 2));
            }

            const results = await findBestConceptionDates(type);
            console.log(`Results for ${type}:`, results.length);
            if (results.length > 0) {
                console.log("Top result:", results[0]);
            } else {
                console.log("No results found!");
            }
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

runDebug();
