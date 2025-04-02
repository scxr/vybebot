import { NftHolderResponse } from "../types/ApiResponses";

export async function getNftHoldersFromApi(collectionAddress: string): Promise<NftHolderResponse> {
    const url = new URL(`https://api.vybenetwork.xyz/nft/collection-owners/${collectionAddress}`);
    
    const response = await fetch(url.toString(), {
        headers: {
            'x-api-key': `${process.env.VYBE_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json() as NftHolderResponse;
} 