const fs = require('fs');
const path = require('path');

// Load the term map
const TERM_MAP_PATH = path.join(__dirname, '../../scripts/islamic-terms-map.json');
let TERM_MAP = {};

try {
    if (fs.existsSync(TERM_MAP_PATH)) {
        TERM_MAP = JSON.parse(fs.readFileSync(TERM_MAP_PATH, 'utf8'));
        console.log(`[QueryNormalizer] Loaded ${Object.keys(TERM_MAP).length} terms from map.`);
    } else {
        console.warn('[QueryNormalizer] Warning: Term map file not found. Normalization will be limited.');
    }
} catch (error) {
    console.error('[QueryNormalizer] Failed to load term map:', error.message);
}

/**
 * Normalizes a user query locally by translating/expanding Islamic terms into English.
 * This is optimized for the 'bge-base-en-v1.5' embedding model.
 * 
 * @param {string} query - The raw user query
 * @returns {Promise<string>} - The normalized query
 */
async function normalizeQuery(query) {
    if (!query || typeof query !== 'string') return "";

    // 1. Lowercase and clean
    let normalized = query.toLowerCase().trim();

    // 2. Remove apostrophes (simple removal: Qur'an -> Quran, rak'ah -> rakah)
    normalized = normalized.replace(/'/g, '');

    // 3. Remove other special characters but keep spaces
    normalized = normalized.replace(/[^\w\s]/g, ' ');

    // 4. Tokenize
    const tokens = normalized.split(/\s+/).filter(t => t.length > 0);

    // 4. Map terms
    const expandedTokens = tokens.map(token => {
        // Direct match
        if (TERM_MAP[token]) {
            // Return "Original (Meaning)" or just Meaning?
            // User asked to "map those in pure commonly used english words"
            // Let's use the English meaning primarily, but keeping the original 
            // might help context if the model knows it slightly.
            // BGE-base-en is purely English focused. 
            // "haram" -> "forbidden" is better than "haram (forbidden)".
            // BUT, context matters. "haram" -> "forbidden prohibited" might be better.
            return `${TERM_MAP[token]}`;
        }

        // Check for plural forms (simple 's' check)
        if (token.endsWith('s') && TERM_MAP[token.slice(0, -1)]) {
            return TERM_MAP[token.slice(0, -1)];
        }

        return token;
    });

    // 5. Reconstruct
    let result = expandedTokens.join(' ');

    // 6. Basic enhancements (optional)
    // If query is very short (1 word), and it was expanded, maybe make it a question?
    // User: "haram" -> "forbidden" -> "What is forbidden?"
    if (tokens.length === 1 && TERM_MAP[tokens[0]]) {
        result = `What is ${TERM_MAP[tokens[0]]}?`; // "What is forbidden?"
    } else if (tokens.length === 1) {
        // If it's a single English word like "interest", make it "What does the Quran say about interest?" 
        result = `What does the Quran say about ${result}?`;
    }

    console.log(`[QueryNormalizer] Original: "${query}" -> Optimized: "${result}"`);
    return result;
}

module.exports = { normalizeQuery };
