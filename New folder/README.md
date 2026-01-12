# Astro Kundli — Daily Horoscope (Vedic)

License: AGPL-3.0-only

## Stack
- Backend: FastAPI (Python 3.11), Swiss Ephemeris (pyswisseph, Lahiri)
- DB: Postgres
- Frontend: Next.js (App Router) + TypeScript
- Worker/Scheduler: Python service (same image as API)

## Features
- Location-aware daily horoscope with Moon Sign, Lagna, or Sun Sign basis
- Panchang at local sunrise (tithi, nakshatra, yoga, karana, weekday)
- Whole-sign houses (engine-ready)
- Open geocoding via Nominatim (with caching)
- Deterministic rule engine (no scraping, no random text)
- Caching in Postgres and scheduled refresh for popular locations

## Quick Start

1. Create `.env` from example:
```
cp .env.example .env
```

2. Start via Docker Compose:
```
docker compose up --build
```

3. Open web: http://localhost:3000 and pick a location + basis under /horoscope.

## Endpoints (Backend)
- POST /api/geo/search {query}
- POST /api/geo/reverse {lat, lon}
- GET /api/horoscope/today?basis=moon_sign|lagna|sun_sign&lat&lon&tz
- GET /api/horoscope/{date}?basis=...&lat&lon&tz

## Deterministic Rules
Rules are template-driven using planetary positions and Panchang at local sunrise. No third-party content is used. Unit tests ensure same inputs => same outputs.

## License
This project is licensed under the GNU AGPL v3.0. See LICENSE for details.
# Astro Kundli 🔮

