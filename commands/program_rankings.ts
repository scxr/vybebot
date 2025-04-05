import { Context } from "telegraf";
import { getProgramRankings } from "../functions/programFuncs/programRankings";
import { ProgramRanking, ProgramRankingData } from "../types/ApiResponses";

interface ProgramRankingsConfig {
    interval: string;
    limit: number;
}

const defaultConfig: ProgramRankingsConfig = {
    interval: "1d",
    limit: 10
};

const allowedIntervals = ["1d", "7d", "30d"];
const waitingForInput = new Map<number, { type: 'limit', messageId: number, originalMessageId: number }>();

export async function getProgramRankingsCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Program Rankings__\n\nInterval: ${defaultConfig.interval}\nLimit: ${defaultConfig.limit}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: `${defaultConfig.interval === "1d" ? "✅" : ""} 1 Day`, callback_data: "rank_interval_1d"},
                        {text: `${defaultConfig.interval === "7d" ? "✅" : ""} 1 Week`, callback_data: "rank_interval_7d"},
                        {text: `${defaultConfig.interval === "30d" ? "✅" : ""} 1 Month`, callback_data: "rank_interval_30d"}
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
                `__Program Rankings__\n\nInterval: ${defaultConfig.interval}\nLimit: ${defaultConfig.limit}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: `${defaultConfig.interval === "1d" ? "✅" : ""} 1 Day`, callback_data: "rank_interval_1d"},
                                {text: `${defaultConfig.interval === "7d" ? "✅" : ""} 1 Week`, callback_data: "rank_interval_7d"},
                                {text: `${defaultConfig.interval === "30d" ? "✅" : ""} 1 Month`, callback_data: "rank_interval_30d"}
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

    if (callbackData.startsWith("rank_interval_")) {
        const interval = callbackData.replace("rank_interval_", "");
        if (allowedIntervals.includes(interval)) {
            defaultConfig.interval = interval;
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Program Rankings__\n\nInterval: ${defaultConfig.interval}\nLimit: ${defaultConfig.limit}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: `${defaultConfig.interval === "1d" ? "✅" : ""} 1 Day`, callback_data: "rank_interval_1d"},
                                    {text: `${defaultConfig.interval === "7d" ? "✅" : ""} 1 Week`, callback_data: "rank_interval_7d"},
                                    {text: `${defaultConfig.interval === "30d" ? "✅" : ""} 1 Month`, callback_data: "rank_interval_30d"}
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
                const data = await getProgramRankings(defaultConfig.interval, null);
                await ctx.reply(buildRankingsDetails(data), {
                    parse_mode: "HTML",
                });
            } catch (error) {
                console.error('Failed to fetch program rankings:', error);
                await ctx.reply("Failed to fetch program rankings. Please try again later.");
            }
            break;
    }
}

function buildRankingsDetails(data: ProgramRanking) {
    console.log(data);
    let message = `<u>Program Rankings</u>\n\n`;
    message += `<b>Interval:</b> ${defaultConfig.interval}\n`;
    message += `<b>Showing top:</b> ${defaultConfig.limit}\n\n`;

    if (data.data && data.data.length > 0) {
        data.data.forEach((program: ProgramRankingData, index: number) => {
            message += `${index + 1}. <b>${program.programName || program.programId}</b>\n`;
            message += `Score: <code>${program.score}</code>\n`;
            

            message += "\n";
        });
    } else {
        message += "No ranking data available.";
    }
    
    return message;
} 