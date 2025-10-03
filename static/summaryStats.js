// Summary Statistics Module for displaying mean emotions across all images

export function createSummarySection(allResults) {
    if (!allResults || allResults.length === 0) {
        return null;
    }

    // Create summary container
    const summaryContainer = document.createElement('div');
    summaryContainer.className = 'summary-statistics-container';
    summaryContainer.innerHTML = '<h2>Summary Statistics</h2>';
    
    // Determine if we have multi-backend or single-backend results
    const firstResult = allResults[0].result;
    const isMultiBackend = firstResult.analysis_mode === 'multi';
    
    if (isMultiBackend) {
        // Calculate means for each backend separately
        const backends = detectBackends(allResults);
        
        backends.forEach(backend => {
            const backendStats = calculateBackendMeans(allResults, backend);
            const backendSection = createBackendSummary(backend, backendStats, allResults.length);
            summaryContainer.appendChild(backendSection);
        });
        
        // Add comparison of means between backends if we have multiple
        if (backends.length > 1) {
            const comparisonSection = createBackendComparison(allResults, backends);
            summaryContainer.appendChild(comparisonSection);
        }
    } else {
        // Single backend summary
        const stats = calculateSingleBackendMeans(allResults);
        const statsSection = createBackendSummary('Single Backend', stats, allResults.length);
        summaryContainer.appendChild(statsSection);
    }
    
    return summaryContainer;
}

function detectBackends(allResults) {
    const backends = new Set();
    allResults.forEach(result => {
        if (result.result.fer) backends.add('fer');
        if (result.result.deepface) backends.add('deepface');
    });
    return Array.from(backends);
}

function calculateBackendMeans(allResults, backend) {
    const emotions = ['anger', 'disgust', 'fear', 'sadness', 'neutral', 'surprise', 'happiness'];
    const sums = {};
    const counts = {};
    
    // Initialize sums and counts
    emotions.forEach(emotion => {
        sums[emotion] = 0;
        counts[emotion] = 0;
    });
    
    // Sum up all emotion values
    allResults.forEach(result => {
        const backendData = result.result[backend];
        if (backendData && backendData.emotions) {
            emotions.forEach(emotion => {
                const value = backendData.emotions[emotion];
                if (value !== undefined && value !== null) {
                    sums[emotion] += value;
                    counts[emotion]++;
                }
            });
        }
    });
    
    // Calculate means
    const means = {};
    const stdDevs = {};
    
    emotions.forEach(emotion => {
        if (counts[emotion] > 0) {
            means[emotion] = sums[emotion] / counts[emotion];
        } else {
            means[emotion] = 0;
        }
    });
    
    // Calculate standard deviations
    emotions.forEach(emotion => {
        let sumSquaredDiffs = 0;
        let count = 0;
        
        allResults.forEach(result => {
            const backendData = result.result[backend];
            if (backendData && backendData.emotions) {
                const value = backendData.emotions[emotion];
                if (value !== undefined && value !== null) {
                    sumSquaredDiffs += Math.pow(value - means[emotion], 2);
                    count++;
                }
            }
        });
        
        if (count > 1) {
            stdDevs[emotion] = Math.sqrt(sumSquaredDiffs / (count - 1));
        } else {
            stdDevs[emotion] = 0;
        }
    });
    
    return { means, stdDevs, counts };
}

function calculateSingleBackendMeans(allResults) {
    const emotions = ['anger', 'disgust', 'fear', 'sadness', 'neutral', 'surprise', 'happiness'];
    const sums = {};
    const counts = {};
    
    emotions.forEach(emotion => {
        sums[emotion] = 0;
        counts[emotion] = 0;
    });
    
    allResults.forEach(result => {
        if (result.result.emotions) {
            emotions.forEach(emotion => {
                const value = result.result.emotions[emotion];
                if (value !== undefined && value !== null) {
                    sums[emotion] += value;
                    counts[emotion]++;
                }
            });
        }
    });
    
    const means = {};
    const stdDevs = {};
    
    emotions.forEach(emotion => {
        if (counts[emotion] > 0) {
            means[emotion] = sums[emotion] / counts[emotion];
        } else {
            means[emotion] = 0;
        }
    });
    
    // Calculate standard deviations
    emotions.forEach(emotion => {
        let sumSquaredDiffs = 0;
        let count = 0;
        
        allResults.forEach(result => {
            if (result.result.emotions) {
                const value = result.result.emotions[emotion];
                if (value !== undefined && value !== null) {
                    sumSquaredDiffs += Math.pow(value - means[emotion], 2);
                    count++;
                }
            }
        });
        
        if (count > 1) {
            stdDevs[emotion] = Math.sqrt(sumSquaredDiffs / (count - 1));
        } else {
            stdDevs[emotion] = 0;
        }
    });
    
    return { means, stdDevs, counts };
}

