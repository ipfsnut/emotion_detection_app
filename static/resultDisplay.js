// Define a fixed order for emotions
const emotionOrder = ['anger', 'disgust', 'fear', 'sadness', 'neutral', 'surprise', 'happiness'];

// Function to create a container for an image result
export function createImageResultContainer(file, imageNumber) {
    console.log('Creating image result container for:', file.name);
    const container = document.createElement('div');
    container.className = 'image-result-container';
    container.file = file;
    container.imageNumber = imageNumber;
    container.originalFilename = file.name; // Store the original filename explicitly

    const imagePreview = document.createElement('div');
    imagePreview.className = 'image-preview';

    const img = document.createElement('img');
    const reader = new FileReader();
    reader.onload = (e) => img.src = e.target.result;
    reader.readAsDataURL(file);
    imagePreview.appendChild(img);

    const imageName = document.createElement('div');
    imageName.className = 'image-name';
    imageName.textContent = `Image #${imageNumber}: ${file.name}`;
    imagePreview.appendChild(imageName);

    const resultDetails = document.createElement('div');
    resultDetails.className = 'result-details';

    container.appendChild(imagePreview);
    container.appendChild(resultDetails);

    console.log('Image result container created');
    return container;
}
// Function to display the analysis results for an image
export function displayResult(resultDetails, data, imageNumber, filename) {
    // Check if this is multi-backend or single-backend result
    if (data.analysis_mode === 'multi') {
        displayMultiBackendResult(resultDetails, data, imageNumber, filename);
    } else {
        displaySingleBackendResult(resultDetails, data, imageNumber, filename);
    }
}

// Function to display single-backend results (legacy format)
function displaySingleBackendResult(resultDetails, data, imageNumber, filename) {
    let resultHtml = `<h3>Analysis Results: Image #${imageNumber} - ${filename}</h3>`;
    
    if (data.error) {
        resultHtml += `<p>Error: ${data.error}</p>`;
    } else {
        resultHtml += `<p class="dominant-emotion">Dominant: ${data.dominant_emotion}</p>`;
        resultHtml += `<div class="emotion-graph">`;

        for (const emotion of emotionOrder) {
            const score = data.emotions[emotion] || 0;
            const percentage = (score * 100).toFixed(1);
            resultHtml += `
                <div class="emotion-bar">
                    <span class="emotion-label">${emotion}</span>
                    <div class="emotion-score">
                        <div class="emotion-score-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="emotion-percentage">${percentage}%</span>
                </div>
            `;
        }
        
        resultHtml += `</div>`;
    }
    
    resultDetails.innerHTML = resultHtml;
}

// Function to display multi-backend comparison results
function displayMultiBackendResult(resultDetails, data, imageNumber, filename) {
    let resultHtml = `<h3>Multi-Backend Analysis: Image #${imageNumber} - ${filename}</h3>`;
    
    // Add comparison summary if available
    if (data.comparison) {
        resultHtml += createComparisonSummary(data.comparison);
    }
    
    // Add meta information
    if (data.meta) {
        resultHtml += createMetaInfo(data.meta);
    }
    
    // Create backend comparison grid
    resultHtml += `<div class="backend-comparison-grid">`;
    
    // Display results for each backend
    const backends = Object.keys(data).filter(key => 
        !['comparison', 'meta', 'analysis_mode'].includes(key)
    );
    
    for (const backend of backends) {
        const backendResult = data[backend];
        resultHtml += createBackendResultCard(backend, backendResult);
    }
    
    resultHtml += `</div>`;
    
    resultDetails.innerHTML = resultHtml;
}

