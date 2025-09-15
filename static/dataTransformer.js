const emotionOrder = ['anger', 'disgust', 'fear', 'sadness', 'neutral', 'surprise', 'happiness'];

export function transformEmotionData(data) {
    // Since we fixed the backend emotion mapping, no transformation needed
    // Just return the data as-is - backends already return correct emotion names
    return data;
}

// Function removed - no longer needed since backends return correct emotion names

export function getEmotionOrder() {
    return emotionOrder;
}
