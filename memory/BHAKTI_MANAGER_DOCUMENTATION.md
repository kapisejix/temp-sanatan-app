# SanatanSaathi - Bhakti Content Manager Documentation

## 🔗 Demo Link
**URL**: https://memory-tracker-29.preview.emergentagent.com

## 🔐 Login Credentials
- **Email**: admin@sanatansaathi.com
- **Password**: SanatanAdmin@123
- **Admin Panel**: /admin/dashboard

---

## 📋 What Was Built

### 10 Bhakti Category Managers in Admin Panel

| Category | Route | Sub-categories | Format | Beginner/Expert Mode |
|----------|-------|----------------|--------|---------------------|
| Aarti | `/admin/arti-manager` | 11 (Ganesha, Hanuman, Krishna, Ram, Shiv, Narayan, Devta, Devi, Sant, Saptavar, Anya) | Full text | ❌ No |
| Chalisa | `/admin/chalisa-manager` | 4 (Devta 22, Devi 21, Sant 9, Anya 2) | Doha+Chaupai | ✅ Yes |
| Namavali | `/admin/namavali-manager` | 22 deity groups | 108 names | ✅ Yes |
| Sahasranama | `/admin/sahasranama-manager` | 7 groups | 1000 names | ✅ Yes |
| Vedic Mantra | `/admin/vedic-mantra-manager` | 15 deity groups | Mantra+Meaning | ✅ Yes |
| Stotram | `/admin/stotram-manager` | 22+ groups | Shloka format | ✅ Yes |
| Suktam | `/admin/suktam-manager` | 9 suktams | Vedic shloka | ✅ Yes |
| Ashtakam | `/admin/ashtakam-manager` | 7 deity groups | 8-verse format | ✅ Yes |
| Shatkam | `/admin/shatkam-manager` | Various | 6-verse format | ✅ Yes |
| Kavacham | `/admin/kavacham-manager` | 2 (Devta, Devi) | Protection verses | ✅ Yes |
| Nam Ramayanam | `/admin/nam-ramayanam-manager` | 2 items | 108 names | ✅ Yes |

---

## 🎯 Features per Category Manager

### Grid View
- Title (Hindi/English)
- Deity tag
- Verse count
- Supported Languages (HI, EN, SA, MR, GU, TA, TE, BN)
- Status (Draft/Published)
- Actions (View, Edit, Delete)

### Bulk Actions
- ☑️ Select all / individual items
- 🗑️ Bulk Delete
- 📤 Export to JSON
- 🔊 Generate TTS (queued for future)

### Beginner Mode (Chalisa & others)
- Verse-by-verse cards
- Sanskrit/Hindi text
- Transliteration
- Word breakdown
- Multi-language meaning tabs

### Expert Mode
- Full text in rich editor
- Audio URL upload
- Video URL upload
- Audio-text sync timestamps

---

## 📦 Content Seeded (35 Items)

### Aarti (14 items)
1. जय गणेश जय गणेश देवा - Jai Ganesh Jai Ganesh Deva
2. सुखकर्ता दुखहर्ता - Sukhkarta Dukhharta
3. आरती कीजै हनुमान लला की - Aarti Keejai Hanuman Lala Ki
4. आरती कुंजबिहारी की - Aarti Kunj Bihari Ki
5. आरती श्री रामचन्द्र जी की - Aarti Shri Ramchandra Ji Ki
6. ॐ जय शिव ओंकारा - Om Jai Shiv Omkara
7. ॐ जय जगदीश हरे - Om Jai Jagdish Hare
8. जय अम्बे गौरी - Jai Ambe Gauri
9. ॐ जय लक्ष्मी माता - Om Jai Lakshmi Mata
10. जय सरस्वती माता - Jai Saraswati Mata
11. जय संतोषी माता - Jai Santoshi Mata
12. जय सूर्य भगवान - Jai Surya Bhagwan
13. जय जय श्री शनिदेव - Jai Shani Dev
14. सोमवार व्रत आरती - Somvar Vrat Aarti

### Chalisa (4 items)
1. हनुमान चालीसा - Hanuman Chalisa (10 verses with meanings)
2. शिव चालीसा - Shiv Chalisa
3. दुर्गा चालीसा - Durga Chalisa
4. लक्ष्मी चालीसा - Lakshmi Chalisa

### Vedic Mantras (2 items)
1. गायत्री मंत्र - Gayatri Mantra (4 verses with full meanings)
2. महामृत्युंजय मंत्र - Mahamrityunjaya Mantra (2 verses)

### Other Categories
- Namavali: Ganesha & Vishnu 108 names
- Sahasranama: Vishnu & Lalita 1000 names
- Stotram: Shiv Mahimna & Vishnu Stotram
- Suktam: Purusha & Shri Suktam
- Ashtakam: Shivashtakam & Krishnashtakam
- Shatkam: Nirvana Shatkam
- Kavacham: Devi & Narayana Kavacham
- Nam Ramayanam: 108 names + Ek Shloki Ramayanam

---

## 🛠️ Technical Details

### Backend API Endpoints
```
GET    /api/bhakti/items?category=&subcategory=&status=
GET    /api/bhakti/items/{id}
POST   /api/bhakti/items
PUT    /api/bhakti/items/{id}
PATCH  /api/bhakti/items/{id}/status
DELETE /api/bhakti/items/{id}
POST   /api/bhakti/bulk-delete
POST   /api/bhakti/bulk-export
POST   /api/bhakti/bulk-tts
```

### MongoDB Collections
- `bhakti_items` - Main content items
- `bhakti_verses` - Individual verses with meanings

### Frontend Files Created
```
/app/frontend/src/pages/bhakti/
├── AartiManagerPage.js
├── ChalisaManagerPage.js
├── BhaktiCategoryManager.js (generic for 8 categories)
└── index.js
```

### Seed Script
```
/app/backend/seed_bhakti_content.py
```
Run with: `cd /app/backend && python seed_bhakti_content.py`

---

## 🎨 Color Scheme
- Primary: `#E95A34`
- Background: `#F8F3F1`
- Text: `#374652`
- Secondary: `#989EA4`
- Accent: `#D08465`
- Highlight: `#EB9C8C`

---

## 📱 Navigation
1. Login at `/login`
2. Dashboard shows at `/admin/dashboard`
3. Sidebar has expandable "Bhakti Categories" menu
4. Click any category to manage content

---

## 🚀 Next Development Tasks (Future)

### P1 - TTS Integration
- [ ] Implement OpenAI TTS worker for audio generation
- [ ] Build audio player with text highlighting sync
- [ ] Add audio-text timestamp editor

### P2 - Content Expansion
- [ ] Import remaining 80+ artis
- [ ] Complete all 54 chalisas with full verses
- [ ] Add all 108 names for each deity in Namavali
- [ ] Complete 1000 names for each Sahasranama

### P3 - Mobile App Sync
- [ ] Build content sync API for Expo app
- [ ] Offline content caching
- [ ] Audio download management

---

## 📝 Content Source Files
- Categories structure: `Bhakti Content Categories.docx`
- Full content: `All 10 Bhakti details in One file.docx`

---

## ⚙️ Commands Reference

### Restart Services
```bash
sudo supervisorctl restart backend frontend
```

### Check Logs
```bash
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.out.log
```

### Re-seed Content
```bash
cd /app/backend && python seed_bhakti_content.py
```

---

*Last Updated: April 5, 2026*
