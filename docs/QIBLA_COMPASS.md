# Qibla Compass — Feature Documentation

## Overview

The Qibla Compass helps users find the direction of the **Kaaba in Mecca** (قبلة) from their current location. It uses the device's **magnetometer** and **GPS** to calculate and display the real-time Qibla direction on a rotating digital compass.

---

## Files

| File | Role |
|---|---|
| `mobile-app/src/screens/QiblaCompassScreen.js` | Main screen — all UI, sensor logic, and calculation |
| `mobile-app/src/navigation/AppNavigator.js` | Registers `QiblaCompass` screen in `HomeStack` |
| `mobile-app/src/screens/HomeScreen.js` | Entry card that navigates to `QiblaCompass` |

---

## Dependencies

| Package | Purpose |
|---|---|
| `expo-location` | GPS coordinates + location permissions |
| `expo-sensors` (`Magnetometer`) | Raw magnetic field data for compass heading |
| `react-native-svg` | SVG-based compass rose rendering |

Install: `npx expo install expo-sensors expo-location`

---

## Architecture

```
GPS Location
    │
    ▼
calcQiblaBearing(lat, lng)
    │  Great Circle Formula
    ▼
qiblaBearing (0–360°, from North CW)
    │
    │           Magnetometer (60fps)
    │               │
    │           toHeading({x,y})
    │               │  atan2(-y, -x) → compass bearing
    │               ▼
    │           smoothHeading (low-pass α=0.2)
    │               │
    └───────────────┤
                    ▼
            dialValRef += shortestDelta
                    │
                    ▼
            Animated.timing (80ms)
                    │
                    ▼
            Dial rotates (-heading)
            Qibla marker fixed at qiblaBearing on dial
```

---

## Math

### Qibla Bearing (Great Circle Formula)

```
Δλ = lng_kaaba - lng_user
y  = sin(Δλ) · cos(φ_kaaba)
x  = cos(φ_user)·sin(φ_kaaba) − sin(φ_user)·cos(φ_kaaba)·cos(Δλ)
bearing = atan2(y, x)  →  normalized 0–360°
```

**Kaaba coordinates:** `21.4225°N, 39.8262°E`

### Compass Heading (from Magnetometer)

```
heading = (90 − atan2(−y, −x) × 180/π + 360) % 360
```

The negation `atan2(-y, -x)` accounts for the device's magnetometer axis convention so that heading 0° = front of phone facing North.

### Distance to Mecca (Haversine)

```
a = sin²(Δlat/2) + cos(φ1)·cos(φ2)·sin²(Δlng/2)
d = 2R · atan2(√a, √(1−a))   where R = 6371 km
```

---

## Sensor Pipeline

| Step | Value | Description |
|---|---|---|
| Raw | `{x, y, z}` µT | Magnetometer data at 16ms intervals (60fps) |
| Convert | `heading` 0–360° | Phone's front-facing compass direction |
| Smooth | low-pass filter α=0.2 | Removes jitter while staying responsive |
| Accumulate | `dialValRef` (unbounded) | Prevents wrap-around snap at 0°/360° |
| Animate | `Animated.timing` 80ms | Crisp rotation via `Easing.out(Easing.sin)` |

---

## Compass UI Design

```
         ▼  ← Fixed red indicator (phone facing direction)
        ┌─────────────────┐
        │    N  E  S  W   │  ← Rotating compass dial
        │  🕋 at qiblaBearing │  ← Qibla marker baked into SVG
        └─────────────────┘
```

- **Dial rotates** by `−heading` → North on dial always points to magnetic North
- **Qibla marker (🕋)** is drawn at `qiblaBearing` degrees on the SVG
- **When 🕋 aligns with the red ▼ triangle** → phone is facing Qibla
- **Alignment detection:** `|heading − qiblaBearing| < 5°` → green banner shown

### SVG Label Positions
Labels are shifted 180° from conventional positions to compensate for the `atan2(-y,-x)` heading offset:

| Label | SVG Position |
|---|---|
| N | 180° |
| E | 270° |
| S | 0° |
| W | 90° |

---

## States

| State | Description |
|---|---|
| `requesting` | Asking for location permission |
| `locating` | GPS fix in progress |
| `ready` | Compass running normally |
| `error` | Permission denied or GPS unavailable |

---

## Permissions Required

- **Location** (`expo-location` — foreground) — for GPS coordinates
- No explicit sensor permission needed (magnetometer is unrestricted on iOS/Android)

---

## Known Limitations

- The magnetometer requires a **physical device** — does not work on simulators/emulators.
- Accuracy depends on device calibration. Metal surfaces, electronics, or phone cases can cause drift. Wave the phone in a figure-8 pattern to re-calibrate.
- Hold the phone **flat and level** for best accuracy. Tilting introduces z-axis errors in the bearing.
