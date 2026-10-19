/**
 * Astronomy helpers for the Vietnamese lunisolar calendar.
 *
 * Written from the published formulas in Jean Meeus, "Astronomical Algorithms" (2nd ed.):
 * ch. 7 (calendar ↔ Julian Day), ch. 25 (solar position) and ch. 49 (new-moon phases), plus the
 * Espenak & Meeus polynomial fits for ΔT. Lunations are numbered from the new moon of
 * 1900 January (k = 0).
 *
 * Conventions:
 * - A "JDN" is an integer Julian Day Number naming a whole civil day.
 * - A "Julian date" is a real number; JDN n starts at Julian date n - 0.5 (midnight UT).
 * - Time zones are hours east of Greenwich (Vietnam = 7).
 */

const DEG = Math.PI / 180;
const TWO_PI = 2 * Math.PI;

/** First JDN of the Gregorian calendar (1582-10-15). Earlier days use the Julian calendar. */
const GREGORIAN_START_JDN = 2299161;

/** Mean length of a synodic month in days. */
export const SYNODIC_MONTH = 29.530588853;

/** sin() of an angle given in degrees. */
const sinDeg = (degrees: number): number => Math.sin(degrees * DEG);

/** Wrap an angle in radians into [0, 2π). */
function wrapRadians(angle: number): number {
  const r = angle % TWO_PI;
  return r < 0 ? r + TWO_PI : r;
}

/**
 * Julian Day Number of a civil date. Dates from 1582-10-15 onwards are read as Gregorian,
 * earlier dates as proleptic Julian (Meeus, Astronomical Algorithms, ch. 7).
 */
export function jdFromDate(dd: number, mm: number, yy: number): number {
  // Treat January and February as months 13 and 14 of the previous year so that the
  // leap day falls at the end of the counting year.
  const shiftedYear = mm <= 2 ? yy - 1 : yy;
  const shiftedMonth = mm <= 2 ? mm + 12 : mm;
  const isGregorian = yy * 10000 + mm * 100 + dd >= 15821015;
  let gregorianFix = 0;
  if (isGregorian) {
    const century = Math.floor(shiftedYear / 100);
    gregorianFix = 2 - century + Math.floor(century / 4);
  }
  // Meeus gives JD at 0h as ... - 1524.5; the civil day number is that plus 0.5.
  return (
    Math.floor(365.25 * (shiftedYear + 4716)) +
    Math.floor(30.6001 * (shiftedMonth + 1)) +
    dd +
    gregorianFix -
    1524
  );
}

/** Civil date of a Julian Day Number (inverse of {@link jdFromDate}). */
export function jdToDate(jd: number): { day: number; month: number; year: number } {
  let base = jd;
  if (jd >= GREGORIAN_START_JDN) {
    const centuries = Math.floor((jd - 1867216.25) / 36524.25);
    base = jd + 1 + centuries - Math.floor(centuries / 4);
  }
  const shifted = base + 1524;
  const yearCount = Math.floor((shifted - 122.1) / 365.25);
  const daysBeforeYear = Math.floor(365.25 * yearCount);
  const monthCount = Math.floor((shifted - daysBeforeYear) / 30.6001);
  const day = shifted - daysBeforeYear - Math.floor(30.6001 * monthCount);
  const month = monthCount < 14 ? monthCount - 1 : monthCount - 13;
  const year = month > 2 ? yearCount - 4716 : yearCount - 4715;
  return { day, month, year };
}

/**
 * ΔT = TT − UT in seconds for a decimal year, using the Espenak & Meeus piecewise
 * polynomials (valid well beyond the calendar's supported 1800-2199 range).
 */
function deltaTSeconds(year: number): number {
  if (year < 1800) {
    // Long-term parabola (Morrison & Stephenson) for anything earlier.
    const u = (year - 1820) / 100;
    return -20 + 32 * u * u;
  }
  if (year < 1860) {
    const t = year - 1800;
    return (
      13.72 -
      0.332447 * t +
      0.0068612 * t ** 2 +
      0.0041116 * t ** 3 -
      0.00037436 * t ** 4 +
      0.0000121272 * t ** 5 -
      0.0000001699 * t ** 6 +
      0.000000000875 * t ** 7
    );
  }
  if (year < 1900) {
    const t = year - 1860;
    return (
      7.62 +
      0.5737 * t -
      0.251754 * t ** 2 +
      0.01680668 * t ** 3 -
      0.0004473624 * t ** 4 +
      t ** 5 / 233174
    );
  }
  if (year < 1920) {
    const t = year - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  }
  if (year < 1941) {
    const t = year - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3;
  }
  if (year < 1961) {
    const t = year - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  }
  if (year < 1986) {
    const t = year - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  }
  if (year < 2005) {
    const t = year - 2000;
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t ** 2 +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    );
  }
  if (year < 2050) {
    const t = year - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  }
  const u = (year - 1820) / 100;
  const parabola = -20 + 32 * u * u;
  return year < 2150 ? parabola - 0.5628 * (2150 - year) : parabola;
}

