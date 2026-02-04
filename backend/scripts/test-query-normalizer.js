const { normalizeQuery } = require('../ml-search/search/query-normalizer');

async function testNormalization() {
    const testQueries = [
        "haram",
        "what does quran say about interest",
        "inheritance laws",
        "give sadaqah",
        "janazah prayer"
    ];

    console.log("🚀 Starting Query Normalization Test...\n");

    for (const query of testQueries) {
        console.log(`----------------------------------------`);
        console.log(`📥 Input Query: "${query}"`);

        try {
            const startTime = Date.now();
            const normalized = await normalizeQuery(query);
            const duration = Date.now() - startTime;

            console.log(`📤 Normalized:  "${normalized}"`);
            console.log(`⏱️  Time taken:  ${duration}ms`);

            if (normalized === query) {
                console.warn("⚠️  Warning: Output equals input (Normalization failed or fell back to original)");
            } else {
                console.log("✅ Normalization successful");
            }
        } catch (error) {
            console.error("❌ Test Error:", error.message);
        }
        console.log(`----------------------------------------\n`);
    }
}

testNormalization();
