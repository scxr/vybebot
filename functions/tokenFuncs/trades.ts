export async function getTokenTrades(
    tokenAddress: string,
    byPlatform: string | null,
    marketId: string | null,
    authority: string | null,
    resolution: "1h" | "1d" | "1w" | "1m" | "1y" | null,
    feePayer: string | null,

) {
    let url = new URL(`https://api.vybenetwork.xyz/token/trades`)
    url.searchParams.set("baseMintAddress", "So11111111111111111111111111111111111111112");
    url.searchParams.set("quoteMintAddress", tokenAddress);
    if (byPlatform) {
        url.searchParams.set("programId", byPlatform);
    }
    if (marketId) {
        url.searchParams.set("marketId", marketId);
    }
    if (authority) {
        url.searchParams.set("authority", authority);
    }
    if (resolution) {
        url.searchParams.set("resolution", resolution);
    }
    if (feePayer) {
        url.searchParams.set("feePayer", feePayer);
    }
    url.searchParams.set("limit", "20");
    url.searchParams.set("sortByDesc", "blockTime");
    let response = await fetch(url, {
        headers: {
            'X-API-KEY': `${process.env.VYBE_API_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
    let data = await response.json();
    return data;
    
    
    
    
}

async function test() {
    let data = await getTokenTrades("36hPeebKEpW8b3GYmsaxt1uMhP9J1VSCSH9iy7SUpump", null, null, null, null, null);
    console.log(data);
}

// test();