/**
 * Lunation index of the 2000 January 6 new moon (Meeus's k = 0) in this module's
 * 1900-based numbering.
 */
const LUNATIONS_1900_TO_2000 = 1237;

/**
 * Periodic terms for the new-moon phase (Meeus, Astronomical Algorithms, 2nd ed., ch. 49).
 * Each row: coefficient in days, power of the eccentricity factor E, and the multiples of
 * [Sun's mean anomaly M, Moon's mean anomaly M′, Moon's argument of latitude F, node Ω].
 */
const NEW_MOON_TERMS: ReadonlyArray<
  readonly [coefficient: number, ePower: number, m: number, mPrime: number, f: number, node: number]
> = [
  [-0.4072, 0, 0, 1, 0, 0],
  [0.17241, 1, 1, 0, 0, 0],
  [0.01608, 0, 0, 2, 0, 0],
  [0.01039, 0, 0, 0, 2, 0],
  [0.00739, 1, -1, 1, 0, 0],
  [-0.00514, 1, 1, 1, 0, 0],
  [0.00208, 2, 2, 0, 0, 0],
  [-0.00111, 0, 0, 1, -2, 0],
  [-0.00057, 0, 0, 1, 2, 0],
  [0.00056, 1, 1, 2, 0, 0],
  [-0.00042, 0, 0, 3, 0, 0],
  [0.00042, 1, 1, 0, 2, 0],
  [0.00038, 1, 1, 0, -2, 0],
  [-0.00024, 1, -1, 2, 0, 0],
  [-0.00017, 0, 0, 0, 0, 1],
  [-0.00007, 0, 2, 1, 0, 0],
  [0.00004, 0, 0, 2, -2, 0],
  [0.00004, 0, 3, 0, 0, 0],
  [0.00003, 0, 1, 1, -2, 0],
  [0.00003, 0, 0, 2, 2, 0],
  [-0.00003, 0, 1, 1, 2, 0],
  [0.00003, 0, -1, 1, 2, 0],
  [-0.00002, 0, -1, 1, -2, 0],
  [-0.00002, 0, 1, 3, 0, 0],
  [0.00002, 0, 0, 4, 0, 0],
];

/**
 * Additional corrections for all phases from planetary perturbations (ch. 49, A1..A14).
 * Each row: coefficient in days, then the argument's constant and per-lunation rate in degrees.
 * The first argument also has a −0.009173 T² term, added separately.
 */
const PLANETARY_TERMS: ReadonlyArray<readonly [coefficient: number, base: number, rate: number]> = [
  [0.000325, 299.77, 0.107408],
  [0.000165, 251.88, 0.016321],
  [0.000164, 251.83, 26.651886],
  [0.000126, 349.42, 36.412478],
  [0.00011, 84.66, 18.206239],
  [0.000062, 141.74, 53.303771],
  [0.00006, 207.14, 2.453732],
  [0.000056, 154.84, 7.30686],
  [0.000047, 34.52, 27.261239],
  [0.000042, 207.19, 0.121824],
  [0.00004, 291.34, 1.844379],
  [0.000037, 161.72, 24.198154],
  [0.000035, 239.56, 25.513099],
  [0.000023, 331.55, 3.592518],
];

/**
 * Julian date (UT, with fraction) of the k-th new moon after the one of 1900 January
 * (k = 0 is the new moon of 1900-01-01; negative k go backwards).
 *
 * Full new-moon method of Meeus, "Astronomical Algorithms" (2nd ed.), ch. 49: mean phase,
 * periodic terms with the eccentricity factor, and planetary corrections. The result is in
 * terrestrial time, converted to UT with ΔT.
 */
