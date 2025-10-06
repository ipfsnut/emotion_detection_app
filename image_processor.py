import cv2
import logging
from emotion_backends import get_detector, get_available_backends
from scipy.stats import pearsonr
import numpy as np


def analyze_image(image_path):
    """Legacy single-backend function for backward compatibility"""
    try:
        # Use the new backend system with FER
        fer_detector = get_detector('fer')
        result = fer_detector.detect(image_path)
        
        # Convert to legacy format
        if 'error' not in result:
            return {
                'emotions': result['emotions'],
                'dominant_emotion': result['dominant_emotion']
            }
        else:
            return {'error': result['error']}
    except Exception as e:
        logging.error(f"Error analyzing image: {str(e)}", exc_info=True)
        return {'error': f'Error analyzing image: {str(e)}'}

def analyze_image_multi(image_path, backends=None):
    """
    Analyze image with multiple emotion detection backends
    
    Args:
        image_path (str): Path to the image file
        backends (list): List of backend names to use (default: all available)
        
    Returns:
        dict: Results from all backends plus comparison metrics
    """
    if backends is None:
        backends = get_available_backends()
    
    results = {}
    successful_results = {}
    
    # Run analysis with each backend
    for backend_name in backends:
        try:
            detector_instance = get_detector(backend_name)
            
            # Check if this is a FACS analyzer (pure muscle data) or emotion detector
            if hasattr(detector_instance, 'analyze'):
                # FACS analyzer - returns pure muscle data
                result = detector_instance.analyze(image_path)
            else:
                # Emotion detector - returns emotion predictions
                result = detector_instance.detect(image_path)
            
            results[backend_name] = result
            
            # Backend analysis completed
            
            # Store successful results for comparison (only emotion backends)
            if ('error' not in result and result.get('face_detected', False) and 
                result.get('analysis_type') != 'pure_facs'):
                successful_results[backend_name] = result
                
        except Exception as e:
            logging.error(f"Error with backend {backend_name}: {str(e)}")
            results[backend_name] = {
                'error': f'Backend {backend_name} failed: {str(e)}',
                'backend': backend_name,
                'face_detected': False
            }
    
    # Add comparison metrics if we have multiple successful results
    if len(successful_results) >= 2:
        results['comparison'] = compare_results(successful_results)
    
    # Add meta information
    results['meta'] = {
        'backends_requested': backends,
        'backends_successful': list(successful_results.keys()),
        'total_backends': len(backends),
        'successful_backends': len(successful_results)
    }
    
    return results

def compare_results(results):
    """
    Compare results from multiple backends and provide analysis
    
    Args:
        results (dict): Dictionary of backend results
        
    Returns:
        dict: Comparison metrics and analysis
    """
    if len(results) < 2:
        return None
    
    backend_names = list(results.keys())
    comparison = {
        'backends_compared': backend_names,
        'agreements': {},
        'correlations': {},
        'confidence_differences': {},
        'consensus': None
    }
    
    # Compare each pair of backends
    for i, backend1 in enumerate(backend_names):
        for backend2 in backend_names[i+1:]:
            pair_key = f"{backend1}_vs_{backend2}"
            
            result1 = results[backend1]
            result2 = results[backend2]
            
            # Dominant emotion agreement
            dominant1 = result1.get('dominant_emotion')
            dominant2 = result2.get('dominant_emotion')
            agreement = bool(dominant1 == dominant2 if dominant1 and dominant2 else False)
            
            comparison['agreements'][pair_key] = {
                'dominant_agreement': agreement,
                'backend1_dominant': dominant1,
                'backend2_dominant': dominant2
            }
            
            # Emotion correlation
            emotions1 = result1.get('emotions', {})
            emotions2 = result2.get('emotions', {})
            
            if emotions1 and emotions2:
                correlation = calculate_emotion_correlation(emotions1, emotions2)
                comparison['correlations'][pair_key] = correlation
                
                # Confidence difference for dominant emotions
                conf1 = result1.get('confidence_score', 0)
                conf2 = result2.get('confidence_score', 0)
                comparison['confidence_differences'][pair_key] = round(float(abs(conf1 - conf2)), 2)
    
    # Calculate consensus if all backends agree
    all_dominants = [r.get('dominant_emotion') for r in results.values() if 'dominant_emotion' in r]
    if all_dominants and len(set(all_dominants)) == 1:
        comparison['consensus'] = {
            'emotion': all_dominants[0],
            'unanimous': True,
            'confidence': 'high'
        }
    elif all_dominants:
        # Find most common dominant emotion
        from collections import Counter
        emotion_counts = Counter(all_dominants)
        most_common = emotion_counts.most_common(1)[0]
        comparison['consensus'] = {
            'emotion': most_common[0],
            'unanimous': False,
            'confidence': 'medium' if most_common[1] > len(all_dominants) / 2 else 'low',
            'agreement_ratio': round(most_common[1] / len(all_dominants), 2)
        }
    
    return comparison

def calculate_emotion_correlation(emotions1, emotions2):
    """
    Calculate correlation between two emotion dictionaries
    
    Args:
        emotions1 (dict): First set of emotion scores
        emotions2 (dict): Second set of emotion scores
        
    Returns:
        dict: Correlation metrics
    """
    # Get common emotions
    common_emotions = set(emotions1.keys()) & set(emotions2.keys())
    
    if len(common_emotions) < 2:
        return {'correlation': None, 'common_emotions': len(common_emotions)}
    
    # Extract scores for common emotions
    scores1 = [emotions1[emotion] for emotion in common_emotions]
    scores2 = [emotions2[emotion] for emotion in common_emotions]
    
    try:
        correlation, p_value = pearsonr(scores1, scores2)
        return {
            'correlation': round(float(correlation), 2),
            'p_value': round(float(p_value), 4),
            'common_emotions': len(common_emotions),
            'significant': bool(p_value < 0.05 if not np.isnan(p_value) else False)
        }
    except Exception as e:
        return {
            'correlation': None,
            'error': str(e),
            'common_emotions': len(common_emotions)
        }