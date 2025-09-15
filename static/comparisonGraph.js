export function updateComparisonGraph(allResults, comparisonSection, comparisonGraph) {
    if (!comparisonSection) {
        console.warn('Comparison section not found');
        return;
    }

    if (allResults.length === 0) {
        comparisonSection.style.display = 'none';
        return;
    }

    // Check if we have multi-backend results
    const firstResult = allResults[0].result;
    const isMultiBackend = firstResult.analysis_mode === 'multi';

    if (isMultiBackend) {
        updateMultiBackendComparison(allResults, comparisonSection, comparisonGraph);
    } else {
        updateSingleBackendComparison(allResults, comparisonSection, comparisonGraph);
    }
}

function updateMultiBackendComparison(allResults, comparisonSection, comparisonGraph) {
    comparisonSection.style.display = 'block';
    
    const emotions = ['anger', 'disgust', 'fear', 'sadness', 'neutral', 'surprise', 'happiness'];
    const backends = ['fer', 'deepface'];
    const datasets = [];
    
    // Create datasets for each backend
    backends.forEach(backend => {
        emotions.forEach(emotion => {
            datasets.push({
                label: `${backend.toUpperCase()} - ${emotion}`,
                data: [],
                borderColor: getBackendEmotionColor(backend, emotion),
                backgroundColor: getBackendEmotionColor(backend, emotion, 0.1),
                fill: false,
                pointRadius: 4,
                borderWidth: 2
            });
        });
    });

    // Sort results by image number
    allResults.sort((a, b) => a.imageNumber - b.imageNumber);
    const labels = allResults.map(result => `Image #${result.imageNumber}`);

    // Populate data
    allResults.forEach(result => {
        backends.forEach((backend, backendIndex) => {
            emotions.forEach((emotion, emotionIndex) => {
                const datasetIndex = backendIndex * emotions.length + emotionIndex;
                const backendData = result.result[backend];
                const emotionValue = backendData && backendData.emotions ? 
                    (backendData.emotions[emotion] || 0) * 100 : 0;
                datasets[datasetIndex].data.push(emotionValue);
            });
        });
    });

    // Create chart
    if (window.comparisonChart) {
        window.comparisonChart.destroy();
    }

    window.comparisonChart = new Chart(comparisonGraph, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Emotion Intensity (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Images'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        padding: 8,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            return `${allResults[index].filename}`;
                        }
                    }
                }
            }
        }
    });

    // Update comparison statistics
    updateComparisonStats(allResults);
}

function updateSingleBackendComparison(allResults, comparisonSection, comparisonGraph) {
    if (allResults.length < 2) {
        comparisonSection.style.display = 'none';
        return;
    }

    comparisonSection.style.display = 'block';
    // Implement single backend comparison if needed
    document.getElementById('comparisonStats').innerHTML = '<p>Single backend comparison not implemented yet.</p>';
}

function updateComparisonStats(allResults) {
    const agreementInfo = document.getElementById('agreementInfo');
    const correlationInfo = document.getElementById('correlationInfo');
    
    if (!agreementInfo || !correlationInfo) return;

    let totalAgreements = 0;
    let totalComparisons = 0;
    let correlations = [];

    allResults.forEach(result => {
        const comparison = result.result.comparison;
        if (comparison) {
            // Count agreements
            if (comparison.agreements) {
                Object.values(comparison.agreements).forEach(agreement => {
                    totalComparisons++;
                    if (agreement.dominant_agreement) totalAgreements++;
                });
            }

            // Collect correlations
            if (comparison.correlations) {
                Object.values(comparison.correlations).forEach(corr => {
                    if (corr.correlation !== null && !isNaN(corr.correlation)) {
                        correlations.push(corr.correlation);
                    }
                });
            }
        }
    });

    // Update agreement info
    const agreementRate = totalComparisons > 0 ? (totalAgreements / totalComparisons * 100).toFixed(1) : 0;
    const agreementClass = agreementRate >= 50 ? 'agreement-positive' : 'agreement-negative';
    
    agreementInfo.className = agreementClass;
    agreementInfo.innerHTML = `
        <h4>🤝 Dominant Emotion Agreement</h4>
        <p><strong>${agreementRate}%</strong> agreement rate (${totalAgreements}/${totalComparisons} comparisons)</p>
        <p>${agreementRate >= 50 ? 'Good agreement between backends' : 'Backends often disagree'}</p>
    `;

    // Update correlation info
    if (correlations.length > 0) {
        const avgCorrelation = correlations.reduce((sum, corr) => sum + corr, 0) / correlations.length;
        const correlationPercentage = (avgCorrelation * 100).toFixed(1);
        
        correlationInfo.innerHTML = `
            <h4>📊 Emotion Score Correlation</h4>
            <p><strong>${correlationPercentage}%</strong> average correlation</p>
            <p>${avgCorrelation > 0.5 ? 'Strong similarity in emotion patterns' : 
                 avgCorrelation > 0 ? 'Moderate similarity in emotion patterns' : 
                 'Low similarity in emotion patterns'}</p>
        `;
    } else {
        correlationInfo.innerHTML = `
            <h4>📊 Emotion Score Correlation</h4>
            <p>No correlation data available</p>
        `;
    }
}

function getBackendEmotionColor(backend, emotion, alpha = 1) {
    const baseColors = {
        'anger': [255, 99, 132],
        'disgust': [75, 192, 192], 
        'fear': [153, 102, 255],
        'sadness': [54, 162, 235],
        'neutral': [201, 203, 207],
        'surprise': [255, 159, 64],
        'happiness': [255, 206, 86]
    };
    
    const color = baseColors[emotion] || [0, 0, 0];
    
    // Adjust intensity based on backend
    if (backend === 'fer') {
        // Slightly darker for FER
        return `rgba(${color[0] * 0.8}, ${color[1] * 0.8}, ${color[2] * 0.8}, ${alpha})`;
    } else {
        // Normal intensity for DeepFace  
        return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    }
}

