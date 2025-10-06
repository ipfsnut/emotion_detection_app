import { getAllResults } from './formSubmission.js';

export function initializeExportButton(exportButton) {
    if (!exportButton) {
        console.error('Export button not found!');
        return;
    }
    
    // Replace single button with dropdown menu
    const exportContainer = exportButton.parentElement;
    
    // Create dropdown structure
    const exportDropdown = document.createElement('div');
    exportDropdown.className = 'export-dropdown';
    exportDropdown.innerHTML = `
        <button class="export-btn-main">Export Results ▼</button>
        <div class="export-options" style="display: none;">
            <button class="export-option" data-format="csv">Export as CSV</button>
            <button class="export-option" data-format="json">Export as JSON</button>
            <button class="export-option" data-format="json-structured">Export as Structured JSON</button>
        </div>
    `;
    
    // Replace original button with dropdown
    exportButton.style.display = 'none';
    exportButton.after(exportDropdown);
    
    // Handle dropdown toggle
    const mainBtn = exportDropdown.querySelector('.export-btn-main');
    const optionsMenu = exportDropdown.querySelector('.export-options');
    
    mainBtn.addEventListener('click', function() {
        optionsMenu.style.display = optionsMenu.style.display === 'none' ? 'block' : 'none';
    });
    
    // Handle export options
    exportDropdown.querySelectorAll('.export-option').forEach(option => {
        option.addEventListener('click', function() {
            const format = this.dataset.format;
            exportResults(format);
            optionsMenu.style.display = 'none';
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!exportDropdown.contains(e.target)) {
            optionsMenu.style.display = 'none';
        }
    });
}

function exportResults(format) {
    const allResults = getAllResults();
    
    if (allResults.length === 0) {
        alert('No results to export');
        return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    let content, filename, mimeType;
    
    switch(format) {
        case 'csv':
            content = createCSV(allResults);
            filename = `emotion_analysis_${timestamp}.csv`;
            mimeType = 'text/csv;charset=utf-8;';
            break;
        case 'json':
            content = JSON.stringify(allResults, null, 2);
            filename = `emotion_analysis_${timestamp}.json`;
            mimeType = 'application/json;charset=utf-8;';
            break;
        case 'json-structured':
            content = JSON.stringify(createStructuredJSON(allResults), null, 2);
            filename = `emotion_analysis_structured_${timestamp}.json`;
            mimeType = 'application/json;charset=utf-8;';
            break;
    }
    
    // Download file
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function createCSV(allResults) {
    const firstResult = allResults[0].result;
    const isMultiBackend = firstResult.analysis_mode === 'multi';
    
    if (isMultiBackend) {
        return createMultiBackendCSV(allResults);
    } else {
        return createSingleBackendCSV(allResults);
    }
}

function createSingleBackendCSV(allResults) {
    const header = "Image Number,Filename,Dominant Emotion,Anger,Disgust,Fear,Sadness,Neutral,Surprise,Happiness\n";
    const rows = allResults.map(result => {
        const emotions = result.result.emotions || {};
        
        const roundedEmotions = {
            anger: (emotions.anger || 0).toFixed(4),
            disgust: (emotions.disgust || 0).toFixed(4),
            fear: (emotions.fear || 0).toFixed(4),
            sadness: (emotions.sadness || 0).toFixed(4),
            neutral: (emotions.neutral || 0).toFixed(4),
            surprise: (emotions.surprise || 0).toFixed(4),
            happiness: (emotions.happiness || 0).toFixed(4)
        };
        
        return `${result.imageNumber},"${result.filename}",${result.result.dominant_emotion || 'unknown'},${roundedEmotions.anger},${roundedEmotions.disgust},${roundedEmotions.fear},${roundedEmotions.sadness},${roundedEmotions.neutral},${roundedEmotions.surprise},${roundedEmotions.happiness}`;
    }).join("\n");
    
    return header + rows;
}

function createMultiBackendCSV(allResults) {
    // Create wide format CSV with columns for each backend
    const emotions = ['anger', 'disgust', 'fear', 'sadness', 'neutral', 'surprise', 'happiness'];
    const backends = [];
    
    // Detect available backends and collect all unique AUs for delta exports
    const allAUs = new Set();
    allResults.forEach(result => {
        if (result.result.fer && !backends.includes('fer')) backends.push('fer');
        if (result.result.deepface && !backends.includes('deepface')) backends.push('deepface');
        if (result.result.simplefacs && !backends.includes('simplefacs')) backends.push('simplefacs');
        if (result.result.simplefacs_delta && !backends.includes('simplefacs_delta')) {
            backends.push('simplefacs_delta');
            // Collect all AUs that appear in delta analyses
            if (result.result.simplefacs_delta.deltas) {
                Object.keys(result.result.simplefacs_delta.deltas).forEach(au => allAUs.add(au));
            }
        }
    });
    
    // Sort AUs for consistent column ordering
    const sortedAUs = Array.from(allAUs).sort();
    
    // Build header
    let header = "Image Number,Filename";
    backends.forEach(backend => {
        if (backend === 'simplefacs') {
            // FACS headers
            header += `,${backend.toUpperCase()}_Total_AUs,${backend.toUpperCase()}_Primary_AUs,${backend.toUpperCase()}_Face_Detected`;
        } else if (backend === 'simplefacs_delta') {
            // Delta headers - summary first
            header += `,${backend.toUpperCase()}_Has_Baseline,${backend.toUpperCase()}_Total_Movement,${backend.toUpperCase()}_Significant_Changes,${backend.toUpperCase()}_Movement_Patterns`;
            // Then individual AU deltas
            sortedAUs.forEach(au => {
                header += `,${backend.toUpperCase()}_${au}_Delta,${backend.toUpperCase()}_${au}_Baseline,${backend.toUpperCase()}_${au}_Current`;
            });
        } else {
            // Emotion backend headers
            header += `,${backend.toUpperCase()}_Dominant`;
            emotions.forEach(emotion => {
                header += `,${backend.toUpperCase()}_${emotion}`;
            });
        }
    });
    if (backends.length > 1) {
        header += ",Agreement,Correlation";
    }
    header += "\n";
    
    // Build rows
    const rows = allResults.map(result => {
        let row = `${result.imageNumber},"${result.filename}"`;
        
        backends.forEach(backend => {
            const backendData = result.result[backend];
            if (backend === 'simplefacs' && backendData) {
                // FACS specific data
                const totalAUs = backendData.total_aus_detected || 0;
                const primaryAUs = backendData.primary_aus?.join(';') || 'None';
                const faceDetected = backendData.face_detected ? 'Yes' : 'No';
                row += `,${totalAUs},"${primaryAUs}",${faceDetected}`;
            } else if (backend === 'simplefacs_delta' && backendData) {
                // Delta analysis specific data - summary first
                const hasBaseline = backendData.has_baseline ? 'Yes' : 'No';
                const totalMovement = backendData.total_movement || 0;
                const sigChanges = backendData.significant_changes?.length || 0;
                const patterns = backendData.movement_patterns?.map(p => p.pattern).join(';') || 'None';
                row += `,${hasBaseline},${totalMovement},${sigChanges},"${patterns}"`;
                
                // Then individual AU deltas
                sortedAUs.forEach(au => {
                    if (backendData.deltas && backendData.deltas[au]) {
                        const auData = backendData.deltas[au];
                        row += `,${auData.delta},${auData.baseline},${auData.current}`;
                    } else {
                        row += `,N/A,N/A,N/A`;
                    }
                });
            } else if (backendData && backendData.emotions) {
                // Emotion backend data
                row += `,${backendData.dominant_emotion || 'N/A'}`;
                emotions.forEach(emotion => {
                    const value = backendData.emotions[emotion] || 0;
                    row += `,${value.toFixed(4)}`;
                });
            } else {
                // Missing data - add appropriate number of N/A columns
                if (backend === 'simplefacs') {
                    row += `,N/A,N/A,N/A`;
                } else if (backend === 'simplefacs_delta') {
                    row += `,N/A,N/A,N/A,N/A`;
                    // Add N/A for all AU delta columns
                    sortedAUs.forEach(() => {
                        row += `,N/A,N/A,N/A`;
                    });
                } else {
                    row += `,N/A`;
                    emotions.forEach(() => row += `,N/A`);
                }
            }
        });
        
        // Add comparison metrics if multiple backends
        if (backends.length > 1 && result.result.comparison) {
            let agreement = 'N/A';
            let correlation = 'N/A';
            
            const comp = result.result.comparison;
            if (comp.agreements) {
                const key = Object.keys(comp.agreements)[0];
                if (key) {
                    agreement = comp.agreements[key].dominant_agreement ? 'Yes' : 'No';
                }
            }
            if (comp.correlations) {
                const key = Object.keys(comp.correlations)[0];
                if (key && comp.correlations[key].correlation !== null) {
                    correlation = comp.correlations[key].correlation.toFixed(4);
                }
            }
            
            row += `,${agreement},${correlation}`;
        }
        
        return row;
    }).join("\n");
    
    return header + rows;
}

function createStructuredJSON(allResults) {
    // Parse filenames to extract participant and condition info if present
    const structured = {
        metadata: {
            timestamp: new Date().toISOString(),
            total_images: allResults.length,
            analysis_type: allResults[0]?.result?.analysis_mode || 'unknown',
            backends_used: []
        },
        images: [],
        summary: {
            average_emotions: {},
            dominant_emotions_distribution: {},
            facs_summary: {
                total_analyses: 0,
                average_au_count: 0,
                most_common_aus: {},
                baseline_analyses: 0,
                average_movement: 0,
                common_patterns: {}
            }
        }
    };
    
    // Detect backends
    const emotions = ['anger', 'disgust', 'fear', 'sadness', 'neutral', 'surprise', 'happiness'];
    const emotionSums = {};
    const dominantCounts = {};
    const facsSummary = {
        totalAnalyses: 0,
        totalAUCount: 0,
        auCounts: {},
        baselineAnalyses: 0,
        totalMovement: 0,
        patternCounts: {}
    };
    
    emotions.forEach(e => {
        emotionSums[e] = 0;
        dominantCounts[e] = 0;
    });
    
    allResults.forEach(result => {
        const imageData = {
            image_number: result.imageNumber,
            filename: result.filename,
            results: {}
        };
        
        // Try to parse filename for metadata (e.g., "participant1_condition_neutral.jpg")
        const filenameParts = result.filename.replace(/\.[^/.]+$/, "").split(/[_-]/);
        if (filenameParts.length > 1) {
            imageData.parsed_metadata = {
                raw_parts: filenameParts,
                potential_participant: filenameParts.find(p => p.match(/p\d+|participant/i)),
                potential_condition: filenameParts.find(p => p.match(/neutral|physical|cognitive|condition/i))
            };
        }
        
        // Add backend results
        if (result.result.fer) {
            imageData.results.fer = result.result.fer;
            if (!structured.metadata.backends_used.includes('fer')) {
                structured.metadata.backends_used.push('fer');
            }
        }
        if (result.result.deepface) {
            imageData.results.deepface = result.result.deepface;
            if (!structured.metadata.backends_used.includes('deepface')) {
                structured.metadata.backends_used.push('deepface');
            }
        }
        if (result.result.simplefacs) {
            imageData.results.simplefacs = result.result.simplefacs;
            if (!structured.metadata.backends_used.includes('simplefacs')) {
                structured.metadata.backends_used.push('simplefacs');
            }
        }
        if (result.result.simplefacs_delta) {
            imageData.results.simplefacs_delta = result.result.simplefacs_delta;
            if (!structured.metadata.backends_used.includes('simplefacs_delta')) {
                structured.metadata.backends_used.push('simplefacs_delta');
            }
        }
        
        // Add comparison if available
        if (result.result.comparison) {
            imageData.comparison = result.result.comparison;
        }
        
        // Calculate averages (using first available backend)
        const primaryBackend = result.result.fer || result.result.deepface || result.result;
        if (primaryBackend.emotions) {
            emotions.forEach(emotion => {
                emotionSums[emotion] += primaryBackend.emotions[emotion] || 0;
            });
        }
        if (primaryBackend.dominant_emotion) {
            dominantCounts[primaryBackend.dominant_emotion] = 
                (dominantCounts[primaryBackend.dominant_emotion] || 0) + 1;
        }
        
        // Calculate FACS statistics
        if (result.result.simplefacs) {
            facsSummary.totalAnalyses++;
            const facsData = result.result.simplefacs;
            if (facsData.total_aus_detected) {
                facsSummary.totalAUCount += facsData.total_aus_detected;
            }
            if (facsData.action_units) {
                Object.keys(facsData.action_units).forEach(au => {
                    facsSummary.auCounts[au] = (facsSummary.auCounts[au] || 0) + 1;
                });
            }
        }
        
        if (result.result.simplefacs_delta) {
            const deltaData = result.result.simplefacs_delta;
            if (deltaData.has_baseline) {
                facsSummary.baselineAnalyses++;
                if (deltaData.total_movement) {
                    facsSummary.totalMovement += deltaData.total_movement;
                }
                if (deltaData.movement_patterns) {
                    deltaData.movement_patterns.forEach(pattern => {
                        const patternName = pattern.pattern;
                        facsSummary.patternCounts[patternName] = 
                            (facsSummary.patternCounts[patternName] || 0) + 1;
                    });
                }
            }
        }
        
        structured.images.push(imageData);
    });
    
    // Calculate summary statistics
    emotions.forEach(emotion => {
        structured.summary.average_emotions[emotion] = 
            (emotionSums[emotion] / allResults.length).toFixed(4);
    });
    structured.summary.dominant_emotions_distribution = dominantCounts;
    
    // Calculate FACS summary
    if (facsSummary.totalAnalyses > 0) {
        structured.summary.facs_summary.total_analyses = facsSummary.totalAnalyses;
        structured.summary.facs_summary.average_au_count = 
            (facsSummary.totalAUCount / facsSummary.totalAnalyses).toFixed(2);
        structured.summary.facs_summary.most_common_aus = facsSummary.auCounts;
        structured.summary.facs_summary.baseline_analyses = facsSummary.baselineAnalyses;
        
        if (facsSummary.baselineAnalyses > 0) {
            structured.summary.facs_summary.average_movement = 
                (facsSummary.totalMovement / facsSummary.baselineAnalyses).toFixed(2);
        }
        structured.summary.facs_summary.common_patterns = facsSummary.patternCounts;
    }
    
    return structured;
}

// Add CSS for dropdown
const style = document.createElement('style');
style.textContent = `
    .export-dropdown {
        position: relative;
        display: inline-block;
    }
    
    .export-btn-main {
        padding: 0.75rem 1.5rem;
        background-color: #0072ff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
    }
    
    .export-btn-main:hover {
        background-color: #0056cc;
    }
    
    .export-options {
        position: absolute;
        top: 100%;
        left: 0;
        background-color: #2a2a2a;
        border: 1px solid #444;
        border-radius: 4px;
        margin-top: 4px;
        z-index: 1000;
        min-width: 200px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }
    
    .export-option {
        display: block;
        width: 100%;
        padding: 0.5rem 1rem;
        background: none;
        color: white;
        border: none;
        text-align: left;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    
    .export-option:hover {
        background-color: #3a3a3a;
    }
    
    .export-option:first-child {
        border-radius: 4px 4px 0 0;
    }
    
    .export-option:last-child {
        border-radius: 0 0 4px 4px;
    }
`;
document.head.appendChild(style);