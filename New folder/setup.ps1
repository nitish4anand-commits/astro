# Astro Kundli - Installation Script for Windows
# Run this in PowerShell as Administrator

Write-Host "🔮 Astro Kundli - Automated Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Please run this script as Administrator" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✓ Node.js is installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found" -ForegroundColor Red
    Write-Host "  Installing Node.js..." -ForegroundColor Yellow
    
    # Download and install Node.js using winget
    winget install OpenJS.NodeJS.LTS
    
    Write-Host "✓ Node.js installed. Please restart PowerShell and run this script again." -ForegroundColor Green
    exit 0
}

# Check Python
Write-Host "Checking Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>$null
if ($pythonVersion) {
    Write-Host "✓ Python is installed: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Python not found" -ForegroundColor Red
    Write-Host "  Installing Python..." -ForegroundColor Yellow
    
    # Download and install Python using winget
    winget install Python.Python.3.11
    
    Write-Host "✓ Python installed. Please restart PowerShell and run this script again." -ForegroundColor Green
    exit 0
}

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
$dockerVersion = docker --version 2>$null
if ($dockerVersion) {
    Write-Host "✓ Docker is installed: $dockerVersion" -ForegroundColor Green
} else {
    Write-Host "⚠️  Docker not found (optional but recommended)" -ForegroundColor Yellow
    Write-Host "  Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Installing project dependencies..." -ForegroundColor Yellow
Write-Host ""

# Install root dependencies
Write-Host "📦 Installing root dependencies..." -ForegroundColor Cyan
npm install --legacy-peer-deps

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Cyan
Set-Location apps\api
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
deactivate
Set-Location ..\..

# Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location apps\web
npm install --legacy-peer-deps
Set-Location ..\..

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 To start the application:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1 - Docker (Recommended):" -ForegroundColor Yellow
Write-Host "  docker-compose up --build" -ForegroundColor White
Write-Host ""
Write-Host "Option 2 - Manual:" -ForegroundColor Yellow
Write-Host "  Terminal 1 - Backend:" -ForegroundColor White
Write-Host "    cd apps\api" -ForegroundColor Gray
Write-Host "    .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "    python -m uvicorn main:app --reload --port 8000" -ForegroundColor Gray
Write-Host ""
Write-Host "  Terminal 2 - Frontend:" -ForegroundColor White
Write-Host "    cd apps\web" -ForegroundColor Gray
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Documentation:" -ForegroundColor Cyan
Write-Host "  - README.md - Full documentation" -ForegroundColor Gray
Write-Host "  - QUICKSTART.md - Setup guide" -ForegroundColor Gray
Write-Host "  - PROJECT_SUMMARY.md - Implementation overview" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 Access the app at:" -ForegroundColor Cyan
Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  - API: http://localhost:8000" -ForegroundColor White
Write-Host "  - API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Happy calculating! 🌟" -ForegroundColor Magenta
