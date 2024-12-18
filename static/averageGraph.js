import { getEmotionOrder } from './dataTransformer.js';

export function updateAverageGraph(allResults, averageGraphCanvas) {
    const emotionOrder = getEmotionOrder();
    const averageEmotions = calculateAverageEmotions(allResults);

    const ctx = averageGraphCanvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: emotionOrder,
            datasets: [{
                label: 'Average Emotion Scores',
                data: emotionOrder.map(emotion => averageEmotions[emotion]),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
                    title: {
                        display: true,
                        text: 'Average Score'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Average Emotion Scores Across All Images'
                }
            },
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

function calculateAverageEmotions(allResults) {
    const emotionOrder = getEmotionOrder();
    const totalEmotions = {};
    emotionOrder.forEach(emotion => totalEmotions[emotion] = 0);

    allResults.forEach(result => {
        emotionOrder.forEach(emotion => {
            totalEmotions[emotion] += result.result.emotions[emotion] || 0;
        });
    });

    const averageEmotions = {};
    emotionOrder.forEach(emotion => {
        averageEmotions[emotion] = totalEmotions[emotion] / allResults.length;
    });

    return averageEmotions;
}
