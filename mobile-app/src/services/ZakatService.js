/**
 * Zakat Service — Nisab Calculator with Live Gold/Silver Prices (BDT)
 *
 * Uses free public APIs to fetch current gold & silver prices.
 * Converts to BDT and calculates Nisab thresholds per Hanafi fiqh.
 *
 * Nisab (Hanafi):
 *   Gold  — 7.5 tola  = 87.48 g
 *   Silver — 52.5 tola = 612.36 g
 *   Lower of the two is used (silver nisab — stricter, benefits the poor)
 *
 * Zakat rate: 2.5% of total zakatable wealth if ≥ nisab.
 */

// ─── Constants ───────────────────────────────────────────────────────────────
const GOLD_NISAB_GRAMS = 87.48;   // 7.5 tola
const SILVER_NISAB_GRAMS = 612.36; // 52.5 tola
const ZAKAT_RATE = 0.025;          // 2.5%

// Fallback prices (updated periodically — used only if API fails)
const FALLBACK_GOLD_BDT_PER_GRAM = 12800;   // ~Mar 2026 estimate
const FALLBACK_SILVER_BDT_PER_GRAM = 165;    // ~Mar 2026 estimate
const FALLBACK_USD_BDT = 121.5;

// ─── Price fetching ──────────────────────────────────────────────────────────

/**
 * Attempt to fetch gold & silver prices in BDT from multiple free sources.
 * Falls back to USD conversion, then to hardcoded values as last resort.
 *
 * Returns: { goldPerGram, silverPerGram, currency, source, lastUpdated }
 */
export async function fetchMetalPrices() {
  // Strategy 1: Try frankfurter.app (free forex) + free metals endpoint
  try {
    const prices = await fetchFromGoldApi();
    if (prices) return prices;
  } catch (e) {
    console.log('[Zakat] Gold API fetch failed:', e.message);
  }

  // Strategy 2: Try exchangerate + metals fallback
  try {
    const prices = await fetchViaExchangeRate();
    if (prices) return prices;
  } catch (e) {
    console.log('[Zakat] Exchange rate fetch failed:', e.message);
  }

  // Strategy 3: Hardcoded fallback
  console.log('[Zakat] Using fallback prices');
  return {
    goldPerGram: FALLBACK_GOLD_BDT_PER_GRAM,
    silverPerGram: FALLBACK_SILVER_BDT_PER_GRAM,
    currency: 'BDT',
    source: 'Cached estimate',
    lastUpdated: 'Fallback values — check manually',
    isFallback: true,
  };
}

/**
 * Strategy 1: gold-api.com (free tier — no key for basic requests)
 */
