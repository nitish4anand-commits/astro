from core.signals import compute_house_overlays, compute_dignities, compute_strengths, compute_yogas
from core.pipeline import ChartPipeline
from core.models import ChartInput

from datetime import datetime

def sample_input():
    return ChartInput(
        name="Test",
        local_datetime=datetime(1995, 5, 20, 10, 30),
        place="Mumbai",
        lat=None,
        lon=None,
        timezone=None,
        unknown_time=False
    )


def test_house_overlays_and_dignity():
    cp = ChartPipeline()
    chart = cp.calculate(sample_input())
    houses = compute_house_overlays(chart.vedic)
    assert "Sun" in houses and "Moon" in houses
    d = compute_dignities(chart.vedic)
    assert set(d.keys()) >= {"Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"}


def test_strengths_and_yogas():
    cp = ChartPipeline()
    chart = cp.calculate(sample_input())
    strengths = compute_strengths(chart.vedic)
    assert 0.0 <= strengths["Sun"] <= 1.0
    yogas = compute_yogas(chart.vedic)
    assert isinstance(yogas, dict)
