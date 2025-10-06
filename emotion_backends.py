from abc import ABC, abstractmethod
import cv2
import logging
import numpy as np

class EmotionDetector(ABC):
    """Abstract base class for emotion detection backends"""
    
    @abstractmethod
    def detect(self, image_path):
        """
        Detect emotions in an image
        
        Args:
            image_path (str): Path to the image file
            
        Returns:
            dict: Dictionary containing emotions and dominant_emotion
        """
        pass
    
    @abstractmethod
    def get_backend_name(self):
        """Return the name of this backend"""
        pass

class FERDetector(EmotionDetector):
    """FER (Facial Emotion Recognition) library detector - Real implementation"""
    
    def __init__(self):
        self.backend_name = "FER"
        from fer import FER
        self.detector = FER(mtcnn=True)
    
    def get_backend_name(self):
        return self.backend_name
    
    def detect(self, image_path):
        try:
            logging.info(f"FER analyzing image: {image_path}")
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError("Failed to load image")
            
            # Real FER emotion detection
            result = self.detector.detect_emotions(img)
            
            if not result:
                return {
                    'error': 'No face detected',
                    'backend': self.backend_name,
                    'face_detected': False
                }
            
            # Get the first face's emotions (FER returns a list of faces)
            face_emotions = result[0]['emotions']
            
            # FER returns emotions as: {'angry': 0.0, 'disgust': 0.0, 'fear': 0.0, 'happy': 0.0, 'sad': 0.0, 'surprise': 0.0, 'neutral': 0.0}
            # We need to normalize to our standard format and round to 2 decimal places
            normalized_emotions = {
                'anger': round(float(face_emotions.get('angry', 0.0)), 2),
                'disgust': round(float(face_emotions.get('disgust', 0.0)), 2),
                'fear': round(float(face_emotions.get('fear', 0.0)), 2),
                'sadness': round(float(face_emotions.get('sad', 0.0)), 2),
                'neutral': round(float(face_emotions.get('neutral', 0.0)), 2),
                'surprise': round(float(face_emotions.get('surprise', 0.0)), 2),
                'happiness': round(float(face_emotions.get('happy', 0.0)), 2)
            }
            
            dominant_emotion = max(normalized_emotions, key=normalized_emotions.get)
            
            # Real FER emotion detection completed
            
            return {
                'emotions': normalized_emotions,
                'dominant_emotion': dominant_emotion,
                'backend': self.backend_name,
                'confidence_score': round(float(normalized_emotions[dominant_emotion]), 2),
                'face_detected': True,
                'box': result[0].get('box', None)  # Face bounding box
            }
        except Exception as e:
            logging.error(f"FER error analyzing image: {str(e)}", exc_info=True)
            return {
                'error': f'FER error analyzing image: {str(e)}',
                'backend': self.backend_name,
                'face_detected': False
            }

