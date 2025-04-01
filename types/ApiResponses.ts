export interface NftBalance {
    date: number,
    ownerAddress: string,
    totalSol: string,
    totalUsd: string,
    totalNftCollectionCount: number,
    data: Nft[]
}

export interface NftBalanceMultiWallet {
    date: number,
    ownerAddresses: string[],
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
/**
 * 
 *   summary: {
    winRate: 13.749683540087142,
    realizedPnlUsd: -33981.05793786401,
    unrealizedPnlUsd: -113408.77841821959,
    uniqueTokensTraded: 44,
    averageTradeUsd: 3693.080904531024,
    tradesCount: 75049,
    winningTradesCount: 10319,
    losingTradesCount: 64725,
    tradesVolumeUsd: 277162028.8041488,
    bestPerformingToken: {
      tokenSymbol: "VINE",
      tokenAddress: "6AJcP7wuLwmRYLBNbi825wgguaPsWzPBEHcHndpRpump",
      tokenName: "Vine Coin",
      tokenLogoUrl: "https://ipfs.io/ipfs/QmRtFJu3ZospaS4EAk17iNXZGAJp7gMxzvsZckZxbqZa5r",
      pnlUsd: 4494.288549828557
    },
    worstPerformingToken: {
      tokenSymbol: "Fartcoin",
      tokenAddress: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
      tokenName: "Fartcoin",
      tokenLogoUrl: "https://ipfs.io/ipfs/QmQr3Fz4h1etNsF7oLGMRHiCzhB5y9a7GjyodnF7zLHK1g",
      pnlUsd: -22686.138989998737
    },
    pnlTrendSevenDays: [
      [ 1742860800000, 15291.011635782299 ], [ 1742947200000, 214277.2164477525 ], [
        1743033600000, 4838.231298738496
      ], [ 1743120000000, 77059.2090226071 ], [ 1743206400000, -19068.79446750306 ], [
        1743292800000, -34604.108202229065
      ], [ 1743379200000, -33981.05793786401 ]
    ]
  },
  tokenMetrics: [
    {
      tokenAddress: "6AJcP7wuLwmRYLBNbi825wgguaPsWzPBEHcHndpRpump",
      tokenSymbol: "VINE",
      realizedPnlUsd: 4494.288549828557,
      unrealizedPnlUsd: 31479.030974660946,
      buys: {
        volumeUsd: 1220605.0371077687,
        tokenAmount: 27862648.813724,
        transactionCount: 3268
      },
      sells: {
        volumeUsd: 789002.0604128605,
        tokenAmount: 17907893.114099,
        transactionCount: 2120
      }
    }, {
 */
export interface PnlData {
    summary: {
        winRate: number,
        realizedPnlUsd: number,
        unrealizedPnlUsd: number,
        uniqueTokensTraded: number,
        averageTradeUsd: number,
        tradesCount: number,
        winningTradesCount: number,
        losingTradesCount: number,
        tradesVolumeUsd: number,
        bestPerformingToken: {
            tokenSymbol: string,
            tokenAddress: string,
            tokenName: string,
            tokenLogoUrl: string,
            pnlUsd: number,
        } | null,
        worstPerformingToken: {
            tokenSymbol: string,
            tokenAddress: string,
            tokenName: string,
            tokenLogoUrl: string,
            pnlUsd: number,
        } | null,
        pnlTrendSevenDays: [
            [number, number]
        ]
    },
    tokenMetrics: PnlTokenMetric[] | null
}

export interface PnlTokenMetric {
    tokenAddress: string,
    tokenSymbol: string,
    realizedPnlUsd: number,
    unrealizedPnlUsd: number,
    buys: {
        volumeUsd: number,
        tokenAmount: number,
        transactionCount: number,
    },
    sells: {
        volumeUsd: number,
        tokenAmount: number,
        transactionCount: number,
    }
}