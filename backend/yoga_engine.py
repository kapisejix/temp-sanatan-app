"""
Vedic Astrology Yoga Detection Engine — Rule-based, deterministic.

Detects classical yogas:
  • Raj Yoga          — Kendra lord + Trikona lord conjunction or mutual aspect
  • Dhan Yoga         — 2nd lord + 11th lord conjunction or mutual aspect
  • Gaj Kesari Yoga   — Jupiter in 1, 4, 7, 10 from Moon
  • Chandra Mangal    — Moon + Mars conjunction
  • Neech Bhang Raj   — Debilitated planet + cancellation conditions

Strength bucketing: "low" / "medium" / "high"
Inputs (dict from kundli_engine):
  planets    [{ graha, degree (0..360), rashi_idx, house, is_retrograde, ... }]
  ascendant  { rashi_idx (0..11), degree }
"""
from typing import Dict, List, Any

# Sign rulerships (0=Aries..11=Pisces)
SIGN_LORDS = {
    0: "Mars", 1: "Venus", 2: "Mercury", 3: "Moon", 4: "Sun",
    5: "Mercury", 6: "Venus", 7: "Mars", 8: "Jupiter",
    9: "Saturn", 10: "Saturn", 11: "Jupiter",
}

# Exaltation / debilitation tables (sign_idx)
EXALTATION_SIGN = {
    "Sun": 0, "Moon": 1, "Mars": 9, "Mercury": 5, "Jupiter": 3,
    "Venus": 11, "Saturn": 6, "Rahu": 1, "Ketu": 7,
}
DEBILITATION_SIGN = {
    "Sun": 6, "Moon": 7, "Mars": 3, "Mercury": 11, "Jupiter": 9,
    "Venus": 5, "Saturn": 0, "Rahu": 7, "Ketu": 1,
}
OWN_SIGNS = {
    "Sun": [4], "Moon": [3], "Mars": [0, 7], "Mercury": [2, 5],
    "Jupiter": [8, 11], "Venus": [1, 6], "Saturn": [9, 10],
}

GRAHA_HI = {
    "Sun": "सूर्य", "Moon": "चन्द्र", "Mars": "मंगल", "Mercury": "बुध",
    "Jupiter": "गुरु", "Venus": "शुक्र", "Saturn": "शनि",
    "Rahu": "राहु", "Ketu": "केतु",
}

KENDRA_HOUSES  = {1, 4, 7, 10}
TRIKONA_HOUSES = {1, 5, 9}


# ---------- helpers ----------

def _planets_by_name(planets: List[Dict]) -> Dict[str, Dict]:
    return {p["graha"]: p for p in planets}

def _planets_in_house(planets: List[Dict], house: int) -> List[Dict]:
    return [p for p in planets if p.get("house") == house]

def _house_lord(asc_rashi_idx: int, house_num: int) -> str:
    sign_idx = (asc_rashi_idx + house_num - 1) % 12
    return SIGN_LORDS[sign_idx]

def _planet_house(planet_name: str, planets: List[Dict]) -> int:
    pm = _planets_by_name(planets)
    return pm.get(planet_name, {}).get("house", 0)

def _are_conjunct(p1: Dict, p2: Dict) -> bool:
    """Two planets in the same house (whole-sign system)."""
    return p1.get("house") and p1.get("house") == p2.get("house")

def _aspects_house(planet: Dict, target_house: int) -> bool:
    """Standard 7th-house aspect (all planets) plus special aspects:
       Mars 4/8, Jupiter 5/9, Saturn 3/10, Rahu/Ketu 5/9.
       Counts from planet's house."""
    h = planet.get("house") or 0
    if not h:
        return False
    aspects = {7}
    g = planet["graha"]
    if g == "Mars":    aspects |= {4, 8}
    elif g == "Jupiter": aspects |= {5, 9}
    elif g == "Saturn":  aspects |= {3, 10}
    elif g in ("Rahu", "Ketu"): aspects |= {5, 9}
    for ofs in aspects:
        if ((h - 1 + ofs - 1) % 12) + 1 == target_house:
            return True
    return False

def _mutual_aspect_or_conjunct(p1: Dict, p2: Dict) -> bool:
    if not p1 or not p2:
        return False
    if _are_conjunct(p1, p2):
        return True
    return _aspects_house(p1, p2["house"]) and _aspects_house(p2, p1["house"])


# ---------- planet strength ----------

def _planet_status(p: Dict, sun_house: int = None) -> Dict[str, bool]:
    """Returns flags used in strength scoring."""
    g = p["graha"]
    sign_idx = p.get("rashi_idx", -1)
    flags = {
        "exalted":     EXALTATION_SIGN.get(g) == sign_idx,
        "own_sign":    sign_idx in OWN_SIGNS.get(g, []),
        "debilitated": DEBILITATION_SIGN.get(g) == sign_idx,
        "retrograde":  bool(p.get("is_retrograde")),
        "combust":     False,
    }
    # Combustion: planet within ~10° of Sun (excluding Sun itself, Rahu, Ketu)
    if sun_house is not None and g not in ("Sun", "Rahu", "Ketu"):
        if p.get("house") == sun_house:
            flags["combust"] = True
    return flags

