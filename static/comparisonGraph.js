export function updateComparisonGraph(allResults, comparisonSection, comparisonGraph) {
    if (!comparisonSection) {
        console.warn('Comparison section not found');
        return;
    }

    if (allResults.length < 2) {
        comparisonSection.style.display = 'none';
        return;
    }

    comparisonSection.style.display = 'block';
    const emotions = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral'];
    const datasets = emotions.map(emotion => ({
        label: emotion,
        data: [],
        borderColor: getEmotionColor(emotion),
        fill: false
    }));

    // Sort results by image number
    allResults.sort((a, b) => a.imageNumber - b.imageNumber);

    const labels = allResults.map(result => `Image #${result.imageNumber}`);

    allResults.forEach(result => {
        emotions.forEach((emotion, i) => {
            datasets[i].data.push((result.result.emotions[emotion] || 0) * 100);
        });
    });

    if (window.comparisonChart) {
        window.comparisonChart.destroy();
    }

    window.comparisonChart = new Chart(comparisonGraph, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Emotion Intensity (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Image Number'
                    }
                }
            },
            tooltips: {
                callbacks: {
                    title: function(tooltipItem, data) {
                        return `Image #${allResults[tooltipItem[0].index].imageNumber}: ${allResults[tooltipItem[0].index].filename}`;
                    }
                }
            }
        }
    });
}

function getEmotionColor(emotion) {
    const colors = {
        'angry': 'rgb(255, 99, 132)',
        'disgust': 'rgb(75, 192, 192)',
        'fear': 'rgb(153, 102, 255)',
        'happy': 'rgb(255, 206, 86)',
        'sad': 'rgb(54, 162, 235)',
        'surprise': 'rgb(255, 159, 64)',
        'neutral': 'rgb(201, 203, 207)'
    };
    return colors[emotion] || 'rgb(0, 0, 0)';
}