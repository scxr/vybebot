export async function getNftBalancesFromApi(address: string, noprice: boolean, limit: number, page: number = 0, order: string = 'desc', sortBy: string = 'valueUsd') {
    //     --url 'https://api.vybenetwork.xyz/account/nft-balance/G9JcXmJkFrM2bummbAFhNfjsnC5FMffbxwFxcjWZx6Mc?includeNoPriceBalance=false&limit=10&page=1' \
    let orderParam = order === 'asc' ? 'sortByAsc=' : 'sortByDesc=';
    if (sortBy == 'value') {
        sortBy = 'valueUsd';
    } else if (sortBy == 'price') {
        sortBy = 'priceUsd';
    }
    orderParam += sortBy;
    let apiReq = await fetch(
        `https://api.vybenetwork.xyz/account/nft-balance/${address}?includeNoPriceBalance=${noprice}&limit=${limit}&page=${page}&${orderParam}`,
        {
            headers: {
                'X-API-KEY': `${process.env.VYBE_API_KEY}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }
    )

    let data = await apiReq.json();
    return data;
}

async function test() {
    let data = await getNftBalancesFromApi('G9JcXmJkFrM2bummbAFhNfjsnC5FMffbxwFxcjWZx6Mc', false, 10, 1);  
    console.log(data);
}

// test();