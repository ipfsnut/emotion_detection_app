const emotionOrder = ['anger', 'disgust', 'fear', 'sadness', 'neutral', 'surprise', 'happiness'];

export function transformEmotionData(data) {
    // Pass-through since backends return correct emotion names
    return data;
}

export function getEmotionOrder() {
    return emotionOrder;
}
