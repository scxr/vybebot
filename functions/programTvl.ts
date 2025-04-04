import { ProgramTvl } from "../types/ApiResponses"

const allowedResolutions = ["1d", "7d", "30d", "90d", "180d", "365d"]

export async function getProgramTvl(programId: string, resolution: string) {
    if (!allowedResolutions.includes(resolution)) {
        throw new Error(`Invalid resolution: ${resolution}`)
    }
    let url = `https://api.vybenetwork.xyz/program/${programId}/tvl?resolution=${resolution}`
    let response = await fetch(url, {
        headers: {
            'x-api-key': `${process.env.VYBE_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
    })
    let data = await response.json()
    console.log(data)
    return data as ProgramTvl
}

getProgramTvl("CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", "1d")