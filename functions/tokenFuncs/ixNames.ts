export async function getInstructionNames(
    ixName: string | null,
    callingProgram: string | null,
    programName: string | null,
    
) {
    if (ixName == null && callingProgram == null && programName == null) {
        throw new Error("ixName, callingProgram, and programName cannot all be null");
    }
    let url = new URL("https://api.vybenetwork.xyz/token/instruction-names")
    if (ixName) {
        url.searchParams.set("ixName", ixName);
    }
    if (callingProgram) {
        url.searchParams.set("callingProgram", callingProgram);
    }
    if (programName) {
        url.searchParams.set("programName", programName);
    }
    let response = await fetch(url, {
        headers: {
            'X-API-KEY': `${process.env.VYBE_API_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });
    let data = await response.json();
    console.log(data);
    return data;
    
    

}

async function test() {
    let data = await getInstructionNames("transfer", null, null);
    console.log(data);
}


