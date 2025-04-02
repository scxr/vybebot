import { TokenBalanceTs, TokenBalanceTsMultiWallet } from "../types/ApiResponses";

export async function getTokenBalancesFromApi(
    ownerAddress: string,
    days: number,
    onlyVerified: boolean,
    oneDayTradeMinimum: number,
    oneDayTradeVolumeMinimum: number,
    holderMinimum: number,
    minAssetValue: string,
    maxAssetValue: string
): Promise<TokenBalanceTs> {
    const url = new URL(`https://api.vybenetwork.xyz/account/token-balance-ts/${ownerAddress}`);
    
    url.searchParams.append('days', days.toString());
    url.searchParams.append('onlyVerified', onlyVerified.toString());
    url.searchParams.append('oneDayTradeMinimum', oneDayTradeMinimum.toString());
    url.searchParams.append('oneDayTradeVolumeMinimum', oneDayTradeVolumeMinimum.toString());
    url.searchParams.append('holderMinimum', holderMinimum.toString());
    url.searchParams.append('minAssetValue', minAssetValue);
    if (maxAssetValue) {
        url.searchParams.append('maxAssetValue', maxAssetValue);
    }

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
    let data = await response.json();
    console.log(data);
    return data as TokenBalanceTs;
} 

export async function getTokenBalancesFromApiMultiWallet(
    ownerAddresses: string[],
    days: number,
    onlyVerified: boolean,
    oneDayTradeMinimum: number,
    oneDayTradeVolumeMinimum: number,
    holderMinimum: number,
    minAssetValue: string,
    maxAssetValue: string
): Promise<TokenBalanceTsMultiWallet> {
    const url = new URL(`https://api.vybenetwork.xyz/account/token-balances-ts`);

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'x-api-key': `${process.env.VYBE_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            wallets: ownerAddresses,
            days: days,
            onlyVerified: onlyVerified,
            oneDayTradeMinimum: oneDayTradeMinimum,
            oneDayTradeVolumeMinimum: oneDayTradeVolumeMinimum,
            holderMinimum: holderMinimum,
            minAssetValue: minAssetValue,
            maxAssetValue: maxAssetValue
        })
    });
    console.log({
        wallets: ownerAddresses,
        days: days,
        onlyVerified: onlyVerified,
        oneDayTradeMinimum: oneDayTradeMinimum,
        oneDayTradeVolumeMinimum: oneDayTradeVolumeMinimum,
        holderMinimum: holderMinimum,
        minAssetValue: minAssetValue,
        maxAssetValue: maxAssetValue
    })
    console.log(response);
    let data = await response.json();
    console.log(data);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    // let data = await response.json();
    // console.log(data);
    return data as TokenBalanceTsMultiWallet;
} 
