# Emotion Detection App

Real-time facial emotion detection application using Flask, OpenCV, and FER (Facial Emotion Recognition).

## Features
- Upload and analyze images for emotion detection
- Real-time video emotion processing
- Export results to CSV
- Comparison graphs for emotion analysis

## Setup

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip3 install flask fer opencv-python
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
- Flask backend
- FER (Facial Emotion Recognition)
- OpenCV for image processing
- JavaScript for real-time processing
- Chart.js for visualization

## File Structure
- `app.py`: Main Flask application
- `image_processor.py`: Emotion detection logic
- `static/`: Frontend assets and JavaScript modules
- `templates/`: HTML templates
