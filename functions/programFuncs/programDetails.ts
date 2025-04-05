import { ProgramDetails } from "../../types/ApiResponses"


export async function getProgramDetails(programId: string): Promise<ProgramDetails> {
    let url = `https://api.vybenetwork.xyz/program/${programId}`
    let response = await fetch(url, {
        headers: {
            'x-api-key': `${process.env.VYBE_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
    })
    let data = await response.json()
    console.log(data)
    return data as ProgramDetails
}

// getProgramDetails("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK")