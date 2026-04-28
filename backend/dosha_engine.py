"""
Dosha Detection Engine — deterministic, rule-based.
Detects: Mangal Dosha, Kaal Sarp Dosha, Sade Sati, Shani Dhaiya.
"""
import swisseph as swe
from datetime import datetime, timezone


RASHIS_HI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
             "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"]


def _pidx(planets, name):
    """Find planet dict by name."""
    for p in planets:
        if p["graha"] == name:
            return p
    return None


# ===================== MANGAL DOSHA =====================

# Houses where Mars causes Mangal Dosha (counted from Lagna, Moon, Venus)
MANGAL_HOUSES = {1, 2, 4, 7, 8, 12}
HIGH_SEVERITY_HOUSES = {7, 8}
MEDIUM_SEVERITY_HOUSES = {1, 4, 12}
LOW_SEVERITY_HOUSES = {2}


def _house_from(reference_rashi_idx: int, planet_rashi_idx: int) -> int:
    """House count (1-12) of planet from a given reference rashi."""
    return ((planet_rashi_idx - reference_rashi_idx) % 12) + 1


def detect_mangal_dosha(planets, asc_rashi_idx):
    """Mars in 1/2/4/7/8/12 from Lagna OR Moon OR Venus."""
    mars = _pidx(planets, "Mars")
    moon = _pidx(planets, "Moon")
    venus = _pidx(planets, "Venus")
    if not mars:
        return {"present": False, "severity": "NONE", "severity_hi": "नहीं", "explanation_hi": "मंगल डेटा अनुपलब्ध", "explanation_en": "Mars data unavailable"}

    mars_rashi = mars["rashi_idx"]
    references = []
    if asc_rashi_idx is not None:
        references.append(("Lagna", "लग्न", _house_from(asc_rashi_idx, mars_rashi)))
    if moon:
        references.append(("Moon", "चन्द्र", _house_from(moon["rashi_idx"], mars_rashi)))
    if venus:
        references.append(("Venus", "शुक्र", _house_from(venus["rashi_idx"], mars_rashi)))

    affliction_count = 0
    max_severity = "NONE"
    severity_levels = {"NONE": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3}
    afflicted_from = []

    for ref_name, ref_hi, house in references:
        if house in MANGAL_HOUSES:
            affliction_count += 1
            afflicted_from.append({"from_en": ref_name, "from_hi": ref_hi, "house": house})
            if house in HIGH_SEVERITY_HOUSES:
                cur = "HIGH"
            elif house in MEDIUM_SEVERITY_HOUSES:
                cur = "MEDIUM"
            else:
                cur = "LOW"
            if severity_levels[cur] > severity_levels[max_severity]:
                max_severity = cur

    present = affliction_count > 0
    sev_hi = {"NONE": "नहीं", "LOW": "हल्का", "MEDIUM": "मध्यम", "HIGH": "उच्च"}[max_severity]

    if not present:
        exp_hi = "मंगल दोष नहीं — मंगल अनुकूल भावों में स्थित है।"
        exp_en = "No Mangal Dosha — Mars is in favourable houses."
    else:
        houses_str_hi = ", ".join(f"{a['from_hi']} से {a['house']}वें भाव" for a in afflicted_from)
        houses_str_en = ", ".join(f"{a['house']} from {a['from_en']}" for a in afflicted_from)
        exp_hi = f"मंगल दोष — मंगल {houses_str_hi} में स्थित है। {sev_hi} तीव्रता।"
        exp_en = f"Mangal Dosha — Mars in house {houses_str_en}. {max_severity} severity."

    return {
        "present": present,
        "severity": max_severity,
        "severity_hi": sev_hi,
        "afflicted_from": afflicted_from,
        "explanation_hi": exp_hi,
        "explanation_en": exp_en,
    }


# ===================== KAAL SARP DOSHA =====================

def detect_kaal_sarp_dosha(planets):
    """All 7 planets (Sun..Saturn) between Rahu and Ketu in zodiac."""
    rahu = _pidx(planets, "Rahu")
    ketu = _pidx(planets, "Ketu")
    if not rahu or not ketu:
        return {"present": False, "severity": "NONE", "severity_hi": "नहीं",
                "explanation_hi": "राहु/केतु डेटा अनुपलब्ध", "explanation_en": "Rahu/Ketu data unavailable"}

    main_planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
    rahu_lon = rahu["degree"]
    ketu_lon = ketu["degree"]

    def in_arc(planet_lon, start, end):
        """Check if planet falls in arc start→end (clockwise) % 360."""
        if start <= end:
            return start <= planet_lon < end
        # Arc wraps around 360
        return planet_lon >= start or planet_lon < end

    # Arc from Rahu → Ketu (going forward through zodiac)
    arc_rahu_to_ketu = 0
    arc_ketu_to_rahu = 0
    for pname in main_planets:
        p = _pidx(planets, pname)
        if not p:
            continue
        if in_arc(p["degree"], rahu_lon, ketu_lon):
            arc_rahu_to_ketu += 1
        else:
            arc_ketu_to_rahu += 1

    total = arc_rahu_to_ketu + arc_ketu_to_rahu
    present = (arc_rahu_to_ketu == total) or (arc_ketu_to_rahu == total)
    if present:
        severity = "HIGH"
        severity_hi = "उच्च"
        if arc_rahu_to_ketu == total:
            ksd_type_hi = "अनंत/शेषनाग प्रकार (राहु → केतु में सब ग्रह)"
            ksd_type_en = "Anant/Sheshnag type (all planets between Rahu→Ketu)"
        else:
            ksd_type_hi = "विपरीत प्रकार (केतु → राहु में सब ग्रह)"
            ksd_type_en = "Reverse type (all planets between Ketu→Rahu)"
        exp_hi = f"काल सर्प दोष — सभी 7 मुख्य ग्रह राहु–केतु अक्ष के एक ओर हैं। {ksd_type_hi}"
        exp_en = f"Kaal Sarp Dosha — all 7 planets on one side of Rahu-Ketu axis. {ksd_type_en}"
    else:
        severity = "NONE"
        severity_hi = "नहीं"
        exp_hi = f"काल सर्प दोष नहीं — ग्रह राहु–केतु के दोनों ओर वितरित हैं ({arc_rahu_to_ketu}/{total})।"
        exp_en = f"No Kaal Sarp Dosha — planets distributed across Rahu-Ketu axis ({arc_rahu_to_ketu}/{total})."

    return {
        "present": present,
        "severity": severity,
        "severity_hi": severity_hi,
        "planets_one_side": max(arc_rahu_to_ketu, arc_ketu_to_rahu),
        "explanation_hi": exp_hi,
        "explanation_en": exp_en,
    }