// Function to create comparison summary
function createComparisonSummary(comparison) {
    if (!comparison) return '';
    
    let summaryHtml = `<div class="comparison-summary">`;
    summaryHtml += `<h4>🔍 Comparison Summary</h4>`;
    
    // Consensus information
    if (comparison.consensus) {
        const consensus = comparison.consensus;
        const confidenceIcon = consensus.confidence === 'high' ? '✅' : 
                               consensus.confidence === 'medium' ? '⚠️' : '❓';
        
        summaryHtml += `
            <div class="consensus-info">
                ${confidenceIcon} <strong>Consensus:</strong> ${consensus.emotion} 
                (${consensus.unanimous ? 'Unanimous' : `${Math.round((consensus.agreement_ratio || 0) * 100)}% agreement`})
            </div>
        `;
    }
    
    // Agreement details
    if (comparison.agreements) {
        const agreements = Object.values(comparison.agreements);
        const agreementCount = agreements.filter(a => a.dominant_agreement).length;
        const totalComparisons = agreements.length;
        
        summaryHtml += `
            <div class="agreement-info">
                📊 <strong>Agreement:</strong> ${agreementCount}/${totalComparisons} backend pairs agree on dominant emotion
            </div>
        `;
    }
    
    // Correlation information
    if (comparison.correlations) {
        const correlations = Object.values(comparison.correlations);
        const avgCorrelation = correlations
            .filter(c => c.correlation !== null)
            .reduce((sum, c) => sum + c.correlation, 0) / correlations.length;
        
        if (!isNaN(avgCorrelation)) {
            summaryHtml += `
                <div class="correlation-info">
                    📈 <strong>Correlation:</strong> ${(avgCorrelation * 100).toFixed(1)}% similarity in emotion scores
                </div>
            `;
        }
    }
    
    summaryHtml += `</div>`;
    return summaryHtml;
}

// Function to create meta information display
function createMetaInfo(meta) {
    return `
        <div class="meta-info">
            <small>
                📊 ${meta.successful_backends}/${meta.total_backends} backends successful: 
                ${meta.backends_successful.join(', ')}
            </small>
        </div>
    `;
}

// Function to create individual backend result card
function createBackendResultCard(backend, result) {
    const backendClass = backend.toLowerCase();
    let cardHtml = `<div class="backend-result-card ${backendClass}">`;
    
    // Backend header
    cardHtml += `
        <div class="backend-header">
            <h4>${backend.toUpperCase()}</h4>
            ${result.face_detected ? '👤' : '❌'} ${result.face_detected ? 'Face Detected' : 'No Face'}
        </div>
    `;
    
    if (result.error) {
        cardHtml += `<p class="error-message">❌ ${result.error}</p>`;
    } else if (result.analysis_type === 'pure_facs') {
        // Pure FACS analysis - show muscle data only
        cardHtml += createPureFACSDisplay(result);
    } else if (result.emotions) {
        // Emotion backend - show emotions
        cardHtml += createEmotionDisplay(result);
        
        // Add FACS Action Units if present (legacy format)
        if (result.action_units && typeof result.action_units === 'object' && !result.action_units.intensity) {
            cardHtml += createActionUnitsDisplay(result.action_units, result.au_interpretation);
        }
    }
    
    cardHtml += `</div>`;
    return cardHtml;
}

// Function to display emotion analysis results
function createEmotionDisplay(result) {
    let emotionHtml = '';
    
    // Dominant emotion
    emotionHtml += `
        <div class="dominant-emotion-card">
            <strong>Dominant:</strong> ${result.dominant_emotion}
            <span class="confidence-score">(${(result.confidence_score * 100).toFixed(1)}%)</span>
        </div>
    `;
    
    // Emotion breakdown
    emotionHtml += `<div class="emotion-graph-card">`;
    for (const emotion of emotionOrder) {
        const score = result.emotions[emotion] || 0;
        const percentage = (score * 100).toFixed(1);
        emotionHtml += `
            <div class="emotion-bar-small">
                <span class="emotion-label-small">${emotion}</span>
                <div class="emotion-score-small">
                    <div class="emotion-score-fill-small" style="width: ${percentage}%"></div>
                </div>
                <span class="emotion-percentage-small">${percentage}%</span>
            </div>
        `;
    }
    emotionHtml += `</div>`;
    
    return emotionHtml;
}

