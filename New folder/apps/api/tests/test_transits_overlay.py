from core.pipeline import ChartPipeline
from core.transits import TransitCalculator
from core.models import ChartInput
from datetime import datetime


def test_transit_overlay_houses_signs():
    cp = ChartPipeline()
    tc = TransitCalculator()
    chart = cp.calculate(ChartInput(
        name="Test",
        local_datetime=datetime(1990, 1, 1, 12, 0),
        place="Delhi",
        lat=None,
        lon=None,
        timezone=None,
        unknown_time=False
    ))
    transits = tc.calculate(chart, datetime(2025, 1, 1, 12, 0))
    jup = next(t for t in transits if t.planet == "Jupiter")
    assert 1 <= jup.from_natal_moon <= 12
    assert 1 <= jup.from_natal_lagna <= 12
    assert jup.current_sign in [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]