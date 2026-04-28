"""
Vimshottari Dasha Engine — Mahadasha + Antardasha calculation
Deterministic, based on Moon's nakshatra position at birth.
120-year cycle: Ke7 V20 Su6 Mo10 Ma7 Ra18 J16 Sa19 Me17
"""
from datetime import datetime, timedelta, timezone
from dateutil.relativedelta import relativedelta

# Standard order and durations (years)
DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
DASHA_YEARS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7,
    "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17,
}
TOTAL_CYCLE = 120  # years

# Nakshatra (1-27) → ruling planet
NAK_TO_LORD = {
    1: "Ketu", 2: "Venus", 3: "Sun", 4: "Moon", 5: "Mars",
    6: "Rahu", 7: "Jupiter", 8: "Saturn", 9: "Mercury",
    10: "Ketu", 11: "Venus", 12: "Sun", 13: "Moon", 14: "Mars",
    15: "Rahu", 16: "Jupiter", 17: "Saturn", 18: "Mercury",
    19: "Ketu", 20: "Venus", 21: "Sun", 22: "Moon", 23: "Mars",
    24: "Rahu", 25: "Jupiter", 26: "Saturn", 27: "Mercury",
}

GRAHA_HI = {
    "Ketu": "केतु", "Venus": "शुक्र", "Sun": "सूर्य", "Moon": "चन्द्र",
    "Mars": "मंगल", "Rahu": "राहु", "Jupiter": "गुरु", "Saturn": "शनि", "Mercury": "बुध",
}

NAK_SPAN_DEG = 360.0 / 27.0  # 13.3333


def _add_years(dt: datetime, years: float) -> datetime:
    """Add fractional years to datetime."""
    days = years * 365.2425
    return dt + timedelta(days=days)


def compute_vimshottari_dasha(birth_dt: datetime, moon_longitude: float):
    """
    Compute full Mahadasha sequence from birth.
    Returns: list of {planet, start, end, balance_years, antar: [...]}.
    """
    # Find Moon's nakshatra (1-27) and degree-into-nakshatra
    nak_num = int(moon_longitude / NAK_SPAN_DEG) + 1
    deg_into = moon_longitude - (nak_num - 1) * NAK_SPAN_DEG  # 0..13.33

    starting_lord = NAK_TO_LORD[nak_num]
    full_period = DASHA_YEARS[starting_lord]

    # Balance of starting MD (years remaining from birth)
    fraction_consumed = deg_into / NAK_SPAN_DEG
    balance_years = full_period * (1 - fraction_consumed)

    # MD started at: birth - (consumed years)
    md_start = _add_years(birth_dt, -fraction_consumed * full_period)

    # Build sequence — iterate through the 9 lords starting from starting_lord
    start_idx = DASHA_ORDER.index(starting_lord)
    sequence = []
    cur = md_start
    for i in range(9):  # one full cycle = 9 mahadashas = 120 years
        lord = DASHA_ORDER[(start_idx + i) % 9]
        period = DASHA_YEARS[lord]
        end = _add_years(cur, period)
        antars = _compute_antardashas(lord, cur, period)
        sequence.append({
            "planet": lord,
            "planet_hi": GRAHA_HI[lord],
            "start": cur.isoformat(),
            "end": end.isoformat(),
            "years": period,
            "antardashas": antars,
        })
        cur = end

    return {
        "moon_nakshatra_num": nak_num,
        "starting_lord": starting_lord,
        "starting_lord_hi": GRAHA_HI[starting_lord],
        "balance_years": round(balance_years, 4),
        "sequence": sequence,
    }


def _compute_antardashas(md_lord: str, md_start: datetime, md_years: float):
    """Compute the 9 Antardashas inside a Mahadasha."""
    md_start_idx = DASHA_ORDER.index(md_lord)
    antars = []
    cur = md_start
    for i in range(9):
        ad_lord = DASHA_ORDER[(md_start_idx + i) % 9]
        # AD duration = (MD_years × AD_lord_years) / 120
        ad_years = (md_years * DASHA_YEARS[ad_lord]) / TOTAL_CYCLE
        end = _add_years(cur, ad_years)
        antars.append({
            "planet": ad_lord,
            "planet_hi": GRAHA_HI[ad_lord],
            "start": cur.isoformat(),
            "end": end.isoformat(),
            "years": round(ad_years, 4),
        })
        cur = end
    return antars


def get_current_dasha(dasha_data: dict, at_dt: datetime = None):
    """Find currently running MD + AD at given datetime."""
    if at_dt is None:
        at_dt = datetime.now(timezone.utc)
    at_iso = at_dt.isoformat()

    cur_md = None
    for md in dasha_data["sequence"]:
        if md["start"] <= at_iso < md["end"]:
            cur_md = md
            break

    if not cur_md:
        return None

    cur_ad = None
    for ad in cur_md["antardashas"]:
        if ad["start"] <= at_iso < ad["end"]:
            cur_ad = ad
            break

    return {
        "mahadasha": {
            "planet": cur_md["planet"],
            "planet_hi": cur_md["planet_hi"],
            "start": cur_md["start"],
            "end": cur_md["end"],
            "years": cur_md["years"],
        },
        "antardasha": cur_ad and {
            "planet": cur_ad["planet"],
            "planet_hi": cur_ad["planet_hi"],
            "start": cur_ad["start"],
            "end": cur_ad["end"],
            "years": cur_ad["years"],
        },
        "as_of": at_iso,
    }


# ============== DASHA INTERPRETATION (RULE-BASED) ==============

