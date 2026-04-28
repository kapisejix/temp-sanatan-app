from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
import logging
import bcrypt

logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SUPPORTED_LANGUAGES = [
    {"code": "sa", "name": "Sanskrit", "native": "संस्कृतम्"},
    {"code": "hi", "name": "Hindi", "native": "हिन्दी"},
    {"code": "en", "name": "English", "native": "English"},
    {"code": "mr", "name": "Marathi", "native": "मराठी"},
    {"code": "gu", "name": "Gujarati", "native": "ગુજરાતી"},
    {"code": "ta", "name": "Tamil", "native": "தமிழ்"},
    {"code": "te", "name": "Telugu", "native": "తెలుగు"},
    {"code": "bn", "name": "Bengali", "native": "বাংলা"},
    {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ"},
    {"code": "ml", "name": "Malayalam", "native": "മലയാളം"},
    {"code": "pa", "name": "Punjabi", "native": "ਪੰਜਾਬੀ"},
    {"code": "od", "name": "Odia", "native": "ଓଡ଼ିଆ"},
]

CONTENT_CATEGORIES = [
    "vedic_mantra", "chalisa", "ashtakam", "sahasranama",
    "nama_ramayanam", "katha", "arti"
]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

async def create_indexes():
    await db.admin_users.create_index("email", unique=True)
    await db.user_profiles.create_index("email", unique=True)
    await db.content_items.create_index([("category", 1), ("sort_order", 1)])
    await db.content_items.create_index("slug", unique=True)
    await db.content_verses.create_index([("item_id", 1), ("verse_num", 1)])
    await db.verse_meanings.create_index([("verse_id", 1), ("language", 1)])
    await db.granth_books.create_index("slug", unique=True)
    await db.granth_chapters.create_index([("book_id", 1), ("chapter_num", 1)])
    await db.granth_verses.create_index([("chapter_id", 1), ("verse_num", 1)])
    await db.veda_books.create_index("slug")
    await db.katha_items.create_index("slug")
    await db.arti_items.create_index("sort_order")
    await db.panchang.create_index("date", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.upload_logs.create_index("created_at")
    logger.info("Database indexes created")

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@sanatansaathi.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "SanatanAdmin@2026")
    existing = await db.admin_users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.admin_users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Super Admin",
            "role": "super_admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login_at": None
        })
        logger.info(f"Admin user seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.admin_users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info("Admin password updated from env")

    # Write credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n")
        f.write(f"## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n- Role: super_admin\n\n")
        f.write(f"## Auth Endpoints\n- POST /api/auth/login\n- GET /api/auth/me\n- POST /api/auth/logout\n")

async def seed_sample_data():
    existing = await db.content_items.find_one({"slug": "hanuman-chalisa"})
    if existing:
        return

    now = datetime.now(timezone.utc).isoformat()

    # Seed Hanuman Chalisa
    chalisa_result = await db.content_items.insert_one({
        "category": "chalisa",
        "slug": "hanuman-chalisa",
        "title": {"hi": "हनुमान चालीसा", "en": "Hanuman Chalisa", "sa": "हनुमान् चालीसा"},
        "deity": "Hanuman",
        "deity_name": {"hi": "हनुमान", "en": "Hanuman"},
        "description": {"hi": "हनुमान चालीसा - श्री गोस्वामी तुलसीदास द्वारा रचित", "en": "Hanuman Chalisa - composed by Shri Goswami Tulsidas"},
        "thumbnail_url": "",
        "audio_url": "",
        "supported_languages": ["sa", "hi", "en"],
        "has_beginner_mode": True,
        "has_expert_mode": True,
        "total_verses": 40,
        "sort_order": 1,
        "is_active": True,
        "is_premium": False,
        "like_count": 0,
        "status": "published",
        "tags": ["daily", "popular", "hanuman"],
        "created_at": now,
        "updated_at": now,
    })
    chalisa_id = str(chalisa_result.inserted_id)

    sample_verses = [
        {"verse_num": 1, "verse_type": "doha", "sanskrit_text": "श्रीगुरु चरन सरोज रज निज मनु मुकुरु सुधारि।\nबरनउँ रघुबर बिमल जसु जो दायकु फल चारि॥",
         "transliteration": "Shri Guru Charan Saroj Raj, Nij Manu Mukuru Sudhari.\nBaranau Raghubar Bimal Jasu, Jo Dayaku Phal Chari."},
        {"verse_num": 2, "verse_type": "doha", "sanskrit_text": "बुद्धिहीन तनु जानिके सुमिरौं पवन-कुमार।\nबल बुद्धि बिद्या देहु मोहिं हरहु कलेस बिकार॥",
         "transliteration": "Buddhiheen Tanu Jaanike, Sumirau Pavan Kumar.\nBal Buddhi Vidya Dehu Mohi, Harahu Kalesh Bikaar."},
        {"verse_num": 3, "verse_type": "chaupai", "sanskrit_text": "जय हनुमान ज्ञान गुन सागर।\nजय कपीस तिहुँ लोक उजागर॥",
         "transliteration": "Jai Hanuman Gyan Gun Sagar.\nJai Kapis Tihun Lok Ujagar."},
        {"verse_num": 4, "verse_type": "chaupai", "sanskrit_text": "राम दूत अतुलित बल धामा।\nअंजनि पुत्र पवनसुत नामा॥",
         "transliteration": "Ram Doot Atulit Bal Dhama.\nAnjani Putra Pavansut Nama."},
        {"verse_num": 5, "verse_type": "chaupai", "sanskrit_text": "महाबीर बिक्रम बजरंगी।\nकुमति निवार सुमति के संगी॥",
         "transliteration": "Mahabeer Bikram Bajrangi.\nKumati Nivar Sumati Ke Sangi."},
    ]

    for v in sample_verses:
        verse_result = await db.content_verses.insert_one({
            "item_id": chalisa_id,
            "verse_num": v["verse_num"],
            "verse_type": v["verse_type"],
            "sanskrit_text": v["sanskrit_text"],
            "transliteration": v["transliteration"],
            "audio_url": "",
            "audio_start_ms": 0,
            "audio_end_ms": 0,
            "sort_order": v["verse_num"],
            "is_active": True
        })
        verse_id = str(verse_result.inserted_id)
        await db.verse_meanings.insert_one({
            "verse_id": verse_id,
            "language": "hi",
            "meaning": f"हिंदी अर्थ - चौपाई {v['verse_num']}",
            "word_breakdown": []
        })
        await db.verse_meanings.insert_one({
            "verse_id": verse_id,
            "language": "en",
            "meaning": f"English meaning - Verse {v['verse_num']}",
            "word_breakdown": []
        })

    # Seed Ganesh Aarti
    await db.arti_items.insert_one({
        "title": {"hi": "गणेश आरती", "en": "Ganesh Aarti"},
        "slug": "ganesh-aarti",
        "deity": "Ganesha",
        "deity_name": {"hi": "गणेश", "en": "Ganesha"},
        "thumbnail_url": "",
        "music_url": "",
        "supported_languages": ["sa", "hi", "en"],
        "content": {
            "hi": "जय गणेश जय गणेश जय गणेश देवा।\nमाता जाकी पार्वती पिता महादेवा॥\n\nएक दन्त दयावन्त चार भुजाधारी।\nमाथे पर तिलक सोहे मूसे की सवारी॥\n\nजय गणेश जय गणेश जय गणेश देवा।\nमाता जाकी पार्वती पिता महादेवा॥\n\nपान चढ़े फूल चढ़े और चढ़े मेवा।\nलड्डुवन का भोग लगे सन्त करें सेवा॥\n\nजय गणेश जय गणेश जय गणेश देवा।\nमाता जाकी पार्वती पिता महादेवा॥",
            "en": "Glory to Lord Ganesha, Glory to Lord Ganesha, Glory to Lord Ganesha.\nWhose Mother is Parvati and Father is Mahadeva.\n\nOne-tusked, compassionate, with four arms.\nTilak adorns his forehead, rides a mouse.\n\nGlory to Lord Ganesha, Glory to Lord Ganesha, Glory to Lord Ganesha.\nWhose Mother is Parvati and Father is Mahadeva.",
            "sa": "जय गणेश जय गणेश जय गणेश देवा।\nमाता जाकी पार्वती पिता महादेवा॥"
        },
        "sort_order": 1,
        "is_active": True,
        "status": "published",
        "created_at": now,
        "updated_at": now,
    })

    # Seed Bhagavad Gita
    gita_result = await db.granth_books.insert_one({
        "title": {"hi": "श्रीमद्भगवद्गीता", "en": "Bhagavad Gita"},
        "slug": "bhagavad-gita",
        "description": {"hi": "भगवद्गीता हिन्दू धर्म का सबसे पवित्र ग्रन्थ है", "en": "The Bhagavad Gita is the most sacred scripture of Hinduism"},
        "thumbnail_url": "",
        "total_chapters": 18,
        "total_verses": 700,
        "sort_order": 1,
        "is_active": True,
        "created_at": now,
    })
    gita_id = str(gita_result.inserted_id)

    ch1_result = await db.granth_chapters.insert_one({
        "book_id": gita_id,
        "chapter_num": 1,
        "title": {"hi": "अर्जुन विषाद योग", "en": "Arjuna Vishada Yoga"},
        "description": {"hi": "अर्जुन का विषाद", "en": "The Grief of Arjuna"},
        "total_verses": 47,
        "sort_order": 1,
    })
    ch1_id = str(ch1_result.inserted_id)

    gita_verses = [
        {"verse_num": 1, "sanskrit": "धृतराष्ट्र उवाच |\nधर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः |\nमामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ||१||",
         "transliteration": "Dhritarashtra Uvacha |\nDharmakshetre Kurukshetre Samaveta Yuyutsavah |\nMamakah Pandavaschaiva Kimakurvata Sanjaya ||1||",
         "meaning_hi": "धृतराष्ट्र ने कहा - हे संजय! धर्मभूमि कुरुक्षेत्र में युद्ध की इच्छा से एकत्रित हुए मेरे और पाण्डु के पुत्रों ने क्या किया?",
         "meaning_en": "Dhritarashtra said: O Sanjaya, what did my sons and the sons of Pandu do when they assembled on the holy field of Kurukshetra, eager to fight?"},
        {"verse_num": 2, "sanskrit": "सञ्जय उवाच |\nदृष्ट्वा तु पाण्डवानीकं व्यूढं दुर्योधनस्तदा |\nआचार्यमुपसङ्गम्य राजा वचनमब्रवीत् ||२||",
         "transliteration": "Sanjaya Uvacha |\nDrishtva Tu Pandavanikam Vyudham Duryodhanastada |\nAcharyamupasangamya Raja Vachanamabravit ||2||",
         "meaning_hi": "संजय ने कहा - पाण्डवों की सेना को व्यूह में खड़ी देखकर राजा दुर्योधन ने अपने गुरु द्रोणाचार्य के पास जाकर यह वचन कहा।",
         "meaning_en": "Sanjaya said: Seeing the army of the Pandavas arranged in battle formation, King Duryodhana approached his teacher Drona and spoke these words."},
    ]

    for v in gita_verses:
        await db.granth_verses.insert_one({
            "chapter_id": ch1_id,
            "book_id": gita_id,
            "verse_num": v["verse_num"],
            "sanskrit": v["sanskrit"],
            "transliteration": v["transliteration"],
            "meaning": {"hi": v["meaning_hi"], "en": v["meaning_en"]},
            "word_meanings": [],
            "sort_order": v["verse_num"],
        })

    # Seed Panchang
    await db.panchang.insert_one({
        "date": "2026-01-15",
        "tithi": "शुक्ल पक्ष तृतीया",
        "nakshatra": "रोहिणी",
        "yoga": "शोभन",
        "karana": "बव",
        "sunrise": "07:12",
        "sunset": "17:48",
        "rahu_kaal": "10:30-12:00",
        "festival_name": {"hi": "मकर संक्रांति", "en": "Makar Sankranti"},
        "is_panchak": False,
        "is_bhadra": False,
        "linked_content_ids": [],
        "special_message": {"hi": "मकर संक्रांति की शुभकामनाएं", "en": "Happy Makar Sankranti"},
    })

    # Seed Katha
    katha_result = await db.katha_items.insert_one({
        "title": {"hi": "श्री सत्यनारायण कथा", "en": "Shri Satyanarayan Katha"},
        "slug": "satyanarayan-katha",
        "deity": "Vishnu",
        "deity_name": {"hi": "विष्णु", "en": "Vishnu"},
        "thumbnail_url": "",
        "intro_text": {"hi": "श्री सत्यनारायण व्रत कथा भगवान विष्णु की पूजा है", "en": "Shri Satyanarayan Vrat Katha is worship of Lord Vishnu"},
        "puja_vidhi": [
            {"step": 1, "text": {"hi": "स्नान करें", "en": "Take bath"}},
            {"step": 2, "text": {"hi": "स्वच्छ वस्त्र धारण करें", "en": "Wear clean clothes"}},
            {"step": 3, "text": {"hi": "पूजा स्थल को साफ करें", "en": "Clean the worship area"}},
        ],
        "samagri": [
            {"item": {"hi": "अक्षत (चावल)", "en": "Rice"}, "quantity": "100g"},
            {"item": {"hi": "हल्दी", "en": "Turmeric"}, "quantity": "1 packet"},
            {"item": {"hi": "सिन्दूर", "en": "Vermilion"}, "quantity": "1 packet"},
            {"item": {"hi": "फूल", "en": "Flowers"}, "quantity": "As needed"},
        ],
        "total_chapters": 5,
        "supported_languages": ["sa", "hi", "en"],
        "sort_order": 1,
        "is_active": True,
        "status": "published",
        "created_at": now,
        "updated_at": now,
    })

    logger.info("Sample data seeded successfully")