// Function to display pure FACS analysis
function createPureFACSDisplay(result) {
    let facsHtml = `<div class="pure-facs-analysis">`;
    
    // Summary
    facsHtml += `
        <div class="facs-summary">
            <strong>🔬 Muscle Analysis:</strong> ${result.total_aus_detected} Action Units detected
        </div>
    `;
    
    // Action Units
    if (result.action_units && Object.keys(result.action_units).length > 0) {
        facsHtml += `<div class="pure-facs-units">`;
        facsHtml += `<h5>💪 Active Muscles</h5>`;
        
        // Sort by intensity
        const sortedAUs = Object.entries(result.action_units)
            .sort((a, b) => b[1].intensity - a[1].intensity);
        
        facsHtml += `<div class="facs-unit-list">`;
        for (const [auCode, auData] of sortedAUs) {
            const percentage = (auData.intensity * 100).toFixed(1);
            const intensityClass = auData.intensity > 0.7 ? 'high' : auData.intensity > 0.4 ? 'medium' : 'low';
            
            facsHtml += `
                <div class="facs-unit-item ${intensityClass}">
                    <div class="facs-unit-header">
                        <span class="facs-au-code">${auCode}</span>
                        <span class="facs-intensity">${percentage}%</span>
                    </div>
                    <div class="facs-unit-description">${auData.description}</div>
                    <div class="facs-muscle-group">${auData.muscle_group}</div>
                    <div class="facs-intensity-bar">
                        <div class="facs-intensity-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }
        facsHtml += `</div>`;
        facsHtml += `</div>`;
    }
    
    // FACS Combinations
    if (result.facs_combinations && result.facs_combinations.length > 0) {
        facsHtml += `<div class="facs-combinations">`;
        facsHtml += `<h5>🎭 Detected Patterns</h5>`;
        
        for (const combo of result.facs_combinations) {
            const percentage = (combo.intensity * 100).toFixed(1);
            facsHtml += `
                <div class="facs-combination">
                    <div class="facs-combo-header">
                        <strong>${combo.pattern}</strong>
                        <span class="facs-combo-intensity">${percentage}%</span>
                    </div>
                    <div class="facs-combo-description">${combo.description}</div>
                    <div class="facs-combo-aus">AUs: ${combo.aus.join(', ')}</div>
                </div>
            `;
        }
        facsHtml += `</div>`;
    }
    
    facsHtml += `</div>`;
    return facsHtml;
}

// Function to display FACS Action Units
function createActionUnitsDisplay(actionUnits, interpretation) {
    let auHtml = `<div class="action-units-section">`;
    auHtml += `<h5>🎭 FACS Action Units</h5>`;
    
    // Display significant action units
    const significantAUs = Object.entries(actionUnits)
        .filter(([au, intensity]) => intensity > 0.1)
        .sort((a, b) => b[1] - a[1]);
    
    if (significantAUs.length > 0) {
        auHtml += `<div class="action-units-grid">`;
        for (const [au, intensity] of significantAUs) {
            const percentage = (intensity * 100).toFixed(1);
            const intensityClass = intensity > 0.7 ? 'high' : intensity > 0.4 ? 'medium' : 'low';
            auHtml += `
                <div class="au-item ${intensityClass}">
                    <span class="au-code">${au}</span>
                    <div class="au-intensity">
                        <div class="au-intensity-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="au-value">${percentage}%</span>
                </div>
            `;
        }
        auHtml += `</div>`;
        
        // Add interpretation if available
        if (interpretation && interpretation.length > 0) {
            auHtml += `<div class="au-interpretation">`;
            auHtml += `<h6>Active Facial Movements:</h6>`;
            auHtml += `<ul class="au-list">`;
            for (const desc of interpretation) {
                auHtml += `<li>${desc}</li>`;
            }
            auHtml += `</ul>`;
            auHtml += `</div>`;
        }
    } else {
        auHtml += `<p class="no-action-units">No significant action units detected</p>`;
    }
    
    auHtml += `</div>`;
    return auHtml;
}