# ===================== SADE SATI / SHANI DHAIYA =====================

def _current_saturn_rashi():
    """Get Saturn's current zodiac rashi index (0-11)."""
    now = datetime.now(timezone.utc)
    ut = now.hour + now.minute / 60.0
    jd = swe.julday(now.year, now.month, now.day, ut)
    sat = swe.calc_ut(jd, swe.SATURN)
    sat_lon = sat[0][0]
    return int(sat_lon / 30.0), sat_lon


def detect_sade_sati(planets):
    """Saturn currently transiting 12th, 1st, or 2nd house from natal Moon."""
    moon = _pidx(planets, "Moon")
    if not moon:
        return {"present": False, "severity": "NONE", "severity_hi": "नहीं",
                "explanation_hi": "चन्द्र डेटा अनुपलब्ध", "explanation_en": "Moon data unavailable"}

    moon_rashi = moon["rashi_idx"]
    cur_sat_rashi, cur_sat_lon = _current_saturn_rashi()

    diff = (cur_sat_rashi - moon_rashi) % 12

    if diff == 11:  # 12th from Moon
        present = True; phase = "PRE_PHASE"; phase_hi = "प्रथम चरण"; severity = "MEDIUM"
        exp_hi = f"साढ़े साती का प्रथम चरण — शनि चन्द्र राशि ({RASHIS_HI[moon_rashi]}) से 12वें भाव में।"
        exp_en = f"Sade Sati Phase 1 — Saturn in 12th from natal Moon ({RASHIS_HI[moon_rashi]})."
    elif diff == 0:  # over Moon
        present = True; phase = "PEAK_PHASE"; phase_hi = "मध्य चरण (शिखर)"; severity = "HIGH"
        exp_hi = f"साढ़े साती का शिखर चरण — शनि चन्द्र राशि ({RASHIS_HI[moon_rashi]}) के ऊपर।"
        exp_en = f"Sade Sati Peak — Saturn over natal Moon ({RASHIS_HI[moon_rashi]})."
    elif diff == 1:  # 2nd from Moon
        present = True; phase = "POST_PHASE"; phase_hi = "अंतिम चरण"; severity = "MEDIUM"
        exp_hi = f"साढ़े साती का अंतिम चरण — शनि चन्द्र राशि ({RASHIS_HI[moon_rashi]}) से 2रे भाव में।"
        exp_en = f"Sade Sati Phase 3 — Saturn in 2nd from natal Moon ({RASHIS_HI[moon_rashi]})."
    elif diff in (3, 7):  # 4th or 8th = Shani Dhaiya
        present = False
        return {
            "present": False,
            "severity": "NONE",
            "severity_hi": "नहीं",
            "shani_dhaiya": {"present": True, "house_from_moon": diff + 1, "severity_hi": "मध्यम"},
            "current_saturn_rashi": RASHIS_HI[cur_sat_rashi],
            "moon_rashi_hi": RASHIS_HI[moon_rashi],
            "explanation_hi": f"शनि ढैय्या — शनि चन्द्र राशि से {diff+1}वें भाव में। ढाई वर्ष का प्रभाव।",
            "explanation_en": f"Shani Dhaiya — Saturn in {diff+1}th from natal Moon. 2.5-year period.",
        }
    else:
        present = False; phase = None; phase_hi = None; severity = "NONE"
        exp_hi = f"साढ़े साती नहीं — शनि वर्तमान में {RASHIS_HI[cur_sat_rashi]} में, चन्द्र राशि {RASHIS_HI[moon_rashi]} है।"
        exp_en = f"No Sade Sati — Saturn currently in {RASHIS_HI[cur_sat_rashi]}, natal Moon in {RASHIS_HI[moon_rashi]}."

    return {
        "present": present,
        "phase": phase,
        "phase_hi": phase_hi,
        "severity": severity,
        "severity_hi": {"NONE": "नहीं", "MEDIUM": "मध्यम", "HIGH": "उच्च"}[severity],
        "current_saturn_rashi": RASHIS_HI[cur_sat_rashi],
        "moon_rashi_hi": RASHIS_HI[moon_rashi],
        "explanation_hi": exp_hi,
        "explanation_en": exp_en,
    }


# ===================== AGGREGATE =====================

def detect_all_doshas(planets, asc_rashi_idx):
    return {
        "mangal_dosha": detect_mangal_dosha(planets, asc_rashi_idx),
        "kaal_sarp_dosha": detect_kaal_sarp_dosha(planets),
        "sade_sati": detect_sade_sati(planets),
    }
