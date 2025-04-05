import { Context } from "telegraf";
import { getProgramRankings } from "../functions/programFuncs/programRankings";
import { ProgramRankings } from "../types/ApiResponses";

interface ProgramRankingsConfig {
    sortBy: string;
    limit: number;
}

const defaultConfig: ProgramRankingsConfig = {
    sortBy: "tvl",
    limit: 10
};

const allowedSortBy = ["tvl", "volume", "users"];
const waitingForInput = new Map<number, { type: 'limit', messageId: number, originalMessageId: number }>();

export async function getProgramRankingsCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Program Rankings__\n\nSort by: ${defaultConfig.sortBy}\nLimit: ${defaultConfig.limit}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: `${defaultConfig.sortBy === "tvl" ? "✅" : ""} TVL`, callback_data: "rank_sort_tvl"},
                        {text: `${defaultConfig.sortBy === "volume" ? "✅" : ""} Volume`, callback_data: "rank_sort_volume"},
                        {text: `${defaultConfig.sortBy === "users" ? "✅" : ""} Users`, callback_data: "rank_sort_users"}
                    ],
                    [
                        {text: "Set Limit", callback_data: "rank_set_limit"},
                    ],
                    [
                        {text: "🔍 Search", callback_data: "rank_search"},
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

    if (waiting.type === 'limit') {
        const newLimit = parseInt(text);
        if (isNaN(newLimit) || newLimit < 1 || newLimit > 100) {
            await ctx.reply('Please enter a valid number between 1 and 100');
            return;
        }
        defaultConfig.limit = newLimit;
    }

    try {
        if (ctx.chat?.id) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                waiting.originalMessageId,
                undefined,
                `__Program Rankings__\n\nSort by: ${defaultConfig.sortBy}\nLimit: ${defaultConfig.limit}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: `${defaultConfig.sortBy === "tvl" ? "✅" : ""} TVL`, callback_data: "rank_sort_tvl"},
                                {text: `${defaultConfig.sortBy === "volume" ? "✅" : ""} Volume`, callback_data: "rank_sort_volume"},
                                {text: `${defaultConfig.sortBy === "users" ? "✅" : ""} Users`, callback_data: "rank_sort_users"}
                            ],
                            [
                                {text: "Set Limit", callback_data: "rank_set_limit"},
                            ],
                            [
                                {text: "🔍 Search", callback_data: "rank_search"},
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

export async function handleRankingsCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (callbackData.startsWith("rank_sort_")) {
        const sortBy = callbackData.replace("rank_sort_", "");
        if (allowedSortBy.includes(sortBy)) {
            defaultConfig.sortBy = sortBy;
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Program Rankings__\n\nSort by: ${defaultConfig.sortBy}\nLimit: ${defaultConfig.limit}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: `${defaultConfig.sortBy === "tvl" ? "✅" : ""} TVL`, callback_data: "rank_sort_tvl"},
                                    {text: `${defaultConfig.sortBy === "volume" ? "✅" : ""} Volume`, callback_data: "rank_sort_volume"},
                                    {text: `${defaultConfig.sortBy === "users" ? "✅" : ""} Users`, callback_data: "rank_sort_users"}
                                ],
                                [
                                    {text: "Set Limit", callback_data: "rank_set_limit"},
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "rank_search"},
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
        case "rank_set_limit":
            const limitMsg = await ctx.reply("Enter a new limit (1-100):", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'limit', 
                    messageId: limitMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;
            
        case "rank_search":
            try {
                const data = await getProgramRankings(defaultConfig.sortBy, defaultConfig.limit);
                await ctx.reply(buildRankingsDetails(data), {
                    parse_mode: "HTML",
                });
            } catch (error) {
                await ctx.reply("Failed to fetch program rankings. Please try again later.");
            }
            break;
    }
}

function buildRankingsDetails(data: ProgramRankings) {
    let message = `<u>Program Rankings</u>\n\n`;
    message += `<b>Sort by:</b> ${defaultConfig.sortBy}\n`;
    message += `<b>Showing top:</b> ${defaultConfig.limit}\n\n`;
    
    if (data.rankings && data.rankings.length > 0) {
        data.rankings.forEach((program, index) => {
            message += `${index + 1}. <b>${program.name || program.programId}</b>\n`;
            message += `<code>${program.programId}</code>\n`;
            
            switch (defaultConfig.sortBy) {
                case "tvl":
                    message += `TVL: <code>${program.tvl.toFixed(2)} SOL</code>\n`;
                    break;
                case "volume":
                    message += `Volume: <code>${program.volume.toFixed(2)} SOL</code>\n`;
                    break;
                case "users":
                    message += `Users: <code>${program.users}</code>\n`;
                    break;
            }
            message += "\n";
        });
    } else {
        message += "No ranking data available.";
    }
    
    return message;
} 