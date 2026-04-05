# app.py
import sys
import os
import streamlit as st
import tempfile
import pandas as pd

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pipeline.full_pipeline import CargoPipeline
from utils.visualization import draw_boxes
from database import init_db, insert_container, get_latest_container

# ---------------- INIT ----------------
init_db()

st.set_page_config(
    page_title="Cargo Risk Intelligence",
    layout="wide"
)

# ---------------- STYLING ----------------
# ---------------- STYLING ----------------
st.markdown("""
<style>

/* overall background */
.main {
    background: linear-gradient(120deg,#f7f9ff,#eef2ff);
}

/* container spacing */
.block-container {
    padding-top: 2rem;
    padding-bottom: 2rem;
}

/* header title */
.title {
    font-size:48px;
    font-weight:900;
    color:#0f2d7a;
    margin-bottom:20px;
    letter-spacing:1px;
}

/* cards */
.card {
    background:white;
    padding:25px;
    border-radius:16px;
    box-shadow:0px 6px 18px rgba(0,0,0,0.08);
    margin-bottom:20px;
    transition:0.3s;
}

.card:hover{
    transform:translateY(-3px);
    box-shadow:0px 10px 22px rgba(0,0,0,0.12);
}

/* metric cards */
.metric-card {
    background:linear-gradient(135deg,#0a3d91,#1b66d1);
    color:white;
    padding:22px;
    border-radius:12px;
    text-align:center;
    font-size:18px;
    font-weight:600;
}

/* case info strip */
.case-strip {
    background:linear-gradient(135deg,#ffffff,#f1f5ff);
    padding:14px;
    border-radius:12px;
    margin-bottom:20px;
    font-size:17px;
    border-left:6px solid #1b66d1;
}

/* buttons */
div.stButton > button {
    background:linear-gradient(135deg,#0a3d91,#1b66d1);
    color:white;
    border-radius:10px;
    border:none;
    padding:10px 22px;
    font-size:16px;
    font-weight:600;
}

div.stButton > button:hover {
    background:linear-gradient(135deg,#062a67,#144aa0);
}

/* SAFE box */
.safe {
    background:linear-gradient(135deg,#1abc9c,#16a085);
    color:white;
    padding:20px;
    border-radius:12px;
    text-align:center;
    font-size:20px;
    font-weight:700;
}

/* SUSPICIOUS box */
.warn {
    background:linear-gradient(135deg,#f39c12,#e67e22);
    color:white;
    padding:20px;
    border-radius:12px;
    text-align:center;
    font-size:20px;
    font-weight:700;
}

/* HIGH RISK box */
.danger {
    background:linear-gradient(135deg,#e74c3c,#c0392b);
    color:white;
    padding:20px;
    border-radius:12px;
    text-align:center;
    font-size:20px;
    font-weight:700;
}

/* subtitles */
h3 {
    font-size:24px !important;
    font-weight:700;
}

/* dataframe */
[data-testid="stDataFrame"] {
    border-radius:12px;
    overflow:hidden;
}

</style>
""", unsafe_allow_html=True)

# ---------------- HEADER ----------------
st.markdown('<div class="title">AI Cargo Risk Intelligence System</div>', unsafe_allow_html=True)

# ---------------- CASE STRIP ----------------
latest = get_latest_container()

if latest:
    st.markdown(f"""
    <div class="case-strip">
    <b>{latest[1]}</b> | {latest[2]} → {latest[3]} | Container: {latest[4]}
    </div>
    """, unsafe_allow_html=True)
else:
    st.markdown('<div class="case-strip">No active container</div>', unsafe_allow_html=True)

pipeline = CargoPipeline()

# ---------------- INPUT ----------------
col1, col2 = st.columns(2)

with col1:
    st.markdown('<div class="card">', unsafe_allow_html=True)

    case_id = st.text_input("Case ID")
    origin = st.text_input("Origin")
    destination = st.text_input("Destination")
    container_no = st.text_input("Container No")

    if st.button("Save Container"):
        insert_container(case_id, origin, destination, container_no)
        st.success("Saved")

    st.markdown('</div>', unsafe_allow_html=True)

with col2:
    st.markdown('<div class="card">', unsafe_allow_html=True)

    uploaded_image = st.file_uploader("Upload X-ray", type=["png","jpg","jpeg"])
    uploaded_manifest = st.file_uploader("Upload Manifest", type=["txt"])

    st.markdown('</div>', unsafe_allow_html=True)

