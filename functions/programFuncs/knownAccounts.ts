export async function getKnownAccounts(
    programId: string | null,
    name: string | null,
    labels: string[] | null,
    entityName: string | null,
    entityId: string | null,
    sortBy: string | null,
) {
    let url =  new URL("https://api.vybenetwork.xyz/program/known-program-accounts")
    if (programId) {
        url.searchParams.set("programId", programId)
    }
    if (name) {
        url.searchParams.set("name", name)
    }
    if (labels) {
        url.searchParams.set("labels", labels.join(","))
    }
    if (entityName) {
        url.searchParams.set("entityName", entityName)
    }
    if (entityId) {
        url.searchParams.set("entityId", entityId)
    }
    if (sortBy) {
        url.searchParams.set("sortBy", sortBy)
    }
    let response = await fetch(url.toString(), {
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

// getKnownAccounts(null, null, null, "Jito", null, null)