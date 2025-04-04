import { ProgramRanking } from "../../types/ApiResponses"

export async function getProgramRankings(interval: string | null, date: number | null): Promise<ProgramRanking> {
    let url = ""
    if (interval === null && date === null) {
        url = `https://api.vybenetwork.xyz/program/ranking`
    } else if (interval === null && date !== null) {
        url = `https://api.vybenetwork.xyz/program/ranking?date=${date}`
    } else if (interval !== null && date === null) {
        url = `https://api.vybenetwork.xyz/program/ranking?interval=${interval}`
    } else {
        url = `https://api.vybenetwork.xyz/program/ranking?interval=${interval}&date=${date}`
    }
    let response = await fetch(url, {
        headers: {
            'x-api-key': `${process.env.VYBE_API_KEY}`,
            'Content-Type': 'application/json', 
            'Accept': 'application/json'
        },
    })
    let data = await response.json() as ProgramRanking
    return data
}

// getProgramRankings(null, null)