# ---------------- RUN ----------------
if uploaded_image and uploaded_manifest:

    img_temp = tempfile.NamedTemporaryFile(delete=False)
    img_temp.write(uploaded_image.read())
    image_path = img_temp.name

    txt_temp = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
    text = uploaded_manifest.read().decode("utf-8")

    with open(txt_temp.name, "w") as f:
        f.write(text)

    manifest_path = txt_temp.name

    if st.button("Run AI Analysis"):

        with st.spinner("Processing cargo inspection..."):

            result = pipeline.run(image_path, manifest_path)

            detections = result["detections"]
            declared_items = result["declared_items"]
            scores = result["scores"]
            decision = result["decision"]

            annotated = draw_boxes(image_path, detections)

        st.divider()

        left, center, right = st.columns([1.2,2,1.2])

        # ---------------- LEFT PANEL ----------------
        with left:

            st.markdown('<div class="card">', unsafe_allow_html=True)

            st.subheader("Declared Items")

            if declared_items:
                for item in declared_items:
                    st.write("•", item)
            else:
                st.write("No declared items")

            st.markdown("---")

            # ---------------- AI EXPLANATION ----------------
            st.subheader("AI Explanation")

            mismatch = round(scores["mismatch"],2)
            anomaly = round(scores["anomaly"],2)
            risk = round(scores["risk"],2)

            detected_names = [d.get("class", d.get("object")) for d in detections]

            if decision == "HIGH RISK":

                explanation = f"""
The AI system detected **{len(detected_names)} object(s)** in the X-ray scan: {", ".join(detected_names)}.

These detected objects **do not match the declared cargo manifest**, which produced a **high mismatch score ({mismatch})**.

The anomaly detection model also found **unusual cargo patterns** with an anomaly score of **{anomaly}**.

Therefore, this shipment is classified as **HIGH RISK** and should be **manually inspected by customs officers**.
"""

            elif decision == "SUSPICIOUS":

                explanation = f"""
The system detected **{len(detected_names)} object(s)** in the cargo scan: {", ".join(detected_names)}.

Some detected objects **partially differ from the declared cargo items**, resulting in a **moderate mismatch score ({mismatch})**.

The anomaly model also detected **minor irregularities** in the cargo structure.

Because of these inconsistencies, the shipment is marked as **SUSPICIOUS** and may require **additional inspection**.
"""

            else:

                explanation = f"""
The AI system detected **{len(detected_names)} object(s)** in the cargo scan: {", ".join(detected_names) if detected_names else "no objects"}.

The detected objects **match the declared manifest**, producing a **low mismatch score ({mismatch})**.

No unusual cargo patterns were detected by the anomaly model.

Therefore, the shipment is considered **SAFE** and no immediate risk was identified.
"""

            st.write(explanation)

            st.markdown('</div>', unsafe_allow_html=True)

        # ---------------- CENTER PANEL ----------------
        with center:

            st.markdown('<div class="card">', unsafe_allow_html=True)

            c1, c2 = st.columns(2)

            with c1:
                st.image(annotated, caption="Detected Objects")

            with c2:
                # 🔥 DISPLAY HEATMAP
                heatmap = result.get("heatmap")

                if heatmap and os.path.exists(heatmap):
                    st.image(heatmap, caption="Explainable AI Heatmap")
                else:
                    st.warning("Heatmap not generated")

            st.markdown('</div>', unsafe_allow_html=True)

            # DETECTED ITEMS TABLE
            st.markdown('<div class="card">', unsafe_allow_html=True)

            st.subheader("Detected Items")

            if detections:
                df = pd.DataFrame([
                    {
                        "Object": d.get("class", d.get("object")),
                        "Confidence (%)": round(d.get("confidence",0)*100,2),
                        "BBox": d.get("bbox")
                    }
                    for d in detections
                ])
                st.dataframe(df, use_container_width=True)
            else:
                st.write("No detections")

            st.markdown('</div>', unsafe_allow_html=True)

            # METRICS
            st.subheader("AI Scores")

            c1,c2,c3,c4 = st.columns(4)

            c1.markdown(f'<div class="metric-card">Detection<br>{round(scores["detection"],2)}</div>', unsafe_allow_html=True)
            c2.markdown(f'<div class="metric-card">Anomaly<br>{round(scores["anomaly"],2)}</div>', unsafe_allow_html=True)
            c3.markdown(f'<div class="metric-card">Mismatch<br>{round(scores["mismatch"],2)}</div>', unsafe_allow_html=True)
            c4.markdown(f'<div class="metric-card">Risk<br>{round(scores["risk"],2)}</div>', unsafe_allow_html=True)

        # ---------------- RIGHT PANEL ----------------
        with right:

            st.markdown('<div class="card">', unsafe_allow_html=True)

            st.subheader("Risk Assessment")

            if decision == "SAFE":
                st.markdown('<div class="safe">SAFE</div>', unsafe_allow_html=True)

            elif decision == "SUSPICIOUS":
                st.markdown('<div class="warn">SUSPICIOUS</div>', unsafe_allow_html=True)

            else:
                st.markdown('<div class="danger">HIGH RISK</div>', unsafe_allow_html=True)

            st.markdown("---")

            st.subheader("Model Contributions")

            st.progress(float(scores["detection"]))
            st.write("YOLOv8")

            st.progress(float(scores["anomaly"]))
            st.write("ResNet50")

            st.progress(float(scores["mismatch"]))
            st.write("CLIP")

            st.markdown('</div>', unsafe_allow_html=True)