async function fetchFromGoldApi() {
  const [goldRes, silverRes] = await Promise.all([
    fetch('https://www.goldapi.io/api/XAU/BDT', {
      headers: { 'x-access-token': 'goldapi-free' },
    }).catch(() => null),
    fetch('https://www.goldapi.io/api/XAG/BDT', {
      headers: { 'x-access-token': 'goldapi-free' },
    }).catch(() => null),
  ]);

  // If the free endpoint doesn't work, try data-asg
  if (!goldRes || !goldRes.ok) {
    // Try the public goldprice.org data feed
    const res = await fetch(
      'https://data-asg.goldprice.org/dbXRates/BDT',
      { headers: { Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = await res.json();
      // data.items[0].xauPrice = gold price per troy oz in BDT
      // data.items[0].xagPrice = silver price per troy oz in BDT
      if (data?.items?.[0]) {
        const item = data.items[0];
        const goldPerGram = item.xauPrice / 31.1035;
        const silverPerGram = item.xagPrice / 31.1035;
        return {
          goldPerGram: Math.round(goldPerGram),
          silverPerGram: Math.round(silverPerGram * 100) / 100,
          currency: 'BDT',
          source: 'GoldPrice.org',
          lastUpdated: new Date(item.date || Date.now()).toLocaleDateString('en-BD'),
          isFallback: false,
        };
      }
    }
    return null;
  }

  const goldData = await goldRes.json();
  const silverData = silverRes ? await silverRes.json() : null;

  if (goldData?.price_gram_24k) {
    return {
      goldPerGram: Math.round(goldData.price_gram_24k),
      silverPerGram: silverData?.price_gram_24k
        ? Math.round(silverData.price_gram_24k * 100) / 100
        : FALLBACK_SILVER_BDT_PER_GRAM,
      currency: 'BDT',
      source: 'Gold API',
      lastUpdated: new Date().toLocaleDateString('en-BD'),
      isFallback: false,
    };
  }
  return null;
}

/**
 * Strategy 2: Get USD metals price + BDT exchange rate and combine.
 */
async function fetchViaExchangeRate() {
  // Get USD → BDT rate
  const forexRes = await fetch(
    'https://api.frankfurter.app/latest?from=USD&to=BDT'
  );
  let usdToBdt = FALLBACK_USD_BDT;
  if (forexRes.ok) {
    const forexData = await forexRes.json();
    if (forexData?.rates?.BDT) {
      usdToBdt = forexData.rates.BDT;
    }
  }

  // Get metals in USD from a free source
  const metalsRes = await fetch(
    'https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=gram'
  );
  if (metalsRes.ok) {
    const metalsData = await metalsRes.json();
    if (metalsData?.metals) {
      const goldUsd = metalsData.metals.gold || metalsData.metals.XAU;
      const silverUsd = metalsData.metals.silver || metalsData.metals.XAG;
      if (goldUsd) {
        return {
          goldPerGram: Math.round(goldUsd * usdToBdt),
          silverPerGram: Math.round((silverUsd || 1) * usdToBdt * 100) / 100,
          currency: 'BDT',
          source: 'Metals.dev + Frankfurter',
          lastUpdated: new Date().toLocaleDateString('en-BD'),
          isFallback: false,
          exchangeRate: usdToBdt,
        };
      }
    }
  }

  return null;
}

// ─── Nisab & Zakat Calculation ───────────────────────────────────────────────

/**
 * Calculate nisab thresholds in BDT.
 *
 * @param {number} goldPerGram  - Price of 1g gold (24k) in BDT
 * @param {number} silverPerGram - Price of 1g silver in BDT
 * @returns {{ goldNisab, silverNisab, nisab, nisabType }}
 */
export function calculateNisab(goldPerGram, silverPerGram) {
  const goldNisab = Math.round(goldPerGram * GOLD_NISAB_GRAMS);
  const silverNisab = Math.round(silverPerGram * SILVER_NISAB_GRAMS);

  // Hanafi: use the lower threshold (silver) to benefit the poor
  const useSilver = silverNisab <= goldNisab;
  return {
    goldNisab,
    silverNisab,
    nisab: useSilver ? silverNisab : goldNisab,
    nisabType: useSilver ? 'silver' : 'gold',
    goldPerGram,
    silverPerGram,
    goldGrams: GOLD_NISAB_GRAMS,
    silverGrams: SILVER_NISAB_GRAMS,
  };
}

/**
 * Full zakat calculation.
 *
 * @param {number} totalWealth - Total zakatable assets in BDT
 * @param {number} nisab       - Nisab threshold in BDT
 * @returns {{ eligible, zakatDue, totalWealth, nisab, rate }}
 */
export function calculateZakat(totalWealth, nisab) {
  const eligible = totalWealth >= nisab;
  return {
    eligible,
    zakatDue: eligible ? Math.round(totalWealth * ZAKAT_RATE) : 0,
    totalWealth,
    nisab,
    rate: ZAKAT_RATE,
    ratePercent: '2.5%',
  };
}

// ─── Foundation Data ─────────────────────────────────────────────────────────

export const ZAKAT_FOUNDATIONS = [
  // ── Payment Platforms ──
  {
    id: 'bkash',
    name: 'bKash Donation Portal',
    namebn: 'বিকাশ ডোনেশন পোর্টাল',
    category: 'payment',
    description: 'Pay Zakat directly to 50+ organizations including Al-Markazul Islami, Prothom Alo Trust & Sajida Foundation.',
    color: '#E2136E',
    icon: '📲',
    url: 'https://www.bkash.com/en/products-services/donation',
    featured: true,
  },
  {
    id: 'nagad',
    name: 'Nagad Islamic',
    namebn: 'নগদ ইসলামিক',
    category: 'payment',
    description: 'Shariah-compliant platform to pay Zakat to various listed NGOs and hospitals.',
    color: '#F26522',
    icon: '💳',
    url: 'https://www.nagad.com.bd',
    featured: true,
  },
  // ── Major Foundations ──
  {
    id: 'as-sunnah',
    name: 'As-Sunnah Foundation',
    namebn: 'আস-সুন্নাহ ফাউন্ডেশন',
    category: 'major',
    description: 'Disaster relief, self-reliance projects, support for poor students and families.',
    color: '#2E7D32',
    icon: '🌿',
    url: 'https://assunnah.org.bd',
  },
  {
    id: 'czm',
    name: 'Center for Zakat Management',
    namebn: 'সেন্টার ফর যাকাত ম্যানেজমেন্ট',
    category: 'major',
    description: 'Professional Zakat management, livelihood development, education for the ultra-poor.',
    color: '#1565C0',
    icon: '🏛️',
    url: 'https://czm-bd.org',
  },
  {
    id: 'anjuman',
    name: 'Anjuman Mufidul Islam',
    namebn: 'আনজুমান মুফিদুল ইসলাম',
    category: 'major',
    description: 'Orphanages, healthcare, and humanitarian services since 1905.',
    color: '#4E342E',
    icon: '🤲',
    url: 'https://www.anjumanmufidul.org',
  },
  {
    id: 'jaago',
    name: 'JAAGO Foundation',
    namebn: 'জাগো ফাউন্ডেশন',
    category: 'major',
    description: 'Quality education and school supplies for underprivileged children.',
    color: '#FF6F00',
    icon: '📚',
    url: 'https://jaagofoundation.org',
  },
  {
    id: 'thalassemia',
    name: 'Bangladesh Thalassemia Foundation',
    namebn: 'বাংলাদেশ থ্যালাসেমিয়া ফাউন্ডেশন',
    category: 'major',
    description: 'Blood transfusions and life-saving treatments for poor Thalassemia patients.',
    color: '#C62828',
    icon: '🩸',
    url: 'https://www.thalassemia.org.bd',
  },
  // ── Humanitarian & Development ──
  {
    id: 'basmah',
    name: 'BASMAH',
    namebn: 'বাসমাহ',
    category: 'humanitarian',
    description: 'Food, healthcare, shelter — particularly for Rohingya refugees and vulnerable communities.',
    color: '#00838F',
    icon: '🏠',
    url: 'https://basmah.org.bd',
  },
  {
    id: 'sawab',
    name: 'SAWAB Foundation',
    namebn: 'সওয়াব ফাউন্ডেশন',
    category: 'humanitarian',
    description: 'Housing projects, clean water, and emergency relief.',
    color: '#1B5E20',
    icon: '💧',
    url: 'https://sawabfoundation.com',
  },
  {
    id: 'obhizatrik',
    name: 'Obhizatrik Foundation',
    namebn: 'অভিযাত্রিক ফাউন্ডেশন',
    category: 'humanitarian',
    description: 'Sustainable livelihood — rickshaws, sewing machines, equipment for families to become self-sufficient.',
    color: '#E65100',
    icon: '🛠️',
    url: 'https://obhizatrik.org',
  },
  {
    id: 'ahsania',
    name: 'Dhaka Ahsania Mission',
    namebn: 'ঢাকা আহ্ছানিয়া মিশন',
    category: 'humanitarian',
    description: 'Extensive health, education, and social welfare programs across Bangladesh.',
    color: '#0D47A1',
    icon: '🌐',
    url: 'https://dam-bd.org',
  },
  {
    id: 'snad',
    name: 'SNAD Foundation Bangladesh',
    namebn: 'এসএনএডি ফাউন্ডেশন',
    category: 'humanitarian',
    description: '2026 Zakat campaign: education, youth unemployment, women\'s empowerment.',
    color: '#6A1B9A',
    icon: '👩‍🎓',
    url: 'https://snadfoundation.org',
  },
  {
    id: 'wateraid',
    name: 'WaterAid Bangladesh',
    namebn: 'ওয়াটারএইড বাংলাদেশ',
    category: 'humanitarian',
    description: 'Clean water and sanitation for marginalized communities.',
    color: '#0277BD',
    icon: '🚰',
    url: 'https://www.wateraid.org/bd',
  },
  // ── Education & Welfare ──
  {
    id: 'ucep',
    name: 'UCEP Bangladesh',
    namebn: 'ইউসেপ বাংলাদেশ',
    category: 'education',
    description: 'Vocational training and technical education for underprivileged youth.',
    color: '#283593',
    icon: '🎓',
    url: 'https://www.ucepbd.org',
  },
  {
    id: 'quantum',
    name: 'Quantum Foundation',
    namebn: 'কোয়ান্টাম ফাউন্ডেশন',
    category: 'education',
    description: 'Healthcare, education, and basic needs for the poor.',
    color: '#00695C',
    icon: '⚕️',
    url: 'https://quantumfoundation.org.bd',
  },
  {
    id: 'mastul',
    name: 'Mastul Foundation',
    namebn: 'মাস্তুল ফাউন্ডেশন',
    category: 'education',
    description: 'Orphan care, health, and burial services.',
    color: '#37474F',
    icon: '🫂',
    url: 'https://mastulfoundation.org',
  },
];

export const FOUNDATION_CATEGORIES = {
  payment: { label: 'Mobile Payment', labelBn: 'মোবাইল পেমেন্ট', icon: '📱' },
  major: { label: 'Major Foundations', labelBn: 'প্রধান ফাউন্ডেশন', icon: '🏛️' },
  humanitarian: { label: 'Humanitarian', labelBn: 'মানবিক সহায়তা', icon: '🤝' },
  education: { label: 'Education & Welfare', labelBn: 'শিক্ষা ও কল্যাণ', icon: '🎓' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format a number in Bangladeshi style: 1,00,000 (lakh system)
 */
export function formatBDT(amount) {
  if (amount == null || isNaN(amount)) return '৳0';
  const num = Math.round(amount);
  const str = num.toString();
  if (str.length <= 3) return `৳${str}`;

  // Last 3 digits, then groups of 2
  let result = str.slice(-3);
  let remaining = str.slice(0, -3);
  while (remaining.length > 0) {
    const chunk = remaining.slice(-2);
    result = chunk + ',' + result;
    remaining = remaining.slice(0, -2);
  }
  return `৳${result}`;
}

export default {
  fetchMetalPrices,
  calculateNisab,
  calculateZakat,
  formatBDT,
  ZAKAT_FOUNDATIONS,
  FOUNDATION_CATEGORIES,
};
