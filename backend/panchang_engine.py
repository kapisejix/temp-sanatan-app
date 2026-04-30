"""
Panchang Engine v2 — comprehensive astronomical calculations.

Uses Swiss Ephemeris (pyswisseph) + Lahiri Ayanamsa.

Returns, for a given date + location:
  - Tithi / Nakshatra / Yoga / Karana with precise start & end times
  - Sunrise / Sunset / Solar Noon
  - Rahu Kaal / Gulika Kaal / Yamagandam (1/8th-portion system per weekday)
  - Abhijit Muhurta (8th of 15 muhurtas of day — the "unconquerable hour")
  - Amrit Kalam (nakshatra-based auspicious window)
  - Bhadra flag (Vishti karana active)
  - Panchak flag (Moon in Dhanishta-2 through Revati)
  - Month name (Purnimanta [N] or Amanta [S] system)

All returned strings are Hindi-first for mobile rendering.
"""
import logging
from datetime import datetime, timedelta, date as date_type
from typing import Optional

import pytz
import swisseph as swe

logger = logging.getLogger(__name__)

# Use Lahiri Ayanamsa for sidereal calculations
swe.set_sid_mode(swe.SIDM_LAHIRI)

# ---------- Constants ----------

TITHI_NAMES_HI = [
    "प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पञ्चमी", "षष्ठी",
    "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी",
    "त्रयोदशी", "चतुर्दशी", "पूर्णिमा/अमावस्या",
]
NAKSHATRA_HI = [
    "अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा",
    "पुनर्वसु","पुष्य","आश्लेषा","मघा","पूर्वा फाल्गुनी","उत्तरा फाल्गुनी",
    "हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा",
    "मूल","पूर्वाषाढ़ा","उत्तराषाढ़ा","श्रवण","धनिष्ठा","शतभिषा",
    "पूर्वा भाद्रपद","उत्तरा भाद्रपद","रेवती",
]
NAKSHATRA_LORDS = [
    "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury",
    "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury",
    "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury",
]
YOGA_HI = [
    "विष्कुम्भ","प्रीति","आयुष्मान्","सौभाग्य","शोभन","अतिगण्ड",
    "सुकर्मा","धृति","शूल","गण्ड","वृद्धि","ध्रुव",
    "व्याघात","हर्षण","वज्र","सिद्धि","व्यतीपात","वरीयान",
    "परिघ","शिव","सिद्ध","साध्य","शुभ","शुक्ल","ब्रह्म","ऐन्द्र","वैधृति",
]
KARANA_NAMES = [
    # 60 karanas in a lunation = first-half tithi karanas (1..57) + 3 fixed end karanas
    # Cycle = Bava, Balava, Kaulava, Taitila, Gara, Vanija, Vishti × 8 repeats
    "किंस्तुघ्न",  # karana_idx 0 (first half of Shukla Pratipada)
    "बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि",
    "बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि",
    "बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि",
    "बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि",
    "बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि",
    "बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि",
    "बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि",
    "बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि",
    "शकुनि","चतुष्पाद","नाग",  # 57, 58, 59
]
# Karana that == Bhadra / Vishti
BHADRA_KARANAS = {"विष्टि"}

WEEKDAY_HI = ["सोमवार","मंगलवार","बुधवार","गुरुवार","शुक्रवार","शनिवार","रविवार"]
WEEKDAY_EN = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]

# Weekday (Python Monday=0) → portion-of-day (1..8)
RAHU_KAAL_PORTION    = {0:2, 1:7, 2:5, 3:6, 4:4, 5:3, 6:8}
GULIKA_KAAL_PORTION  = {0:6, 1:5, 2:4, 3:3, 4:2, 5:1, 6:7}
YAMAGANDAM_PORTION   = {0:4, 1:3, 2:2, 3:1, 4:7, 5:6, 6:5}

