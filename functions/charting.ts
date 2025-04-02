import { createCanvas } from 'canvas';

async function getOhclvData(token: string) {
    let url = `https://api.vybenetwork.xyz/price/${token}/token-ohlcv`;
    let response = await fetch(url, {
        headers: {
            'x-api-key': `${process.env.VYBE_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }   
    });
    let data = await response.json();
    // Convert string values to numbers and sort by timestamp
    const processedData = data.data
        .map((d: any) => ({
            timestamp: Number(d.timestamp),
            open: Number(d.open),
            high: Number(d.high),
            low: Number(d.low),
            close: Number(d.close),
            volume: Number(d.volume)
        }))
        .sort((a: any, b: any) => a.timestamp - b.timestamp);
    return processedData;
}

function drawCryptoChart(data: any[], width: number, height: number, t1: string = "tmp", t2: string = "tmp", timeUnit: string = "tmp", aggregate: string = "tmp") {
    try {
        const margin = { top: 40, right: 60, bottom: 40, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        const volumeHeight = chartHeight * 0.2;
        const priceChartHeight = chartHeight - volumeHeight - 20; // 20px gap between price and volume
    
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
    
        // Set background
        ctx.fillStyle = '#1e222d';
        ctx.fillRect(0, 0, width, height);
    
        // Calculate price range with padding
        const prices = data.flatMap(d => [d.high, d.low]);
        const rawPriceMin = Math.min(...prices);
        const rawPriceMax = Math.max(...prices);
        const priceRange = rawPriceMax - rawPriceMin;
        const priceMin = rawPriceMin - (priceRange * 0.05); // Add 5% padding
        const priceMax = rawPriceMax + (priceRange * 0.05);

        // Calculate volume range
        const volumes = data.map(d => d.volume);
        const volumeMax = Math.max(...volumes) * 1.1; // Add 10% padding
    
        // Calculate candle width and spacing
        const candleWidth = Math.min(Math.max(chartWidth / data.length / 2, 3), 15);
        const candleSpacing = candleWidth / 2;
        const totalCandleWidth = candleWidth + candleSpacing;
        
        // Calculate start position to center the chart
        const startX = margin.left + (chartWidth - (data.length * totalCandleWidth)) / 2;
    
        const yPriceScale = priceChartHeight / (priceMax - priceMin);
        const yVolumeScale = volumeHeight / volumeMax;
    
        // Draw price grid
        ctx.strokeStyle = '#2a2e39';
        ctx.lineWidth = 1;
        const priceStep = (priceMax - priceMin) / 8;
        for (let i = 0; i <= 8; i++) {
            const y = margin.top + i * (priceChartHeight / 8);
            const price = priceMax - (i * priceStep);
            
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(width - margin.right, y);
            ctx.stroke();

            // Add price labels
            ctx.fillStyle = '#787b86';
            ctx.font = '11px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(price.toFixed(6), margin.left - 5, y + 4);
        }
    
        // Draw candlesticks and volume bars
        data.forEach((d, i) => {
            const x = startX + i * totalCandleWidth;
            const open = margin.top + (priceMax - d.open) * yPriceScale;
            const close = margin.top + (priceMax - d.close) * yPriceScale;
            const high = margin.top + (priceMax - d.high) * yPriceScale;
            const low = margin.top + (priceMax - d.low) * yPriceScale;
    
            // Draw candlestick
            const isGreen = d.close >= d.open;
            ctx.strokeStyle = isGreen ? '#26a69a' : '#ef5350';
            ctx.fillStyle = isGreen ? '#26a69a' : '#ef5350';
            
            // Draw wick
            ctx.beginPath();
            ctx.moveTo(x + candleWidth/2, high);
            ctx.lineTo(x + candleWidth/2, low);
            ctx.stroke();
            
            // Draw body
            const bodyHeight = Math.max(Math.abs(close - open), 1);
            ctx.fillRect(x, Math.min(open, close), candleWidth, bodyHeight);
    
            // Draw volume bar
            const volumeY = height - margin.bottom - (d.volume * yVolumeScale);
            ctx.fillStyle = isGreen ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)';
            ctx.fillRect(x, volumeY, candleWidth, height - margin.bottom - volumeY);
        });
    
        // Add current price label and line
        const currentPrice = data[data.length - 1].close;
        const currentPriceY = margin.top + (priceMax - currentPrice) * yPriceScale;
    
        ctx.strokeStyle = '#809c6d';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(margin.left, currentPriceY);
        ctx.lineTo(width - margin.right, currentPriceY);
        ctx.stroke();
        ctx.setLineDash([]);
    
        // Add current price label
        ctx.fillStyle = '#809c6d';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`$${currentPrice.toFixed(6)}`, width - margin.right + 55, currentPriceY + 4);
    
        // Add title
        ctx.fillStyle = '#787b86';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${t1}/${t2} • ${aggregate}${timeUnit}`, margin.left, margin.top - 15);
        
        // Add volume label
        const currentVolume = data[data.length - 1].volume;
        ctx.textAlign = 'left';
        ctx.fillText(`Volume: $${currentVolume.toLocaleString(undefined, {maximumFractionDigits: 2})}`, margin.left, height - margin.bottom/2);
    
        return canvas;
    } catch (error) {
        console.error(`[CHART] Error drawing chart: ${error}`);
        return null;
    }
}

async function createAndSaveChart(token: string, outputPath: string = 'chart.png'): Promise<void> {
    // Get OHLCV data
    const data = await getOhclvData(token);
    
    // Create the chart
    const canvas = drawCryptoChart(data, 1500, 800, token, "USDC", "h", "1");
    
    if (!canvas) {
        throw new Error('Failed to create chart');
    }

    // Save the chart
    const buffer = canvas.toBuffer('image/png');
    await Bun.write(outputPath, buffer);
}

// Example usage
createAndSaveChart("4TBi66vi32S7J8X1A6eWfaLHYmUXu7CStcEmsJQdpump").then(() => {
    console.log('Chart saved successfully!');
}).catch(error => {
    console.error('Error creating chart:', error);
});

export { getOhclvData, createAndSaveChart };