def _strength_bucket(flags_list: List[Dict[str, bool]]) -> str:
    """Combine flags from involved planets into low/medium/high."""
    score = 0
    for f in flags_list:
        if f.get("exalted"):     score += 3
        if f.get("own_sign"):    score += 2
        if f.get("retrograde"):  score += 1
        if f.get("debilitated"): score -= 3
        if f.get("combust"):     score -= 2
    if score >= 4:  return "high"
    if score >= 1:  return "medium"
    return "low"


# ---------- individual yoga rules ----------

def detect_raj_yoga(planets, asc_rashi_idx) -> List[Dict]:
    """Kendra lord (1/4/7/10) connected with Trikona lord (1/5/9).
    Connection = conjunction OR mutual aspect."""
    pm = _planets_by_name(planets)
    sun_house = pm.get("Sun", {}).get("house")
    results = []
    seen = set()
    for k in KENDRA_HOUSES:
        kl = _house_lord(asc_rashi_idx, k)
        if kl not in pm: continue
        for t in TRIKONA_HOUSES:
            tl = _house_lord(asc_rashi_idx, t)
            if tl not in pm or tl == kl: continue
            key = tuple(sorted([kl, tl]))
            if key in seen: continue
            if _mutual_aspect_or_conjunct(pm[kl], pm[tl]):
                seen.add(key)
                strength = _strength_bucket([
                    _planet_status(pm[kl], sun_house),
                    _planet_status(pm[tl], sun_house),
                ])
                results.append({
                    "name": "राज योग",
                    "name_en": "Raj Yoga",
                    "status": True,
                    "strength": strength,
                    "planets": [kl, tl],
                    "planets_hi": [GRAHA_HI[kl], GRAHA_HI[tl]],
                    "description": (
                        f"केन्द्राधिपति {GRAHA_HI[kl]} और त्रिकोणाधिपति {GRAHA_HI[tl]} का सम्बन्ध — "
                        "अधिकार, मान-सम्मान, उन्नति का योग"
                    ),
                })
    return results


def detect_dhan_yoga(planets, asc_rashi_idx) -> List[Dict]:
    """2nd-lord + 11th-lord conjunction or mutual aspect."""
    pm = _planets_by_name(planets)
    sun_house = pm.get("Sun", {}).get("house")
    l2 = _house_lord(asc_rashi_idx, 2)
    l11 = _house_lord(asc_rashi_idx, 11)
    if l2 == l11 or l2 not in pm or l11 not in pm:
        return []
    if not _mutual_aspect_or_conjunct(pm[l2], pm[l11]):
        return []
    strength = _strength_bucket([
        _planet_status(pm[l2], sun_house),
        _planet_status(pm[l11], sun_house),
    ])
    return [{
        "name": "धन योग",
        "name_en": "Dhan Yoga",
        "status": True,
        "strength": strength,
        "planets": [l2, l11],
        "planets_hi": [GRAHA_HI[l2], GRAHA_HI[l11]],
        "description": (
            f"द्वितीयेश {GRAHA_HI[l2]} और एकादशेश {GRAHA_HI[l11]} का सम्बन्ध — "
            "धन, संग्रह, आर्थिक उन्नति का योग"
        ),
    }]


def detect_gaj_kesari_yoga(planets) -> List[Dict]:
    """Jupiter in Kendra (1/4/7/10) from Moon."""
    pm = _planets_by_name(planets)
    moon = pm.get("Moon"); jup = pm.get("Jupiter")
    if not moon or not jup: return []
    moon_h = moon.get("house") or 0; jup_h = jup.get("house") or 0
    if not moon_h or not jup_h: return []
    diff = ((jup_h - moon_h) % 12) + 1
    if diff in (1, 4, 7, 10):
        sun_house = pm.get("Sun", {}).get("house")
        strength = _strength_bucket([
            _planet_status(jup, sun_house),
            _planet_status(moon, sun_house),
        ])
        return [{
            "name": "गज केसरी योग",
            "name_en": "Gaj Kesari Yoga",
            "status": True,
            "strength": strength,
            "planets": ["Jupiter", "Moon"],
            "planets_hi": [GRAHA_HI["Jupiter"], GRAHA_HI["Moon"]],
            "description": (
                "चन्द्र से केन्द्र (1/4/7/10) में गुरु — बुद्धि, यश, सम्मान का योग"
            ),
        }]
    return []


