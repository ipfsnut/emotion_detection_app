// Define a fixed order for emotions
const emotionOrder = ['anger', 'disgust', 'fear', 'sadness', 'neutral', 'surprise', 'happiness'];

// Function to create a container for an image result
export function createImageResultContainer(file, imageNumber) {
    console.log('Creating image result container for:', file.name);
    const container = document.createElement('div');
    container.className = 'image-result-container';
    container.file = file;
    container.imageNumber = imageNumber;

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
export function displayResult(resultDetails, data, imageNumber) {
    // Start building the HTML for the results
    let resultHtml = `<h3>Analysis Results: Image #${imageNumber} </h3>`;
    
    if (data.error) {
        // If there's an error, display it
        resultHtml += `<p>Error: ${data.error}</p>`;
    } else {
        // Display the dominant emotion
        resultHtml += `<p class="dominant-emotion">Dominant: ${data.dominant_emotion}</p>`;
        resultHtml += `<div class="emotion-graph">`;

        // Create a bar for each emotion in the predefined order
        for (const emotion of emotionOrder) {
            const score = data.emotions[emotion] || 0;
            const percentage = (score * 100).toFixed(1);  // Convert score to percentage
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
    
    // Insert the generated HTML into the resultDetails element
    resultDetails.innerHTML = resultHtml;
}