**Open-source Vedic & Western Astrology Web App**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![CI](https://github.com/yourusername/astro-kundli/workflows/CI/badge.svg)](https://github.com/yourusername/astro-kundli/actions)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

A production-ready astrology web application for Indian users featuring accurate Vedic and Western calculations using Swiss Ephemeris.

## ✨ Features

### Vedic Astrology (Primary)
- 🏠 **D1 (Rashi) Chart** - North & South Indian styles
- 📊 **Divisional Charts** - D9 (Navamsa), D10 (Dashamsa)
- ⭐ **Nakshatra & Pada** - Complete lunar mansion analysis
- 🔄 **Vimshottari Dasha** - Maha, Antar, and Pratyantar periods with current period highlighting
- 🌙 **Gochar (Transits)** - Saturn, Jupiter, Rahu-Ketu transits from Moon & Lagna
- 🪐 **Sade Sati Calculator** - Saturn's 7.5-year transit phases

### Western Astrology (Secondary)
- 🎯 **Tropical Wheel** - Complete natal chart
- 🔗 **Aspects** - Conjunction, Opposition, Trine, Square, Sextile
- 👑 **Dignities** - Exaltation, Detriment, Rulership
- 🏛️ **Multiple House Systems** - Placidus, Koch, Equal, Whole Sign

### Predictions with Explainability
- 📈 **Rule DSL Engine** - 20 starter rules (Career, Wealth, Relationships, Health)
- 🎯 **Timeframes** - Now, Next 90 days, Next 12 months
- 💡 **Evidence Trace** - "Why am I seeing this?" with triggered conditions
- ✅ **Do's & Don'ts** - Actionable suggestions
- 🔒 **Conservative Tone** - Non-alarmist, realistic predictions

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    5-Layer Pipeline                      │
├─────────────────────────────────────────────────────────┤
│ 1. Input Normalization (DOB/TOB/Place)                  │
│ 2. Geo + Timezone Resolution → UTC + Lat/Long           │
│ 3. Swiss Ephemeris Calculations (Raw longitudes, ASC)   │
│ 4. Vedic Transforms (Sidereal + Ayanamsa + Nakshatras)  │
│ 5. Western Transforms (Tropical + Aspects)              │
└─────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Next.js    │◄────►│   FastAPI    │◄────►│    Swiss     │
│  Frontend    │      │   Backend    │      │  Ephemeris   │
│ (TypeScript) │      │  (Python)    │      │ (pyswisseph) │
└──────────────┘      └──────────────┘      └──────────────┘
       │                     │                      │
       └─────────────────────┴──────────────────────┘
                      Docker Compose
```

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Axios for API calls

**Backend:**
- Python 3.11+ FastAPI
- pyswisseph (Swiss Ephemeris)
- pytz + timezonefinder (Timezone accuracy)
- geopy (Geocoding for Indian cities)

**DevOps:**
- Docker + docker-compose
- GitHub Actions CI/CD
- pytest (Backend tests)
- Ruff (Python linting)

---

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (recommended)
- OR: Node.js 18+, Python 3.11+

### Option 1: Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/astro-kundli.git
cd astro-kundli

# Start all services
docker-compose up --build

# Access:
# - Web: http://localhost:3000
# - API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

### Option 2: Local Development

```bash
# Install root dependencies
npm install

# Backend setup
cd apps/api
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Frontend setup (in new terminal)
cd apps/web
npm install
npm run dev

# Access:
# - Web: http://localhost:3000
# - API: http://localhost:8000
```

---

## 📖 How It Works

### 1. Calculation Pipeline

The 5-layer pipeline ensures accuracy:

```python
# Layer 1: Input Normalization
ChartInput(
    name="User Name",
    local_datetime=datetime(1990, 1, 1, 12, 0),
    place="Mumbai, India",
    lat=19.076,
    lon=72.8777
)

# Layer 2: Timezone Resolution
# Auto-detects IANA timezone, handles DST historically
# Converts to UTC for calculations

# Layer 3: Swiss Ephemeris
# Calculates planetary positions at exact UTC moment
# Generates house cusps, ascendant, MC

# Layer 4: Vedic Transformations
# Applies Lahiri ayanamsa (~24° for 2000)
# Calculates nakshatras, padas, rashi lords
# Generates D1, D9, D10 charts

# Layer 5: Western Transformations
# Uses tropical zodiac
# Calculates aspects (orbs: 8° major, 6° minor)
# Determines dignities
```

### 2. Prediction Engine

Rule DSL example:

```json
{
  "id": "career_001",
  "domain": "career",
  "system": "vedic",
  "tone": "positive",
  "headline": "Strong Career Growth Period",
  "conditions": {
    "natal": "strong_10th_lord",
    "dasha": ["Sun", "Jupiter", "Mercury"]
  },
  "weight": 0.7,
  "do": ["Focus on leadership", "Network with seniors"],
  "dont": ["Avoid job changes without planning"]
}
```

**How predictions work:**
1. **Natal Promise** - Chart must support the prediction
2. **Dasha Timing** - Current Mahadasha/Antardasha triggers rule
3. **Transit Activation** - Current transits provide timing windows
4. **Evidence Tracking** - All triggered conditions are recorded
5. **Confidence Score** - Weighted based on number of factors

---

## 🧪 Testing

### Backend Tests

```bash
cd apps/api

# Run all tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=core --cov-report=html

# Golden test cases
pytest tests/test_pipeline.py::TestGoldenCases -v
```

### Golden Test Cases

3 verified birth charts included:
1. **Raj Kapoor** (Dec 14, 1924) - Historical verification
2. **Modern Date** (Jan 1, 2000) - Easily verifiable online
3. **DST Test** (July 15, 2023) - Timezone accuracy

### Frontend Tests

```bash
cd apps/web
npm test
```

---

## 📚 API Documentation

### Endpoints

#### `POST /v1/chart`
Generate complete birth chart (Vedic + Western)

**Request:**
```json
{
  "name": "John Doe",
  "local_datetime": "1990-01-01T12:00:00",
  "place": "Mumbai, India",
  "lat": 19.076,
  "lon": 72.8777,
  "timezone": "Asia/Kolkata",
  "unknown_time": false
}
```

**Response:**
```json
{
  "calculation_version": "1.0.0",
  "input_echo": { ... },
  "astronomy": {
    "utc_datetime": "1990-01-01T06:30:00Z",
    "julian_day": 2447893.770833,
    "planets": [...],
    "ascendant": 264.5,
    "house_cusps": [...]
  },
  "vedic": {
    "ayanamsa": 23.85,
    "planets": [...],
    "lagna_rashi": "Sagittarius",
    "d1_chart": {...}
  },
  "western": {
    "planets": [...],
    "aspects": [...]
  }
}
```

#### `POST /v1/dasha/vimshottari`
Calculate Vimshottari Dasha periods

#### `POST /v1/transits`
Calculate current transits (Gochar)

#### `POST /v1/predictions`
Generate predictions with evidence

**Full API docs:** http://localhost:8000/docs

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Adding New Features

**Adding a Prediction Rule:**

1. Edit `apps/api/core/predictions.py`
2. Add rule to `_get_starter_rules()` list
3. Follow Rule DSL schema
4. Test with sample chart

**Adding a Varga Chart:**

1. Edit `apps/api/core/pipeline.py`
2. Implement divisional chart calculation
3. Add to `VedicData` model
4. Write tests

### Code Style

**Python:**
```bash
# Format with Black
black apps/api

# Lint with Ruff
ruff check apps/api
```

**TypeScript:**
```bash
# Lint
npm run lint

# Type check
npm run typecheck
```

---

## 📜 License & Compliance

### AGPL-3.0 License

This project is licensed under the **GNU Affero General Public License v3.0**.

**Why AGPL?**  
Swiss Ephemeris (pyswisseph) is AGPL-licensed. Any software using it must also be AGPL-licensed. This ensures:
- ✅ Full source code transparency
- ✅ Community-driven development
- ✅ No proprietary forks
- ✅ Network use = distribution

**Commercial Use:**  
You can use this commercially under AGPL terms. If you modify and deploy it, you must:
1. Release your modifications under AGPL
2. Provide source code to all users
3. Display license and source code link prominently

### Swiss Ephemeris Compliance

Swiss Ephemeris is copyright **Astrodienst AG** and distributed under AGPL.

**Data Files:**  
Swiss Ephemeris data files are automatically downloaded and stored in `/ephe` directory. These are covered under AGPL.

**Attribution:**  
This software uses Swiss Ephemeris for astronomical calculations.  
Swiss Ephemeris: https://www.astro.com/swisseph/

---

## 🌍 Roadmap

### v1.0 (Current - MVP)
- [x] Complete 5-layer calculation pipeline
- [x] Vedic: D1, D9, D10, Nakshatras, Dashas
- [x] Western: Tropical chart, Aspects
- [x] 20 prediction rules with evidence
- [x] Next.js frontend with shadcn/ui
- [x] Docker deployment
- [x] CI/CD with GitHub Actions

### v1.1 (Next)
- [ ] North/South Indian chart SVG visualization
- [ ] PDF export
- [ ] WhatsApp share functionality
- [ ] More Vargas (D7, D12, D16, D20)
- [ ] Panchang (Tithi, Yoga, Karana)

### v1.2 (Pro Features)
- [ ] Shadbala calculations
- [ ] Ashtakavarga
- [ ] Remedial suggestions (clearly marked as traditional)
- [ ] Multiple Ayanamsa support (Lahiri, KP, Raman)
- [ ] User accounts & chart storage

### v2.0 (Advanced)
- [ ] Hindi localization (full UI)
- [ ] Compatibility matching (synastry)
- [ ] Progressive Web App (PWA)
- [ ] Mobile apps (React Native)
- [ ] Advanced prediction models

---

## 🙏 Acknowledgments

- **Swiss Ephemeris** by Astrodienst AG - Astronomical calculations
- **pyswisseph** by aloistr - Python bindings
- **shadcn/ui** - Beautiful React components
- **Vedic Astrology Community** - Domain knowledge
- **Open Source Contributors** - Bug fixes and features

---

## 📧 Contact & Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/astro-kundli/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/astro-kundli/discussions)
- **Email:** support@astrokundli.com

---

## ⚖️ Disclaimer

This software is for **educational and entertainment purposes only**. Astrological predictions are based on traditional rules and should not be considered as:
- Financial advice
- Medical advice
- Legal advice
- Guaranteed future outcomes

Always consult qualified professionals for important life decisions.

---

**Built with ❤️ for the Vedic Astrology community**

*"The stars incline, they do not compel." - Traditional Astrological Wisdom*
