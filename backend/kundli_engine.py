"""
Kundli Generation Engine + Graha Scoring Engine + Mantra Recommendation
Uses Swiss Ephemeris for accurate planetary calculations.
"""
import swisseph as swe
from datetime import datetime, timezone
from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder
import pytz
import math
import logging

logger = logging.getLogger(__name__)

swe.set_ephe_path(None)

# ===================== CONSTANTS =====================

GRAHAS = {
    swe.SUN: "Sun", swe.MOON: "Moon", swe.MARS: "Mars",
    swe.MERCURY: "Mercury", swe.JUPITER: "Jupiter", swe.VENUS: "Venus",
    swe.SATURN: "Saturn",
}
RAHU_KETU = True  # We calculate Rahu/Ketu separately (mean node)

RASHIS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]
RASHIS_HI = [
    "मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"
]

NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]
NAKSHATRAS_HI = [
    "अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा",
    "पुनर्वसु", "पुष्य", "आश्लेषा", "मघा", "पूर्वा फाल्गुनी", "उत्तरा फाल्गुनी",
    "हस्त", "चित्रा", "स्वाती", "विशाखा", "अनुराधा", "ज्येष्ठा",
    "मूल", "पूर्वाषाढ़ा", "उत्तराषाढ़ा", "श्रवण", "धनिष्ठा", "शतभिषा",
    "पूर्वा भाद्रपद", "उत्तरा भाद्रपद", "रेवती"
]

GRAHA_NAMES_HI = {
    "Sun": "सूर्य", "Moon": "चन्द्र", "Mars": "मंगल", "Mercury": "बुध",
    "Jupiter": "गुरु", "Venus": "शुक्र", "Saturn": "शनि", "Rahu": "राहु", "Ketu": "केतु"
}

# Exaltation signs (rashi index 0-based)
EXALTATION = {"Sun": 0, "Moon": 1, "Mars": 9, "Mercury": 5, "Jupiter": 3, "Venus": 11, "Saturn": 6, "Rahu": 1, "Ketu": 7}
DEBILITATION = {"Sun": 6, "Moon": 7, "Mars": 3, "Mercury": 11, "Jupiter": 9, "Venus": 5, "Saturn": 0, "Rahu": 7, "Ketu": 1}
OWN_SIGN = {
    "Sun": [4], "Moon": [3], "Mars": [0, 7], "Mercury": [2, 5],
    "Jupiter": [8, 11], "Venus": [1, 6], "Saturn": [9, 10], "Rahu": [10], "Ketu": [7]
}
FRIENDLY_SIGN = {
    "Sun": [0, 3, 8, 7], "Moon": [1, 2, 4, 5], "Mars": [3, 4, 8],
    "Mercury": [1, 4, 6], "Jupiter": [0, 3, 4, 7], "Venus": [2, 5, 9, 10],
    "Saturn": [1, 2, 6], "Rahu": [2, 5, 8, 11], "Ketu": [2, 5, 8, 11]
}

