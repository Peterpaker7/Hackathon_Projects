import joblib

class Predictor:
    def __init__(self):
        self.model = None
        self.vectorizer = None

    def load(self):
        self.model = joblib.load("app/artifacts/fake_review_model.pkl")
        self.vectorizer = joblib.load("app/artifacts/tfidf_vectorizer.pkl")

    def predict(self, text: str) -> dict:
        X = self.vectorizer.transform([text])          # vectorize FIRST
        proba = self.model.predict_proba(X)[0]         # [P(deceptive), P(truthful)]
        truthful_score = float(proba[1])              # index 1 = truthful

        label = "genuine" if truthful_score >= 0.5 else "fake"
        confidence = "low" if 0.4 <= truthful_score <= 0.6 else "high"

        return {
            "label": label,
            "score": round(truthful_score * 100, 1),
            "confidence": confidence,
            "reason": self.reason(text, label),
        }
        
    def reason(self, text: str, label: str) -> str:
        X = self.vectorizer.transform([text])
        names = self.vectorizer.get_feature_names_out()
        coefs = self.model.coef_[0]                 # positive = toward truthful

        contribs = [(names[i], float(X[0, i] * coefs[i])) for i in X.nonzero()[1]]
        
        if not contribs:
            return "Not enough recognizable words to explain this prediction."

        if label == "fake":
            # words pushing toward deceptive = most negative
            words = [w for w, c in sorted(contribs, key=lambda x: x[1])[:3] if c < 0]
            if not words:
                return "Flagged mainly by overall wording rather than specific words."
            return "Flagged as fake mainly due to vague, exaggerated wording like: " + ", ".join(words) + "."
        else:
            # words pushing toward truthful = most positive
            words = [w for w, c in sorted(contribs, key=lambda x: x[1], reverse=True)[:3] if c > 0]
            if not words:
                return "Rated genuine based on overall wording."
            return "Rated genuine mainly due to concrete, specific details like: " + ", ".join(words) + "."

predictor = Predictor()