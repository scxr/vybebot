import { TokenBalance, TokenBalanceMultiWallet } from "../types/ApiResponses";

export async function getTokenBalancesFromApi(
    ownerAddress: string,
    includeNoPriceBalance: boolean,
    sortByAsc: 'amount' | 'value' | null,
    sortByDesc: 'amount' | 'value' | null,
    onlyVerified: boolean,
    oneDayTradeMinimum: number,
    oneDayTradeVolumeMinimum: number,
    holderMinimum: number,
    minAssetValue: string,
    maxAssetValue: string,
    limit: number,
    page: number
): Promise<TokenBalance> {

    console.log("Simple token balance request");
    const url = new URL(`https://api.vybenetwork.xyz/account/token-balance/${ownerAddress}`);
    
    if (includeNoPriceBalance) url.searchParams.append('includeNoPriceBalance', 'true');
    if (sortByAsc) url.searchParams.append('sortByAsc', sortByAsc == "value" ? "valueUsd" : "priceUsd");
    if (sortByDesc) url.searchParams.append('sortByDesc', sortByDesc == "value" ? "valueUsd" : "priceUsd");
    if (onlyVerified) url.searchParams.append('onlyVerified', 'true');
    if (oneDayTradeMinimum) url.searchParams.append('oneDayTradeMinimum', oneDayTradeMinimum.toString());
    if (oneDayTradeVolumeMinimum) url.searchParams.append('oneDayTradeVolumeMinimum', oneDayTradeVolumeMinimum.toString());
    if (holderMinimum) url.searchParams.append('holderMinimum', holderMinimum.toString());
    if (minAssetValue) url.searchParams.append('minAssetValue', minAssetValue);
    if (maxAssetValue) url.searchParams.append('maxAssetValue', maxAssetValue);
    if (limit) url.searchParams.append('limit', limit.toString());
    if (page) url.searchParams.append('page', page.toString());
    console.log(url.toString());
    const response = await fetch(url.toString(), {
        headers: {
            'x-api-key': `${process.env.VYBE_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });

    console.log("Simple token balance response");
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json() as TokenBalance;
}

export async function getTokenBalancesFromApiMultiWallet(
    ownerAddresses: string[],
    includeNoPriceBalance: boolean,
    sortByAsc: 'amount' | 'value' | null,
    sortByDesc: 'amount' | 'value' | null,
    onlyVerified: boolean,
    oneDayTradeMinimum: number,
    oneDayTradeVolumeMinimum: number,
    holderMinimum: number,
    minAssetValue: string,
    maxAssetValue: string,
    limit: number,
    page: number
): Promise<TokenBalanceMultiWallet> {
    console.log("Multi-wallet token balance request");
    const url = new URL('https://api.vybenetwork.xyz/account/token-balances');
    let sortParam = sortByAsc == "value" ? "valueUsd" : "priceUsd";
    if (sortByDesc) sortParam = sortByDesc == "value" ? "valueUsd" : "priceUsd";
    
    const requestBody = {
        wallets: ownerAddresses,
        includeNoPriceBalance,
        sortByDesc: sortParam,
        onlyVerified,
        oneDayTradeMinimum,
        oneDayTradeVolumeMinimum,
        holderMinimum,
        minAssetValue,
        maxAssetValue: maxAssetValue || "1000000000000000000",
        limit,
        page
    };

    console.log(JSON.stringify(requestBody));

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'x-api-key': `${process.env.VYBE_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    console.log("Multi-wallet token balance response");
    console.log(response);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    let data = await response.json();       
    console.log(data);
    return data as TokenBalanceMultiWallet;
} 