# Graha → Devta → Mantra mapping
GRAHA_MANTRA_MAP = {
    "Sun": {
        "devta": "Surya Dev", "devta_hi": "सूर्य देव",
        "mantra": "ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः",
        "mantra_en": "Om Hraam Hreem Hraum Sah Suryaya Namah",
        "count": 108, "day": "Sunday", "day_hi": "रविवार",
        "color": "Red", "color_hi": "लाल",
        "remedy_hi": "रविवार को सूर्योदय के समय जल अर्पित करें। गुड़ और गेहूं का दान करें।",
        "remedy_en": "Offer water to Sun at sunrise on Sunday. Donate jaggery and wheat.",
    },
    "Moon": {
        "devta": "Chandra Dev", "devta_hi": "चन्द्र देव",
        "mantra": "ॐ श्रां श्रीं श्रौं सः चन्द्राय नमः",
        "mantra_en": "Om Shraam Shreem Shraum Sah Chandraya Namah",
        "count": 108, "day": "Monday", "day_hi": "सोमवार",
        "color": "White", "color_hi": "सफ़ेद",
        "remedy_hi": "सोमवार को शिव जी को जल चढ़ाएं। चावल और दूध का दान करें।",
        "remedy_en": "Offer water to Lord Shiva on Monday. Donate rice and milk.",
    },
    "Mars": {
        "devta": "Hanuman Ji", "devta_hi": "हनुमान जी",
        "mantra": "ॐ क्रां क्रीं क्रौं सः भौमाय नमः",
        "mantra_en": "Om Kraam Kreem Kraum Sah Bhaumaya Namah",
        "count": 108, "day": "Tuesday", "day_hi": "मंगलवार",
        "color": "Red", "color_hi": "लाल",
        "remedy_hi": "मंगलवार को हनुमान चालीसा पढ़ें। मसूर दाल और गुड़ का दान करें।",
        "remedy_en": "Recite Hanuman Chalisa on Tuesday. Donate masoor dal and jaggery.",
    },
    "Mercury": {
        "devta": "Vishnu Bhagwan", "devta_hi": "विष्णु भगवान",
        "mantra": "ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः",
        "mantra_en": "Om Braam Breem Braum Sah Budhaya Namah",
        "count": 108, "day": "Wednesday", "day_hi": "बुधवार",
        "color": "Green", "color_hi": "हरा",
        "remedy_hi": "बुधवार को विष्णु सहस्रनाम पढ़ें। मूंग दाल और हरी सब्जी का दान करें।",
        "remedy_en": "Recite Vishnu Sahasranama on Wednesday. Donate moong dal and green vegetables.",
    },
    "Jupiter": {
        "devta": "Brihaspati Dev", "devta_hi": "बृहस्पति देव",
        "mantra": "ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः",
        "mantra_en": "Om Graam Greem Graum Sah Gurave Namah",
        "count": 108, "day": "Thursday", "day_hi": "गुरुवार",
        "color": "Yellow", "color_hi": "पीला",
        "remedy_hi": "गुरुवार को बृहस्पति स्तोत्र पढ़ें। चने की दाल और हल्दी का दान करें।",
        "remedy_en": "Recite Brihaspati Stotra on Thursday. Donate chana dal and turmeric.",
    },
    "Venus": {
        "devta": "Maa Lakshmi", "devta_hi": "माँ लक्ष्मी",
        "mantra": "ॐ द्रां द्रीं द्रौं सः शुक्राय नमः",
        "mantra_en": "Om Draam Dreem Draum Sah Shukraya Namah",
        "count": 108, "day": "Friday", "day_hi": "शुक्रवार",
        "color": "White", "color_hi": "सफ़ेद",
        "remedy_hi": "शुक्रवार को लक्ष्मी जी की पूजा करें। सफ़ेद वस्तुओं का दान करें।",
        "remedy_en": "Worship Goddess Lakshmi on Friday. Donate white items.",
    },
    "Saturn": {
        "devta": "Shani Dev", "devta_hi": "शनि देव",
        "mantra": "ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः",
        "mantra_en": "Om Praam Preem Praum Sah Shanaischaraya Namah",
        "count": 108, "day": "Saturday", "day_hi": "शनिवार",
        "color": "Black/Blue", "color_hi": "काला/नीला",
        "remedy_hi": "शनिवार को शनि देव को तेल अर्पित करें। काले उड़द और तिल का दान करें।",
        "remedy_en": "Offer oil to Shani Dev on Saturday. Donate black urad and sesame.",
    },
    "Rahu": {
        "devta": "Durga Maa", "devta_hi": "दुर्गा माँ",
        "mantra": "ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः",
        "mantra_en": "Om Bhraam Bhreem Bhraum Sah Rahave Namah",
        "count": 108, "day": "Saturday", "day_hi": "शनिवार",
        "color": "Blue", "color_hi": "नीला",
        "remedy_hi": "शनिवार को दुर्गा सप्तशती पढ़ें। नारियल और काले वस्त्र का दान करें।",
        "remedy_en": "Recite Durga Saptashati on Saturday. Donate coconut and black cloth.",
    },
    "Ketu": {
        "devta": "Ganesha Ji", "devta_hi": "गणेश जी",
        "mantra": "ॐ स्रां स्रीं स्रौं सः केतवे नमः",
        "mantra_en": "Om Sraam Sreem Sraum Sah Ketave Namah",
        "count": 108, "day": "Tuesday", "day_hi": "मंगलवार",
        "color": "Grey", "color_hi": "धूसर",
        "remedy_hi": "मंगलवार को गणेश जी की पूजा करें। सप्तधान्य का दान करें।",
        "remedy_en": "Worship Lord Ganesha on Tuesday. Donate seven types of grains.",
    },
}