class DeepFaceDetector(EmotionDetector):
    """DeepFace emotion detector"""
    
    def __init__(self):
        self.backend_name = "DeepFace"
        # Lazy import to handle potential installation issues
        self._deepface = None
    
    def get_backend_name(self):
        return self.backend_name
    
    def _get_deepface(self):
        """Lazy load DeepFace to handle import errors gracefully"""
        if self._deepface is None:
            try:
                from deepface import DeepFace
                self._deepface = DeepFace
            except ImportError as e:
                raise ImportError(f"DeepFace not installed: {e}")
        return self._deepface
    
    def _normalize_emotion_names(self, deepface_emotions):
        """
        Normalize DeepFace emotion names to match FER format
        DeepFace uses: angry, disgust, fear, happy, sad, surprise, neutral
        FER uses: anger, disgust, fear, happiness, sadness, surprise, neutral
        """
        emotion_mapping = {
            'angry': 'anger',
            'happy': 'happiness', 
            'sad': 'sadness'
        }
        
        # Check if DeepFace emotions are in 0-100 or 0-1 range by checking the sum
        total_score = sum(float(score) for score in deepface_emotions.values())
        is_percentage = total_score > 10  # If sum > 10, likely 0-100 range
        
        normalized = {}
        for emotion, score in deepface_emotions.items():
            # Convert percentage to decimal if needed
            if is_percentage:
                score_decimal = float(score) / 100.0
            else:
                score_decimal = float(score)
            
            # Map emotion name or keep as-is
            mapped_emotion = emotion_mapping.get(emotion, emotion)
            # Round to 2 decimal places
            normalized[mapped_emotion] = round(score_decimal, 2)
        
        return normalized
    
    def detect(self, image_path):
        try:
            logging.info(f"DeepFace analyzing image: {image_path}")
            DeepFace = self._get_deepface()
            
            # Create a temporary copy with safe filename for DeepFace
            import os
            import shutil
            import tempfile
            
            # Create temporary file with safe name
            temp_dir = tempfile.gettempdir()
            safe_filename = f"deepface_temp_{os.getpid()}_{hash(image_path) % 10000}.jpg"
            temp_path = os.path.join(temp_dir, safe_filename)
            
            try:
                # Copy original file to temp location with safe name
                shutil.copy2(image_path, temp_path)
                
                # Analyze with enforce_detection=False to handle no-face cases gracefully
                result = DeepFace.analyze(
                    img_path=temp_path, 
                    actions=['emotion'], 
                    enforce_detection=False,
                    silent=True
                )
            finally:
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            
            # DeepFace returns a list, get first result
            if isinstance(result, list):
                result = result[0]
            
            # Extract emotion data
            emotions = result.get('emotion', {})
            if not emotions:
                return {
                    'error': 'No emotions detected',
                    'backend': self.backend_name,
                    'face_detected': False
                }
            
            # Normalize emotion names and scores to match FER format
            normalized_emotions = self._normalize_emotion_names(emotions)
            
            # Find dominant emotion
            dominant_emotion = max(normalized_emotions, key=normalized_emotions.get)
            
            return {
                'emotions': normalized_emotions,
                'dominant_emotion': dominant_emotion,
                'backend': self.backend_name,
                'confidence_score': round(float(normalized_emotions[dominant_emotion]), 2),
                'face_detected': True,
                'region': result.get('region', {})  # Face bounding box info
            }
            
        except ImportError as e:
            return {
                'error': f'DeepFace not available: {str(e)}',
                'backend': self.backend_name,
                'face_detected': False
            }
        except Exception as e:
            logging.error(f"DeepFace error analyzing image: {str(e)}", exc_info=True)
            return {
                'error': f'DeepFace error analyzing image: {str(e)}',
                'backend': self.backend_name,
                'face_detected': False
            }

def get_detector(backend_name):
    """Factory function to get emotion detector by name"""
    detectors = {
        'fer': FERDetector,
        'deepface': DeepFaceDetector
    }
    
    # Add FACS analyzer if available (returns pure muscle data, not emotions)
    try:
        from facs_backend import get_facs_analyzer
        detectors['facs'] = lambda: get_facs_analyzer(use_simple=False)
        detectors['simplefacs'] = lambda: get_facs_analyzer(use_simple=True)
    except ImportError:
        pass
    
    if backend_name.lower() not in detectors:
        raise ValueError(f"Unknown backend: {backend_name}. Available: {list(detectors.keys())}")
    
    return detectors[backend_name.lower()]()

def get_available_backends():
    """Return list of available backend names"""
    available = ['fer']  # FER is always available
    
    # Check if DeepFace is available
    try:
        import deepface
        available.append('deepface')
    except ImportError:
        pass
    
    # Check if FACS analyzers are available
    try:
        from facs_backend import FACSDetector
        detector = FACSDetector()
        detector._get_detector()  # Try to initialize
        available.append('facs')
    except:
        # If full FACS not available, try SimpleFACS
        try:
            from facs_backend import SimpleFACSDetector
            import cv2  # SimpleFACS uses OpenCV
            detector = SimpleFACSDetector()
            available.append('simplefacs')
        except Exception as e:
            # Removed debug print for production
            pass
    
    return available