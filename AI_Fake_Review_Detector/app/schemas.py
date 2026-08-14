from pydantic import BaseModel, Field
from typing import Literal

class ReviewIn(BaseModel):
    text: str = Field(..., min_length=1)

class Verdict(BaseModel):
    label: Literal["fake", "genuine"]
    score: float
    confidence: Literal["high", "low"]
    reason: str