function createBackendSummary(backendName, stats, totalImages) {
    const section = document.createElement('div');
    section.className = 'backend-summary';
    
    const title = document.createElement('h3');
    title.textContent = backendName.toUpperCase() + ' - Mean Emotion Scores';
    section.appendChild(title);
    
    const info = document.createElement('p');
    info.className = 'summary-info';
    info.textContent = `Based on ${totalImages} images`;
    section.appendChild(info);
    
    const table = document.createElement('table');
    table.className = 'summary-table';
    
    // Create header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Emotion</th>
            <th>Mean</th>
            <th>Std Dev</th>
            <th>Visual</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    const emotions = ['anger', 'disgust', 'fear', 'sadness', 'neutral', 'surprise', 'happiness'];
    
    emotions.forEach(emotion => {
        const row = document.createElement('tr');
        const mean = stats.means[emotion] || 0;
        const stdDev = stats.stdDevs[emotion] || 0;
        
        row.innerHTML = `
            <td class="emotion-name">${capitalizeFirst(emotion)}</td>
            <td class="mean-value">${mean.toFixed(4)}</td>
            <td class="std-value">±${stdDev.toFixed(4)}</td>
            <td class="visual-bar">
                <div class="bar-container">
                    <div class="bar-fill ${emotion}" style="width: ${mean * 100}%"></div>
                    <span class="bar-label">${(mean * 100).toFixed(1)}%</span>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    section.appendChild(table);
    
    // Add dominant emotion summary
    const dominantEmotions = countDominantEmotions(stats.means);
    if (dominantEmotions.primary) {
        const dominant = document.createElement('p');
        dominant.className = 'dominant-summary';
        dominant.innerHTML = `<strong>Highest Mean:</strong> ${capitalizeFirst(dominantEmotions.primary)} (${(stats.means[dominantEmotions.primary] * 100).toFixed(2)}%)`;
        section.appendChild(dominant);
    }
    
    // Add valence summary
    const valenceSummary = createValenceSummary(stats.means);
    section.appendChild(valenceSummary);
    
    return section;
}

function createBackendComparison(allResults, backends) {
    const section = document.createElement('div');
    section.className = 'backend-comparison';
    
    const title = document.createElement('h3');
    title.textContent = 'Backend Comparison';
    section.appendChild(title);
    
    // Calculate means for each backend
    const backendStats = {};
    backends.forEach(backend => {
        backendStats[backend] = calculateBackendMeans(allResults, backend);
    });
    
    // Create comparison table
    const table = document.createElement('table');
    table.className = 'comparison-table';
    
    // Header
    const thead = document.createElement('thead');
    let headerHTML = '<tr><th>Emotion</th>';
    backends.forEach(backend => {
        headerHTML += `<th>${backend.toUpperCase()}</th>`;
    });
    headerHTML += '<th>Difference</th></tr>';
    thead.innerHTML = headerHTML;
    table.appendChild(thead);
    
    // Body
    const tbody = document.createElement('tbody');
    const emotions = ['anger', 'disgust', 'fear', 'sadness', 'neutral', 'surprise', 'happiness'];
    
    emotions.forEach(emotion => {
        const row = document.createElement('tr');
        let rowHTML = `<td class="emotion-name">${capitalizeFirst(emotion)}</td>`;
        
        const values = [];
        backends.forEach(backend => {
            const mean = backendStats[backend].means[emotion] || 0;
            values.push(mean);
            rowHTML += `<td class="mean-value">${mean.toFixed(4)}</td>`;
        });
        
        // Calculate difference if we have exactly 2 backends
        if (values.length === 2) {
            const diff = Math.abs(values[0] - values[1]);
            const diffClass = diff > 0.1 ? 'high-diff' : diff > 0.05 ? 'medium-diff' : 'low-diff';
            rowHTML += `<td class="diff-value ${diffClass}">${diff.toFixed(4)}</td>`;
        } else {
            rowHTML += '<td>-</td>';
        }
        
        row.innerHTML = rowHTML;
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    section.appendChild(table);
    
    return section;
}

function countDominantEmotions(means) {
    let primary = null;
    let maxValue = -1;
    
    Object.keys(means).forEach(emotion => {
        if (means[emotion] > maxValue) {
            maxValue = means[emotion];
            primary = emotion;
        }
    });
    
    return { primary, value: maxValue };
}

function createValenceSummary(means) {
    const container = document.createElement('div');
    container.className = 'valence-summary';
    
    // Define emotion groupings
    const negativeEmotions = ['anger', 'sadness', 'fear', 'disgust'];
    const neutralEmotions = ['neutral'];
    const positiveEmotions = ['happiness', 'surprise'];
    
    // Calculate valence sums (total emotional content per category)
    const negativeSum = negativeEmotions.reduce((sum, emotion) => sum + (means[emotion] || 0), 0);
    const neutralSum = neutralEmotions.reduce((sum, emotion) => sum + (means[emotion] || 0), 0);
    const positiveSum = positiveEmotions.reduce((sum, emotion) => sum + (means[emotion] || 0), 0);
    
    // Create header
    const header = document.createElement('h4');
    header.textContent = 'Valence Summary';
    header.className = 'valence-header';
    container.appendChild(header);
    
    // Calculate net valence ratio: (positive - negative) / neutral
    // When neutral <= 0.01 (1%), treat as 1.0 (100%) for calculation
    const neutralForCalculation = Math.max(neutralSum, 1.0);
    const valenceScore = (positiveSum - negativeSum) / neutralForCalculation;
    
    // Add explanation
    const explanation = document.createElement('p');
    explanation.className = 'valence-explanation';
    explanation.textContent = 'Net valence: (positive - negative) / neutral';
    container.appendChild(explanation);
    
    // Create valence display
    const valenceDisplay = document.createElement('div');
    valenceDisplay.className = 'valence-display';
    
    // Negative valence
    const negativeDiv = document.createElement('div');
    negativeDiv.className = 'valence-group negative';
    negativeDiv.innerHTML = `
        <div class="valence-label">Negative</div>
        <div class="valence-emotions">(${negativeEmotions.map(capitalizeFirst).join(', ')})</div>
        <div class="valence-value">${(negativeSum * 100).toFixed(2)}%</div>
        <div class="valence-bar">
            <div class="valence-bar-fill negative" style="width: ${negativeSum * 100}%"></div>
        </div>
    `;
    
    // Neutral valence
    const neutralDiv = document.createElement('div');
    neutralDiv.className = 'valence-group neutral';
    neutralDiv.innerHTML = `
        <div class="valence-label">Neutral</div>
        <div class="valence-emotions">(${neutralEmotions.map(capitalizeFirst).join(', ')})</div>
        <div class="valence-value">${(neutralSum * 100).toFixed(2)}%</div>
        <div class="valence-bar">
            <div class="valence-bar-fill neutral" style="width: ${neutralSum * 100}%"></div>
        </div>
    `;
    
    // Positive valence
    const positiveDiv = document.createElement('div');
    positiveDiv.className = 'valence-group positive';
    positiveDiv.innerHTML = `
        <div class="valence-label">Positive</div>
        <div class="valence-emotions">(${positiveEmotions.map(capitalizeFirst).join(', ')})</div>
        <div class="valence-value">${(positiveSum * 100).toFixed(2)}%</div>
        <div class="valence-bar">
            <div class="valence-bar-fill positive" style="width: ${positiveSum * 100}%"></div>
        </div>
    `;
    
    valenceDisplay.appendChild(negativeDiv);
    valenceDisplay.appendChild(neutralDiv);
    valenceDisplay.appendChild(positiveDiv);
    
    container.appendChild(valenceDisplay);
    
    // Add interpretation
    const interpretation = document.createElement('div');
    interpretation.className = 'valence-interpretation';
    
    let valenceInterpretation;
    if (valenceScore > 0.1) {
        valenceInterpretation = 'Positive';
    } else if (valenceScore < -0.1) {
        valenceInterpretation = 'Negative';
    } else {
        valenceInterpretation = 'Neutral';
    }
    
    interpretation.innerHTML = `
        <strong>Net Valence Score:</strong> ${valenceScore.toFixed(3)} (${valenceInterpretation})
        <br>
        <span class="valence-ratio">Components: ${(positiveSum * 100).toFixed(1)}% positive, ${(neutralSum * 100).toFixed(1)}% neutral, ${(negativeSum * 100).toFixed(1)}% negative</span>
    `;
    
    container.appendChild(interpretation);
    
    return container;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function updateSummarySection(allResults) {
    // Remove existing summary if present
    const existingSummary = document.querySelector('.summary-statistics-container');
    if (existingSummary) {
        existingSummary.remove();
    }
    
    // Create and append new summary
    const summarySection = createSummarySection(allResults);
    if (summarySection) {
        // Find the image container or a suitable parent
        const imageContainer = document.getElementById('imageContainer');
        if (imageContainer && imageContainer.parentNode) {
            // Insert after image container
            imageContainer.parentNode.insertBefore(summarySection, imageContainer.nextSibling);
        } else {
            // Fallback: append to main
            document.querySelector('main').appendChild(summarySection);
        }
    }
}