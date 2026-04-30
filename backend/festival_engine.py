"""
Festival Detection Engine — rule-based, derived from Panchang.

Covers 20 major Hindu festivals based on combinations of tithi,
paksha, nakshatra, and month. Returns list of festivals falling
on the given date.

Rules use Purnimanta month (North convention) as the reference.
"""
from typing import Dict, List

# tithi_index: 0..29 (0..14 Shukla, 15..29 Krishna)
# tithi_in_paksha: 0..14 (index inside paksha)
def _tithi_in_paksha(idx30: int) -> int:
    return idx30 % 15


FESTIVAL_RULES = [
    # ---------- Tithi-only (every paksha) ----------
    {
        "key": "ekadashi_shukla",
        "name_hi": "एकादशी (शुक्ल)", "name_en": "Ekadashi (Shukla)",
        "match": lambda p: p["tithi_index"] == 10,
        "category": "vrat",
        "description_hi": "भगवान विष्णु को समर्पित एकादशी व्रत — निर्जला अथवा फलाहार उपवास",
    },
    {
        "key": "ekadashi_krishna",
        "name_hi": "एकादशी (कृष्ण)", "name_en": "Ekadashi (Krishna)",
        "match": lambda p: p["tithi_index"] == 25,
        "category": "vrat",
        "description_hi": "भगवान विष्णु को समर्पित एकादशी व्रत",
    },
    {
        "key": "pradosh",
        "name_hi": "प्रदोष व्रत", "name_en": "Pradosh Vrat",
        "match": lambda p: _tithi_in_paksha(p["tithi_index"]) == 12,
        "category": "vrat",
        "description_hi": "त्रयोदशी तिथि — भगवान शिव की संध्याकालीन पूजा",
    },
    {
        "key": "purnima",
        "name_hi": "पूर्णिमा", "name_en": "Purnima",
        "match": lambda p: p["tithi_index"] == 14,
        "category": "day",
        "description_hi": "पूर्णिमा व्रत — सत्यनारायण पूजा का शुभ दिन",
    },
    {
        "key": "amavasya",
        "name_hi": "अमावस्या", "name_en": "Amavasya",
        "match": lambda p: p["tithi_index"] == 29,
        "category": "day",
        "description_hi": "अमावस्या — पितृ तर्पण और दान का विशेष दिन",
    },
    {
        "key": "sankashti",
        "name_hi": "संकष्टी चतुर्थी", "name_en": "Sankashti Chaturthi",
        "match": lambda p: p["tithi_index"] == 18,  # Krishna Chaturthi (15+3)
        "category": "vrat",
        "description_hi": "भगवान गणेश को समर्पित — चन्द्रोदय के बाद व्रत पारण",
    },
    {
        "key": "masik_shivratri",
        "name_hi": "मासिक शिवरात्रि", "name_en": "Masik Shivratri",
        "match": lambda p: p["tithi_index"] == 28,  # Krishna Chaturdashi
        "category": "vrat",
        "description_hi": "शिवजी की मासिक शिवरात्रि — रात्रि जागरण व अभिषेक",
    },

    # ---------- Month + tithi combinations ----------
    {
        "key": "makar_sankranti",
        "name_hi": "मकर संक्रांति", "name_en": "Makar Sankranti",
        "match": lambda p: p.get("month_hi") == "पौष" and p["tithi_index"] in (14, 15, 16, 17),
        "category": "major",
        "description_hi": "सूर्य का मकर राशि में प्रवेश — तिल-गुड़ दान, पतंग उत्सव",
    },
    {
        "key": "basant_panchami",
        "name_hi": "बसन्त पंचमी", "name_en": "Basant Panchami",
        "match": lambda p: p.get("month_hi") == "माघ" and p["tithi_index"] == 4,
        "category": "major",
        "description_hi": "सरस्वती माता की पूजा — विद्यारम्भ का शुभ दिन",
    },
    {
        "key": "mahashivratri",
        "name_hi": "महाशिवरात्रि", "name_en": "Maha Shivratri",
        "match": lambda p: p.get("month_hi") == "फाल्गुन" and p["tithi_index"] == 28,
        "category": "major",
        "description_hi": "शिवजी की सबसे बड़ी रात्रि — अभिषेक, रुद्री पाठ, रात्रि जागरण",
    },
    {
        "key": "holi",
        "name_hi": "होली", "name_en": "Holi",
        "match": lambda p: p.get("month_hi") == "फाल्गुन" and p["tithi_index"] == 14,
        "category": "major",
        "description_hi": "होलिका दहन (पूर्णिमा) के बाद रंगों का पर्व",
    },
    {
        "key": "ram_navami",
        "name_hi": "राम नवमी", "name_en": "Ram Navami",
        "match": lambda p: p.get("month_hi") == "चैत्र" and p["tithi_index"] == 8,
        "category": "major",
        "description_hi": "श्रीराम का जन्मोत्सव — दोपहर 12 बजे पूजा",
    },
    {
        "key": "hanuman_jayanti",
        "name_hi": "हनुमान जयन्ती", "name_en": "Hanuman Jayanti",
        "match": lambda p: p.get("month_hi") == "चैत्र" and p["tithi_index"] == 14,
        "category": "major",
        "description_hi": "हनुमान जी का जन्मोत्सव — सुंदरकाण्ड व हनुमान चालीसा पाठ",
    },
    {
        "key": "guru_purnima",
        "name_hi": "गुरु पूर्णिमा", "name_en": "Guru Purnima",
        "match": lambda p: p.get("month_hi") == "आषाढ़" and p["tithi_index"] == 14,
        "category": "major",
        "description_hi": "वेदव्यास जयन्ती — गुरु पूजा और आशीर्वाद का दिन",
    },
    {
        "key": "raksha_bandhan",
        "name_hi": "रक्षा बन्धन", "name_en": "Raksha Bandhan",
        "match": lambda p: p.get("month_hi") == "श्रावण" and p["tithi_index"] == 14,
        "category": "major",
        "description_hi": "भाई-बहन का पवित्र त्योहार — बहनें राखी बाँधती हैं",
    },
    {
        "key": "janmashtami",
        "name_hi": "जन्माष्टमी", "name_en": "Krishna Janmashtami",
        "match": lambda p: p.get("month_hi") == "भाद्रपद" and p["tithi_index"] == 22,  # Krishna Ashtami (15+7)
        "category": "major",
        "description_hi": "श्रीकृष्ण जन्मोत्सव — रात्रि 12 बजे जन्मोत्सव पूजा",
    },
    {
        "key": "ganesh_chaturthi",
        "name_hi": "गणेश चतुर्थी", "name_en": "Ganesh Chaturthi",
        "match": lambda p: p.get("month_hi") == "भाद्रपद" and p["tithi_index"] == 3,
        "category": "major",
        "description_hi": "गणपति स्थापना — 10 दिन का उत्सव शुरू",
    },
    {
        "key": "navratri_start",
        "name_hi": "नवरात्रि प्रारम्भ", "name_en": "Navratri Begins",
        "match": lambda p: p.get("month_hi") == "आश्विन" and p["tithi_index"] == 0,
        "category": "major",
        "description_hi": "शारदीय नवरात्रि प्रारम्भ — माँ दुर्गा की 9 दिन पूजा",
    },
    {
        "key": "dussehra",
        "name_hi": "विजयदशमी (दशहरा)", "name_en": "Dussehra",
        "match": lambda p: p.get("month_hi") == "आश्विन" and p["tithi_index"] == 9,
        "category": "major",
        "description_hi": "राम की रावण पर विजय — शस्त्र पूजा और रावण दहन",
    },
    {
        "key": "karva_chauth",
        "name_hi": "करवा चौथ", "name_en": "Karva Chauth",
        "match": lambda p: p.get("month_hi") == "कार्तिक" and p["tithi_index"] == 18,  # Krishna Chaturthi
        "category": "major",
        "description_hi": "सौभाग्यवती स्त्रियों का व्रत — चन्द्रोदय दर्शन के बाद पारण",
    },
    {
        "key": "dhanteras",
        "name_hi": "धनतेरस", "name_en": "Dhanteras",
        "match": lambda p: p.get("month_hi") == "कार्तिक" and p["tithi_index"] == 27,  # Krishna Trayodashi
        "category": "major",
        "description_hi": "धन्वन्तरि जयन्ती — लक्ष्मी-कुबेर पूजन, धातु क्रय शुभ",
    },
    {
        "key": "diwali",
        "name_hi": "दीपावली", "name_en": "Diwali",
        "match": lambda p: p.get("month_hi") == "कार्तिक" and p["tithi_index"] == 29,
        "category": "major",
        "description_hi": "महालक्ष्मी पूजन — अमावस्या की रात घर-घर दीप प्रज्वलन",
    },
    {
        "key": "bhai_dooj",
        "name_hi": "भाई दूज", "name_en": "Bhai Dooj",
        "match": lambda p: p.get("month_hi") == "कार्तिक" and p["tithi_index"] == 1,
        "category": "major",
        "description_hi": "यम द्वितीया — बहनें भाइयों के लिए तिलक व आरती करती हैं",
    },
    {
        "key": "chhath_puja",
        "name_hi": "छठ पूजा (सूर्य षष्ठी)", "name_en": "Chhath Puja",
        "match": lambda p: p.get("month_hi") == "कार्तिक" and p["tithi_index"] == 5,
        "category": "major",
        "description_hi": "सूर्य भगवान और छठी मैया की पूजा — अर्घ्य और 36 घंटे निर्जल व्रत",
    },
]


def detect_festivals(panchang: Dict) -> List[Dict]:
    """Run all festival rules against the given panchang dict.

    Returns list of {key, name_hi, name_en, category, description_hi} entries.
    Sorted so 'major' festivals come first.
    """
    out = []
    for rule in FESTIVAL_RULES:
        try:
            if rule["match"](panchang):
                out.append({
                    "key": rule["key"],
                    "name_hi": rule["name_hi"],
                    "name_en": rule["name_en"],
                    "category": rule["category"],
                    "description_hi": rule["description_hi"],
                })
        except Exception:
            continue
    priority = {"major": 0, "vrat": 1, "day": 2}
    out.sort(key=lambda x: priority.get(x["category"], 9))
    return out
