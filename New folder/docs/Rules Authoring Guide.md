# Rules Authoring Guide

This guide explains how to create and edit data-driven rules for the prediction engine, how confidence is computed, and how to keep outputs deterministic and explainable.

## Architecture
- Signals layer: computes structured features from the chart, dashas, and transits.
- Rules layer: JSON files describing conditions (`all`/`any` atoms) with simple operations over signal paths.
- Renderer: converts rule hits into premium predictions with multi-line WHY showing exact values.

## Signals
Signals are produced by `apps/api/core/signals.py`. Key namespaces:
- `natal.houses.<Planet>.from_lagna` and `from_moon`
- `natal.dignity.<Planet>`: Exalted, Own, Mooltrikona, Neutral, Debilitated
- `natal.combust.<Planet>`: boolean
- `natal.graha_drishti.<Planet>`: list of houses the planet aspects (special drishti)
- `natal.yogas.<YogaName>`: boolean (e.g., `Gajakesari`, `BudhaAditya`, `ChandraMangal`, `RajaYoga`, `DhanaYoga`, `VipareetaRaja`)
- `natal.strength.<Planet>`: 0.0–1.0 heuristic score
- `natal.d9` / `natal.d10`: divisional chart house placements
- `dasha.maha/antar`: lord, dignity, placement info
- `transit.houses.<Planet>.from_moon` and `from_lagna`, `transit.houses.<Planet>.sign`
- `transit.by_planet.<Planet>.aspects_natal`: list of natal planets in conjunction/opposition

## Rule format
Rules are authored in JSON (see `apps/api/core/rules/vedic.json`). Example:

```
{
  "id": "career_growth_jupiter_10",
  "domain": "career",
  "system": "vedic",
  "tone": "positive",
  "headline": "Career expansion windows under Jupiter",
  "description": "When Jupiter activates the 10th from Moon/Lagna and 10th-related natal strengths are present, expect clear career uplift.",
  "timeframe": "next_90_days",
  "weight": 0.75,
  "conditions": {
    "all": [
      {"path": "transit.houses.Jupiter.from_moon", "op": "in", "value": [10], "why_format": "Transit Jupiter in {path} = {cur}"},
      {"path": "natal.strength.Jupiter", "op": "ge", "value": 0.6, "why_format": "Natal Jupiter strength = {cur}"}
    ],
    "any": [
      {"path": "natal.houses.Sun.from_lagna", "op": "eq", "value": 10, "why_format": "Sun in 10th from Lagna = {cur}"},
      {"path": "natal.houses.Mercury.from_lagna", "op": "eq", "value": 10, "why_format": "Mercury in 10th from Lagna = {cur}"}
    ]
  },
  "what": ["New projects or leadership responsibilities open"],
  "do": ["Pitch initiatives aligned to long-term impact"],
  "dont": ["Defer key decisions beyond the window"]
}
```

### Operations
- `eq`, `ne`, `ge`, `le`, `in` over numeric/string/boolean.
- `path` resolves dotted keys inside signals.
- `why_format` prints a precise WHY line with `{path}` and `{cur}` value.

### Confidence
`confidence = min(1.0, weight + 0.05 * triggers_count)` where `weight` is the base confidence (`0.5–0.85` typical). Add atoms to `all` and `any` to improve confidence.

## Determinism & Explainability
- Every prediction must cite at least 2 WHY triggers with exact values (houses, signs, degrees, etc.).
- Avoid labels like `venus_strong`; use `natal.strength.Venus = 0.72` and `natal.dignity.Venus = Own`.
- The genericness filter drops overly generic lines; keep guidance specific to activated houses/planets.

## Adding a new yoga or rule
1. Implement detection in `compute_yogas()` in `signals.py` and return a boolean flag.
2. Add a rule in `apps/api/core/rules/vedic.json` referencing `natal.yogas.<YogaName>`.
3. Provide specific `what/do/dont` tied to the yoga’s outcomes.
4. Run snapshot tests to validate stability.

## Tests
- Unit tests should cover: house overlays, dignity classification, drishti lists, yoga detection, dasha contexts, transit overlays.
- Snapshot tests: generate predictions for the sample chart and assert stable top headlines and WHY trigger shapes.

## Migration notes
- The old inline rules are removed; rules are now authored under `apps/api/core/rules/`.
- The prediction model now includes `what_this_means` and richer `triggers` in evidence.
- Divisional charts now include D9 and simplified D10 for relationship/career refinement.
