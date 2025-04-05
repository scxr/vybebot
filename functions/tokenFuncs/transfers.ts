export async function getTokenTransfers(
    tokenAddress: string,
    signature: string | null,
    callingProgram: string | null,
    senderTokenAccount: string | null,
    senderAddress: string | null,
    receiverTokenAccount: string | null,
    receiverAddress: string | null,

) {
    let url = new URL(`https://api.vybenetwork.xyz/token/transfers`)
    url.searchParams.set("mintAddress", tokenAddress);
    if (signature) {
        url.searchParams.set("signature", signature);
    }
    if (callingProgram) {
        url.searchParams.set("callingProgram", callingProgram);
    }
    if (senderTokenAccount) {
        url.searchParams.set("senderTokenAccount", senderTokenAccount);
    }
    if (senderAddress) {
        url.searchParams.set("senderAddress", senderAddress);
    }
    if (receiverTokenAccount) {
        url.searchParams.set("receiverTokenAccount", receiverTokenAccount);
    }
    if (receiverAddress) {
        url.searchParams.set("receiverAddress", receiverAddress);
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
    console.log(data);
    return data;
    
}

async function test() {
    let data = await getTokenTransfers("36hPeebKEpW8b3GYmsaxt1uMhP9J1VSCSH9iy7SUpump", null, null, null, null, null, null);
    console.log(JSON.stringify(data, null, 2));
}

// test();

