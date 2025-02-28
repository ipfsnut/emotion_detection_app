// videoProcessor.js

export function initializeVideoProcessor(videoInput, imageContainer, form) {
    videoInput.addEventListener('change', function(e) {
        const file = this.files[0];
        if (file) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.onloadedmetadata = function() {
                processVideo(video, imageContainer, form);
            };
        }
    });
}

function processVideo(video, imageContainer, form) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let currentTime = 0;
    const interval = 500; // 500ms = 0.5 seconds

    function extractFrame() {
        if (currentTime <= video.duration) {
            video.currentTime = currentTime;
            video.onseeked = function() {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(function(blob) {
                    const filename = `frame_${currentTime.toFixed(2)}.jpg`;
                    const file = new File([blob], filename, { type: 'image/jpeg' });
                    addImageToContainer(file, imageContainer);
                }, 'image/jpeg');
                currentTime += interval / 1000;
                extractFrame();
            };
        } else {
            // All frames extracted, trigger analysis
            form.dispatchEvent(new Event('submit'));
        }
    }

    extractFrame();
}

function addImageToContainer(file, imageContainer) {
    const container = document.createElement('div');
    container.className = 'image-result-container';
    container.file = file;
    container.originalFilename = file.name; // Store the original filename

    const imagePreview = document.createElement('div');
    imagePreview.className = 'image-preview';

    const img = document.createElement('img');
    const reader = new FileReader();
    reader.onload = (e) => img.src = e.target.result;
    reader.readAsDataURL(file);
    imagePreview.appendChild(img);

    const imageName = document.createElement('div');
    imageName.className = 'image-name';
    imageName.textContent = file.name; // Display the original filename
    imagePreview.appendChild(imageName);

    const resultDetails = document.createElement('div');
    resultDetails.className = 'result-details';

    container.appendChild(imagePreview);
    container.appendChild(resultDetails);

    imageContainer.appendChild(container);
}