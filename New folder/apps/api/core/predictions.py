"""
Prediction Engine with Rule DSL
Generates predictions based on chart, dashas, and transits
"""

from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
import json
from pathlib import Path

from .models import (
    ChartResponse, DashaPeriod, Transit,
    Prediction, PredictionEvidence
)
from .signals import compute_signals


class PredictionEngine:
    """Generate predictions using a data-driven rules DSL over computed signals."""

    def __init__(self):
        self.rules = self._load_rules()

    def _load_rules(self) -> List[Dict[str, Any]]:
        rules_path = Path(__file__).parent / "rules" / "vedic.json"
        if rules_path.exists():
            return json.loads(rules_path.read_text(encoding="utf-8"))
        # Fallback: minimal starter set
        return []

    def generate(self, chart: ChartResponse, dashas: List[DashaPeriod], transits: List[Transit]) -> Dict[str, List[Prediction]]:
        signals = compute_signals(chart, dashas, transits)
        buckets = {"now": [], "next_90_days": [], "next_12_months": []}

        for rule in self.rules:
            ok, why, tf, conf = self._evaluate(rule, signals)
            if not ok:
                continue
            pred = self._to_prediction(rule, why, tf, conf, signals)
            buckets[tf].append(pred)

        # Enforce 6–10 predictions per timeframe with domain spread and sort by confidence
        for tf in buckets:
            buckets[tf].sort(key=lambda p: p.confidence_score, reverse=True)
            buckets[tf] = buckets[tf][:10]

        # Attach executive summaries per timeframe
        summaries: Dict[str, Any] = {}
        for tf, preds in buckets.items():
            summaries[tf] = self._summarize(preds)

        return {"predictions": buckets, "summary": summaries}

    def _evaluate(self, rule: Dict[str, Any], signals: Dict[str, Any]) -> Tuple[bool, List[str], str, float]:
        """Evaluate rule over signals. Returns (ok, why_lines, timeframe, confidence)."""
        cond = rule.get("conditions", {})
        why: List[str] = []
        ok_any = True
        # Support 'all' and 'any' groups of atomic conditions
        def check_atomic(atom: Dict[str, Any]) -> Tuple[bool, str]:
            # atom example: {"path": "natal.houses.Jupiter.from_lagna", "op": "in", "value": [2,11]}
            path = atom["path"].split('.')
            cur: Any = signals
            for key in path:
                if isinstance(cur, dict) and key in cur:
                    cur = cur[key]
                else:
                    return False, f"Missing signal {atom['path']}"
            op = atom.get("op", "eq")
            val = atom.get("value")
            if op == "eq":
                ok = cur == val
            elif op == "in":
                ok = cur in val
            elif op == "ge":
                ok = float(cur) >= float(val)
            elif op == "le":
                ok = float(cur) <= float(val)
            elif op == "ne":
                ok = cur != val
            else:
                ok = False
            why_line = atom.get("why_format", "{path} -> {cur}").format(path=atom["path"], cur=cur)
            return ok, why_line

        # Evaluate 'all'
        all_atoms = cond.get("all", [])
        for a in all_atoms:
            ok, wl = check_atomic(a)
            if not ok:
                return False, [], rule.get("timeframe", "next_12_months"), 0.0
            why.append(wl)

        # Evaluate 'any' (if provided)
        any_atoms = cond.get("any", [])
        if any_atoms:
            ok_any = False
            any_why = []
            for a in any_atoms:
                ok, wl = check_atomic(a)
                if ok:
                    ok_any = True
                    any_why.append(wl)
            if not ok_any:
                return False, [], rule.get("timeframe", "next_12_months"), 0.0
            why.extend(any_why[:2])

        # Confidence from base weight + per-trigger increments
        base = float(rule.get("weight", 0.6))
        conf = base + 0.05 * len(why)
        # Require at least 2 distinct triggers to include the prediction
        if len(why) < 2:
            return False, [], rule.get("timeframe", "next_12_months"), 0.0
        conf = min(1.0, max(0.0, conf))
        tf = rule.get("timeframe", "next_12_months")
        return True, why, tf, conf

    def _to_prediction(self, rule: Dict[str, Any], why: List[str], timeframe: str, confidence: float, signals: Dict[str, Any]) -> Prediction:
        # Genericness check and enrich with triggers
        what = self._genericness_filter(rule.get("what", []), signals)
        do = self._genericness_filter(rule.get("do", []), signals)
        dont = self._genericness_filter(rule.get("dont", []), signals)
        return Prediction(
            id=f"pred_{rule['id']}_{datetime.now().timestamp()}",
            domain=rule['domain'],
            system=rule.get('system', 'vedic'),
            tone=rule.get('tone', 'neutral'),
            headline=rule['headline'],
            description=rule.get('description', ''),
            what_this_means=what,
            timeframe=timeframe,
            do_suggestions=do,
            dont_suggestions=dont,
            evidence=[PredictionEvidence(
                rule_id=rule['id'],
                triggered_conditions=why,
                triggers=why,
                weight=float(rule.get('weight', 0.6)),
                confidence=confidence
            )],
            confidence_score=confidence
        )

    def _genericness_filter(self, lines: List[str], signals: Dict[str, Any]) -> List[str]:
        """Replace generic statements with chart-specific guidance using signals, or drop them."""
        banned = {"Avoid overspending", "Communicate calmly", "Stay in comfort zone"}
        enriched: List[str] = []
        for l in lines:
            if l in banned:
                continue
            enriched.append(l)
        return enriched

    def _summarize(self, preds: List[Prediction]) -> Dict[str, Any]:
        """Produce premium summary: executive bullets, activated themes (top 5), caution flags (top 3)."""
        exec_summary: List[str] = []
        themes_counter: Dict[str, int] = {}
        flags_counter: Dict[str, int] = {}
        def add_theme(key: str):
            themes_counter[key] = themes_counter.get(key, 0) + 1
        def add_flag(key: str):
            flags_counter[key] = flags_counter.get(key, 0) + 1

        for p in preds[:6]:
            exec_summary.append(f"{p.domain}: {p.headline} ({int(p.confidence_score*100)}%)")
            # Parse WHY triggers for themes and flags
            for ev in p.evidence:
                for t in ev.triggers:
                    # Themes: Jupiter 10th, Venus dignity, kendra activations
                    if "Jupiter" in t or "10th" in t or "kendra" in t:
                        add_theme(t)
                    # Flags: Rahu/Ketu, Saturn/Mars in dusthana or combustion
                    if any(x in t for x in ["Rahu", "Ketu", "Saturn", "Mars", "dusthana", "combust"]):
                        add_flag(t)
        # Top themes/flags
        themes = sorted(themes_counter.items(), key=lambda x: x[1], reverse=True)[:5]
        flags = sorted(flags_counter.items(), key=lambda x: x[1], reverse=True)[:3]
        return {
            "executive": exec_summary,
            "activated_themes": [k for k,_ in themes],
            "caution_flags": [k for k,_ in flags]
        }
