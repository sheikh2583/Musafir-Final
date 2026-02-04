const fs = require('fs');
const path = require('path');

const TAFSEER_PATH = 'd:/Musafir/tazkirul-quran-en.json/tazkirul-quran-en.json';
const HADITH_DIR = 'd:/Musafir/hadith-json/db/by_book/the_9_books';
const MAP_PATH = path.join(__dirname, 'islamic-terms-map.json');

// Load existing map
let termMap = {};
if (fs.existsSync(MAP_PATH)) {
    termMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
}
const existingTerms = new Set(Object.keys(termMap).map(k => k.toLowerCase()));

// Stats
let potentialTerms = {};
let parenthesizedPairs = [];

function tokenize(text) {
    if (!text) return;

    // 1. Check for "word (definition)" pattern
    const parensRegex = /([a-zA-Z']+(?:\s[a-zA-Z']+)?)\s*\(([^)]+)\)/g;
    let match;
    while ((match = parensRegex.exec(text)) !== null) {
        const term = match[1].toLowerCase().trim();
        const def = match[2].toLowerCase().trim();
        // Avoid common English parens (e.g. "he (the narrator)")
        if (term.length > 2 && !existingTerms.has(term) && !['he', 'she', 'it', 'they', 'i', 'we'].includes(term)) {
            // Heuristic: Islamic terms often have apostrophes or don't look like standard English
            // But we will capture them all for review in the output
            parenthesizedPairs.push({ term, def });
        }
    }

    // 2. Word frequency analysis for distinct patterns
    const words = text.toLowerCase().split(/[\s,.?!:;"()\[\]]+/);
    words.forEach(w => {
        if (!w) return;

        // Filter: 
        // - Starts with 'al-'
        // - Contains apostrophe inside word (e.g. mu'min)
        // - Ends with 'in' or 'un' (common Arabic transliteration endings, noisy but useful)
        // - Check if NOT in existing map

        if (existingTerms.has(w)) return;

        if (w.startsWith('al-') || w.includes("'") || w === 'pbuh') {
            potentialTerms[w] = (potentialTerms[w] || 0) + 1;
        }
    });
}

function scanTafseer() {
    console.log('Scanning Tafseer...');
    if (fs.existsSync(TAFSEER_PATH)) {
        const data = JSON.parse(fs.readFileSync(TAFSEER_PATH, 'utf8'));
        for (const k in data) {
            if (data[k].text) tokenize(data[k].text);
        }
    }
}

function scanHadith() {
    console.log('Scanning Hadith...');
    if (fs.existsSync(HADITH_DIR)) {
        const files = fs.readdirSync(HADITH_DIR);
        for (const file of files) {
            if (file.endsWith('.json')) {
                console.log(` - ${file}`);
                const content = JSON.parse(fs.readFileSync(path.join(HADITH_DIR, file), 'utf8'));
                if (content.hadiths) {
                    content.hadiths.forEach(h => {
                        if (h.english && h.english.text) tokenize(h.english.text);
                    });
                }
            }
        }
    }
}

scanTafseer();
scanHadith();

// Process Results
console.log('\n--- Top 50 Potential New Terms (by Frequency) ---');
Object.entries(potentialTerms)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .forEach(([term, count]) => console.log(`${count}: ${term}`));

console.log('\n--- Sample Parenthesized Definitions (Potential Mappings) ---');
// De-dupe pairs
const uniquePairs = {};
parenthesizedPairs.forEach(p => {
    uniquePairs[p.term] = p.def;
});
Object.entries(uniquePairs)
    .slice(0, 40)
    .forEach(([term, def]) => console.log(`${term} -> ${def}`));
