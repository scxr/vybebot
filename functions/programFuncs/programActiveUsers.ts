export async function getProgramActiveUsers(programId: string, days: number | null, sortBy: string | null) {
    let url = `https://api.vybenetwork.xyz/program/${programId}/active-users`
    if (days !== null && sortBy !== null) {
        url += `?days=${days}&sortBy=${sortBy}`
    } else if (days !== null) {
        url += `?days=${days.toString().replace("d", "")}`
    } else if (sortBy !== null) {
        url += `?sortBy=${sortBy}`
    }
    console.log("URL", url)
    let response = await fetch(url, {
        headers: {
            'x-api-key': `${process.env.VYBE_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
    })
    console.log("RESPONSE", response.status)
    let data = await response.json()
    console.log("DATA", data)
    return data
}

// getProgramActiveUsers("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", null, null)