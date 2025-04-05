export async function getTokenHolders(
    tokenAddress: string
) {
    let url = new URL(`https://api.vybenetwork.xyz/token/${tokenAddress}/top-holders`)
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
    let data = await getTokenHolders("36hPeebKEpW8b3GYmsaxt1uMhP9J1VSCSH9iy7SUpump");
    console.log(data);
}