# Domain impact rules — based on planet's natural significations
PLANET_DOMAINS = {
    "Sun":     {"career": +5, "marriage": -1, "health": +1, "finance": +2, "mind": +0},
    "Moon":    {"career": +1, "marriage": +3, "health": +2, "finance": +1, "mind": +5},
    "Mars":    {"career": +4, "marriage": -2, "health": +0, "finance": +1, "mind": -2},
    "Mercury": {"career": +5, "marriage": +2, "health": +1, "finance": +5, "mind": +3},
    "Jupiter": {"career": +5, "marriage": +5, "health": +4, "finance": +5, "mind": +5},
    "Venus":   {"career": +2, "marriage": +5, "health": +2, "finance": +5, "mind": +3},
    "Saturn":  {"career": +3, "marriage": -3, "health": -3, "finance": -1, "mind": -3},
    "Rahu":    {"career": +2, "marriage": -3, "health": -3, "finance": +1, "mind": -4},
    "Ketu":    {"career": -2, "marriage": -3, "health": -2, "finance": -3, "mind": +2},
}

DOMAIN_HI = {
    "career": "करियर", "marriage": "विवाह/संबंध",
    "health": "स्वास्थ्य", "finance": "धन/वित्त", "mind": "मानसिक स्थिति",
}


def interpret_current_dasha(current_dasha: dict, graha_scores: list):
    """
    Rule-based domain impact interpretation.
    MD planet defines main theme, AD modifies. Graha score adjusts severity.
    Returns: themes + domain_impacts + severity.
    """
    md_planet = current_dasha["mahadasha"]["planet"]
    ad_planet = current_dasha["antardasha"]["planet"] if current_dasha.get("antardasha") else md_planet

    # Build score map
    score_map = {s["graha"]: s["score"] for s in graha_scores}
    md_score = score_map.get(md_planet, 50)
    ad_score = score_map.get(ad_planet, 50)

    # Higher score = more affliction in scoring engine. Invert for "strength factor".
    md_strength = 1.0 - (md_score / 100.0)  # 1.0 = strong, 0.0 = afflicted
    ad_strength = 1.0 - (ad_score / 100.0)

    md_dom = PLANET_DOMAINS.get(md_planet, {})
    ad_dom = PLANET_DOMAINS.get(ad_planet, {})

    domain_impacts = {}
    for domain in ["career", "marriage", "health", "finance", "mind"]:
        # Base impact from MD weighted higher than AD (60/40)
        base_md = md_dom.get(domain, 0)
        base_ad = ad_dom.get(domain, 0)
        # Modulate by strength
        md_effect = base_md * (0.5 + md_strength)  # 0.5..1.5
        ad_effect = base_ad * (0.5 + ad_strength)
        score = round(md_effect * 0.6 + ad_effect * 0.4, 2)
        # Map to severity
        if score >= 3:
            label = "POSITIVE"; label_hi = "अनुकूल"
        elif score >= 1:
            label = "MILD_POSITIVE"; label_hi = "थोड़ा अनुकूल"
        elif score >= -1:
            label = "NEUTRAL"; label_hi = "सामान्य"
        elif score >= -3:
            label = "MILD_NEGATIVE"; label_hi = "थोड़ा प्रतिकूल"
        else:
            label = "NEGATIVE"; label_hi = "प्रतिकूल"
        domain_impacts[domain] = {
            "domain_hi": DOMAIN_HI[domain],
            "score": score,
            "severity": label,
            "severity_hi": label_hi,
        }

    # Overall severity (avg of all domain scores)
    avg_score = sum(d["score"] for d in domain_impacts.values()) / 5.0
    if avg_score >= 2:
        overall = "FAVOURABLE"; overall_hi = "अनुकूल काल"
    elif avg_score >= 0:
        overall = "MIXED"; overall_hi = "मिश्रित काल"
    elif avg_score >= -2:
        overall = "CHALLENGING"; overall_hi = "चुनौतीपूर्ण"
    else:
        overall = "DIFFICULT"; overall_hi = "कठिन काल"

    # Themes (rule-based, short)
    themes_hi = []
    themes_en = []
    if md_planet == ad_planet:
        themes_hi.append(f"{GRAHA_HI[md_planet]} की प्रबल अवधि — गहरा प्रभाव")
        themes_en.append(f"Strong {md_planet} period — deep impact")
    else:
        themes_hi.append(f"मुख्य प्रभाव: {GRAHA_HI[md_planet]} (महादशा)")
        themes_hi.append(f"उप-प्रभाव: {GRAHA_HI[ad_planet]} (अंतर्दशा)")
        themes_en.append(f"Main: {md_planet} (Mahadasha)")
        themes_en.append(f"Sub: {ad_planet} (Antardasha)")

    if md_strength > 0.7:
        themes_hi.append(f"{GRAHA_HI[md_planet]} बलवान — सकारात्मक परिणाम संभव")
        themes_en.append(f"{md_planet} is strong — positive outcomes likely")
    elif md_strength < 0.4:
        themes_hi.append(f"{GRAHA_HI[md_planet]} पीड़ित — सावधानी और उपाय आवश्यक")
        themes_en.append(f"{md_planet} is afflicted — caution and remedies needed")

    return {
        "md": md_planet, "md_hi": GRAHA_HI[md_planet], "md_score": md_score,
        "ad": ad_planet, "ad_hi": GRAHA_HI[ad_planet], "ad_score": ad_score,
        "domain_impacts": domain_impacts,
        "overall_severity": overall,
        "overall_severity_hi": overall_hi,
        "avg_score": round(avg_score, 2),
        "themes_hi": themes_hi,
        "themes_en": themes_en,
    }
