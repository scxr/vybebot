export async function getTokenTimeseries(
    tokenAddress: string,
    type: 'transfer-volume' | "holders-ts",
    startTime: number | null,
    endTime: number | null,
    interval: "day" | "hour" | null,


) {
    let url = new URL(`https://api.vybenetwork.xyz/token/${tokenAddress}/${type}`)
    if (startTime) {
        url.searchParams.set("startTime", startTime.toString());
    }
    if (endTime) {
        url.searchParams.set("endTime", endTime.toString());
    }
    if (interval) {
        url.searchParams.set("interval", interval);
    }
    let response = await fetch(url, {
        headers: {
            'X-API-KEY': `${process.env.VYBE_API_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
    let data = await response.json();
    console.log(data);
    return data;
}

async function test() {
    let data = await getTokenTimeseries("FtUEW73K6vEYHfbkfpdBZfWpxgQar2HipGdbutEhpump", "holders-ts", null, null, null);
    console.log(data);
}

// test();