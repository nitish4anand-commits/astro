# Quick Start Guide

This guide will help you get Astro Kundli running on your local machine.

## Prerequisites Installation

### 1. Install Node.js (for Frontend)

**Windows:**
1. Download from https://nodejs.org/ (LTS version 18.x or higher)
2. Run the installer
3. Verify installation:
```powershell
node --version
npm --version
```

**macOS:**
```bash
brew install node@18
```

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install Python (for Backend)

**Windows:**
1. Download from https://python.org (3.11 or higher)
2. **Important:** Check "Add Python to PATH" during installation
3. Verify:
```powershell
python --version
pip --version
```

**macOS:**
```bash
brew install python@3.11
```

**Linux:**
```bash
sudo apt update
sudo apt install python3.11 python3-pip
```

### 3. Install Docker (Optional but Recommended)

**Windows & macOS:**
- Download Docker Desktop: https://www.docker.com/products/docker-desktop

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl start docker
sudo systemctl enable docker
```

Verify:
```bash
docker --version
docker-compose --version
```

---

## Setup Instructions

### Option A: Docker Setup (Easiest)

```bash
# 1. Navigate to project folder
cd "path/to/astro-kundli"

# 2. Start everything
docker-compose up --build

# 3. Wait for services to start (2-3 minutes)

# 4. Open browser:
# - Frontend: http://localhost:3000
# - API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

**To stop:**
```bash
docker-compose down
```

### Option B: Manual Setup

#### Backend Setup

```powershell
# 1. Navigate to API folder
cd apps/api

# 2. Create virtual environment (recommended)
python -m venv venv

# 3. Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat
# macOS/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Start API server
python -m uvicorn main:app --reload --port 8000

# Server will start at: http://localhost:8000
```

#### Frontend Setup (New Terminal)

```bash
# 1. Navigate to web folder
cd apps/web

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# Server will start at: http://localhost:3000
```

---

## First-Time Usage

### 1. Open the Application

Navigate to http://localhost:3000

### 2. Create Your First Kundli

1. Click "Create Kundli" button
2. Fill in the form:
   - **Name:** Your name
   - **Date & Time:** Your birth date and time
   - **Place:** Select from Indian cities dropdown
   - Lat/Long will auto-populate

3. Click "Create Kundli"
4. View your complete birth chart!

### 3. Explore Features

- **Chart Tab:** View D1 (Rashi) chart with planetary positions
- **Planets Tab:** Detailed planetary positions with nakshatras
- **Dashas Tab:** Vimshottari dasha periods
- **Predictions Tab:** Personalized predictions with evidence

---

## Testing the API

### Using Swagger UI

1. Open http://localhost:8000/docs
2. Try the `/v1/chart` endpoint
3. Click "Try it out"
4. Use this example:

```json
{
  "name": "Test User",
  "local_datetime": "1990-01-01T12:00:00",
  "place": "Mumbai, India",
  "lat": 19.076,
  "lon": 72.8777,
  "timezone": "Asia/Kolkata",
  "unknown_time": false
}
```

5. Click "Execute"
6. View the calculated chart response

### Using curl

```bash
curl -X POST http://localhost:8000/v1/chart \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "local_datetime": "1990-01-01T12:00:00",
    "place": "Mumbai, India",
    "lat": 19.076,
    "lon": 72.8777
  }'
```

---

## Common Issues & Solutions

### Issue: "npm: command not found"

**Solution:** Node.js is not installed or not in PATH
- Reinstall Node.js and ensure "Add to PATH" is checked
- Restart your terminal/PowerShell

### Issue: "python: command not found"

**Solution:** Python is not installed or not in PATH
- Reinstall Python and check "Add Python to PATH"
- Try `python3` instead of `python`

### Issue: "Port 8000 already in use"

**Solution:** Another process is using port 8000
```bash
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9
```

### Issue: Swiss Ephemeris files not downloading

**Solution:** Manual download
```python
# Run in Python:
import swisseph as swe
swe.set_ephe_path('./ephe')
# This will trigger download
```

### Issue: Module not found errors

**Solution:** Reinstall dependencies
```bash
# Backend:
cd apps/api
pip install -r requirements.txt --force-reinstall

# Frontend:
cd apps/web
rm -rf node_modules package-lock.json
npm install
```

---

## Development Workflow

### Making Changes

1. **Backend Changes:**
   - Edit files in `apps/api/`
   - FastAPI auto-reloads on save
   - Check logs in terminal

2. **Frontend Changes:**
   - Edit files in `apps/web/src/`
   - Next.js auto-reloads on save
   - Check browser console for errors

### Running Tests

```bash
# Backend tests
cd apps/api
pytest tests/ -v

# Frontend tests
cd apps/web
npm test
```

### Code Quality

```bash
# Python linting
cd apps/api
ruff check .

# TypeScript type checking
cd apps/web
npm run typecheck
```

---

## Project Structure Overview

```
astro-kundli/
├── apps/
│   ├── api/              # FastAPI backend
│   │   ├── core/         # Core calculation logic
│   │   │   ├── pipeline.py   # 5-layer calculation pipeline
│   │   │   ├── dasha.py      # Vimshottari dasha engine
│   │   │   ├── transits.py   # Transit calculator
│   │   │   ├── predictions.py # Prediction engine
│   │   │   └── models.py     # Data models
│   │   ├── tests/        # Test suite
│   │   ├── main.py       # FastAPI app entry
│   │   └── requirements.txt
│   └── web/              # Next.js frontend
│       ├── src/
│       │   ├── app/      # Pages (Next.js 14 App Router)
│       │   ├── components/ # UI components
│       │   └── lib/      # Utilities & API client
│       └── package.json
├── docker-compose.yml    # Docker orchestration
├── README.md            # Main documentation
└── LICENSE              # AGPL-3.0 license
```

---

## Next Steps

1. **Read the full README.md** for feature details
2. **Explore CONTRIBUTING.md** to add features
3. **Check DEPLOY.md** for production deployment
4. **Join discussions** on GitHub

---

## Getting Help

- **Documentation:** Check README.md and other guides
- **Issues:** https://github.com/yourusername/astro-kundli/issues
- **Discussions:** https://github.com/yourusername/astro-kundli/discussions

**Happy Calculating! 🌟**
