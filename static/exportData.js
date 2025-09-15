import { getAllResults } from './formSubmission.js';

export function initializeExportButton(exportButton) {
    if (!exportButton) {
        console.error('Export button not found!');
        return;
    }
    
    exportButton.addEventListener('click', function() {
        const allResults = getAllResults();
        
        if (allResults.length === 0) {
            alert('No results to export');
            return;
        }
        
        // Check if we have multi-backend or single-backend results
        const firstResult = allResults[0].result;
        const isMultiBackend = firstResult.analysis_mode === 'multi';
        
        let csvContent, filename;
        
        if (isMultiBackend) {
            // Create multi-backend CSV with separate columns for each backend
            csvContent = createMultiBackendCSV(allResults);
            filename = "emotion_detection_multi_backend_results.csv";
        } else {
            // Create single-backend CSV (legacy format)
            csvContent = createSingleBackendCSV(allResults);
            filename = "emotion_detection_results.csv";
        }
        
        // Use Blob for more reliable CSV download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        URL.revokeObjectURL(url);
    });
}

function createSingleBackendCSV(allResults) {
    const header = "Image Number,Filename,Dominant Emotion,Anger,Disgust,Fear,Sadness,Neutral,Surprise,Happiness\n";
    const rows = allResults.map(result => {
        const emotions = result.result.emotions || {};
        
        // Round emotion scores to 2 decimal places
        const roundedEmotions = {
            anger: (emotions.anger || 0).toFixed(2),
            disgust: (emotions.disgust || 0).toFixed(2),
            fear: (emotions.fear || 0).toFixed(2),
            sadness: (emotions.sadness || 0).toFixed(2),
            neutral: (emotions.neutral || 0).toFixed(2),
            surprise: (emotions.surprise || 0).toFixed(2),
            happiness: (emotions.happiness || 0).toFixed(2)
        };
        
        return `${result.imageNumber},${result.filename},${result.result.dominant_emotion || 'unknown'},${roundedEmotions.anger},${roundedEmotions.disgust},${roundedEmotions.fear},${roundedEmotions.sadness},${roundedEmotions.neutral},${roundedEmotions.surprise},${roundedEmotions.happiness}`;
    }).join("\n");
    
    return header + rows;
}

function createMultiBackendCSV(allResults) {
    const header = "Image Number,Filename,Backend,Dominant Emotion,Anger,Disgust,Fear,Sadness,Neutral,Surprise,Happiness,Agreement,Correlation\n";
    
    const rows = [];
    allResults.forEach((result) => {
        const data = result.result;
        
        // Add row for each backend
        if (data.fer) {
            rows.push(createBackendRow(result.imageNumber, result.filename, 'FER', data.fer, data.comparison));
        }
        if (data.deepface) {
            rows.push(createBackendRow(result.imageNumber, result.filename, 'DeepFace', data.deepface, data.comparison));
        }
    });
    
    return header + rows.join("\n");
}

function createBackendRow(imageNumber, filename, backend, backendData, comparison) {
    const emotions = backendData.emotions || {};
    const dominant = backendData.dominant_emotion || 'unknown';
    
    // Round emotion scores to 2 decimal places
    const roundedEmotions = {
        anger: (emotions.anger || 0).toFixed(2),
        disgust: (emotions.disgust || 0).toFixed(2),
        fear: (emotions.fear || 0).toFixed(2),
        sadness: (emotions.sadness || 0).toFixed(2),
        neutral: (emotions.neutral || 0).toFixed(2),
        surprise: (emotions.surprise || 0).toFixed(2),
        happiness: (emotions.happiness || 0).toFixed(2)
    };
    
    // Get comparison metrics if available
    let agreement = '';
    let correlation = '';
    
    if (comparison && comparison.agreements) {
        const agreementKey = Object.keys(comparison.agreements)[0];
        if (agreementKey) {
            agreement = comparison.agreements[agreementKey].dominant_agreement ? 'Yes' : 'No';
        }
    }
    
    if (comparison && comparison.correlations) {
        const correlationKey = Object.keys(comparison.correlations)[0];
        if (correlationKey && comparison.correlations[correlationKey].correlation !== null) {
            correlation = comparison.correlations[correlationKey].correlation.toFixed(2);
        }
    }
    
    return `${imageNumber},${filename},${backend},${dominant},${roundedEmotions.anger},${roundedEmotions.disgust},${roundedEmotions.fear},${roundedEmotions.sadness},${roundedEmotions.neutral},${roundedEmotions.surprise},${roundedEmotions.happiness},${agreement},${correlation}`;
}