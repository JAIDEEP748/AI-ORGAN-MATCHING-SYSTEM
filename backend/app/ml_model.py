import os
import logging
import numpy as np

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "organ_priority_xgboost.pkl"
)


class FallbackPriorityModel:
    """Fallback ranking model in case XGBoost native library is unavailable."""
    def predict(self, feature_rows):
        feature_rows = np.array(feature_rows)
        # Features: [urgency_score, waiting_time_score, distance_km, hospital_readiness_score]
        # Weighted formula matching clinical prioritization heuristics
        urgency = feature_rows[:, 0]
        waiting = feature_rows[:, 1]
        distance = feature_rows[:, 2]
        readiness = feature_rows[:, 3]

        # Normalized distance penalty
        dist_factor = np.clip(1.0 - (distance / 2000.0), 0.0, 1.0)

        scores = (
            (urgency * 0.40) +
            (waiting * 0.25) +
            (readiness * 0.20) +
            (dist_factor * 15.0)
        )
        return scores


class FallbackExplainer:
    """Fallback SHAP explainer providing feature contributions."""
    def shap_values(self, feature_rows):
        rows = np.array(feature_rows)
        shap_vals = []
        for r in rows:
            urgency_contrib = float(r[0] * 0.40)
            waiting_contrib = float(r[1] * 0.25)
            dist_factor = float(max(0.0, 1.0 - (r[2] / 2000.0)) * 15.0)
            readiness_contrib = float(r[3] * 0.20)
            shap_vals.append([
                urgency_contrib,
                waiting_contrib,
                dist_factor,
                readiness_contrib
            ])
        return shap_vals


try:
    import joblib
    import shap
    model = joblib.load(MODEL_PATH)
    explainer = shap.TreeExplainer(model)
    print("XGBoost model and SHAP explainer loaded successfully!")
except Exception as e:
    logger.warning(f"Could not load native XGBoost model ({e}). Using clinical fallback model.")
    print(f"Notice: XGBoost native binary not loaded ({e}). Active FallbackPriorityModel enabled.")
    model = FallbackPriorityModel()
    explainer = FallbackExplainer()
