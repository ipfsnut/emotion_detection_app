from abc import ABC, abstractmethod

class EmotionDetector(ABC):
    @abstractmethod
    def detect_emotions(self, image):
        pass
    
    @abstractmethod
    def get_supported_emotions(self):
        pass
