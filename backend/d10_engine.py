"""
Dasamsa (D10) Chart Engine — divisional chart for career / profession.

Rule (Parashara):
  - Each rashi divided into 10 parts of 3° each.
  - For ODD signs (rashi_idx % 2 == 0, i.e. Aries=0, Gemini=2, Leo=4, ...):
      D10 starts from the same sign.
  - For EVEN signs (Taurus=1, Cancer=3, ...):
      D10 starts from the 9th sign (offset 8).
"""
RASHIS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
          "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
RASHIS_HI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
             "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"]


def dasamsa_position(longitude_deg: float) -> int:
    rashi_idx = int(longitude_deg / 30.0)
    deg_in_sign = longitude_deg - rashi_idx * 30.0
    pada = int(deg_in_sign / 3.0)  # 0..9
    offset = 0 if rashi_idx % 2 == 0 else 8
    return (rashi_idx + offset + pada) % 12


def build_dasamsa_chart(planets, asc_longitude):
    d10_asc = dasamsa_position(asc_longitude)
    d10_planets = []
    for p in planets:
        d10_idx = dasamsa_position(p["degree"])
        d10_house = ((d10_idx - d10_asc) % 12) + 1
        d10_planets.append({
            "graha": p["graha"],
            "graha_hi": p.get("graha_hi", p["graha"]),
            "rashi_idx": d10_idx,
            "rashi": RASHIS[d10_idx],
            "rashi_hi": RASHIS_HI[d10_idx],
            "house": d10_house,
            "degree_in_sign": p["degree"] - int(p["degree"] / 30.0) * 30.0,
            "is_retrograde": p.get("is_retrograde", False),
        })
    return {
        "ascendant": {"rashi_idx": d10_asc, "rashi": RASHIS[d10_asc], "rashi_hi": RASHIS_HI[d10_asc]},
        "planets": d10_planets,
    }
