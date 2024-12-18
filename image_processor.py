from fer import FER
import cv2
import logging

detector = FER()

def analyze_image(image_path):
    try:
        logging.info(f"Analyzing image: {image_path}")
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Failed to load image")
        
        logging.info(f"Image shape: {img.shape}")
        result = detector.detect_emotions(img)
        
        if result:
            emotions = result[0]['emotions']
            dominant_emotion = max(emotions, key=emotions.get)
            return {
                'emotions': emotions,
                'dominant_emotion': dominant_emotion
            }
        else:
            return {'error': 'No face detected in the image'}
    except Exception as e:
        logging.error(f"Error analyzing image: {str(e)}", exc_info=True)
        return {'error': f'Error analyzing image: {str(e)}'}