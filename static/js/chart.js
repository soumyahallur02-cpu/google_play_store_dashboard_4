let chartInstance = null;
let demoOverride = false;

// Custom base color palettes (Normal vs High Intensity for >25% MoM increase)
const categoryColors = {
    'Voyage et local': {
        normal: 'rgba(56, 189, 248, 0.45)',
        high: 'rgba(2, 132, 199, 0.95)',
        borderNormal: '#38bdf8',
        borderHigh: '#0284c7'
    },
    'Productividad': {
        normal: 'rgba(251, 146, 60, 0.45)',
        high: 'rgba(234, 88, 12, 0.95)',
        borderNormal: '#fb923c',
        borderHigh: '#ea580c'
    },
    '写真': {
        normal: 'rgba(244, 63, 94, 0.45)',
        high: 'rgba(225, 29, 72, 0.95)',
        borderNormal: '#f43f5e',
        borderHigh: '#e11d48'
    },
    'Tools': {
        normal: 'rgba(168, 85, 247, 0.45)',
        high: 'rgba(147, 51, 234, 0.95)',
        borderNormal: '#a855f7',
        borderHigh: '#9333ea'
    },
    'Personalization': {
        normal: 'rgba(34, 197, 94, 0.45)',
        high: 'rgba(22, 163, 74, 0.95)',
        borderNormal: '#22c55e',
        borderHigh: '#16a34a'
    },
    'Parenting': {
        normal: 'rgba(234, 179, 8, 0.45)',
        high: 'rgba(202, 138, 4, 0.95)',
        borderNormal: '#eab308',
        borderHigh: '#ca8a04'
    }
};

function checkTimeAndRender() {
    // Determine IST time using client browser UTC offset logic for IST (+5:30)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utc + (3600000 * 5.5));
    
    const istHours = istTime.getHours();
    const istMinutes = istTime.getMinutes();
    const istSeconds = istTime.getSeconds();

    const formattedTime = `${String(istHours).padStart(2, '0')}:${String(istMinutes).padStart(2, '0')}:${String(istSeconds).padStart(2, '0')} IST`;
    
    const timeBadge = document.getElementById('timeBadge');
    timeBadge.innerText = `IST Time: ${formattedTime}`;

    // Active Window: 16:00 to 18:00 IST (4 PM - 6 PM IST)
    const isInWindow = (istHours >= 16 && istHours < 18);

    const gateMessage = document.getElementById('gateMessage');
    const chartSection = document.getElementById('chartSection');
    document.getElementById('clockTime').innerText = formattedTime;

    if (isInWindow || demoOverride) {
        gateMessage.classList.add('hidden');
        chartSection.classList.remove('hidden');
        if (!chartInstance) {
            fetchAndRenderChart();
        }
    } else {
        gateMessage.classList.remove('hidden');
        chartSection.classList.add('hidden');
    }
}

function toggleOverride() {
    demoOverride = !demoOverride;
    checkTimeAndRender();
}

async function fetchAndRenderChart() {
    try {
        const response = await fetch('/api/chart-data');
        const result = await response.json();
        const chartData = result.data;

        const ctx = document.getElementById('stackedAreaChart').getContext('2d');

        const datasets = chartData.series.map(series => {
            const label = series.translated_category;
            const colors = categoryColors[label] || {
                normal: 'rgba(148, 163, 184, 0.45)',
                high: 'rgba(71, 85, 105, 0.95)',
                borderNormal: '#94a3b8',
                borderHigh: '#475569'
            };

            // Dynamic point background & radius based on >25% MoM increase highlights
            const pointBgColors = series.highlights.map(h => h ? colors.borderHigh : colors.borderNormal);
            const pointRadius = series.highlights.map(h => h ? 6 : 2);
            const pointHoverRadius = series.highlights.map(h => h ? 8 : 4);

            // Segment styling to increase color intensity for highlight months
            return {
                label: label,
                data: series.cumulative_installs,
                fill: 'origin',
                borderColor: colors.borderNormal,
                borderWidth: 2,
                pointBackgroundColor: pointBgColors,
                pointRadius: pointRadius,
                pointHoverRadius: pointHoverRadius,
                tension: 0.3,
                segment: {
                    backgroundColor: ctx => {
                        const idx = ctx.p1DataIndex;
                        const isHighlighted = series.highlights[idx];
                        return isHighlighted ? colors.high : colors.normal;
                    },
                    borderColor: ctx => {
                        const idx = ctx.p1DataIndex;
                        const isHighlighted = series.highlights[idx];
                        return isHighlighted ? colors.borderHigh : colors.borderNormal;
                    }
                }
            };
        });

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.months,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Year-Month',
                            color: '#94a3b8'
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Cumulative Installs',
                            color: '#94a3b8'
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#94a3b8',
                            callback: function(value) {
                                if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
                                if (value >= 1e6) return (value / 1e6).toFixed(0) + 'M';
                                if (value >= 1e3) return (value / 1e3).toFixed(0) + 'K';
                                return value;
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#f1f5f9',
                            font: { family: 'Inter', size: 12 },
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleColor: '#38bdf8',
                        bodyColor: '#f8fafc',
                        borderColor: '#334155',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toLocaleString() + ' installs';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Failed to load chart data:', err);
    }
}

// Check time on startup and interval every 10 seconds
checkTimeAndRender();
setInterval(checkTimeAndRender, 10000);
