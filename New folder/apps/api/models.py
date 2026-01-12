from sqlalchemy import Column, String, Text, Date, DateTime, Numeric, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from db import Base


class LocationCache(Base):
    __tablename__ = "locations_cache"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query = Column(Text, nullable=False)
    provider = Column(String(50), nullable=False)
    result_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class HoroscopeCache(Base):
    __tablename__ = "horoscope_cache"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = Column(Date, nullable=False)
    tz = Column(String(64), nullable=False)
    lat_round = Column(Numeric(6, 2), nullable=False)
    lon_round = Column(Numeric(6, 2), nullable=False)
    basis = Column(String(16), nullable=False)  # moon_sign | lagna | sun_sign
    rashi = Column(String(16), nullable=True)
    lagna_sign = Column(String(16), nullable=True)
    title = Column(Text, nullable=False)
    body_md = Column(Text, nullable=False)
    highlights = Column(JSON, nullable=False)
    cautions = Column(JSON, nullable=False)
    remedy = Column(Text, nullable=True)
    scores = Column(JSON, nullable=False)
    astro_facts = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint(
            "date", "tz", "lat_round", "lon_round", "basis", "rashi",
            name="uq_horoscope_cache_key"
        ),
    )


class LocationUsage(Base):
    __tablename__ = "location_usage"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tz = Column(String(64), nullable=False)
    lat_round = Column(Numeric(6, 2), nullable=False)
    lon_round = Column(Numeric(6, 2), nullable=False)
    hit_at = Column(DateTime(timezone=True), server_default=func.now())
