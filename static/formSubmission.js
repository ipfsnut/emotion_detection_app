import { displayResult } from './resultDisplay.js';
import { transformEmotionData, getEmotionOrder } from './dataTransformer.js';
import { updateComparisonGraph } from './comparisonGraph.js';
import { updateSummarySection } from './summaryStats.js';


let allResults = [];

export function initializeFormSubmission(form, imageContainer, exportButton, comparisonSection, comparisonGraph, uiManager) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submission started');
        allResults = [];

        const containers = imageContainer.querySelectorAll('.image-result-container');
        console.log(`Processing ${containers.length} images`);

        for (let container of containers) {
            const file = container.file;
            const originalFilename = container.originalFilename || file.name; // Get the original filename
            console.log(`Processing file: ${originalFilename}`);
            const resultDetails = container.querySelector('.result-details');

            const formData = new FormData();
            formData.append('file', file);
            
            // Add selected backends
            const selectedBackends = Array.from(form.querySelectorAll('input[name="backends"]:checked'))
                .map(checkbox => checkbox.value);
            selectedBackends.forEach(backend => {
                formData.append('backends', backend);
            });
            
            // Add analysis mode
            const analysisMode = form.querySelector('input[name="analysis_mode"]:checked')?.value || 'multi';
            formData.append('analysis_mode', analysisMode);
            
            console.log('Selected backends:', selectedBackends);
            console.log('Analysis mode:', analysisMode);

            try {
                console.log(`Sending request for ${originalFilename}`);
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                console.log(`Received response for ${originalFilename}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log(`Parsed data for ${originalFilename}:`, data);
                const transformedData = transformEmotionData(data);
                displayResult(resultDetails, transformedData, container.imageNumber, originalFilename);
                allResults.push({
                    filename: originalFilename, // Use the original filename
                    imageNumber: container.imageNumber, 
                    result: transformedData
                });
                console.log(`Processed ${originalFilename} successfully`);
            } catch (error) {
                console.error(`Error processing ${originalFilename}:`, error);
            }
        }

        exportButton.style.display = 'block';
        
        // Show view controls when results are displayed
        if (window.viewManager) {
            window.viewManager.showViewControls();
        }

        updateComparisonGraph(allResults, comparisonSection, comparisonGraph);
        
        // Add summary statistics section
        updateSummarySection(allResults);

    });

}

export function getAllResults() {
    return allResults;
}