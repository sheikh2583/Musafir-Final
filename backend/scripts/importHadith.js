const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
const Hadith = require('../models/Hadith.model');

/**
 * Hadith Data Import Script
 * 
 * Imports Sihah Sittah (The Six Authentic Books) from trusted sources.
 * Run ONCE during initial setup.
 * 
 * Data Sources:
 * - sunnah.com API (for initial download)
 * - Alternative: Use pre-downloaded JSON files from hadith databases
 * 
 * IMPORTANT: Downloads data ONCE. App works 100% offline after import.
 */

dotenv.config();

/**
 * Collection mapping
 */
const COLLECTIONS = {
  bukhari: {
    id: 'bukhari',
    apiName: 'bukhari',
    name: 'Sahih Bukhari',
    totalBooks: 97
  },
  muslim: {
    id: 'muslim',
    apiName: 'muslim',
    name: 'Sahih Muslim',
    totalBooks: 56
  },
  abudawud: {
    id: 'abudawud',
    apiName: 'abudawud',
    name: 'Sunan Abu Dawood',
    totalBooks: 43
  },
  tirmidhi: {
    id: 'tirmidhi',
    apiName: 'tirmidhi',
    name: 'Jami` at-Tirmidhi',
    totalBooks: 51
  },
  nasai: {
    id: 'nasai',
    apiName: 'nasai',
    name: 'Sunan an-Nasa\'i',
    totalBooks: 52
  },
  ibnmajah: {
    id: 'ibnmajah',
    apiName: 'ibnmajah',
    name: 'Sunan Ibn Majah',
    totalBooks: 37
  }
};

/**
 * Import hadith from sunnah.com API
 * 
 * NOTE: This is for INITIAL DOWNLOAD only.
 * Recommended: Download JSON files manually for better reliability.
 */