# ===================== GEOCODING =====================

geolocator = Nominatim(user_agent="sanatan_saathi", timeout=10)
tf = TimezoneFinder()

def geocode_location(place_name: str):
    """Convert place name to lat/lon/timezone."""
    try:
        location = geolocator.geocode(place_name)
        if not location:
            return None
        lat, lon = location.latitude, location.longitude
        tz_name = tf.timezone_at(lat=lat, lng=lon)
        return {"latitude": lat, "longitude": lon, "timezone": tz_name or "Asia/Kolkata", "display_name": location.address}
    except Exception as e:
        logger.error(f"Geocode error: {e}")
        return None


# ===================== KUNDLI GENERATION =====================

def get_nakshatra(longitude):
    """Get Nakshatra from longitude (0-360)."""
    nak_span = 360.0 / 27.0  # 13.333... degrees per nakshatra
    idx = int(longitude / nak_span)
    return NAKSHATRAS[idx], NAKSHATRAS_HI[idx], idx + 1

def get_rashi(longitude):
    """Get Rashi (zodiac sign) from longitude."""
    idx = int(longitude / 30.0)
    return RASHIS[idx], RASHIS_HI[idx], idx

def generate_kundli(name, gender, dob, tob, place_name):
    """
    Generate Kundli using Swiss Ephemeris.
    dob: "YYYY-MM-DD"
    tob: "HH:MM" (24-hour format)
    """
    # Geocode location
    geo = geocode_location(place_name)
    if not geo:
        raise ValueError(f"Could not find location: {place_name}")

    lat = geo["latitude"]
    lon = geo["longitude"]
    tz_name = geo["timezone"]

    # Parse date/time
    year, month, day = map(int, dob.split("-"))
    hour, minute = map(int, tob.split(":"))

    # Convert to UTC
    local_tz = pytz.timezone(tz_name)
    local_dt = local_tz.localize(datetime(year, month, day, hour, minute))
    utc_dt = local_dt.astimezone(pytz.utc)

    ut_hour = utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
    jd = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, ut_hour)

    # Calculate Ascendant (Lagna) and House cusps
    houses, ascmc = swe.houses(jd, lat, lon, b'P')  # Placidus
    asc_longitude = ascmc[0]
    asc_rashi, asc_rashi_hi, asc_rashi_idx = get_rashi(asc_longitude)
    asc_nakshatra, asc_nakshatra_hi, _ = get_nakshatra(asc_longitude)

    # Calculate planets
    planets = []
    planet_objects = [
        (swe.SUN, "Sun"), (swe.MOON, "Moon"), (swe.MARS, "Mars"),
        (swe.MERCURY, "Mercury"), (swe.JUPITER, "Jupiter"),
        (swe.VENUS, "Venus"), (swe.SATURN, "Saturn"),
    ]

    for planet_id, name_en in planet_objects:
        result = swe.calc_ut(jd, planet_id)
        lon_deg = result[0][0]
        speed = result[0][3]
        rashi, rashi_hi, rashi_idx = get_rashi(lon_deg)
        nakshatra, nakshatra_hi, nak_num = get_nakshatra(lon_deg)
        degree_in_sign = lon_deg % 30.0

        # Determine house (based on ascendant)
        house = int(((lon_deg - asc_longitude + 360) % 360) / 30.0) + 1

        # Check retrograde
        is_retrograde = speed < 0

        # Check combust (proximity to Sun)
        sun_lon = swe.calc_ut(jd, swe.SUN)[0][0]
        angular_dist = abs(lon_deg - sun_lon)
        if angular_dist > 180:
            angular_dist = 360 - angular_dist
        # Combustion thresholds
        combust_thresholds = {"Moon": 12, "Mars": 17, "Mercury": 14, "Jupiter": 11, "Venus": 10, "Saturn": 15}
        is_combust = False
        if name_en in combust_thresholds and angular_dist < combust_thresholds[name_en]:
            is_combust = True

        planets.append({
            "graha": name_en,
            "graha_hi": GRAHA_NAMES_HI[name_en],
            "rashi": rashi,
            "rashi_hi": rashi_hi,
            "rashi_idx": rashi_idx,
            "degree": round(lon_deg, 4),
            "degree_in_sign": round(degree_in_sign, 4),
            "house": house,
            "nakshatra": nakshatra,
            "nakshatra_hi": nakshatra_hi,
            "nakshatra_num": nak_num,
            "is_retrograde": is_retrograde,
            "is_combust": is_combust,
            "speed": round(speed, 4),
        })

    # Calculate Rahu and Ketu (Mean Node)
    rahu_result = swe.calc_ut(jd, swe.MEAN_NODE)
    rahu_lon = rahu_result[0][0]
    ketu_lon = (rahu_lon + 180.0) % 360.0

    for graha_name, graha_lon in [("Rahu", rahu_lon), ("Ketu", ketu_lon)]:
        rashi, rashi_hi, rashi_idx = get_rashi(graha_lon)
        nakshatra, nakshatra_hi, nak_num = get_nakshatra(graha_lon)
        degree_in_sign = graha_lon % 30.0
        house = int(((graha_lon - asc_longitude + 360) % 360) / 30.0) + 1

        planets.append({
            "graha": graha_name,
            "graha_hi": GRAHA_NAMES_HI[graha_name],
            "rashi": rashi,
            "rashi_hi": rashi_hi,
            "rashi_idx": rashi_idx,
            "degree": round(graha_lon, 4),
            "degree_in_sign": round(degree_in_sign, 4),
            "house": house,
            "nakshatra": nakshatra,
            "nakshatra_hi": nakshatra_hi,
            "nakshatra_num": nak_num,
            "is_retrograde": True,  # Rahu/Ketu always retrograde
            "is_combust": False,
            "speed": 0,
        })

    return {
        "name": name if isinstance(name, str) else name,
        "gender": gender,
        "dob": dob,
        "tob": tob,
        "birth_place": place_name,
        "location": geo,
        "ascendant": {
            "rashi": asc_rashi,
            "rashi_hi": asc_rashi_hi,
            "degree": round(asc_longitude, 4),
            "nakshatra": asc_nakshatra,
            "nakshatra_hi": asc_nakshatra_hi,
        },
        "planets": planets,
        "julian_day": jd,
    }


