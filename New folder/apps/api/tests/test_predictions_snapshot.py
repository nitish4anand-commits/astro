from core.pipeline import ChartPipeline
from core.dasha import VimshottariDasha
from core.transits import TransitCalculator
from core.predictions import PredictionEngine
from core.models import ChartInput
from datetime import datetime


def test_predictions_summary_and_triggers():
    cp = ChartPipeline()
    de = VimshottariDasha()
    tc = TransitCalculator()
    pe = PredictionEngine()

    chart = cp.calculate(ChartInput(
        name="Snapshot",
        local_datetime=datetime(1992, 3, 15, 14, 20),
        place="Bengaluru",
        lat=None,
        lon=None,
        timezone=None,
        unknown_time=False
    ))
    dashas = de.calculate(chart.vedic.moon_longitude)
    transits = tc.calculate(chart, datetime.utcnow())

    result = pe.generate(chart, dashas, transits)
    assert isinstance(result, dict)
    assert "predictions" in result and "summary" in result

    for tf, preds in result["predictions"].items():
        assert len(preds) <= 10
        # Each prediction must have >=2 triggers in WHY
        for p in preds:
            assert p.evidence and len(p.evidence) >= 1
            ev = p.evidence[0]
            assert len(ev.triggers) >= 2

    # Summary contains executive list and activated flags
    for tf, summ in result["summary"].items():
        assert "executive" in summ
        assert "activated_themes" in summ
        assert "caution_flags" in summ
