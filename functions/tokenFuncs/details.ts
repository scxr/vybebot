export async function getTokenDetails(tokenAddress: string) {
    let url = `https://api.vybenetwork.xyz/token/${tokenAddress}`
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
    let data = await getTokenDetails("36hPeebKEpW8b3GYmsaxt1uMhP9J1VSCSH9iy7SUpump");
    console.log(data);
}

