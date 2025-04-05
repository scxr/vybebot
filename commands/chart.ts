import { Context } from "telegraf";
import { createAndSaveChart } from '../functions/tokenFuncs/charting';

interface ChartConfig {
    tokenAddress: string;
    resolution: string;
    timeStart: number | null;
    timeEnd: number | null;
    limit: number;
}

const defaultConfig: ChartConfig = {
    tokenAddress: "",
    resolution: '1d',
    timeStart: null,
    timeEnd: null,
    limit: 1000
};

const validResolutions = ['15m', '30m', '1h', '2h', '3h', '4h', '1d', '1w', '1mo', '1y'];
const waitingForInput = new Map<number, { type: 'token' | 'timeStart' | 'timeEnd' | 'limit', messageId: number, originalMessageId: number }>();

export async function handleChartCommand(ctx: Context, args: string[]) {
    console.log(args);
        await ctx.reply(`__Chart Configuration__\n\nToken address: ${defaultConfig.tokenAddress || "Not set"}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Edit token address", callback_data: "chart_edit_token"}
                    ],
                    [
                        {text: `Resolution: ${defaultConfig.resolution}`, callback_data: "chart_edit_resolution"},
                        {text: `Limit: ${defaultConfig.limit}`, callback_data: "chart_edit_limit"}
                    ],
                    [
                        {text: `${defaultConfig.timeStart ? "✅" : ""} Set start time`, callback_data: "chart_edit_timeStart"},
                        {text: `${defaultConfig.timeEnd ? "✅" : ""} Set end time`, callback_data: "chart_edit_timeEnd"}
                    ],
                    [
                        {text: "🔍 Generate Chart", callback_data: "chart_generate"},
                    ]
                ]
            }
        });
    
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

    switch (waiting.type) {
        case 'token':
            defaultConfig.tokenAddress = text;
            break;
        case 'timeStart':
            const startTime = parseInt(text);
            if (isNaN(startTime) || startTime < 0) {
                await ctx.reply('Please enter a valid Unix timestamp');
                return;
            }
            defaultConfig.timeStart = startTime;
            break;
        case 'timeEnd':
            const endTime = parseInt(text);
            if (isNaN(endTime) || endTime < 0) {
                await ctx.reply('Please enter a valid Unix timestamp');
                return;
            }
            defaultConfig.timeEnd = endTime;
            break;
        case 'limit':
            const newLimit = parseInt(text);
            if (isNaN(newLimit) || newLimit < 1 || newLimit > 1000) {
                await ctx.reply('Please enter a valid number between 1 and 1000');
                return;
            }
            defaultConfig.limit = newLimit;
            break;
    }

    try {
        if (ctx.chat?.id) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                waiting.originalMessageId,
                undefined,
                `__Chart Configuration__\n\nToken address: ${defaultConfig.tokenAddress || "Not set"}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: "Edit token address", callback_data: "chart_edit_token"}
                            ],
                            [
                                {text: `Resolution: ${defaultConfig.resolution}`, callback_data: "chart_edit_resolution"},
                                {text: `Limit: ${defaultConfig.limit}`, callback_data: "chart_edit_limit"}
                            ],
                            [
                                {text: `${defaultConfig.timeStart ? "✅" : ""} Set start time`, callback_data: "chart_edit_timeStart"},
                                {text: `${defaultConfig.timeEnd ? "✅" : ""} Set end time`, callback_data: "chart_edit_timeEnd"}
                            ],
                            [
                                {text: "🔍 Generate Chart", callback_data: "chart_generate"},
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

export async function handleChartCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    switch (callbackData) {
        case "chart_edit_token":
            const tokenMsg = await ctx.reply("Please enter a token address:", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'token', 
                    messageId: tokenMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;

        case "chart_edit_resolution":
            const currentIndex = validResolutions.indexOf(defaultConfig.resolution);
            defaultConfig.resolution = validResolutions[(currentIndex + 1) % validResolutions.length];
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Chart Configuration__\n\nToken address: ${defaultConfig.tokenAddress || "Not set"}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Edit token address", callback_data: "chart_edit_token"}
                                ],
                                [
                                    {text: `Resolution: ${defaultConfig.resolution}`, callback_data: "chart_edit_resolution"},
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "chart_edit_limit"}
                                ],
                                [
                                    {text: `${defaultConfig.timeStart ? "✅" : ""} Set start time`, callback_data: "chart_edit_timeStart"},
                                    {text: `${defaultConfig.timeEnd ? "✅" : ""} Set end time`, callback_data: "chart_edit_timeEnd"}
                                ],
                                [
                                    {text: "🔍 Generate Chart", callback_data: "chart_generate"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "chart_edit_timeStart":
            const timeStartMsg = await ctx.reply("Enter start time (Unix timestamp):", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'timeStart', 
                    messageId: timeStartMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;

        case "chart_edit_timeEnd":
            const timeEndMsg = await ctx.reply("Enter end time (Unix timestamp):", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'timeEnd', 
                    messageId: timeEndMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;

        case "chart_edit_limit":
            const limitMsg = await ctx.reply("Enter a new limit (1-1000):", {
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

        case "chart_generate":
            if (!defaultConfig.tokenAddress) {
                await ctx.reply("Please set a token address first!");
                return;
            }

            try {
                const timestamp = Date.now();
                const filename = `chart_${defaultConfig.tokenAddress}_${defaultConfig.resolution}_${timestamp}.png`;
                
                await ctx.reply("Generating chart...");
                
                await createAndSaveChart(
                    defaultConfig.tokenAddress,
                    defaultConfig.resolution,
                    defaultConfig.timeStart || undefined,
                    defaultConfig.timeEnd || undefined,
                    defaultConfig.limit,
                    filename
                );

                // await ctx.reply(`Chart generated successfully! Saved as ${filename}`);
                await ctx.replyWithPhoto({
                    source: filename,
                    
                }); 
                // let file = Bun.file(filename)
                // await file.delete()
            } catch (error) {
                console.error('Error generating chart:', error);
                await ctx.reply('Failed to generate chart. Please check the token and parameters.');
            }
            break;
    }
} 