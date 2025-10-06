"""
Baseline Face Calibration System

Manages baseline facial measurements for delta analysis.
Allows comparison of expressions against a neutral baseline to isolate actual movements.
"""

import json
import os
import time
from datetime import datetime
from typing import Dict, Optional, Any
import logging

class BaselineManager:
    """Manages baseline facial measurements for FACS delta analysis"""
    
    def __init__(self, baseline_dir: str = "baselines"):
        """
        Initialize baseline manager
        
        Args:
            baseline_dir: Directory to store baseline data
        """
        self.baseline_dir = baseline_dir
        self.current_baseline = None
        self.baseline_timestamp = None
        
        # Create baseline directory if it doesn't exist
        os.makedirs(baseline_dir, exist_ok=True)
    
    def set_baseline(self, facs_result: Dict[str, Any], person_id: str = "default") -> bool:
        """
        Set a new baseline from FACS analysis result
        
        Args:
            facs_result: FACS analysis result containing action_units
            person_id: Identifier for the person (for multi-person support)
            
        Returns:
            bool: True if baseline was set successfully
        """
        try:
            if not self._is_valid_facs_result(facs_result):
                logging.error("Invalid FACS result for baseline")
                return False
            
            # Extract baseline data
            baseline_data = {
                'person_id': person_id,
                'timestamp': datetime.now().isoformat(),
                'action_units': facs_result.get('action_units', {}),
                'total_aus_detected': facs_result.get('total_aus_detected', 0),
                'analyzer': facs_result.get('analyzer', 'unknown'),
                'note': f"Baseline set for {person_id}"
            }
            
            # Store in memory
            self.current_baseline = baseline_data
            self.baseline_timestamp = baseline_data['timestamp']
            
            # Save to file
            baseline_file = os.path.join(self.baseline_dir, f"{person_id}_baseline.json")
            with open(baseline_file, 'w') as f:
                json.dump(baseline_data, f, indent=2)
            
            logging.info(f"Baseline set for {person_id} with {baseline_data['total_aus_detected']} AUs")
            return True
            
        except Exception as e:
            logging.error(f"Failed to set baseline: {e}")
            return False
    
    def load_baseline(self, person_id: str = "default") -> bool:
        """
        Load baseline from file
        
        Args:
            person_id: Identifier for the person
            
        Returns:
            bool: True if baseline was loaded successfully
        """
        try:
            baseline_file = os.path.join(self.baseline_dir, f"{person_id}_baseline.json")
            
            if not os.path.exists(baseline_file):
                logging.warning(f"No baseline file found for {person_id}")
                return False
            
            with open(baseline_file, 'r') as f:
                self.current_baseline = json.load(f)
                self.baseline_timestamp = self.current_baseline['timestamp']
            
            logging.info(f"Baseline loaded for {person_id}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to load baseline: {e}")
            return False
    
    def calculate_delta(self, facs_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate delta between current FACS result and baseline
        
        Args:
            facs_result: Current FACS analysis result
            
        Returns:
            Dict containing delta analysis with baseline comparison
        """
        if not self.current_baseline:
            return {
                'error': 'No baseline set',
                'has_baseline': False
            }
        
        if not self._is_valid_facs_result(facs_result):
            return {
                'error': 'Invalid FACS result',
                'has_baseline': True
            }
        
        try:
            baseline_aus = self.current_baseline['action_units']
            current_aus = facs_result.get('action_units', {})
            
            # Calculate deltas for each Action Unit
            deltas = {}
            significant_changes = []
            
            # Get all unique AUs from both baseline and current
            all_aus = set(baseline_aus.keys()) | set(current_aus.keys())
            
            for au_code in all_aus:
                baseline_intensity = baseline_aus.get(au_code, {}).get('intensity', 0.0)
                current_intensity = current_aus.get(au_code, {}).get('intensity', 0.0)
                
                delta = current_intensity - baseline_intensity
                
                deltas[au_code] = {
                    'delta': round(delta, 3),
                    'baseline': round(baseline_intensity, 3),
                    'current': round(current_intensity, 3),
                    'description': current_aus.get(au_code, {}).get('description', 
                                                 baseline_aus.get(au_code, {}).get('description', 'Unknown AU')),
                    'change_type': self._classify_change(delta)
                }
                
                # Track significant changes (>0.2 intensity change)
                if abs(delta) > 0.2:
                    significant_changes.append({
                        'au': au_code,
                        'delta': delta,
                        'description': deltas[au_code]['description'],
                        'change_type': deltas[au_code]['change_type']
                    })
            
            # Sort significant changes by magnitude
            significant_changes.sort(key=lambda x: abs(x['delta']), reverse=True)
            
            # Detect movement patterns
            movement_patterns = self._detect_movement_patterns(deltas)
            
            return {
                'has_baseline': True,
                'baseline_timestamp': self.baseline_timestamp,
                'baseline_person': self.current_baseline['person_id'],
                'deltas': deltas,
                'significant_changes': significant_changes,
                'movement_patterns': movement_patterns,
                'total_movement': round(sum(abs(d['delta']) for d in deltas.values()), 2),
                'analysis_type': 'baseline_delta'
            }
            
        except Exception as e:
            logging.error(f"Failed to calculate delta: {e}")
            return {
                'error': f'Delta calculation failed: {str(e)}',
                'has_baseline': True
            }
    
    def clear_baseline(self, person_id: str = "default") -> bool:
        """
        Clear current baseline
        
        Args:
            person_id: Identifier for the person
            
        Returns:
            bool: True if cleared successfully
        """
        try:
            self.current_baseline = None
            self.baseline_timestamp = None
            
            # Optionally remove file
            baseline_file = os.path.join(self.baseline_dir, f"{person_id}_baseline.json")
            if os.path.exists(baseline_file):
                os.remove(baseline_file)
            
            logging.info(f"Baseline cleared for {person_id}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to clear baseline: {e}")
            return False
    
    def get_baseline_info(self) -> Optional[Dict[str, Any]]:
        """
        Get information about current baseline
        
        Returns:
            Dict with baseline info or None if no baseline set
        """
        if not self.current_baseline:
            return None
        
        return {
            'person_id': self.current_baseline['person_id'],
            'timestamp': self.current_baseline['timestamp'],
            'total_aus': self.current_baseline['total_aus_detected'],
            'analyzer': self.current_baseline['analyzer'],
            'age_minutes': round((time.time() - 
                               datetime.fromisoformat(self.current_baseline['timestamp']).timestamp()) / 60, 1)
        }
    
    def _is_valid_facs_result(self, facs_result: Dict[str, Any]) -> bool:
        """Validate FACS result structure"""
        return (
            isinstance(facs_result, dict) and
            'action_units' in facs_result and
            facs_result.get('analysis_type') == 'pure_facs' and
            facs_result.get('face_detected', False)
        )
    
    def _classify_change(self, delta: float) -> str:
        """Classify the type of change based on delta magnitude"""
        if abs(delta) < 0.1:
            return 'minimal'
        elif abs(delta) < 0.3:
            return 'moderate'
        elif abs(delta) < 0.5:
            return 'significant'
        else:
            return 'major'
    
    def _detect_movement_patterns(self, deltas: Dict[str, Dict]) -> list:
        """Detect common movement patterns from deltas"""
        patterns = []
        
        # Smile pattern: AU12 increase, possibly with AU06
        au12_delta = deltas.get('AU12', {}).get('delta', 0)
        au06_delta = deltas.get('AU06', {}).get('delta', 0)
        
        if au12_delta > 0.3:
            if au06_delta > 0.2:
                patterns.append({
                    'pattern': 'Duchenne Smile Development',
                    'description': 'Both lip corners and eye muscles activated',
                    'intensity': round((au12_delta + au06_delta) / 2, 2)
                })
            else:
                patterns.append({
                    'pattern': 'Social Smile Development', 
                    'description': 'Lip corners activated without eye involvement',
                    'intensity': au12_delta
                })
        
        # Frown pattern: AU15 increase or AU04 increase
        au15_delta = deltas.get('AU15', {}).get('delta', 0)
        au04_delta = deltas.get('AU04', {}).get('delta', 0)
        
        if au15_delta > 0.3 or au04_delta > 0.3:
            patterns.append({
                'pattern': 'Frown Development',
                'description': 'Brow lowering or lip corner depression',
                'intensity': max(au15_delta, au04_delta)
            })
        
        # Surprise pattern: AU01 + AU02 + AU26
        au01_delta = deltas.get('AU01', {}).get('delta', 0)
        au02_delta = deltas.get('AU02', {}).get('delta', 0)
        au26_delta = deltas.get('AU26', {}).get('delta', 0)
        
        if au01_delta > 0.2 and au02_delta > 0.2:
            patterns.append({
                'pattern': 'Brow Flash',
                'description': 'Eyebrow raise movement',
                'intensity': round((au01_delta + au02_delta) / 2, 2)
            })
        
        return patterns


# Global baseline manager instance
baseline_manager = BaselineManager()