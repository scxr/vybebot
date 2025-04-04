export async function getIcTs(programId: string, range: string, type: string ) {
    let url = ""
    if (type == "ic") {
        url = `https://api.vybenetwork.xyz/program/${programId}/instructions-count-ts?range=${range}`
    } else if (type == "tc") {
        url = `https://api.vybenetwork.xyz/program/${programId}/transactions-count-ts?range=${range}`
    } else if (type == "au") {
        url = `https://api.vybenetwork.xyz/program/${programId}/active-users-ts?range=${range}`
    } else {
        throw new Error("Invalid type")
    }
    let response = await fetch(url, {
        headers: {
            'x-api-key': `${process.env.VYBE_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
    })
    let data = await response.json()
    console.log(data)
    return data as any[]
}

getIcTs("T1pyyaTNZsKv2WcRAB8oVnk93mLJw2XzjtVYqCsaHqt", "1d", "ic")