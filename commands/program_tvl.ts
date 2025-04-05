import { Context } from "telegraf";
import { getProgramTvl } from "../functions/programFuncs/programTvl";
import { ProgramTvl } from "../types/ApiResponses";

interface ProgramTvlConfig {
    programId: string;
    resolution: string;
}

const defaultConfig: ProgramTvlConfig = {
    programId: "",
    resolution: "1d"
};

const allowedResolutions = ["1h", "6h", "12h", "1d", "7d", "30d"];
const waitingForInput = new Map<number, { type: 'program_id', messageId: number, originalMessageId: number }>();

export async function getProgramTvlCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Program TVL lookup__\n\nProgram ID: ${defaultConfig.programId || "Not set"}\nResolution: ${defaultConfig.resolution}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Set Program ID", callback_data: "tvl_set_id"},
                        {text: "Clear Program ID", callback_data: "tvl_clear_id"}
                    ],
                    [
                        {text: "1h", callback_data: "tvl_res_1h"},
                        {text: "6h", callback_data: "tvl_res_6h"},
                        {text: "12h", callback_data: "tvl_res_12h"}
                    ],
                    [
                        {text: "1d", callback_data: "tvl_res_1d"},
                        {text: "7d", callback_data: "tvl_res_7d"},
                        {text: "30d", callback_data: "tvl_res_30d"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "tvl_search"},
                    ]
                ]
            }
        });
    }
}

export async function handleTextMessage(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const waiting = waitingForInput.get(userId);
    if (!waiting) return;

    if (!ctx.message) return;
    if (!('text' in ctx.message)) return;
    const text = ctx.message.text;
    if (!text) return;

    await ctx.deleteMessage();

    try {
        if (ctx.chat?.id) {
            await ctx.telegram.deleteMessage(ctx.chat.id, waiting.messageId);
        }
    } catch (error) {
        console.error('Failed to delete message:', error);
    }

    if (waiting.type === 'program_id') {
        defaultConfig.programId = text;
    }

    try {
        if (ctx.chat?.id) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                waiting.originalMessageId,
                undefined,
                `__Program TVL lookup__\n\nProgram ID: ${defaultConfig.programId || "Not set"}\nResolution: ${defaultConfig.resolution}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: "Set Program ID", callback_data: "tvl_set_id"},
                                {text: "Clear Program ID", callback_data: "tvl_clear_id"}
                            ],
                            [
                                {text: "1h", callback_data: "tvl_res_1h"},
                                {text: "6h", callback_data: "tvl_res_6h"},
                                {text: "12h", callback_data: "tvl_res_12h"}
                            ],
                            [
                                {text: "1d", callback_data: "tvl_res_1d"},
                                {text: "7d", callback_data: "tvl_res_7d"},
                                {text: "30d", callback_data: "tvl_res_30d"}
                            ],
                            [
                                {text: "🔍 Search", callback_data: "tvl_search"},
                            ]
                        ]
                    }
                }
            );
        }
    } catch (error) {
        console.error('Failed to edit message:', error);
    }

    waitingForInput.delete(userId);
}

export async function handleTvlCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (callbackData.startsWith("tvl_res_")) {
        const resolution = callbackData.replace("tvl_res_", "");
        if (allowedResolutions.includes(resolution)) {
            defaultConfig.resolution = resolution;
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Program TVL lookup__\n\nProgram ID: ${defaultConfig.programId || "Not set"}\nResolution: ${defaultConfig.resolution}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Set Program ID", callback_data: "tvl_set_id"},
                                    {text: "Clear Program ID", callback_data: "tvl_clear_id"}
                                ],
                                [
                                    {text: "1h", callback_data: "tvl_res_1h"},
                                    {text: "6h", callback_data: "tvl_res_6h"},
                                    {text: "12h", callback_data: "tvl_res_12h"}
                                ],
                                [
                                    {text: "1d", callback_data: "tvl_res_1d"},
                                    {text: "7d", callback_data: "tvl_res_7d"},
                                    {text: "30d", callback_data: "tvl_res_30d"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "tvl_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            return;
        }
    }

    switch (callbackData) {
        case "tvl_set_id":
            const idMsg = await ctx.reply("Please enter a program ID:", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'program_id', 
                    messageId: idMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;
            
        case "tvl_clear_id":
            defaultConfig.programId = "";
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Program TVL lookup__\n\nProgram ID: ${defaultConfig.programId || "Not set"}\nResolution: ${defaultConfig.resolution}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Set Program ID", callback_data: "tvl_set_id"},
                                    {text: "Clear Program ID", callback_data: "tvl_clear_id"}
                                ],
                                [
                                    {text: "1h", callback_data: "tvl_res_1h"},
                                    {text: "6h", callback_data: "tvl_res_6h"},
                                    {text: "12h", callback_data: "tvl_res_12h"}
                                ],
                                [
                                    {text: "1d", callback_data: "tvl_res_1d"},
                                    {text: "7d", callback_data: "tvl_res_7d"},
                                    {text: "30d", callback_data: "tvl_res_30d"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "tvl_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;
            
        case "tvl_search":
            if (!defaultConfig.programId) {
                await ctx.reply("Please set a program ID first!");
                return;
            }

            try {
                const data = await getProgramTvl(defaultConfig.programId, defaultConfig.resolution);
                await ctx.reply(buildTvlDetails(data), {
                    parse_mode: "HTML",
                });
            } catch (error) {
                console.log(error)
                await ctx.reply("Failed to fetch TVL data. Please check the program ID and try again.");
            }
            break;
    }
}

function buildTvlDetails(data: ProgramTvl) {
    let message = `<u>Program TVL Details</u>\n\n`;
    message += `<b>Program ID:</b> <code>${defaultConfig.programId}</code>\n`;
    message += `<b>Resolution:</b> ${defaultConfig.resolution}\n\n`;

    
    
    if (data.data && data.data.length > 0) {
        let startTvl = data.data[0].tvl;
        let endTvl = data.data[data.data.length - 1].tvl;
        let change = Number(endTvl) - Number(startTvl);
        let changePercent = (change / Number(startTvl)) * 100;
        message += `<b>TVL History:</b>\n`;
        data.data.forEach(point => {
            const date = new Date(point.time).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            message += `${date}: <code>${Number(point.tvl).toFixed(2)} SOL</code>\n`;
        });

        message += `\n\n<b>TVL Change:</b> <code>${change.toFixed(2)} SOL</code> (${changePercent.toFixed(2)}%)\n`;
    } else {
        message += "No TVL data available for this period.";
    }
    
    return message;
} 