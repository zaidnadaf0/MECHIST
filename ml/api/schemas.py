from typing import List, Optional
from pydantic import BaseModel, Field

class Candidate(BaseModel):
    mechanic_id: str
    customer_lat: float = Field(ge=-90, le=90)
    customer_lng: float = Field(ge=-180, le=180)
    problem_category: str = Field(description="flat-tyre|battery|engine|tow|other")
    vehicle_type: str
    urgency: str = Field(description="low|medium|high|critical")
    mechanic_lat: float
    mechanic_lng: float
    service_radius_km: float = Field(ge=0)
    rating: float = Field(ge=0, le=5)
    review_count: int = Field(ge=0)
    experience_years: int = Field(ge=0)
    availability: str = Field(description="available|busy")
    active_jobs: int = Field(ge=0)
    completion_rate: float = Field(ge=0, le=1)
    eta_min: float = Field(ge=0)
    distance_km: float = Field(ge=0)
    specialty_match: int = Field(ge=0, le=1)
    vehicle_match: int = Field(ge=0, le=1)
    within_service_radius: int = Field(ge=0, le=1)

class PredictRequest(BaseModel):
    candidate: Candidate

class PredictResponse(BaseModel):
    mechanic_id: str
    score: float
    model: str
    version: str

class RankRequest(BaseModel):
    candidates: List[Candidate]

class RankedItem(BaseModel):
    mechanic_id: str
    score: float
    rank: int

class RankResponse(BaseModel):
    ranked: List[RankedItem]
    model: str
    version: str
