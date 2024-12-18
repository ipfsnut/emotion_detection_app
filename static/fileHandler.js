import { createImageResultContainer } from './resultDisplay.js';
import { transformEmotionData } from './dataTransformer.js';

let imageCounter = 0;

export function initializeFileHandler(fileInput, imageContainer) {
    fileInput.addEventListener('change', function(e) {
        for (let file of this.files) {
            imageCounter++;
            const imageResultContainer = createImageResultContainer(file, imageCounter);
            imageContainer.appendChild(imageResultContainer);
        }
    });
}