async function importCollectionFromAPI(collectionKey) {
  const collection = COLLECTIONS[collectionKey];
  
  console.log(`\n📚 Importing ${collection.name}...`);
  
  try {
    let totalImported = 0;
    
    for (let bookNum = 1; bookNum <= collection.totalBooks; bookNum++) {
      try {
        console.log(`  📖 Book ${bookNum}/${collection.totalBooks}...`);
        
        // Fetch from sunnah.com API
        const response = await axios.get(
          `https://api.sunnah.com/${collection.apiName}/books/${bookNum}/hadiths`,
          {
            headers: {
              'X-API-Key': process.env.SUNNAH_API_KEY || '' // Optional: Get API key from sunnah.com
            }
          }
        );
        
        if (!response.data || !response.data.hadiths) {
          console.log(`  ⚠️  No data for book ${bookNum}`);
          continue;
        }
        
        const hadiths = response.data.hadiths;
        
        const hadithsToInsert = hadiths.map(hadith => ({
          collection: collectionKey,
          bookNumber: bookNum,
          bookName: hadith.bookName || '',
          chapter: hadith.chapterName || '',
          chapterNumber: hadith.chapterNumber || null,
          hadithNumber: hadith.hadithNumber,
          arabicText: hadith.hadithArabic || hadith.text || '',
          translationEn: hadith.hadithEnglish || hadith.englishText || '',
          translationBn: '', // Add if source available
          metadata: {
            narrator: hadith.narrator || '',
            grade: hadith.grade || '',
            reference: `${collection.name} ${hadith.hadithNumber}`
          }
        }));
        
        if (hadithsToInsert.length > 0) {
          await Hadith.insertMany(hadithsToInsert, { ordered: false });
          totalImported += hadithsToInsert.length;
          console.log(`  ✅ Imported ${hadithsToInsert.length} hadiths from book ${bookNum}`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ℹ️  Book ${bookNum} already exists, skipping...`);
        } else {
          console.error(`  ❌ Error importing book ${bookNum}:`, error.message);
        }
      }
    }
    
    console.log(`✅ ${collection.name}: Imported ${totalImported} hadiths total`);
    return totalImported;
    
  } catch (error) {
    console.error(`❌ Error importing ${collection.name}:`, error.message);
    return 0;
  }
}

/**
 * Import from local JSON files (RECOMMENDED)
 * 
 * Download hadith collections from:
 * - https://github.com/A-H4NU/kalem-data
 * - https://github.com/islamic-network/hadith-api-data
 * 
 * Place JSON files in backend/data/hadith/
 */
async function importCollectionFromJSON(collectionKey) {
  const collection = COLLECTIONS[collectionKey];
  
  try {
    console.log(`\n📚 Importing ${collection.name} from JSON...`);
    
    const fs = require('fs');
    const path = require('path');
    
    const jsonPath = path.join(__dirname, `../data/hadith/${collectionKey}.json`);
    
    if (!fs.existsSync(jsonPath)) {
      console.log(`⚠️  ${collectionKey}.json not found. Skipping.`);
      return false;
    }
    
    const hadithData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Transform based on JSON structure (adjust as needed)
    const hadithsToInsert = hadithData.map(item => ({
      collection: collectionKey,
      bookNumber: item.bookNumber || item.book,
      bookName: item.bookName || '',
      chapter: item.chapter || '',
      chapterNumber: item.chapterNumber || null,
      hadithNumber: item.hadithNumber || item.number,
      arabicText: item.arabicText || item.ar || '',
      translationEn: item.translationEn || item.en || '',
      translationBn: item.translationBn || item.bn || '',
      metadata: {
        narrator: item.narrator || '',
        grade: item.grade || '',
        reference: `${collection.name} ${item.hadithNumber || item.number}`
      }
    }));
    
    // Insert in batches to avoid memory issues
    const batchSize = 1000;
    let imported = 0;
    
    for (let i = 0; i < hadithsToInsert.length; i += batchSize) {
      const batch = hadithsToInsert.slice(i, i + batchSize);
      await Hadith.insertMany(batch, { ordered: false }).catch(() => {});
      imported += batch.length;
      console.log(`  Progress: ${imported}/${hadithsToInsert.length}`);
    }
    
    console.log(`✅ ${collection.name}: Imported ${imported} hadiths from JSON`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error importing ${collection.name} from JSON:`, error.message);
    return false;
  }
}

/**
 * Import all collections
 */
async function importAllCollections() {
  console.log('📚 Starting Hadith import for all Sihah Sittah...');
  console.log('⚠️  This will take considerable time. Please be patient.\n');
  
  let totalImported = 0;
  
  for (const collectionKey of Object.keys(COLLECTIONS)) {
    // Try JSON first, fall back to API
    const jsonImported = await importCollectionFromJSON(collectionKey);
    
    if (!jsonImported) {
      const count = await importCollectionFromAPI(collectionKey);
      totalImported += count;
    } else {
      const count = await Hadith.countDocuments({ collection: collectionKey });
      totalImported += count;
    }
  }
  
  return totalImported;
}

/**
 * Main import function
 */
async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('⚠️  IMPORTANT NOTES:');
    console.log('   - For best results, use pre-downloaded JSON files');
    console.log('   - API import requires internet and may take hours');
    console.log('   - Place JSON files in: backend/data/hadith/');
    console.log('   - Recommended source: https://github.com/A-H4NU/kalem-data\n');
    
    // Clear existing hadith data (optional - comment out to preserve)
    // await Hadith.deleteMany({});
    // console.log('🗑️  Cleared existing hadith data\n');
    
    const totalImported = await importAllCollections();
    
    // Verify import
    const stats = await Promise.all(
      Object.keys(COLLECTIONS).map(async (key) => {
        const count = await Hadith.countDocuments({ collection: key });
        return { collection: COLLECTIONS[key].name, count };
      })
    );
    
    console.log('\n📊 Import Summary:');
    stats.forEach(stat => {
      console.log(`   ${stat.collection}: ${stat.count} hadiths`);
    });
    console.log(`   Total: ${totalImported} hadiths`);
    
    console.log('\n✅ Hadith import completed!');
    
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run import
if (require.main === module) {
  main();
}

module.exports = { importCollectionFromAPI, importCollectionFromJSON, importAllCollections };
