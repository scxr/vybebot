export async function getProgramActiveUsers(programId: string, days: number | null, sortBy: string | null) {
    let url = `https://api.vybenetwork.xyz/program/${programId}/active-users?`
    if (days !== null) {
        url += `days=${days}&`
    }
    if (sortBy !== null) {
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
    // console.log(data)
    return data
}

// getProgramActiveUsers("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", null, null)