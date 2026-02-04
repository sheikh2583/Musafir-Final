const fs = require('fs');
const path = require('path');

const filePath = 'd:/Musafir/tazkirul-quran-en.json/tazkirul-quran-en.json';

try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let text = "";
    for (const k in data) {
        if (data[k].text) text += data[k].text + " ";
    }

    const words = text.toLowerCase().split(/\s+/);
    const counts = {};

    words.forEach(w => {
        // Clean punctuation
        const clean = w.replace(/[",.?():;!]/g, '');
        if (!clean) return;

        // Filter for potential transliterations:
        // 1. Contains apostrophe (e.g. mu'min)
        // 2. Starts with al- (e.g. al-fatihah)
        // 3. Or just looks "foreign" (hard to do without dict, but let's stick to 1 & 2 first)
        if (clean.includes("'") || clean.startsWith("al-")) {
            counts[clean] = (counts[clean] || 0) + 1;
        }
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    console.log("Top 50 Potential Transliterations:");
    sorted.slice(0, 50).forEach(([word, count]) => {
        console.log(`${count}: ${word}`);
    });

} catch (e) {
    console.error(e);
}
