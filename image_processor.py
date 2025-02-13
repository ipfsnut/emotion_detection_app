from fer import FER
from deepface import DeepFace
import cv2
import logging
from abc import ABC, abstractmethod
import torch
from facenet_pytorch import MTCNN

class EmotionDetector(ABC):
    @abstractmethod
    def detect_emotions(self, image):
        pass

class FERDetector(EmotionDetector):
    def __init__(self):
        self.detector = FER()
        
    def detect_emotions(self, image):
        result = self.detector.detect_emotions(image)
        if result:
            return result[0]['emotions']
        return None

class DeepFaceDetector(EmotionDetector):
    def detect_emotions(self, image):
        result = DeepFace.analyze(image, actions=['emotion'], enforce_detection=False)
        if isinstance(result, list):
            result = result[0]
        return result['emotion']

class EmotioNetDetector(EmotionDetector):
    def __init__(self):
        self.mtcnn = MTCNN(keep_all=True)
        # Initialize EmotioNet model here
        
    def detect_emotions(self, image):
        faces = self.mtcnn(image)
        if faces is None:
            return None
        # Process through EmotioNet model
        return self.process_emotions(faces)

class EmotionProcessor:
    def __init__(self, model_type='fer'):
        self.detectors = {
            'fer': FERDetector(),
            'deepface': DeepFaceDetector(),
            'emotionet': EmotioNetDetector()
        }
        self.current_model = model_type

    def analyze_image(self, image_path):
        try:
            logging.info(f"Analyzing image: {image_path} using {self.current_model}")
            img = cv2.imread(image_path)
            
            if img is None:
                raise ValueError("Failed to load image")
                
            logging.info(f"Image shape: {img.shape}")
            
            detector = self.detectors.get(self.current_model)
            if not detector:
                raise ValueError(f"Invalid model type: {self.current_model}")
                
            emotions = detector.detect_emotions(img)
            
            if emotions:
                dominant_emotion = max(emotions, key=emotions.get)
                return {
                    'emotions': emotions,
                    'dominant_emotion': dominant_emotion
                }
            return {'error': 'No face detected in the image'}
            
        except Exception as e:
            logging.error(f"Error analyzing image: {str(e)}", exc_info=True)
            return {'error': f'Error analyzing image: {str(e)}'}

    def switch_model(self, model_type):
        if model_type in self.detectors:
            self.current_model = model_type
            logging.info(f"Switched to {model_type} model")
            return True
        return False