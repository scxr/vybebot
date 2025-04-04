import { PnlData } from "../../types/ApiResponses";

export async function getPnlFromApi(
    ownerAddress: string,
    resolution: '1d' | '7d' | '30d',
    tokenAddress: string | null,
    sortByAsc: string | null,
    sortByDesc: string | null,
    limit: number
): Promise<PnlData> {
    const baseUrl = `https://api.vybenetwork.xyz/account/pnl/${ownerAddress}`;
    const params = new URLSearchParams({

        resolution,
        limit: limit.toString()
    });

    if (tokenAddress) {
        params.append('tokenAddress', tokenAddress);
    }

    if (sortByAsc) {
        params.append('sortByAsc', sortByAsc);
    }

    if (sortByDesc) {
        params.append('sortByDesc', sortByDesc);
    }

    console.log(`${baseUrl}?${params.toString()}`);

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
        headers: {
            'x-api-key': `${process.env.VYBE_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
    let data = await response.json();
    console.log(data);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return data as PnlData;
} 