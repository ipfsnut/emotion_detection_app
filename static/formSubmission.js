import { displayResult } from './resultDisplay.js';
import { transformEmotionData, getEmotionOrder } from './dataTransformer.js';
import { updateComparisonGraph } from './comparisonGraph.js';


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
            console.log(`Processing file: ${file.name}`);
            const resultDetails = container.querySelector('.result-details');

            const formData = new FormData();
            formData.append('file', file);

            try {
                console.log(`Sending request for ${file.name}`);
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                console.log(`Received response for ${file.name}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log(`Parsed data for ${file.name}:`, data);
                const transformedData = transformEmotionData(data);
                displayResult(resultDetails, transformedData, container.imageNumber, file.name);
                allResults.push({filename: file.name, imageNumber: container.imageNumber, result: transformedData});
                console.log(`Processed ${file.name} successfully`);
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
            }
        }

        exportButton.style.display = 'block';

        updateComparisonGraph(allResults, comparisonSection, comparisonGraph);

    });

}

export function getAllResults() {
    return allResults;
}
