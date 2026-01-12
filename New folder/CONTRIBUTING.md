# Contributing to Astro Kundli

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🌟 How Can I Contribute?

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/astro-kundli/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Birth chart details if calculation-related (DOB, TOB, Place)
   - Screenshots if UI-related

### Suggesting Features

1. Open a [GitHub Discussion](https://github.com/yourusername/astro-kundli/discussions)
2. Describe the feature and its use case
3. Wait for community feedback before implementing

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write tests for new functionality
5. Ensure all tests pass (`pytest` for backend, `npm test` for frontend)
6. Commit with descriptive messages
7. Push to your fork
8. Open a Pull Request

## 📝 Coding Standards

### Python (Backend)

- Follow PEP 8
- Use type hints
- Format with Black: `black apps/api`
- Lint with Ruff: `ruff check apps/api`
- Write docstrings for all functions

```python
def calculate_nakshatra(longitude: float) -> tuple[str, int]:
    """
    Calculate nakshatra and pada from sidereal longitude.
    
    Args:
        longitude: Sidereal longitude (0-360°)
        
    Returns:
        Tuple of (nakshatra_name, pada)
    """
    nakshatra_num = int(longitude / 13.333333) % 27
    pada = int((longitude % 13.333333) / 3.333333) + 1
    return NAKSHATRAS[nakshatra_num], pada
```

### TypeScript (Frontend)

- Use TypeScript strict mode
- Follow ESLint rules: `npm run lint`
- Use Prettier for formatting
- Prefer functional components with hooks

```typescript
interface ChartData {
  vedic: VedicData
  western: WesternData
}

export const ChartDisplay: React.FC<{ data: ChartData }> = ({ data }) => {
  // Component implementation
}
```

## 🧪 Testing Requirements

### Backend Tests

All new features must include tests:

```python
def test_new_feature():
    """Test description"""
    input_data = ChartInput(...)
    result = new_feature(input_data)
    assert result.expected_value == actual_value
```

Run tests before submitting:
```bash
cd apps/api
pytest tests/ -v
```

### Frontend Tests

Add tests for new components:
```typescript
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

test('renders correctly', () => {
  render(<MyComponent />)
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

## 🎯 Adding New Features

### Adding a Prediction Rule

1. Edit `apps/api/core/predictions.py`
2. Add to `_get_starter_rules()`:

```python
{
    "id": "new_rule_001",
    "system": "vedic",  # or "western"
    "domain": "career",  # or wealth, relationships, health
    "tone": "positive",  # or neutral, cautionary
    "headline": "Short headline (3-7 words)",
    "description": "Detailed explanation",
    "conditions": {
        "natal": "condition_description",
        "dasha": ["Jupiter", "Venus"],
        "transits": {"Jupiter": 10}
    },
    "weight": 0.7,  # 0.0-1.0 confidence
    "do": ["Actionable suggestion 1", "Suggestion 2"],
    "dont": ["Thing to avoid 1", "Thing to avoid 2"]
}
```

3. Write test:
```python
def test_new_rule():
    chart = create_test_chart()
    predictions = engine.generate(chart, dashas, transits)
    assert any(p.id.startswith("new_rule") for p in predictions['now'])
```

### Adding a Divisional Chart (Varga)

1. Edit `apps/api/core/pipeline.py`
2. Add calculation method:

```python
def _calculate_d7_chart(self, planets: List[VedicPlanetPosition]) -> Dict[int, List[str]]:
    """Calculate D7 (Saptamsa) chart for children"""
    d7_chart = {i: [] for i in range(1, 13)}
    
    for planet in planets:
        # D7: Each sign divided into 7 parts
        d7_position = (planet.longitude * 7 / 30) % 360
        sign = int(d7_position / 30)
        d7_chart[sign + 1].append(planet.name)
    
    return d7_chart
```

3. Add to `VedicData` model in `core/models.py`:
```python
d7_chart: Optional[Dict[int, List[str]]] = None
```

4. Update pipeline to call it:
```python
vedic.d7_chart = self._calculate_d7_chart(vedic_planets)
```

### Adding Chart Visualization

1. Create component in `apps/web/src/components/charts/`
2. Example North Indian chart:

```typescript
export const NorthIndianChart: React.FC<{ chartData: D1Chart }> = ({ chartData }) => {
  return (
    <svg width="400" height="400" viewBox="0 0 400 400">
      {/* Diamond layout for North Indian style */}
      <g transform="rotate(45 200 200)">
        {/* Houses and planets */}
      </g>
    </svg>
  )
}
```

## 📚 Documentation

Update documentation for:
- New API endpoints → Add to README.md
- New features → Update README.md Features section
- Configuration changes → Update docker-compose.yml docs
- Calculation methodology → Add to ARCHITECTURE.md

## 🔒 Security

- Never commit API keys or secrets
- Use environment variables for configuration
- Validate all user inputs
- Follow OWASP guidelines for web security

## 🌍 Localization

When adding Hindi translations:

1. Edit `apps/web/src/i18n/hi.json`:
```json
{
  "create_kundli": "कुंडली बनाएं",
  "birth_details": "जन्म विवरण"
}
```

2. Use translation hook:
```typescript
const { t } = useTranslation()
return <h1>{t('create_kundli')}</h1>
```

## ⚖️ License Compliance

This project is AGPL-3.0 licensed due to Swiss Ephemeris usage.

**All contributions must:**
- Be compatible with AGPL-3.0
- Not include proprietary code
- Include proper attribution for external code
- Respect Swiss Ephemeris license terms

## 🎓 Learning Resources

**Vedic Astrology:**
- *Light on Life* by Hart de Fouw
- *Brihat Parashara Hora Shastra* (classical text)
- Ernst Wilhelm's courses

**Swiss Ephemeris:**
- Official documentation: https://www.astro.com/swisseph/
- pyswisseph docs: https://github.com/astrorigin/pyswisseph

**Project Tech Stack:**
- Next.js: https://nextjs.org/docs
- FastAPI: https://fastapi.tiangolo.com/
- TypeScript: https://www.typescriptlang.org/docs/

## 💬 Getting Help

- **Questions:** Open a [GitHub Discussion](https://github.com/yourusername/astro-kundli/discussions)
- **Bugs:** Open an [Issue](https://github.com/yourusername/astro-kundli/issues)
- **Chat:** Join our Discord (link in README)

## 🙏 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Respect different astrological traditions
- No harassment or discrimination

---

**Thank you for contributing to Astro Kundli! 🌟**
