export async function getProgramsList(labels: string[] | null, sortBy: string | null) {
    let url = `https://api.vybenetwork.xyz/programs?`
    if (labels) {
        labels = labels.map(label => label.toUpperCase())
        url += `labels=${labels.join(",")}&`
    }
    if (sortBy) {
        url += `sortBy=${sortBy}`
    }
    let response = await fetch(url, {
        headers: {
            'x-api-key': `${process.env.VYBE_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
    })
    let data = await response.json()
    return data as any[]
}

getProgramsList(["defi"], null)   