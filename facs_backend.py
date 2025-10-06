from abc import ABC, abstractmethod
import cv2
import logging
import numpy as np
import os
import tempfile
import shutil

class FACSAnalyzer(ABC):
    """Base class for FACS (Facial Action Coding System) analysis - purely descriptive"""
    
    @abstractmethod
    def analyze(self, image_path):
        """
        Analyze facial action units in an image
        
        Returns:
            dict: Pure FACS data without emotion inference
        """
        pass
    
    @abstractmethod
    def get_analyzer_name(self):
        """Return the name of this analyzer"""
        pass

class FACSDetector(FACSAnalyzer):
    """FACS (Facial Action Coding System) detector using py-feat"""
    
    def __init__(self):
        self.analyzer_name = "FACS"
        self._detector = None
        self._feat = None
    
    def get_analyzer_name(self):
        return self.analyzer_name
    
    def _get_detector(self):
        """Lazy load py-feat detector to handle import errors gracefully"""
        if self._detector is None:
            try:
                from feat import Detector
                self._detector = Detector(
                    face_model="retinaface",
                    landmark_model="mobilefacenet", 
                    au_model="xgb",  # XGBoost model for Action Units
                    emotion_model="resmasknet",
                    facepose_model="img2pose"
                )
                logging.info("FACS detector initialized successfully")
            except ImportError as e:
                raise ImportError(f"py-feat not installed. Install with: pip install py-feat\nError: {e}")
            except Exception as e:
                raise Exception(f"Failed to initialize FACS detector: {e}")
        return self._detector
    
    def _action_units_to_emotions(self, action_units):
        """
        Map FACS Action Units to basic emotions based on Ekman's research
        This is a simplified mapping - real emotions are complex combinations
        """
        # Initialize emotion scores
        emotions = {
            'anger': 0.0,
            'disgust': 0.0,
            'fear': 0.0,
            'happiness': 0.0,
            'sadness': 0.0,
            'surprise': 0.0,
            'neutral': 0.0
        }
        
        # Map Action Units to emotions (based on FACS-emotion mappings)
        # Happiness: AU6 (cheek raiser) + AU12 (lip corner puller)
        if 'AU06' in action_units and 'AU12' in action_units:
            emotions['happiness'] = (action_units['AU06'] + action_units['AU12']) / 2
        elif 'AU12' in action_units:
            emotions['happiness'] = action_units['AU12'] * 0.8
        
        # Sadness: AU1 (inner brow raiser) + AU15 (lip corner depressor)
        if 'AU01' in action_units and 'AU15' in action_units:
            emotions['sadness'] = (action_units['AU01'] + action_units['AU15']) / 2
        elif 'AU15' in action_units:
            emotions['sadness'] = action_units['AU15'] * 0.7
        
        # Anger: AU4 (brow lowerer) + AU5 (upper lid raiser) + AU23 (lip tightener)
        anger_aus = []
        if 'AU04' in action_units: anger_aus.append(action_units['AU04'])
        if 'AU05' in action_units: anger_aus.append(action_units['AU05'])
        if 'AU23' in action_units: anger_aus.append(action_units['AU23'])
        if anger_aus:
            emotions['anger'] = sum(anger_aus) / len(anger_aus)
        
        # Fear: AU1 + AU2 (outer brow raiser) + AU5
        fear_aus = []
        if 'AU01' in action_units: fear_aus.append(action_units['AU01'])
        if 'AU02' in action_units: fear_aus.append(action_units['AU02'])
        if 'AU05' in action_units: fear_aus.append(action_units['AU05'])
        if fear_aus:
            emotions['fear'] = sum(fear_aus) / len(fear_aus)
        
        # Surprise: AU1 + AU2 + AU26 (jaw drop)
        surprise_aus = []
        if 'AU01' in action_units: surprise_aus.append(action_units['AU01'])
        if 'AU02' in action_units: surprise_aus.append(action_units['AU02'])
        if 'AU26' in action_units: surprise_aus.append(action_units['AU26'])
        if surprise_aus:
            emotions['surprise'] = sum(surprise_aus) / len(surprise_aus)
        
        # Disgust: AU9 (nose wrinkler) + AU10 (upper lip raiser)
        disgust_aus = []
        if 'AU09' in action_units: disgust_aus.append(action_units['AU09'])
        if 'AU10' in action_units: disgust_aus.append(action_units['AU10'])
        if disgust_aus:
            emotions['disgust'] = sum(disgust_aus) / len(disgust_aus)
        
        # Calculate neutral as inverse of other emotions
        total_emotion = sum(emotions.values())
        if total_emotion < 1.0:
            emotions['neutral'] = 1.0 - total_emotion
        
        # Normalize to ensure sum = 1.0 and round
        total = sum(emotions.values())
        if total > 0:
            emotions = {k: round(v/total, 2) for k, v in emotions.items()}
        
        return emotions
    
    def analyze(self, image_path):
        """
        Detect FACS Action Units - purely descriptive, no emotion inference
        
        Returns raw facial muscle activation data
        """
        try:
            logging.info(f"FACS analyzing image: {image_path}")
            detector = self._get_detector()
            
            # Load image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Failed to load image: {image_path}")
            
            # Convert BGR to RGB (py-feat expects RGB)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Detect faces and extract features
            result = detector.detect_image(img_rgb)
            
            if result is None or result.empty:
                return {
                    'error': 'No face detected',
                    'backend': self.backend_name,
                    'face_detected': False
                }
            
            # Get the first face's data
            face_data = result.iloc[0]
            
            # Extract Action Units (AU01-AU43) with detailed information
            action_units = {}
            au_descriptions = self._get_au_descriptions()
            
            for col in result.columns:
                if col.startswith('AU') and not col.endswith('_c'):  # Get intensity values, not classifications
                    au_value = face_data[col]
                    if not np.isnan(au_value) and au_value > 0.1:  # Only include significant activations
                        action_units[col] = {
                            'intensity': round(float(au_value), 3),
                            'description': au_descriptions.get(col, 'Unknown Action Unit'),
                            'muscle_group': self._get_muscle_group(col)
                        }
            
            # Detect known FACS combinations
            facs_combinations = self._detect_facs_combinations(action_units)
            
            # Get face bounding box
            bbox = None
            if 'FaceRectX' in result.columns:
                bbox = {
                    'x': int(face_data['FaceRectX']),
                    'y': int(face_data['FaceRectY']),
                    'width': int(face_data['FaceRectWidth']),
                    'height': int(face_data['FaceRectHeight'])
                }
            
            return {
                'action_units': action_units,
                'facs_combinations': facs_combinations,
                'analyzer': self.analyzer_name,
                'face_detected': True,
                'box': bbox,
                'analysis_type': 'pure_facs',
                'total_aus_detected': len(action_units),
                'note': 'Pure FACS analysis - no emotion inference'
            }
            
        except ImportError as e:
            return {
                'error': f'FACS detector not available: {str(e)}',
                'analyzer': self.analyzer_name,
                'face_detected': False,
                'analysis_type': 'pure_facs'
            }
        except Exception as e:
            logging.error(f"FACS error analyzing image: {str(e)}", exc_info=True)
            return {
                'error': f'FACS error analyzing image: {str(e)}',
                'analyzer': self.analyzer_name,
                'face_detected': False,
                'analysis_type': 'pure_facs'
            }
    
    def _get_au_descriptions(self):
        """Return detailed descriptions of Action Units"""
        return {
            'AU01': 'Inner Brow Raiser',
            'AU02': 'Outer Brow Raiser', 
            'AU04': 'Brow Lowerer',
            'AU05': 'Upper Lid Raiser',
            'AU06': 'Cheek Raiser',
            'AU07': 'Lid Tightener',
            'AU09': 'Nose Wrinkler',
            'AU10': 'Upper Lip Raiser',
            'AU11': 'Nasolabial Deepener',
            'AU12': 'Lip Corner Puller',
            'AU13': 'Sharp Lip Puller',
            'AU14': 'Dimpler',
            'AU15': 'Lip Corner Depressor',
            'AU16': 'Lower Lip Depressor',
            'AU17': 'Chin Raiser',
            'AU18': 'Lip Puckerer',
            'AU20': 'Lip Stretcher',
            'AU22': 'Lip Funneler',
            'AU23': 'Lip Tightener',
            'AU24': 'Lip Pressor',
            'AU25': 'Lips Part',
            'AU26': 'Jaw Drop',
            'AU27': 'Mouth Stretch',
            'AU28': 'Lip Suck'
        }
    
    def _get_muscle_group(self, au_code):
        """Return the muscle group for an Action Unit"""
        muscle_groups = {
            'AU01': 'corrugator supercilii (medial)',
            'AU02': 'frontalis (lateral)', 
            'AU04': 'corrugator supercilii, depressor supercilii',
            'AU05': 'levator palpebrae superioris',
            'AU06': 'orbicularis oculi (pars orbitalis)',
            'AU07': 'orbicularis oculi (pars palpebralis)',
            'AU09': 'levator labii superioris alaeque nasi',
            'AU10': 'levator labii superioris',
            'AU12': 'zygomaticus major',
            'AU15': 'depressor anguli oris',
            'AU17': 'mentalis',
            'AU20': 'risorius',
            'AU23': 'orbicularis oris',
            'AU25': 'depressor labii inferioris',
            'AU26': 'masseter (relaxed)',
            'AU28': 'orbicularis oris'
        }
        return muscle_groups.get(au_code, 'Unknown muscle group')
    
    def _detect_facs_combinations(self, action_units):
        """Detect known FACS combinations and patterns"""
        combinations = []
        
        # Duchenne smile: AU6 + AU12
        if 'AU06' in action_units and 'AU12' in action_units:
            if action_units['AU06']['intensity'] > 0.3 and action_units['AU12']['intensity'] > 0.3:
                combinations.append({
                    'pattern': 'Duchenne Smile',
                    'aus': ['AU06', 'AU12'],
                    'description': 'Genuine smile involving both cheek raiser and lip corner puller',
                    'intensity': round((action_units['AU06']['intensity'] + action_units['AU12']['intensity']) / 2, 2)
                })
        
        # Pan Am smile: AU12 only (without AU6)
        elif 'AU12' in action_units and 'AU06' not in action_units:
            if action_units['AU12']['intensity'] > 0.4:
                combinations.append({
                    'pattern': 'Pan Am Smile',
                    'aus': ['AU12'],
                    'description': 'Social smile - lip corners only, no eye involvement',
                    'intensity': action_units['AU12']['intensity']
                })
        
        # Brow flash: AU1 + AU2
        if 'AU01' in action_units and 'AU02' in action_units:
            if action_units['AU01']['intensity'] > 0.4 and action_units['AU02']['intensity'] > 0.4:
                combinations.append({
                    'pattern': 'Brow Flash',
                    'aus': ['AU01', 'AU02'],
                    'description': 'Eyebrow raise often used in greeting or emphasis',
                    'intensity': round((action_units['AU01']['intensity'] + action_units['AU02']['intensity']) / 2, 2)
                })
        
        # Frown: AU15 + AU4
        if 'AU15' in action_units and 'AU04' in action_units:
            combinations.append({
                'pattern': 'Frown Pattern',
                'aus': ['AU15', 'AU04'],
                'description': 'Downturned mouth with lowered brow',
                'intensity': round((action_units['AU15']['intensity'] + action_units['AU04']['intensity']) / 2, 2)
            })
        
        return combinations
    
    def _interpret_action_units(self, action_units):
        """
        Provide human-readable interpretation of detected Action Units
        """
        au_descriptions = {
            'AU01': 'Inner Brow Raiser',
            'AU02': 'Outer Brow Raiser',
            'AU04': 'Brow Lowerer',
            'AU05': 'Upper Lid Raiser',
            'AU06': 'Cheek Raiser',
            'AU07': 'Lid Tightener',
            'AU09': 'Nose Wrinkler',
            'AU10': 'Upper Lip Raiser',
            'AU12': 'Lip Corner Puller',
            'AU14': 'Dimpler',
            'AU15': 'Lip Corner Depressor',
            'AU17': 'Chin Raiser',
            'AU20': 'Lip Stretcher',
            'AU23': 'Lip Tightener',
            'AU24': 'Lip Pressor',
            'AU25': 'Lips Part',
            'AU26': 'Jaw Drop',
            'AU28': 'Lip Suck'
        }
        
        active_aus = []
        for au, intensity in action_units.items():
            if intensity > 0.3:  # Consider AU active if intensity > 0.3
                desc = au_descriptions.get(au, au)
                active_aus.append(f"{desc} ({au}): {intensity:.2f}")
        
        return active_aus