def detect_chandra_mangal_yoga(planets) -> List[Dict]:
    """Moon + Mars conjunction (same house)."""
    pm = _planets_by_name(planets)
    moon = pm.get("Moon"); mars = pm.get("Mars")
    if not moon or not mars: return []
    if not _are_conjunct(moon, mars): return []
    sun_house = pm.get("Sun", {}).get("house")
    strength = _strength_bucket([
        _planet_status(moon, sun_house),
        _planet_status(mars, sun_house),
    ])
    return [{
        "name": "चन्द्र-मंगल योग",
        "name_en": "Chandra Mangal Yoga",
        "status": True,
        "strength": strength,
        "planets": ["Moon", "Mars"],
        "planets_hi": [GRAHA_HI["Moon"], GRAHA_HI["Mars"]],
        "description": "चन्द्र और मंगल की युति — व्यापारिक बुद्धि, धनार्जन क्षमता",
    }]


def detect_neech_bhang_raj_yoga(planets, asc_rashi_idx) -> List[Dict]:
    """Debilitated planet whose debilitation is cancelled by:
       (a) lord of debilitation sign in a kendra from Lagna or Moon, OR
       (b) the planet that is exalted in the debilitation sign is in a kendra.
       Either condition produces Neech Bhang Raj Yoga."""
    pm = _planets_by_name(planets)
    sun_house = pm.get("Sun", {}).get("house")
    moon_house = pm.get("Moon", {}).get("house")
    results = []
    for g, p in pm.items():
        if g in ("Rahu", "Ketu"): continue
        sign_idx = p.get("rashi_idx", -1)
        if DEBILITATION_SIGN.get(g) != sign_idx: continue
        # Find lord of the sign of debilitation
        sign_lord = SIGN_LORDS.get(sign_idx)
        if not sign_lord or sign_lord not in pm: continue
        sl_house = pm[sign_lord].get("house") or 0
        cond_a = sl_house in KENDRA_HOUSES or (
            moon_house and ((sl_house - moon_house) % 12) + 1 in KENDRA_HOUSES
        )
        # Planet exalted in this sign
        exalter = next((g2 for g2, s in EXALTATION_SIGN.items() if s == sign_idx), None)
        cond_b = bool(exalter and exalter in pm and pm[exalter].get("house") in KENDRA_HOUSES)
        if cond_a or cond_b:
            strength = _strength_bucket([
                _planet_status(p, sun_house),
                _planet_status(pm[sign_lord], sun_house),
            ])
            # NBR is inherently a strong yoga; bump if both conditions met
            if cond_a and cond_b and strength != "high":
                strength = "high" if strength == "medium" else "medium"
            results.append({
                "name": "नीच भंग राज योग",
                "name_en": "Neech Bhang Raj Yoga",
                "status": True,
                "strength": strength,
                "planets": [g, sign_lord],
                "planets_hi": [GRAHA_HI[g], GRAHA_HI[sign_lord]],
                "description": (
                    f"{GRAHA_HI[g]} नीच राशि में, परन्तु {GRAHA_HI[sign_lord]} द्वारा "
                    "नीच भंग — अकल्पित उत्थान, कठिनाई के बाद सफलता"
                ),
            })
    return results


# ---------- entry point ----------

def detect_all_yogas(planets: List[Dict], ascendant: Dict) -> Dict[str, Any]:
    """Run all detectors and return a structured result.

    `ascendant` shape: { rashi_idx, ... }
    """
    asc_idx = ascendant["rashi_idx"]
    yogas = []
    yogas += detect_raj_yoga(planets, asc_idx)
    yogas += detect_dhan_yoga(planets, asc_idx)
    yogas += detect_gaj_kesari_yoga(planets)
    yogas += detect_chandra_mangal_yoga(planets)
    yogas += detect_neech_bhang_raj_yoga(planets, asc_idx)

    # Always-return list of canonical yoga checks (so UI can show "not present" too)
    canonical_names = ["राज योग", "धन योग", "गज केसरी योग", "चन्द्र-मंगल योग", "नीच भंग राज योग"]
    present_names = {y["name"] for y in yogas}
    for name in canonical_names:
        if name not in present_names:
            yogas.append({
                "name": name,
                "name_en": {
                    "राज योग": "Raj Yoga", "धन योग": "Dhan Yoga",
                    "गज केसरी योग": "Gaj Kesari Yoga",
                    "चन्द्र-मंगल योग": "Chandra Mangal Yoga",
                    "नीच भंग राज योग": "Neech Bhang Raj Yoga",
                }[name],
                "status": False,
                "strength": "low",
                "planets": [],
                "planets_hi": [],
                "description": "योग अनुपस्थित",
            })

    return {
        "yogas": yogas,
        "summary": {
            "total_present": sum(1 for y in yogas if y["status"]),
            "total_checked": len(canonical_names),
            "high_strength": [y["name"] for y in yogas if y["status"] and y["strength"] == "high"],
        },
    }
