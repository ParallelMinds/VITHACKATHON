#risk_mapping.py

def compute_risk(detection, anomaly, mismatch):
    w1, w2, w3 = 0.5, 0.3, 0.2
    risk = (w1 * detection + w2 * anomaly + w3 * mismatch) * 100
    return round(risk, 2)


def get_decision(risk):

    if risk >= 70:
        return "HIGH RISK"

    elif risk >= 40 and risk<70:
        return "SUSPICIOUS"

    else:
        return "SAFE"