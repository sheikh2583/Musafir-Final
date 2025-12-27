import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchMetalPrices,
  calculateNisab,
  calculateZakat,
  formatBDT,
  ZAKAT_FOUNDATIONS,
  FOUNDATION_CATEGORIES,
} from '../services/ZakatService';

// ─── Input styles (defined before WealthInput so the component can reference them) ──
const inputStyles = StyleSheet.create({
  inputGroup: { marginBottom: 12 },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inputIcon: { fontSize: 14 },
  inputLabelText: { fontSize: 12, fontWeight: '600', color: '#B3B3B3' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 12,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4A84B',
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

// ─── Extracted outside to prevent re-mount on every keystroke ──
const WealthInput = ({ label, icon, value, onChangeText, placeholder }) => (
  <View style={inputStyles.inputGroup}>
    <View style={inputStyles.inputLabel}>
      <Text style={inputStyles.inputIcon}>{icon}</Text>
      <Text style={inputStyles.inputLabelText}>{label}</Text>
    </View>
    <View style={inputStyles.inputWrapper}>
      <Text style={inputStyles.inputPrefix}>{'\u09F3'}</Text>
      <TextInput
        style={inputStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || '0'}
        placeholderTextColor="#555555"
        keyboardType="numeric"
        returnKeyType="done"
        blurOnSubmit={true}
      />
    </View>
  </View>
);

export default function ZakatScreen({ navigation }) {
  // ─── State ───────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prices, setPrices] = useState(null);
  const [nisabData, setNisabData] = useState(null);
  const [error, setError] = useState(null);

  // Wealth inputs
  const [cashSavings, setCashSavings] = useState('');
  const [goldValue, setGoldValue] = useState('');
  const [silverValue, setSilverValue] = useState('');
  const [investments, setInvestments] = useState('');
  const [businessAssets, setBusinessAssets] = useState('');
  const [otherAssets, setOtherAssets] = useState('');
  const [debts, setDebts] = useState('');

  const [zakatResult, setZakatResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const resultAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);

  // ─── Load prices on mount ────────────────────────────────
  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      setError(null);
      if (!refreshing) setLoading(true);

      const metalPrices = await fetchMetalPrices();
      setPrices(metalPrices);

      const nisab = calculateNisab(metalPrices.goldPerGram, metalPrices.silverPerGram);
      setNisabData(nisab);
    } catch (err) {
      console.error('[Zakat] Price fetch error:', err);
      setError('Could not fetch live metal prices. Using estimated values.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPrices();
  }, []);

  // ─── Calculate Zakat ─────────────────────────────────────
  const handleCalculate = () => {
    Keyboard.dismiss();

    const parse = (v) => parseFloat(v.replace(/,/g, '')) || 0;
    const totalAssets =
      parse(cashSavings) +
      parse(goldValue) +
      parse(silverValue) +
      parse(investments) +
      parse(businessAssets) +
      parse(otherAssets);
    const totalDebts = parse(debts);
    const netWealth = Math.max(0, totalAssets - totalDebts);

    if (!nisabData) return;

    const result = calculateZakat(netWealth, nisabData.nisab);
    result.totalAssets = totalAssets;
    result.totalDebts = totalDebts;
    result.netWealth = netWealth;
    setZakatResult(result);
    setShowResult(true);

    // Animate in
    Animated.spring(resultAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Scroll to result
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 600, animated: true });
    }, 300);
  };

  const handleReset = () => {
    setCashSavings('');
    setGoldValue('');
    setSilverValue('');
    setInvestments('');
    setBusinessAssets('');
    setOtherAssets('');
    setDebts('');
    setShowResult(false);
    setZakatResult(null);
    resultAnim.setValue(0);
  };

  // ─── Foundation helpers ──────────────────────────────────
  const getFilteredFoundations = () => {
    if (activeCategory === 'all') return ZAKAT_FOUNDATIONS;
    return ZAKAT_FOUNDATIONS.filter((f) => f.category === activeCategory);
  };

  // ─── Loading state ───────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Zakat Calculator</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#D4A84B" />
          <Text style={styles.loadingText}>Fetching live gold & silver prices...</Text>
          <Text style={styles.loadingSubtext}>Bangladesh (BDT)</Text>
        </View>
      </View>
    );
  }

  // ─── Main Render ─────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zakat Calculator</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#D4A84B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4A84B" colors={['#D4A84B']} />
        }
      >
        {/* ═══ Bismillah Banner ═══ */}
        <View style={styles.bismillahCard}>
          <Text style={styles.bismillahArabic}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
          <Text style={styles.bismillahVerse}>
            "Take from their wealth a charity to purify and cleanse them"
          </Text>
          <Text style={styles.bismillahRef}>— Quran 9:103</Text>
        </View>

        {/* ═══ Live Price Card ═══ */}
        <View style={styles.priceCard}>
          <View style={styles.priceCardHeader}>
            <Ionicons name="pulse" size={18} color="#D4A84B" />
            <Text style={styles.priceCardTitle}>Live Metal Prices (BDT)</Text>
          </View>

          {prices?.isFallback && (
            <View style={styles.fallbackBanner}>
              <Ionicons name="information-circle" size={14} color="#FFB74D" />
              <Text style={styles.fallbackText}>Using estimated prices — live API unavailable</Text>
            </View>
          )}

          {error && (
            <View style={styles.fallbackBanner}>
              <Ionicons name="warning" size={14} color="#FFB74D" />
              <Text style={styles.fallbackText}>{error}</Text>
            </View>
          )}

          <View style={styles.priceRow}>
            <View style={styles.priceItem}>
              <Text style={styles.priceEmoji}>🥇</Text>
              <Text style={styles.priceLabel}>Gold (24K)</Text>
              <Text style={styles.priceValue}>{formatBDT(prices?.goldPerGram)}/g</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceItem}>
              <Text style={styles.priceEmoji}>🥈</Text>
              <Text style={styles.priceLabel}>Silver</Text>
              <Text style={styles.priceValue}>{formatBDT(prices?.silverPerGram)}/g</Text>
            </View>
          </View>

          <View style={styles.sourceRow}>
            <Text style={styles.sourceText}>Source: {prices?.source || 'N/A'}</Text>
            <Text style={styles.sourceText}>{prices?.lastUpdated || ''}</Text>
          </View>
        </View>

        {/* ═══ Nisab Thresholds ═══ */}
        {nisabData && (
          <View style={styles.nisabCard}>
            <View style={styles.nisabHeader}>
              <Ionicons name="shield-checkmark" size={18} color="#D4A84B" />
              <Text style={styles.nisabTitle}>Nisab Threshold (Hanafi)</Text>
            </View>

            <View style={styles.nisabRow}>
              <View style={[styles.nisabItem, nisabData.nisabType === 'gold' && styles.nisabItemActive]}>
                <Text style={styles.nisabItemLabel}>Gold Nisab</Text>
                <Text style={styles.nisabItemSub}>{nisabData.goldGrams}g (7.5 tola)</Text>
                <Text style={styles.nisabItemValue}>{formatBDT(nisabData.goldNisab)}</Text>
              </View>
              <View style={[styles.nisabItem, nisabData.nisabType === 'silver' && styles.nisabItemActive]}>
                <Text style={styles.nisabItemLabel}>Silver Nisab</Text>
                <Text style={styles.nisabItemSub}>{nisabData.silverGrams}g (52.5 tola)</Text>
                <Text style={styles.nisabItemValue}>{formatBDT(nisabData.silverNisab)}</Text>
              </View>
            </View>

            <View style={styles.nisabActiveRow}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.nisabActiveText}>
                Using {nisabData.nisabType} nisab: <Text style={styles.nisabActiveValue}>{formatBDT(nisabData.nisab)}</Text>
              </Text>
            </View>
            <Text style={styles.nisabNote}>
              Per Hanafi fiqh, the lower (silver) nisab is used to benefit the poor.
            </Text>
          </View>
        )}

        {/* ═══ Wealth Input Section ═══ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calculator" size={18} color="#D4A84B" />
            <Text style={styles.sectionTitle}>Your Zakatable Wealth</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Enter all assets held for one lunar year
          </Text>

          <WealthInput label="Cash & Bank Savings" icon="💰" value={cashSavings} onChangeText={setCashSavings} />
          <WealthInput label="Gold Value" icon="🥇" value={goldValue} onChangeText={setGoldValue} placeholder="Market value of gold" />
          <WealthInput label="Silver Value" icon="🥈" value={silverValue} onChangeText={setSilverValue} placeholder="Market value of silver" />
          <WealthInput label="Investments & Shares" icon="📈" value={investments} onChangeText={setInvestments} />
          <WealthInput label="Business Assets & Stock" icon="🏪" value={businessAssets} onChangeText={setBusinessAssets} />
          <WealthInput label="Other Assets" icon="📦" value={otherAssets} onChangeText={setOtherAssets} placeholder="Property rent, crypto, etc." />

          <View style={styles.debtDivider}>
            <View style={styles.debtLine} />
            <Text style={styles.debtDividerText}>Minus Debts</Text>
            <View style={styles.debtLine} />
          </View>

          <WealthInput label="Outstanding Debts" icon="📋" value={debts} onChangeText={setDebts} placeholder="Loans, liabilities" />

          {/* Calculate Button */}
          <TouchableOpacity style={styles.calculateBtn} onPress={handleCalculate} activeOpacity={0.85}>
            <Ionicons name="calculator" size={20} color="#121212" />
            <Text style={styles.calculateBtnText}>Calculate Zakat</Text>
          </TouchableOpacity>

          {showResult && (
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Ionicons name="refresh-circle-outline" size={18} color="#808080" />
              <Text style={styles.resetBtnText}>Reset All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══ Result Card ═══ */}
        {showResult && zakatResult && (
          <Animated.View
            style={[
              styles.resultCard,
              zakatResult.eligible ? styles.resultCardEligible : styles.resultCardNotEligible,
              {
                opacity: resultAnim,
                transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              },
            ]}
          >
            {/* Status */}
            <View style={styles.resultStatusRow}>
              <Text style={styles.resultStatusEmoji}>
                {zakatResult.eligible ? '✅' : '❌'}
              </Text>
              <Text style={[styles.resultStatusText, { color: zakatResult.eligible ? '#4CAF50' : '#CF6679' }]}>
                {zakatResult.eligible
                  ? 'Zakat is Due — Alhamdulillah'
                  : 'Zakat Not Applicable'}
              </Text>
            </View>

            {/* Breakdown */}
            <View style={styles.resultBreakdown}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Total Assets</Text>
                <Text style={styles.resultValue}>{formatBDT(zakatResult.totalAssets)}</Text>
              </View>
              {zakatResult.totalDebts > 0 && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Debts</Text>
                  <Text style={[styles.resultValue, { color: '#CF6679' }]}>
                    −{formatBDT(zakatResult.totalDebts)}
                  </Text>
                </View>
              )}
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Net Wealth</Text>
                <Text style={[styles.resultValue, { fontWeight: '700' }]}>{formatBDT(zakatResult.netWealth)}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Nisab Threshold</Text>
                <Text style={styles.resultValue}>{formatBDT(zakatResult.nisab)}</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={[styles.resultLabel, { fontWeight: '700', fontSize: 15 }]}>
                  Zakat Due ({zakatResult.ratePercent})
                </Text>
                <Text style={styles.resultZakatAmount}>{formatBDT(zakatResult.zakatDue)}</Text>
              </View>
            </View>

            {!zakatResult.eligible && (
              <Text style={styles.resultNote}>
                Your net wealth ({formatBDT(zakatResult.netWealth)}) is below the nisab threshold ({formatBDT(zakatResult.nisab)}). Zakat is not obligatory.
              </Text>
            )}
            {zakatResult.eligible && (
              <Text style={styles.resultNote}>
                May Allah accept your Zakat. Scroll below to donate to verified Bangladeshi foundations.
              </Text>
            )}
          </Animated.View>
        )}

        {/* ═══ Foundation Section ═══ */}
        <View style={styles.foundationSection}>
          <View style={styles.foundationHeader}>
            <Text style={styles.foundationHeaderEmoji}>🕌</Text>
            <View>
              <Text style={styles.foundationTitle}>Donate Your Zakat</Text>
              <Text style={styles.foundationSubtitle}>Verified Bangladeshi foundations & platforms</Text>
            </View>
          </View>

          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            <TouchableOpacity
              style={[styles.categoryChip, activeCategory === 'all' && styles.categoryChipActive]}
              onPress={() => setActiveCategory('all')}
            >
              <Text style={[styles.categoryChipText, activeCategory === 'all' && styles.categoryChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {Object.entries(FOUNDATION_CATEGORIES).map(([key, cat]) => (
              <TouchableOpacity
                key={key}
                style={[styles.categoryChip, activeCategory === key && styles.categoryChipActive]}
                onPress={() => setActiveCategory(key)}
              >
                <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryChipText, activeCategory === key && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Foundation Cards */}
          {getFilteredFoundations().map((foundation) => (
            <TouchableOpacity
              key={foundation.id}
              style={[
                styles.foundationCard,
                foundation.featured && styles.foundationCardFeatured,
              ]}
              activeOpacity={0.85}
              onPress={() => Linking.openURL(foundation.url)}
            >
              <View style={styles.foundationCardTop}>
                <View style={[styles.foundationIcon, { backgroundColor: foundation.color + '22' }]}>
                  <Text style={styles.foundationIconText}>{foundation.icon}</Text>
                </View>
                <View style={styles.foundationInfo}>
                  <Text style={styles.foundationName}>{foundation.name}</Text>
                  {foundation.namebn && (
                    <Text style={styles.foundationNameBn}>{foundation.namebn}</Text>
                  )}
                </View>
                {foundation.featured && (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>QUICK PAY</Text>
                  </View>
                )}
              </View>

              <Text style={styles.foundationDesc}>{foundation.description}</Text>

              <View style={styles.foundationFooter}>
                <View style={[styles.foundationCatBadge, { backgroundColor: foundation.color + '33' }]}>
                  <Text style={[styles.foundationCatText, { color: foundation.color }]}>
                    {FOUNDATION_CATEGORIES[foundation.category]?.label}
                  </Text>
                </View>
                <View style={styles.foundationLink}>
                  <Text style={styles.foundationLinkText}>Visit</Text>
                  <Ionicons name="open-outline" size={14} color="#D4A84B" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══ Footer ═══ */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 This calculator follows the Hanafi school of jurisprudence. Consult a scholar for complex cases.
          </Text>
          <Text style={styles.footerTextSmall}>
            Metal prices sourced from public APIs. Foundation links are for reference only.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ══════════════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  /* ── Header ─────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 6 },
  refreshBtn: { padding: 6 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* ── Bismillah ──────────────── */
  bismillahCard: {
    backgroundColor: '#1A1A12',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4A84B33',
  },
  bismillahArabic: {
    fontSize: 26,
    color: '#E8C87A',
    fontWeight: '500',
    marginBottom: 10,
    textAlign: 'center',
  },
  bismillahVerse: {
    fontSize: 13,
    color: '#B3B3B3',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 4,
  },
  bismillahRef: {
    fontSize: 11,
    color: '#808080',
  },

  /* ── Price Card ─────────────── */
  priceCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  priceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  priceCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fallbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2A2A1A',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  fallbackText: {
    fontSize: 11,
    color: '#FFB74D',
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 10,
  },
  priceItem: {
    alignItems: 'center',
    flex: 1,
  },
  priceEmoji: { fontSize: 28, marginBottom: 4 },
  priceLabel: { fontSize: 12, color: '#B3B3B3', marginBottom: 2 },
  priceValue: { fontSize: 17, fontWeight: '800', color: '#D4A84B' },
  priceDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#333333',
    marginHorizontal: 10,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
    paddingTop: 8,
  },
  sourceText: { fontSize: 10, color: '#666666' },

  /* ── Nisab Card ─────────────── */
  nisabCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  nisabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  nisabTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  nisabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  nisabItem: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  nisabItemActive: {
    borderColor: '#D4A84B',
    backgroundColor: '#2A2A1A',
  },
  nisabItemLabel: { fontSize: 12, fontWeight: '600', color: '#B3B3B3', marginBottom: 2 },
  nisabItemSub: { fontSize: 10, color: '#808080', marginBottom: 6 },
  nisabItemValue: { fontSize: 16, fontWeight: '800', color: '#D4A84B' },
  nisabActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  nisabActiveText: { fontSize: 12, color: '#B3B3B3' },
  nisabActiveValue: { fontWeight: '700', color: '#D4A84B' },
  nisabNote: { fontSize: 10, color: '#666666', fontStyle: 'italic', lineHeight: 16 },

  /* ── Section Card (wealth input) ── */
  sectionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  sectionSubtitle: { fontSize: 11, color: '#808080', marginBottom: 14 },

  /* ── Input fields ───────────── */
  inputGroup: { marginBottom: 12 },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inputIcon: { fontSize: 14 },
  inputLabelText: { fontSize: 12, fontWeight: '600', color: '#B3B3B3' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 12,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D4A84B',
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  /* ── Debt divider ───────────── */
  debtDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 10,
  },
  debtLine: { flex: 1, height: 1, backgroundColor: '#333333' },
  debtDividerText: { fontSize: 11, color: '#CF6679', fontWeight: '600' },

  /* ── Buttons ────────────────── */
  calculateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D4A84B',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  calculateBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#121212',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 6,
  },
  resetBtnText: { fontSize: 13, color: '#808080', fontWeight: '600' },

  /* ── Result Card ────────────── */
  resultCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  resultCardEligible: {
    backgroundColor: '#1A2A1A',
    borderColor: '#4CAF50',
  },
  resultCardNotEligible: {
    backgroundColor: '#2A1A1A',
    borderColor: '#CF6679',
  },
  resultStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  resultStatusEmoji: { fontSize: 28 },
  resultStatusText: { fontSize: 18, fontWeight: '800' },
  resultBreakdown: { marginBottom: 12 },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  resultLabel: { fontSize: 13, color: '#B3B3B3' },
  resultValue: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  resultDivider: {
    height: 1,
    backgroundColor: '#444444',
    marginVertical: 6,
  },
  resultZakatAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#D4A84B',
  },
  resultNote: {
    fontSize: 12,
    color: '#808080',
    lineHeight: 18,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  /* ── Foundation Section ─────── */
  foundationSection: {
    marginBottom: 20,
  },
  foundationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  foundationHeaderEmoji: { fontSize: 32 },
  foundationTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  foundationSubtitle: { fontSize: 12, color: '#808080' },

  /* ── Category chips ─────────── */
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingRight: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
  },
  categoryChipActive: {
    backgroundColor: '#D4A84B',
    borderColor: '#D4A84B',
  },
  categoryChipIcon: { fontSize: 13 },
  categoryChipText: { fontSize: 12, fontWeight: '600', color: '#B3B3B3' },
  categoryChipTextActive: { color: '#121212' },

  /* ── Foundation Card ────────── */
  foundationCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  foundationCardFeatured: {
    borderColor: '#D4A84B55',
    backgroundColor: '#1A1A12',
  },
  foundationCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  foundationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  foundationIconText: { fontSize: 22 },
  foundationInfo: { flex: 1 },
  foundationName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  foundationNameBn: { fontSize: 13, color: '#E8C87A', marginTop: 1 },
  featuredBadge: {
    backgroundColor: '#D4A84B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredBadgeText: { fontSize: 9, fontWeight: '800', color: '#121212' },
  foundationDesc: {
    fontSize: 12,
    color: '#B3B3B3',
    lineHeight: 18,
    marginBottom: 8,
  },
  foundationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foundationCatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  foundationCatText: { fontSize: 10, fontWeight: '700' },
  foundationLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  foundationLinkText: { fontSize: 12, fontWeight: '600', color: '#D4A84B' },

  /* ── Footer ─────────────────── */
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 11,
    color: '#808080',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  footerTextSmall: {
    fontSize: 10,
    color: '#555555',
    textAlign: 'center',
  },

  /* ── Loading ────────────────── */
  loadingText: {
    fontSize: 15,
    color: '#B3B3B3',
    marginTop: 14,
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#808080',
    marginTop: 4,
  },
});
