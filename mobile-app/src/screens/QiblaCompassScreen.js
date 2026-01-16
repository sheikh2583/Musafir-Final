import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
  TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle, Line, Text as SvgText, Defs, RadialGradient, Stop,
  Polygon, G,
} from 'react-native-svg';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = Math.min(width * 0.86, 320);
const C = COMPASS_SIZE / 2;

const KAABA_LAT = 21.4225;
const KAABA_LNG  = 39.8262;

// ─── Math helpers ─────────────────────────────────────────────────────────────

function calcQiblaBearing(lat, lng) {
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (KAABA_LAT * Math.PI) / 180;
  const Δλ = ((KAABA_LNG - lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function toHeading({ x, y }) {
  // Negate x,y to flip 180° so heading = direction phone's FRONT is facing
  return (90 - (Math.atan2(-y, -x) * 180) / Math.PI + 360) % 360;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shortestDelta(from, to) {
  let d = to - from;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function angularDiff(a, b) {
  return Math.abs(((a - b + 540) % 360) - 180);
}

function toCardinal(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

// ─── Compass SVG (rotates as a whole unit) ────────────────────────────────────
// qiblaBearing is the absolute bearing; it's baked into the SVG drawing.
// When the dial rotates by -heading, the Qibla marker moves to the top = facing Qibla.

const TICK_COUNT = 72;

function RotatingCompassFace({ qiblaBearing }) {
  const outerR = C - 2;
  const innerR = C - 20;
  const labelR = C - 40;

  return (
    <Svg width={COMPASS_SIZE} height={COMPASS_SIZE}>
      <Defs>
        <RadialGradient id="bg" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#242424" />
          <Stop offset="100%" stopColor="#0c0c0c" />
        </RadialGradient>
      </Defs>

      {/* Background */}
      <Circle cx={C} cy={C} r={outerR} fill="url(#bg)" />
      {/* Outer gold ring */}
      <Circle cx={C} cy={C} r={outerR} stroke="#D4A84B" strokeWidth={2} fill="none" />
      {/* Inner ring */}
      <Circle cx={C} cy={C} r={innerR} stroke="#2e2e2e" strokeWidth={1} fill="none" />

      {/* Tick marks */}
      {Array.from({ length: TICK_COUNT }, (_, i) => {
        const deg = (i * 360) / TICK_COUNT;
        const rad = (deg * Math.PI) / 180;
        const isCard = i % 18 === 0;       // every 90°
        const isMed  = i % 3 === 0;        // every 15°
        const len = isCard ? 16 : isMed ? 8 : 4;
        const r1 = C - 2;
        return (
          <Line
            key={i}
            x1={C + r1 * Math.sin(rad)}       y1={C - r1 * Math.cos(rad)}
            x2={C + (r1 - len) * Math.sin(rad)} y2={C - (r1 - len) * Math.cos(rad)}
            stroke={isCard ? '#D4A84B' : isMed ? '#555' : '#2e2e2e'}
            strokeWidth={isCard ? 2.5 : 1}
          />
        );
      })}

      {/* Cardinal labels: N E S W */}
      {[
        { label: 'N', deg: 0,   color: '#FF4040', size: 18 },
        { label: 'E', deg: 90,  color: '#D4A84B', size: 14 },
        { label: 'S', deg: 180, color: '#ccc',    size: 14 },
        { label: 'W', deg: 270, color: '#ccc',    size: 14 },
      ].map(({ label, deg, color, size }) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <SvgText key={label}
            x={C + labelR * Math.sin(rad)} y={C - labelR * Math.cos(rad) + 5}
            textAnchor="middle" fill={color} fontSize={size} fontWeight="bold">
            {label}
          </SvgText>
        );
      })}

      {/* Ordinal degree numbers */}
      {[30,60,120,150,210,240,300,330].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <SvgText key={deg}
            x={C + labelR * Math.sin(rad)} y={C - labelR * Math.cos(rad) + 5}
            textAnchor="middle" fill="#444" fontSize={9}>
            {deg}
          </SvgText>
        );
      })}

      {/* ── QIBLA MARKER ─────────────────────────────────────────────────────
          Placed at qiblaBearing degrees from North.
          When the dial rotates by -heading, this marker will reach the top
          exactly when heading == qiblaBearing (phone faces Qibla).
      ─────────────────────────────────────────────────────────────────────── */}
      {qiblaBearing !== null && (() => {
        const qiblaRad = (qiblaBearing * Math.PI) / 180;
        const markerR = C - 24;
        const mx = C + markerR * Math.sin(qiblaRad);
        const my = C - markerR * Math.cos(qiblaRad);

        // Gold triangle pointing toward the edge, at the bearing
        const tipR = C - 6;
        const tx = C + tipR * Math.sin(qiblaRad);
        const ty = C - tipR * Math.cos(qiblaRad);

        // Perpendicular offset for triangle base
        const perpX = Math.cos(qiblaRad) * 7;
        const perpY = Math.sin(qiblaRad) * 7;

        // Base of triangle slightly inward
        const baseR = C - 22;
        const bx = C + baseR * Math.sin(qiblaRad);
        const by = C - baseR * Math.cos(qiblaRad);

        return (
          <G key="qibla">
            {/* Gold triangle at the rim */}
            <Polygon
              points={`${tx},${ty} ${bx - perpX},${by + perpY} ${bx + perpX},${by - perpY}`}
              fill="#D4A84B"
            />
            {/* Kaaba emoji centered slightly inside */}
            <SvgText x={mx} y={my + 5} textAnchor="middle" fontSize={18}>🕋</SvgText>
          </G>
        );
      })()}

      {/* Center cap */}
      <Circle cx={C} cy={C} r={6} fill="#D4A84B" />
      <Circle cx={C} cy={C} r={3} fill="#121212" />
    </Svg>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function QiblaCompassScreen({ navigation }) {
  const [status, setStatus]           = useState('requesting');
  const [errorMsg, setErrorMsg]       = useState('');
  const [locationCoords, setCoords]   = useState(null);
  const [qiblaBearing, setQibla]      = useState(null);
  const [headingDisplay, setHeadingDisplay] = useState(0);
  const [distance, setDistance]       = useState(null);
  const [isAligned, setAligned]       = useState(false);

  const dialRotation  = useRef(new Animated.Value(0)).current;
  const alignScale    = useRef(new Animated.Value(1)).current;
  const fadeIn        = useRef(new Animated.Value(0)).current;

  const smoothH    = useRef(0);
  const dialValRef = useRef(0);
  const qiblaRef   = useRef(null);

  // Fade in on mount
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Pulse when aligned
  useEffect(() => {
    if (isAligned) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(alignScale, { toValue: 1.07, duration: 500, useNativeDriver: true }),
          Animated.timing(alignScale, { toValue: 1,    duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      alignScale.stopAnimation();
      alignScale.setValue(1);
    }
  }, [isAligned]);

  // Get location + compute Qibla bearing
  useEffect(() => {
    (async () => {
      const { status: s } = await Location.requestForegroundPermissionsAsync();
      if (s !== 'granted') {
        setStatus('error');
        setErrorMsg('Location permission required. Enable it in Settings.');
        return;
      }
      setStatus('locating');
      try {
        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = coords;
        setCoords({ latitude, longitude });
        const bearing = calcQiblaBearing(latitude, longitude);
        qiblaRef.current = bearing;
        setQibla(bearing);
        setDistance(Math.round(haversineKm(latitude, longitude, KAABA_LAT, KAABA_LNG)));
        setStatus('ready');
      } catch {
        setStatus('error');
        setErrorMsg('Unable to get your location. Ensure GPS is on and try again.');
      }
    })();
  }, []);

  // Magnetometer at 60fps — rotates the DIAL opposite to heading (real compass behaviour)
  useEffect(() => {
    if (status !== 'ready') return;

    Magnetometer.setUpdateInterval(16);

    const sub = Magnetometer.addListener((raw) => {
      const rawH = toHeading(raw);
      // Low-pass smooth (alpha=0.2 for smoothness)
      const delta = shortestDelta(smoothH.current, rawH);
      smoothH.current = (smoothH.current + delta * 0.2 + 360) % 360;
      const h = smoothH.current;

      setHeadingDisplay(Math.round(h));

      // Real compass: dial rotates by -heading so North on dial always points to true North
      const target = -h;
      const dAngle = shortestDelta(dialValRef.current % 360, target);
      dialValRef.current += dAngle;

      Animated.timing(dialRotation, {
        toValue: dialValRef.current,
        duration: 80,
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      }).start();

      if (qiblaRef.current !== null) {
        setAligned(angularDiff(h, qiblaRef.current) < 5);
      }
    });

    return () => sub.remove();
  }, [status]);

  const retry = useCallback(() => {
    setStatus('locating');
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(({ coords }) => {
        const { latitude, longitude } = coords;
        setCoords({ latitude, longitude });
        const b = calcQiblaBearing(latitude, longitude);
        qiblaRef.current = b;
        setQibla(b);
        setDistance(Math.round(haversineKm(latitude, longitude, KAABA_LAT, KAABA_LNG)));
        setStatus('ready');
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('Still unable to locate you. Check GPS.');
      });
  }, []);

  const dialDeg = dialRotation.interpolate({
    inputRange: [-36000, 36000],
    outputRange: ['-36000deg', '36000deg'],
  });

  // ── Render: loading / error ──────────────────────────────────────────────

  if (status === 'requesting' || status === 'locating') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D4A84B" />
        <Text style={styles.loadingTxt}>
          {status === 'requesting' ? 'Requesting permissions…' : 'Finding your location…'}
        </Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Ionicons name="location-outline" size={56} color="#F44336" />
        <Text style={styles.errTitle}>Location Unavailable</Text>
        <Text style={styles.errBody}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={retry}>
          <Text style={styles.retryTxt}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 14 }}>
          <Text style={{ color: '#666', fontSize: 13 }}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const offset = qiblaBearing !== null ? Math.round(angularDiff(headingDisplay, qiblaBearing)) : null;

  // ── Render: compass ──────────────────────────────────────────────────────

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#D4A84B" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.title}>Qibla Compass</Text>
            <Text style={styles.titleAr}>اتجاه القبلة</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Alignment banner */}
        <Animated.View style={[
          styles.banner,
          isAligned ? styles.bannerGreen : styles.bannerGold,
          { transform: [{ scale: alignScale }] },
        ]}>
          <Text style={[styles.bannerTxt, { color: isAligned ? '#4CAF50' : '#D4A84B' }]}>
            {isAligned
              ? '✅  Facing Qibla — الله أكبر'
              : `Rotate ${offset}° to face Qibla 🕋`}
          </Text>
        </Animated.View>

        {/* ── Compass area ─────────────────────────────────────────────────── */}
        <View style={styles.compassArea}>

          {/*  Fixed phone-direction indicator at the top of the compass
              This red triangle points DOWN toward the center.
              It represents "the direction your phone is currently facing".
              Align the 🕋 marker with this indicator to face Qibla.          */}
          <View style={styles.indicator} />

          {/* Rotating compass dial (the whole rose including 🕋 marker rotates) */}
          <Animated.View style={[
            { width: COMPASS_SIZE, height: COMPASS_SIZE },
            { transform: [{ rotate: dialDeg }] },
          ]}>
            <RotatingCompassFace qiblaBearing={qiblaBearing} />
          </Animated.View>

        </View>

        {/* Instruction */}
        <Text style={styles.instruction}>
          Rotate your phone until 🕋 aligns with the ▼ triangle above
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{headingDisplay}°</Text>
            <Text style={styles.statSub}>{toCardinal(headingDisplay)}</Text>
            <Text style={styles.statLbl}>Heading</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: '#D4A84B' }]}>
              {qiblaBearing != null ? Math.round(qiblaBearing) : '--'}°
            </Text>
            <Text style={[styles.statSub, { color: '#D4A84B' }]}>
              {qiblaBearing != null ? toCardinal(qiblaBearing) : '--'}
            </Text>
            <Text style={styles.statLbl}>Qibla</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>
              {distance != null
                ? distance >= 1000 ? `${(distance / 1000).toFixed(1)}k` : distance
                : '--'}
            </Text>
            <Text style={styles.statSub}>km</Text>
            <Text style={styles.statLbl}>to Mecca</Text>
          </View>
        </View>

        {locationCoords && (
          <Text style={styles.coords}>
            📍 {locationCoords.latitude.toFixed(4)}°, {locationCoords.longitude.toFixed(4)}°
          </Text>
        )}

      </SafeAreaView>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0d0d0d' },
  safe:       { flex: 1, alignItems: 'center' },
  center:     { flex: 1, backgroundColor: '#0d0d0d', justifyContent: 'center', alignItems: 'center', padding: 30 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontSize: 18, fontWeight: '700', color: '#fff' },
  titleAr:  { fontSize: 12, color: '#D4A84B', marginTop: 1 },

  banner: {
    borderRadius: 24, paddingHorizontal: 18, paddingVertical: 7,
    marginBottom: 10, borderWidth: 1,
  },
  bannerGreen: { backgroundColor: 'rgba(76,175,80,0.1)',    borderColor: '#4CAF50' },
  bannerGold:  { backgroundColor: 'rgba(212,168,75,0.07)', borderColor: '#393939' },
  bannerTxt:   { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // Compass
  compassArea: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },

  // Fixed red triangle at top — represents phone's facing direction
  indicator: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF4040',
    zIndex: 10,
  },

  instruction: {
    color: '#666', fontSize: 11.5, textAlign: 'center',
    marginBottom: 14, paddingHorizontal: 30,
  },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a1a', borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 10,
    width: '90%', borderWidth: 1, borderColor: '#2a2a2a',
  },
  stat:    { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] },
  statSub: { fontSize: 12, color: '#888', fontWeight: '600', marginTop: 1 },
  statLbl: { fontSize: 10, color: '#555', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { width: 1, height: 42, backgroundColor: '#2a2a2a' },

  coords:     { color: '#444', fontSize: 11, marginTop: 12, fontVariant: ['tabular-nums'] },
  loadingTxt: { color: '#999', marginTop: 14, fontSize: 14 },
  errTitle:   { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 14 },
  errBody:    { color: '#999', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retryBtn:   { backgroundColor: '#D4A84B', paddingHorizontal: 28, paddingVertical: 11, borderRadius: 10, marginTop: 22 },
  retryTxt:   { color: '#0d0d0d', fontSize: 15, fontWeight: '700' },
});