# Panchak nakshatras (23..26 = Dhanishta, Shatabhisha, Poorva Bhadrapada, Uttara Bhadrapada, Revati)
# Technically Panchak starts from Dhanishta 2nd half (longitude 296°40'+) through Revati end (360°)
PANCHAK_NAKS = {22, 23, 24, 25, 26}

# North Indian (Purnimanta) month names — begins after Full Moon
MONTHS_PURNIMANTA_HI = [
    "चैत्र","वैशाख","ज्येष्ठ","आषाढ़","श्रावण","भाद्रपद",
    "आश्विन","कार्तिक","मार्गशीर्ष","पौष","माघ","फाल्गुन",
]
# Amanta shifts the month name by 1 during Krishna paksha (waning fortnight):
# Purnimanta "Vaishakh Krishna" == Amanta "Chaitra Krishna" etc.

# Tithi angular span (12°) and Nakshatra angular span (13°20')
TITHI_SPAN = 12.0
NAK_SPAN = 360.0 / 27.0  # 13.3333
YOGA_SPAN = 360.0 / 27.0

# ---------- Low-level helpers ----------

def _jd_from_dt(dt_utc: datetime) -> float:
    return swe.julday(dt_utc.year, dt_utc.month, dt_utc.day,
                      dt_utc.hour + dt_utc.minute / 60.0 + dt_utc.second / 3600.0)

def _sun_moon_lons(jd: float):
    sun = swe.calc_ut(jd, swe.SUN)[0][0]
    moon = swe.calc_ut(jd, swe.MOON)[0][0]
    return sun % 360, moon % 360

def _format_hhmm(dt_local: datetime) -> str:
    return dt_local.strftime("%H:%M")

def _format_hhmm_date(dt_local: datetime, today: date_type) -> str:
    """Format as HH:MM, or HH:MM (next day) if crosses midnight."""
    if dt_local.date() != today:
        delta = (dt_local.date() - today).days
        if delta == 1:   return dt_local.strftime("%H:%M") + " (अगला दिन)"
        if delta == -1:  return dt_local.strftime("%H:%M") + " (पिछला दिन)"
    return dt_local.strftime("%H:%M")


# ---------- Boundary solver ----------

def _find_boundary(start_jd: float, end_jd: float, target_fn, tolerance_min: float = 0.5):
    """Bisect JD range to find the time when target_fn crosses zero.

    target_fn(jd) returns a value that changes sign across the boundary.
    Returns jd where |target_fn| < tolerance or iterations exhausted.
    """
    a, b = start_jd, end_jd
    fa = target_fn(a); fb = target_fn(b)
    if fa * fb > 0:
        return None  # no crossing in this range
    tolerance_jd = tolerance_min / (24.0 * 60.0)
    for _ in range(60):
        if (b - a) < tolerance_jd:
            break
        m = (a + b) / 2
        fm = target_fn(m)
        if fa * fm <= 0:
            b, fb = m, fm
        else:
            a, fa = m, fm
    return (a + b) / 2


def _tithi_end_jd(current_tithi_idx: int, start_jd: float, search_hours: int = 48):
    """Find JD when current tithi ends (diff crosses (idx+1)*12°)."""
    target = (current_tithi_idx + 1) * TITHI_SPAN
    def f(jd):
        s, m = _sun_moon_lons(jd)
        diff = (m - s) % 360
        # Wrap-aware distance to target
        d = diff - target
        # Normalise to [-180, 180]
        if d > 180:  d -= 360
        if d < -180: d += 360
        return d
    return _find_boundary(start_jd, start_jd + search_hours / 24.0, f)


def _nak_end_jd(current_nak_idx: int, start_jd: float, search_hours: int = 48):
    target = (current_nak_idx + 1) * NAK_SPAN
    def f(jd):
        s, m = _sun_moon_lons(jd)
        d = (m % 360) - (target % 360)
        if d > 180:  d -= 360
        if d < -180: d += 360
        return d
    return _find_boundary(start_jd, start_jd + search_hours / 24.0, f)