class SimpleFACSDetector(FACSAnalyzer):
    """
    Simplified FACS detector using OpenCV for basic AU approximation
    This provides basic facial analysis mapped to approximate Action Units
    """
    
    def __init__(self):
        self.analyzer_name = "SimpleFACS"
        self._face_cascade = None
        self._eye_cascade = None
    
    def get_analyzer_name(self):
        return self.analyzer_name
    
    def _get_cascades(self):
        """Initialize OpenCV face cascades"""
        if self._face_cascade is None:
            # Use OpenCV's built-in cascades
            face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            eye_cascade_path = cv2.data.haarcascades + 'haarcascade_eye.xml'
            
            self._face_cascade = cv2.CascadeClassifier(face_cascade_path)
            self._eye_cascade = cv2.CascadeClassifier(eye_cascade_path)
            logging.info("SimpleFACS detector initialized with OpenCV cascades")
        return self._face_cascade, self._eye_cascade
    
    def analyze(self, image_path):
        """
        Analyze approximate Action Units using OpenCV - purely descriptive
        """
        try:
            logging.info(f"SimpleFACS analyzing image: {image_path}")
            face_cascade, eye_cascade = self._get_cascades()
            
            # Load and process image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Failed to load image: {image_path}")
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) == 0:
                return {
                    'error': 'No face detected',
                    'analyzer': self.analyzer_name,
                    'face_detected': False,
                    'analysis_type': 'pure_facs'
                }
            
            # Use first face
            (x, y, w, h) = faces[0]
            face_roi = gray[y:y+h, x:x+w]
            
            # Detect eyes in face region
            eyes = eye_cascade.detectMultiScale(face_roi)
            
            # Get raw Action Units with detailed information
            raw_action_units = self._approximate_action_units(face_roi, eyes)
            
            # Convert to detailed format
            au_descriptions = self._get_au_descriptions()
            action_units = {}
            for au_code, intensity in raw_action_units.items():
                action_units[au_code] = {
                    'intensity': intensity,
                    'description': au_descriptions.get(au_code, 'Unknown Action Unit'),
                    'muscle_group': self._get_muscle_group(au_code),
                    'detection_method': 'OpenCV approximation'
                }
            
            # Detect FACS combinations
            facs_combinations = self._detect_facs_combinations(action_units)
            
            return {
                'action_units': action_units,
                'facs_combinations': facs_combinations,
                'analyzer': self.analyzer_name,
                'face_detected': True,
                'box': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)},
                'analysis_type': 'pure_facs',
                'total_aus_detected': len(action_units),
                'note': 'Simplified FACS using OpenCV approximation - no emotion inference'
            }
            
        except Exception as e:
            logging.error(f"SimpleFACS error: {str(e)}", exc_info=True)
            return {
                'error': f'SimpleFACS error: {str(e)}',
                'analyzer': self.analyzer_name,
                'face_detected': False,
                'analysis_type': 'pure_facs'
            }
    
    def _approximate_action_units(self, face_roi, eyes):
        """
        Approximate Action Units from face regions using OpenCV
        This is a very simplified approximation
        """
        action_units = {}
        h, w = face_roi.shape
        
        # Analyze face regions for basic AUs
        # These are rough approximations based on image intensity patterns
        
        # AU12 - Lip Corner Puller (smile detection via mouth region)
        mouth_region = face_roi[int(h*0.6):, :]
        mouth_edges = cv2.Canny(mouth_region, 50, 150)
        mouth_activity = np.sum(mouth_edges) / (mouth_region.shape[0] * mouth_region.shape[1])
        action_units['AU12'] = round(min(1.0, mouth_activity / 50), 3)
        
        # AU01/AU02 - Brow movements (upper face region)
        brow_region = face_roi[:int(h*0.3), :]
        brow_edges = cv2.Canny(brow_region, 30, 100)
        brow_activity = np.sum(brow_edges) / (brow_region.shape[0] * brow_region.shape[1])
        action_units['AU01'] = round(min(1.0, brow_activity / 40), 3)
        
        # AU04 - Brow Lowerer (inverse correlation with AU01)
        if action_units['AU01'] < 0.3:
            action_units['AU04'] = round(0.5 + (0.3 - action_units['AU01']), 3)
        
        # AU05 - Upper Lid Raiser (based on eye detection)
        if len(eyes) >= 2:
            # Eyes detected and open
            action_units['AU05'] = 0.6
        elif len(eyes) == 1:
            action_units['AU05'] = 0.3
        else:
            # No eyes detected - possibly closed or squinting
            action_units['AU07'] = 0.7  # Lid Tightener
        
        # AU26 - Jaw Drop (lower face analysis)
        lower_face = face_roi[int(h*0.7):, :]
        lower_variance = np.var(lower_face)
        action_units['AU26'] = round(min(1.0, lower_variance / 2000), 3)
        
        # Add some mock anger/disgust triggers for testing
        # Check for frown patterns (inverted smile detection)
        if action_units.get('AU12', 0) < 0.3:  # Low smile activity
            # Look for downturned mouth patterns
            mouth_bottom = mouth_region[int(mouth_region.shape[0]*0.7):, :]
            mouth_bottom_activity = np.sum(cv2.Canny(mouth_bottom, 30, 100))
            if mouth_bottom_activity > mouth_activity * 50:  # More activity in bottom of mouth
                action_units['AU15'] = 0.6  # Lip corner depressor (frown)
        
        # Enhanced anger detection - look for tense face patterns
        face_texture = cv2.Laplacian(face_roi, cv2.CV_64F).var()
        if face_texture > 800:  # High texture variance = tense face
            action_units['AU04'] = max(action_units.get('AU04', 0), 0.5)  # Boost brow lowerer
            action_units['AU07'] = 0.4  # Add lid tightener
        
        # Filter out very low values but keep more for debugging
        action_units = {k: v for k, v in action_units.items() if v > 0.05}
        
        return action_units
    
    def _get_au_descriptions(self):
        """Return detailed descriptions of Action Units"""
        return {
            'AU01': 'Inner Brow Raiser',
            'AU02': 'Outer Brow Raiser', 
            'AU04': 'Brow Lowerer',
            'AU05': 'Upper Lid Raiser',
            'AU06': 'Cheek Raiser',
            'AU07': 'Lid Tightener',
            'AU12': 'Lip Corner Puller',
            'AU15': 'Lip Corner Depressor',
            'AU26': 'Jaw Drop'
        }
    
    def _get_muscle_group(self, au_code):
        """Return the muscle group for an Action Unit"""
        muscle_groups = {
            'AU01': 'corrugator supercilii (medial)',
            'AU02': 'frontalis (lateral)', 
            'AU04': 'corrugator supercilii, depressor supercilii',
            'AU05': 'levator palpebrae superioris',
            'AU06': 'orbicularis oculi (pars orbitalis)',
            'AU07': 'orbicularis oculi (pars palpebralis)',
            'AU12': 'zygomaticus major',
            'AU15': 'depressor anguli oris',
            'AU26': 'masseter (relaxed)'
        }
        return muscle_groups.get(au_code, 'Unknown muscle group')
    
    def _detect_facs_combinations(self, action_units):
        """Detect known FACS combinations and patterns"""
        combinations = []
        
        # Duchenne smile: AU6 + AU12
        if 'AU06' in action_units and 'AU12' in action_units:
            if action_units['AU06']['intensity'] > 0.3 and action_units['AU12']['intensity'] > 0.3:
                combinations.append({
                    'pattern': 'Duchenne Smile',
                    'aus': ['AU06', 'AU12'],
                    'description': 'Genuine smile involving both cheek raiser and lip corner puller',
                    'intensity': round((action_units['AU06']['intensity'] + action_units['AU12']['intensity']) / 2, 2)
                })
        
        # Pan Am smile: AU12 only (without AU6)
        elif 'AU12' in action_units and 'AU06' not in action_units:
            if action_units['AU12']['intensity'] > 0.4:
                combinations.append({
                    'pattern': 'Pan Am Smile',
                    'aus': ['AU12'],
                    'description': 'Social smile - lip corners only, no eye involvement',
                    'intensity': action_units['AU12']['intensity']
                })
        
        # Brow activity: AU1 + AU2
        if 'AU01' in action_units and 'AU02' in action_units:
            if action_units['AU01']['intensity'] > 0.4 and action_units['AU02']['intensity'] > 0.4:
                combinations.append({
                    'pattern': 'Brow Flash',
                    'aus': ['AU01', 'AU02'],
                    'description': 'Eyebrow raise often used in greeting or emphasis',
                    'intensity': round((action_units['AU01']['intensity'] + action_units['AU02']['intensity']) / 2, 2)
                })
        
        # Frown: AU15 + AU4
        if 'AU15' in action_units and 'AU04' in action_units:
            combinations.append({
                'pattern': 'Frown Pattern',
                'aus': ['AU15', 'AU04'],
                'description': 'Downturned mouth with lowered brow',
                'intensity': round((action_units['AU15']['intensity'] + action_units['AU04']['intensity']) / 2, 2)
            })
        
        return combinations


def get_facs_analyzer(use_simple=False):
    """
    Factory function to get FACS analyzer
    
    Args:
        use_simple: If True, use SimpleFACSDetector (OpenCV-based)
                   If False, try py-feat first, fall back to simple if unavailable
    
    Returns:
        FACSAnalyzer: Pure FACS analyzer that returns muscle data, not emotions
    """
    if use_simple:
        return SimpleFACSDetector()
    
    try:
        # Try to use full FACS detector with py-feat
        return FACSDetector()
    except ImportError:
        logging.warning("py-feat not available, falling back to SimpleFACS")
        return SimpleFACSDetector()

# Backward compatibility
def get_facs_detector(use_simple=False):
    """Deprecated: Use get_facs_analyzer instead"""
    return get_facs_analyzer(use_simple)