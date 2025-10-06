# Emotion Detection App

Real-time facial emotion detection application using Flask, OpenCV, and FER (Facial Emotion Recognition).

## Features
- **Multi-backend emotion detection**: Compare FER vs DeepFace predictions
- **FACS muscle analysis**: Pure facial muscle movement data (no emotion inference)
- **Pattern detection**: Identify Duchenne smiles, brow flashes, frown patterns
- **Upload and analyze images** for comprehensive facial analysis
- **Export results to CSV** for further analysis
- **Comparison visualization** between emotion models and muscle data

## Setup

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create uploads directory:
```bash
mkdir uploads
```

4. Run the application:
```bash
python3 app.py
```

5. Access the app at http://127.0.0.1:5000

## Tech Stack
- **Flask** backend with multi-backend support
- **FER** (Facial Emotion Recognition) for emotion detection
- **DeepFace** for alternative emotion analysis
- **SimpleFACS** for facial muscle analysis (OpenCV-based)
- **OpenCV** for computer vision and image processing
- **JavaScript** modules for frontend interaction
- **Chart.js** for data visualization

## File Structure
- `app.py`: Main Flask application
- `image_processor.py`: Emotion detection logic
- `static/`: Frontend assets and JavaScript modules
- `templates/`: HTML templates
