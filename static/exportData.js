import { getAllResults } from './formSubmission.js';

export function initializeExportButton(exportButton) {
    exportButton.addEventListener('click', function() {
        const allResults = getAllResults();
        const csvContent = "data:text/csv;charset=utf-8," 
        + "Image Number,Filename,Dominant Emotion,Anger,Disgust,Fear,Sadness,Neutral,Surprise,Happiness\n"
        + allResults.map(result => {
                const emotions = result.result.emotions;
                return `${result.imageNumber},${result.filename},${result.result.dominant_emotion},${emotions.anger},${emotions.disgust},${emotions.fear},${emotions.sadness},${emotions.neutral},${emotions.surprise},${emotions.happiness}`;
            }).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "emotion_detection_results.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}