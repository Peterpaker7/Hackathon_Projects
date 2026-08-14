from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .schemas import ReviewIn, Verdict
from .predictor import predictor

@asynccontextmanager
async def lifespan(app: FastAPI):
    predictor.load()
    yield

app = FastAPI(title="Fake Review Detector", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "loaded": predictor.model is not None}

@app.post("/predict", response_model=Verdict)
def predict(review: ReviewIn):
    result = predictor.predict(review.text)
    return Verdict(**result)