def _yoga_end_jd(current_yoga_idx: int, start_jd: float, search_hours: int = 48):
    target = (current_yoga_idx + 1) * YOGA_SPAN
    def f(jd):
        s, m = _sun_moon_lons(jd)
        val = (s + m) % 360
        d = val - (target % 360)
        if d > 180:  d -= 360
        if d < -180: d += 360
        return d
    return _find_boundary(start_jd, start_jd + search_hours / 24.0, f)


def _jd_to_local(jd: float, tz) -> datetime:
    yr, mo, da, frac = swe.revjul(jd)
    utc = datetime(int(yr), int(mo), int(da), tzinfo=pytz.utc) + timedelta(hours=float(frac))
    return utc.astimezone(tz)


# ---------- Sunrise / sunset ----------

def _compute_sunrise_sunset(date_local: date_type, lat: float, lon: float, tz):
    """Return (sunrise_local_dt, sunset_local_dt) or (None, None) on failure."""
    try:
        geopos = (lon, lat, 0.0)
        # Search from local midnight
        midnight_local = datetime(date_local.year, date_local.month, date_local.day, 0, 0, tzinfo=tz)
        midnight_utc = midnight_local.astimezone(pytz.utc)
        jd_start = _jd_from_dt(midnight_utc)
        rise_ret, rise_tret = swe.rise_trans(jd_start, swe.SUN,
                                             swe.CALC_RISE | swe.BIT_DISC_CENTER, geopos)
        set_ret, set_tret = swe.rise_trans(jd_start, swe.SUN,
                                           swe.CALC_SET | swe.BIT_DISC_CENTER, geopos)
        if rise_ret == 0 and set_ret == 0:
            sunrise = _jd_to_local(rise_tret[0], tz)
            sunset = _jd_to_local(set_tret[0], tz)
            return sunrise, sunset
    except Exception as e:
        logger.warning(f"Sunrise/sunset calc failed: {e}")
    return None, None


# ---------- Muhurtas / Kaals ----------

def _portion_window(sunrise: datetime, sunset: datetime, portion: int):
    """Compute start+end of the Nth one-eighth of daytime (portion 1..8)."""
    day_seconds = (sunset - sunrise).total_seconds()
    if day_seconds <= 0:
        return None, None
    seg = day_seconds / 8.0
    start = sunrise + timedelta(seconds=(portion - 1) * seg)
    end = start + timedelta(seconds=seg)
    return start, end


def _abhijit_muhurta(sunrise: datetime, sunset: datetime):
    """Abhijit = the 8th of 15 muhurtas of daylight, centred on solar noon.

    Daytime is split into 15 equal parts. The 8th part (index 7) is Abhijit.
    Not valid on Wednesdays (traditionally).
    """
    day_seconds = (sunset - sunrise).total_seconds()
    if day_seconds <= 0:
        return None, None
    muhurta_len = day_seconds / 15.0
    start = sunrise + timedelta(seconds=7 * muhurta_len)
    end = start + timedelta(seconds=muhurta_len)
    return start, end


def _amrit_kalam_for_nak(nak_idx: int, sunrise: datetime, sunset: datetime):
    """Amrit Kalam is a nakshatra-wise pre-computed window inside daytime.

    Pragmatic approximation: each nakshatra has a fixed "amrit" fractional
    window of daytime. Here we use a widely cited simplified table that
    gives a ~1h 36m (4 ghati) window. The actual exact table uses complex
    tithi×nakshatra combinations — we defer that to admin annotations.
    """
    # Ratio into daytime where Amrit Kalam starts (per nakshatra index 0..26)
    # Derived from traditional cheat-sheet; admin can override per-date.
    start_ratios = [
        0.58, 0.12, 0.70, 0.24, 0.82, 0.36,
        0.48, 0.00, 0.60, 0.14, 0.72, 0.26,
        0.84, 0.38, 0.50, 0.02, 0.62, 0.16,
        0.74, 0.28, 0.86, 0.40, 0.52, 0.04,
        0.64, 0.18, 0.76,
    ]
    day_seconds = (sunset - sunrise).total_seconds()
    if day_seconds <= 0:
        return None, None
    r = start_ratios[nak_idx % 27]
    start = sunrise + timedelta(seconds=r * day_seconds)
    end = start + timedelta(hours=1, minutes=36)
    return start, end


