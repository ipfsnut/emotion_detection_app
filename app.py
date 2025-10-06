from flask import Flask, render_template, request, jsonify
import os
import traceback
from image_processor import analyze_image, analyze_image_multi
from emotion_backends import get_available_backends
from baseline_manager import baseline_manager

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def index():
    # Pass available backends to the template
    available_backends = get_available_backends()
    return render_template('index.html', available_backends=available_backends)

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        if file and file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            filename = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
            file.save(filename)
            
            # Get selected backends from form data
            backends = request.form.getlist('backends')
            if not backends:
                # Default to all available backends if none specified
                backends = get_available_backends()
            
            # Determine analysis mode
            analysis_mode = request.form.get('analysis_mode', 'multi')
            
            try:
                if analysis_mode == 'single' or len(backends) == 1:
                    # Use single-backend analysis for backward compatibility
                    result = analyze_image(filename)
                    result['analysis_mode'] = 'single'
                    result['backend_used'] = backends[0] if backends else 'fer'
                else:
                    # Use multi-backend analysis
                    result = analyze_image_multi(filename, backends)
                    result['analysis_mode'] = 'multi'
                    
                    # Multi-backend analysis completed
                
                # Check if user wants baseline analysis
                use_baseline = request.form.get('use_baseline', 'false').lower() == 'true'
                
                if use_baseline:
                    # Add baseline delta analysis for FACS results
                    # Create a list of items to avoid modifying dict during iteration
                    delta_results = {}
                    for backend_name, backend_result in list(result.items()):
                        if (isinstance(backend_result, dict) and 
                            backend_result.get('analysis_type') == 'pure_facs'):
                            delta_result = baseline_manager.calculate_delta(backend_result)
                            delta_results[f'{backend_name}_delta'] = delta_result
                    
                    # Add delta results after iteration
                    result.update(delta_results)
                
                return jsonify(result)
            finally:
                # Always clean up uploaded file
                if os.path.exists(filename):
                    os.remove(filename)
        else:
            return jsonify({'error': 'Invalid file type'}), 400
    except Exception as e:
        app.logger.error(f"An error occurred: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': 'An internal server error occurred'}), 500

@app.route('/api/backends', methods=['GET'])
def get_backends():
    """API endpoint to get available backends"""
    try:
        available = get_available_backends()
        return jsonify({
            'available_backends': available,
            'default_backends': available  # Use all available by default
        })
    except Exception as e:
        app.logger.error(f"Error getting backends: {str(e)}")
        return jsonify({'error': 'Could not get available backends'}), 500

@app.route('/set_baseline', methods=['POST'])
def set_baseline():
    """Set baseline from uploaded image"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if file and file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            filename = os.path.join(app.config['UPLOAD_FOLDER'], f"baseline_{file.filename}")
            file.save(filename)
            
            try:
                # Get person ID
                person_id = request.form.get('person_id', 'default')
                
                # Analyze with FACS only
                result = analyze_image_multi(filename, ['simplefacs'])
                
                # Check if FACS analysis was successful
                facs_result = result.get('simplefacs')
                if facs_result and facs_result.get('analysis_type') == 'pure_facs':
                    success = baseline_manager.set_baseline(facs_result, person_id)
                    if success:
                        baseline_info = baseline_manager.get_baseline_info()
                        return jsonify({
                            'success': True,
                            'message': f'Baseline set for {person_id}',
                            'baseline_info': baseline_info,
                            'facs_result': facs_result
                        })
                    else:
                        return jsonify({'error': 'Failed to set baseline'}), 500
                else:
                    return jsonify({'error': 'FACS analysis failed for baseline'}), 500
            finally:
                # Clean up baseline file
                if os.path.exists(filename):
                    os.remove(filename)
        else:
            return jsonify({'error': 'Invalid file type'}), 400
    except Exception as e:
        app.logger.error(f"Baseline setup failed: {str(e)}")
        return jsonify({'error': f'Baseline setup failed: {str(e)}'}), 500

@app.route('/baseline_info', methods=['GET'])
def get_baseline_info():
    """Get current baseline information"""
    baseline_info = baseline_manager.get_baseline_info()
    return jsonify({
        'has_baseline': baseline_info is not None,
        'baseline_info': baseline_info
    })

@app.route('/clear_baseline', methods=['POST'])
def clear_baseline():
    """Clear current baseline"""
    try:
        person_id = request.json.get('person_id', 'default') if request.json else 'default'
        success = baseline_manager.clear_baseline(person_id)
        
        if success:
            return jsonify({'success': True, 'message': f'Baseline cleared for {person_id}'})
        else:
            return jsonify({'error': 'Failed to clear baseline'}), 500
    except Exception as e:
        app.logger.error(f"Clear baseline failed: {str(e)}")
        return jsonify({'error': f'Clear baseline failed: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)