# ===================== GRAHA SCORING ENGINE =====================

def calculate_graha_scores(planets):
    """
    Score each Graha 0-100 based on:
    A. Base Strength
    B. Affliction
    C. House Impact
    D. Transit (simplified)
    E. Dasha (simplified)
    """
    scores = []

    # Build lookup for quick access
    planet_map = {p["graha"]: p for p in planets}

    for p in planets:
        graha = p["graha"]
        rashi_idx = p["rashi_idx"]
        house = p["house"]
        raw_score = 0
        reasons = []

        # A. Base Strength
        if graha in EXALTATION and rashi_idx == EXALTATION[graha]:
            raw_score -= 10
            reasons.append(f"{GRAHA_NAMES_HI.get(graha, graha)} उच्च राशि में है (Exalted)")
        elif graha in DEBILITATION and rashi_idx == DEBILITATION[graha]:
            raw_score += 10
            reasons.append(f"{GRAHA_NAMES_HI.get(graha, graha)} नीच राशि में है (Debilitated)")
        elif graha in OWN_SIGN and rashi_idx in OWN_SIGN[graha]:
            raw_score -= 5
            reasons.append(f"स्वगृही (Own Sign)")
        elif graha in FRIENDLY_SIGN and rashi_idx in FRIENDLY_SIGN[graha]:
            raw_score += 0
        else:
            raw_score += 5
            reasons.append(f"शत्रु/अन्य राशि में स्थित (Enemy/Neutral sign)")

        # B. Affliction
        saturn = planet_map.get("Saturn")
        rahu = planet_map.get("Rahu")
        ketu = planet_map.get("Ketu")

        if graha not in ("Saturn", "Rahu", "Ketu"):
            # Conjunction with malefics (same house)
            if saturn and saturn["house"] == house:
                raw_score += 6
                reasons.append("शनि के साथ युति (Conjunction with Saturn)")
            if rahu and rahu["house"] == house:
                raw_score += 6
                reasons.append("राहु के साथ युति (Conjunction with Rahu)")
            if ketu and ketu["house"] == house:
                raw_score += 6
                reasons.append("केतु के साथ युति (Conjunction with Ketu)")

            # Aspect from Saturn (Saturn aspects 3rd, 7th, 10th from itself)
            if saturn:
                saturn_house = saturn["house"]
                saturn_aspects = [(saturn_house + 2) % 12 + 1, (saturn_house + 6) % 12 + 1, (saturn_house + 9) % 12 + 1]
                if house in saturn_aspects:
                    raw_score += 5
                    reasons.append("शनि की दृष्टि (Aspect from Saturn)")

            # Aspect from Rahu/Ketu (7th aspect)
            if rahu:
                rahu_aspect = (rahu["house"] + 6) % 12 + 1
                if house == rahu_aspect:
                    raw_score += 5
                    reasons.append("राहु/केतु की दृष्टि (Aspect from Rahu/Ketu)")

        if p["is_combust"]:
            raw_score += 4
            reasons.append("अस्त (Combust)")

        if p["is_retrograde"] and graha not in ("Rahu", "Ketu"):
            raw_score += 3
            reasons.append("वक्री (Retrograde)")

        # C. House Impact
        if house in (6, 8, 12):
            raw_score += 8
            reasons.append(f"{house}वें भाव में (Dusthana house {house})")
        elif house in (3, 11):
            raw_score += 3
        elif house in (1, 4, 7, 10):
            raw_score -= 2
            reasons.append(f"केंद्र भाव {house} (Kendra house)")
        elif house in (5, 9):
            raw_score -= 5
            reasons.append(f"त्रिकोण भाव {house} (Trikona house)")

        # Normalize: Clamp(raw + 20, 0, 100)
        normalized = max(0, min(100, raw_score + 20))

        # Determine priority
        if normalized > 60:
            priority = "HIGH"
        elif normalized >= 40:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        # Get mantra recommendation
        mantra_info = GRAHA_MANTRA_MAP.get(graha, {})

        scores.append({
            "graha": graha,
            "graha_hi": GRAHA_NAMES_HI.get(graha, graha),
            "score": normalized,
            "raw_score": raw_score,
            "priority": priority,
            "reasons": reasons if reasons else [f"{GRAHA_NAMES_HI.get(graha, graha)} सामान्य स्थिति में (Normal)"],
            "recommendation": {
                "devta": mantra_info.get("devta", ""),
                "devta_hi": mantra_info.get("devta_hi", ""),
                "mantra": mantra_info.get("mantra", ""),
                "mantra_en": mantra_info.get("mantra_en", ""),
                "count": mantra_info.get("count", 108),
                "day": mantra_info.get("day", ""),
                "day_hi": mantra_info.get("day_hi", ""),
                "color": mantra_info.get("color", ""),
                "color_hi": mantra_info.get("color_hi", ""),
                "remedy_hi": mantra_info.get("remedy_hi", ""),
                "remedy_en": mantra_info.get("remedy_en", ""),
            },
            "planet_data": {
                "rashi": p["rashi"],
                "rashi_hi": p["rashi_hi"],
                "house": p["house"],
                "degree": p["degree_in_sign"],
                "nakshatra": p["nakshatra"],
                "nakshatra_hi": p["nakshatra_hi"],
                "is_retrograde": p["is_retrograde"],
                "is_combust": p["is_combust"],
            }
        })

    # Sort by score descending (highest affliction first)
    scores.sort(key=lambda x: x["score"], reverse=True)
    return scores


def get_top_recommendations(scores, max_count=2):
    """Get top 1-2 afflicted Grahas for mantra recommendation."""
    high_priority = [s for s in scores if s["priority"] == "HIGH"]
    if len(high_priority) >= max_count:
        return high_priority[:max_count]
    medium = [s for s in scores if s["priority"] == "MEDIUM"]
    return (high_priority + medium)[:max_count]