export function newMoon(k: number): number {
  const lunation = k - LUNATIONS_1900_TO_2000; // Meeus's k, 0 = 2000 January 6
  const t = lunation / 1236.85; // Julian centuries since J2000.0 (approximately)
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;

  const meanPhase =
    2451550.09766 +
    29.530588861 * lunation +
    0.00015437 * t2 -
    0.00000015 * t3 +
    0.00000000073 * t4;

  // Eccentricity of Earth's orbit, scaling terms that involve the Sun's anomaly.
  const eccentricity = 1 - 0.002516 * t - 0.0000074 * t2;

  // Fundamental arguments, in degrees.
  const sunAnomaly = 2.5534 + 29.1053567 * lunation - 0.0000014 * t2 - 0.00000011 * t3;
  const moonAnomaly =
    201.5643 + 385.81693528 * lunation + 0.0107582 * t2 + 0.00001238 * t3 - 0.000000058 * t4;
  const latitudeArg =
    160.7108 + 390.67050284 * lunation - 0.0016118 * t2 - 0.00000227 * t3 + 0.000000011 * t4;
  const node = 124.7746 - 1.56375588 * lunation + 0.0020672 * t2 + 0.00000215 * t3;

  let correction = 0;
  for (const [coefficient, ePower, m, mPrime, f, n] of NEW_MOON_TERMS) {
    const argument = m * sunAnomaly + mPrime * moonAnomaly + f * latitudeArg + n * node;
    correction += coefficient * eccentricity ** ePower * sinDeg(argument);
  }
  PLANETARY_TERMS.forEach(([coefficient, base, rate], index) => {
    const quadratic = index === 0 ? -0.009173 * t2 : 0;
    correction += coefficient * sinDeg(base + rate * lunation + quadratic);
  });

  const terrestrialJd = meanPhase + correction;
  const decimalYear = 2000 + (terrestrialJd - 2451545) / 365.25;
  return terrestrialJd - deltaTSeconds(decimalYear) / 86400;
}

/**
 * Apparent geocentric ecliptic longitude of the Sun, in radians within [0, 2π), at the
 * given Julian date (Meeus, Astronomical Algorithms, ch. 25, low-accuracy method).
 */
export function sunLongitude(jdn: number): number {
  const t = (jdn - 2451545.0) / 36525; // Julian centuries since J2000.0
  const meanLongitude = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const meanAnomaly = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
  const centreEquation =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * sinDeg(meanAnomaly) +
    (0.019993 - 0.000101 * t) * sinDeg(2 * meanAnomaly) +
    0.000289 * sinDeg(3 * meanAnomaly);
  // Correct the true longitude for nutation and aberration.
  const ascendingNode = 125.04 - 1934.136 * t;
  const apparent = meanLongitude + centreEquation - 0.00569 - 0.00478 * sinDeg(ascendingNode);
  return wrapRadians(apparent * DEG);
}

/** Julian date (UT) of local midnight at the start of civil day `jdn` in UTC+timeZone. */
function localMidnight(jdn: number, timeZone: number): number {
  return jdn - 0.5 - timeZone / 24;
}

/** Which of `parts` equal arcs of the ecliptic (starting at 0°) holds the Sun at that day's start. */
function sunSector(jdn: number, timeZone: number, parts: number): number {
  const fraction = sunLongitude(localMidnight(jdn, timeZone)) / TWO_PI;
  return Math.min(parts - 1, Math.floor(fraction * parts));
}

/**
 * 30° sector (0..11) of the Sun's longitude at local midnight starting day `jdn`.
 * Sector 0 starts at the March equinox; a change of sector marks a major solar term.
 */
export function getSunLongitudeIndex(jdn: number, timeZone: number): number {
  return sunSector(jdn, timeZone, 12);
}

/**
 * 15° sector (0..23) of the Sun's longitude at local midnight starting day `jdn`:
 * the current one of the 24 solar terms (tiết khí), 0 = Xuân phân (0°-15°).
 */
export function getSolarTermIndex(jdn: number, timeZone: number): number {
  return sunSector(jdn, timeZone, 24);
}

/**
 * Pinned UTC+7 new-moon days for historical new moons that fall within about 30 s of local
 * midnight, where the Meeus series (accurate to roughly ±10 s) cannot decide the day on its own.
 * Keyed by lunation index k; the value is the local JDN of the day the new moon falls on.
 *
 * Times come from JPL Horizons (geocentric apparent ecliptic longitudes of Moon and Sun),
 * which is US-government work in the public domain.
 *
 * Only past dates are listed. For new moons decades ahead, a time within a minute of midnight
 * depends on the future value of ΔT (TT − UT), which cannot be known in advance, so the local
 * day of such new moons is not certain and is left to the model.
 */
const VN_NEW_MOON_DAY_OVERRIDES: ReadonlyMap<number, number> = new Map([
  // JPL Horizons: 1967-07-07T17:00:04Z = 1967-07-08 00:00:04 UTC+7 (Meeus model: ~6 s earlier,
  // before midnight). North Vietnam's 1967 calendar, then on UTC+8, also starts month 6 on 8 July.
  [835, jdFromDate(8, 7, 1967)],
]);

/** Local (UTC+timeZone) JDN of the civil day on which new moon `k` occurs. */
export function getNewMoonDay(k: number, timeZone: number): number {
  if (timeZone === 7) {
    const pinned = VN_NEW_MOON_DAY_OVERRIDES.get(k);
    if (pinned !== undefined) return pinned;
  }
  return Math.floor(newMoon(k) + 0.5 + timeZone / 24);
}
