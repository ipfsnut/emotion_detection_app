const emotionOrder = ['anger', 'disgust', 'fear', 'sadness', 'neutral', 'surprise', 'happiness'];

export function transformEmotionData(data) {
    const newEmotions = {};
    const oldToNew = {
        'angry': 'anger',
        'disgust': 'disgust',
        'fear': 'fear',
        'sad': 'sadness',
        'neutral': 'neutral',
        'surprise': 'surprise',
        'happy': 'happiness'
    };

    for (const [oldEmotion, newEmotion] of Object.entries(oldToNew)) {
        if (data.emotions.hasOwnProperty(oldEmotion)) {
            newEmotions[newEmotion] = data.emotions[oldEmotion];
        }
    }

    return {
        ...data,
        emotions: newEmotions,
        dominant_emotion: oldToNew[data.dominant_emotion] || data.dominant_emotion
    };
}

export function getEmotionOrder() {
    return emotionOrder;
}