# ---------- Main entry point ----------

def compute_panchang(
    lat: float = 28.6139,
    lon: float = 77.2090,
    tz_name: str = "Asia/Kolkata",
    for_date: Optional[str] = None,   # YYYY-MM-DD
    system: str = "north",            # "north" (Purnimanta) or "south" (Amanta)
):
    tz = pytz.timezone(tz_name)
    if for_date:
        y, m, d = [int(x) for x in for_date.split("-")]
        target_date = date_type(y, m, d)
    else:
        target_date = datetime.now(tz).date()

    # Reference moment: local sunrise (fall back to noon)
    sunrise, sunset = _compute_sunrise_sunset(target_date, lat, lon, tz)
    if not sunrise or not sunset:
        # Fallback: local 06:00 / 18:30
        sunrise = tz.localize(datetime(target_date.year, target_date.month, target_date.day, 6, 0))
        sunset  = tz.localize(datetime(target_date.year, target_date.month, target_date.day, 18, 30))

    sunrise_utc = sunrise.astimezone(pytz.utc)
    jd_ref = _jd_from_dt(sunrise_utc)

    # Panchang elements at sunrise (tradition)
    sun_lon, moon_lon = _sun_moon_lons(jd_ref)
    diff = (moon_lon - sun_lon) % 360

    # Tithi
    tithi_idx_30 = int(diff / TITHI_SPAN)            # 0..29
    paksha_hi = "शुक्ल पक्ष" if tithi_idx_30 < 15 else "कृष्ण पक्ष"
    paksha_en = "Shukla" if tithi_idx_30 < 15 else "Krishna"
    tithi_num_hi = TITHI_NAMES_HI[tithi_idx_30 % 15]
    tithi_end_jd = _tithi_end_jd(tithi_idx_30, jd_ref)
    tithi_end_local = _jd_to_local(tithi_end_jd, tz) if tithi_end_jd else None

    # Nakshatra
    nak_idx = int(moon_lon / NAK_SPAN)
    nak_name = NAKSHATRA_HI[nak_idx]
    nak_lord = NAKSHATRA_LORDS[nak_idx]
    nak_end_jd = _nak_end_jd(nak_idx, jd_ref)
    nak_end_local = _jd_to_local(nak_end_jd, tz) if nak_end_jd else None

    # Yoga
    yoga_val = (sun_lon + moon_lon) % 360
    yoga_idx = int(yoga_val / YOGA_SPAN)
    yoga_name = YOGA_HI[yoga_idx]
    yoga_end_jd = _yoga_end_jd(yoga_idx, jd_ref)
    yoga_end_local = _jd_to_local(yoga_end_jd, tz) if yoga_end_jd else None

    # Karana (half-tithi)
    karana_idx = int(diff / 6) % 60
    karana_name = KARANA_NAMES[min(karana_idx, len(KARANA_NAMES) - 1)]
    bhadra_active = karana_name in BHADRA_KARANAS

    # Panchak flag
    panchak_active = nak_idx in PANCHAK_NAKS

    # Weekday (use local date)
    weekday_py = target_date.weekday()  # Mon=0
    weekday_hi = WEEKDAY_HI[weekday_py]
    weekday_en = WEEKDAY_EN[weekday_py]

    # Kaals & muhurtas
    rk_start, rk_end = _portion_window(sunrise, sunset, RAHU_KAAL_PORTION[weekday_py])
    gk_start, gk_end = _portion_window(sunrise, sunset, GULIKA_KAAL_PORTION[weekday_py])
    ym_start, ym_end = _portion_window(sunrise, sunset, YAMAGANDAM_PORTION[weekday_py])
    ab_start, ab_end = _abhijit_muhurta(sunrise, sunset)
    ak_start, ak_end = _amrit_kalam_for_nak(nak_idx, sunrise, sunset)

    # Month (Purnimanta vs Amanta)
    # Traditional rule: lunar month is named after the full-moon nakshatra, which
    # happens when Sun is in the sign opposite to that nakshatra's sign.
    # Practical approximation: month_idx = (sun_sidereal_sign + 1) % 12
    # e.g. Sun in Aries(0) → Vaishakh(1), Sun in Libra(6) → Kartik(7).
    sun_sidereal = (sun_lon - swe.get_ayanamsa_ut(jd_ref)) % 360
    solar_sign_idx = int(sun_sidereal / 30)  # 0..11
    solar_month_idx = (solar_sign_idx + 1) % 12
    # In Purnimanta, month changes after Purnima; in Amanta after Amavasya.
    # For Krishna paksha (tithi_idx_30 >= 15), Amanta's month name is "one-ahead" of Purnimanta.
    month_purnimanta = MONTHS_PURNIMANTA_HI[solar_month_idx]
    month_amanta = MONTHS_PURNIMANTA_HI[(solar_month_idx - 1) % 12] if tithi_idx_30 >= 15 else month_purnimanta
    month_name = month_purnimanta if system == "north" else month_amanta

    def fmt(dt): return _format_hhmm(dt) if dt else None
    def fmt_range(s, e): return f"{fmt(s)} – {fmt(e)}" if s and e else None

    return {
        "date": target_date.isoformat(),
        "date_str_hi": target_date.strftime("%d-%m-%Y"),
        "weekday_hi": weekday_hi,
        "weekday_en": weekday_en,
        "system": system,  # "north" / "south"
        "location": {"lat": lat, "lon": lon, "tz": tz_name},

        # Month + paksha
        "month_hi": month_name,
        "paksha_hi": paksha_hi,
        "paksha_en": paksha_en,
        "main_line_hi": f"{month_name} {paksha_hi} {tithi_num_hi} — {fmt(tithi_end_local) if tithi_end_local else ''} तक",

        # Sun
        "sunrise": fmt(sunrise),
        "sunset":  fmt(sunset),
        "solar_noon": fmt(sunrise + (sunset - sunrise) / 2),

        # Tithi
        "tithi_hi": f"{paksha_hi} {tithi_num_hi}",
        "tithi_name_hi": tithi_num_hi,
        "tithi_index": tithi_idx_30,
        "tithi_end": _format_hhmm_date(tithi_end_local, target_date) if tithi_end_local else None,

        # Nakshatra
        "nakshatra_hi": nak_name,
        "nakshatra_index": nak_idx,
        "nakshatra_lord": nak_lord,
        "nakshatra_end": _format_hhmm_date(nak_end_local, target_date) if nak_end_local else None,

        # Yoga
        "yoga_hi": yoga_name,
        "yoga_index": yoga_idx,
        "yoga_end": _format_hhmm_date(yoga_end_local, target_date) if yoga_end_local else None,

        # Karana
        "karana_hi": karana_name,
        "karana_index": karana_idx,

        # Kaals
        "rahu_kaal": fmt_range(rk_start, rk_end),
        "gulika_kaal": fmt_range(gk_start, gk_end),
        "yamagandam": fmt_range(ym_start, ym_end),

        # Auspicious windows
        "abhijit_muhurta": fmt_range(ab_start, ab_end) if weekday_py != 2 else None,  # not on Wednesday
        "amrit_kalam": fmt_range(ak_start, ak_end),

        # Flags
        "is_bhadra": bhadra_active,
        "is_panchak": panchak_active,
    }
