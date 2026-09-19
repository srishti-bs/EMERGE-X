# EMERGE-X: AI & Computer Vision Subsystem

> **Edge Vision Detection & Traffic Density Analysis**  
> *Technologies: Python / OpenCV / YOLO / PyTorch*

---

## 1. Subsystem Purpose & Boundary

The `ai` subsystem processes live visual frames captured from a physical USB webcam mounted over the prototype intersection. It extracts structural traffic features to inform the backend routing and signal prioritization engines.

```
+------------------+     +--------------------+     +---------------------+     +-----------------+
| USB Webcam Feed  | --> | OpenCV Preprocess  | --> |   YOLO Detection    | --> | Traffic Density |
| (Over Junction)  |     | ROI & Rectification|     | (Bounding Boxes)    |     | & Queue Metrics |
+------------------+     +--------------------+     +---------------------+     +--------+--------+
                                                                                         |
                                                          HTTP POST /api/v1/traffic/state v
                                                                                +-----------------+
                                                                                | FastAPI Backend |
                                                                                +-----------------+
```

---

## 2. Structural Breakdown

- **`ai/detection/`**:
  - Video stream acquisition and device handling.
  - YOLO object detection pipeline (identifying classes: car, motorcycle, bus, truck).
  - Multi-frame object tracking to correlate vehicle positions across frames.
- **`ai/traffic/`**:
  - Region-of-Interest (ROI) vehicle counting.
  - Normalized density estimation (ratio of road surface occupied by detected bounding boxes).
  - Queue length estimation (stationary vehicle clusters approaching red signals).
  - Obstruction and stalled vehicle anomaly detection.
  - State serialization matching `docs/integration-contract.md`.
- **`ai/models/`**:
  - Configuration files, anchor specifications, and confidence thresholds.
  - Model metadata registry.

---

## 3. Important Architectural Distinctions

> [!IMPORTANT]
> **YOLO is a Detection System, NOT a Traffic Prediction Engine**  
> 1. YOLO’s sole responsibility in EMERGE-X is **real-time spatial object detection** (identifying where vehicles and obstacles currently are in a given camera frame).  
> 2. YOLO does **not** predict future traffic congestion, time-series flow patterns, or route travel times.  
> 3. Downstream traffic forecasting and dynamic edge cost calculations are synthesized separately by the backend routing services using aggregated detection histories, simulation models, and sensor telemetry.

---

## 4. Current Phase Status

> [!NOTE]
> **No models or PyTorch weights are downloaded or executed during this setup phase.**  
> Large binary model files (`*.pt`, `*.onnx`) are deliberately excluded via `.gitignore`. Weights will be loaded locally when setting up the edge camera pipeline.
