export interface NftBalance {
    date: number,
    ownerAddress: string,
    totalSol: string,
    totalUsd: string,
    totalNftCollectionCount: number,
    data: Nft[]
}

export interface Nft {
    name: string | null,
    collectionAddress: string,
    totalItems: number,
    valueSol: string,
    priceSol: string,
    valueUsd: string,
    priceUsd: string,
    logoUrl: string | null,
    slot: number,
}