import { createImageResultContainer } from './resultDisplay.js';
import { transformEmotionData } from './dataTransformer.js';

let imageCounter = 0;

export function initializeFileHandler(fileInput, imageContainer) {
    fileInput.addEventListener('change', function(e) {
        for (let file of this.files) {
            imageCounter++;
            const imageResultContainer = createImageResultContainer(file, imageCounter);
            // Store the original filename on the container itself
            imageResultContainer.originalFilename = file.name;
            imageContainer.appendChild(imageResultContainer);
        }
    });
}