import { Context } from "telegraf";
import { getProgramsList } from "../functions/programFuncs/programsList";
import { ProgramsList } from "../types/ApiResponses";

interface ProgramListConfig {
    category: string | null;
    subcategory: string | null;
    limit: number;
}

const defaultConfig: ProgramListConfig = {
    category: null,
    subcategory: null,
    limit: 10
};

const waitingForInput = new Map<number, { type: 'limit' | 'category' | 'subcategory', messageId: number, originalMessageId: number }>();

export async function getProgramListCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Program List__\n\nCategory: ${defaultConfig.category || "All"}\nSubcategory: ${defaultConfig.subcategory || "All"}\nLimit: ${defaultConfig.limit}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Set Category", callback_data: "list_set_category"},
                        {text: "Clear Category", callback_data: "list_clear_category"}
                    ],
                    [
                        {text: "Set Subcategory", callback_data: "list_set_subcategory"},
                        {text: "Clear Subcategory", callback_data: "list_clear_subcategory"}
                    ],
                    [
                        {text: "Set Limit", callback_data: "list_set_limit"},
                    ],
                    [
                        {text: "🔍 Search", callback_data: "list_search"},
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

    switch (waiting.type) {
        case 'category':
            defaultConfig.category = text;
            break;
        case 'subcategory':
            defaultConfig.subcategory = text;
            break;
        case 'limit':
            const newLimit = parseInt(text);
            if (isNaN(newLimit) || newLimit < 1 || newLimit > 100) {
                await ctx.reply('Please enter a valid number between 1 and 100');
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
                `__Program List__\n\nCategory: ${defaultConfig.category || "All"}\nSubcategory: ${defaultConfig.subcategory || "All"}\nLimit: ${defaultConfig.limit}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: "Set Category", callback_data: "list_set_category"},
                                {text: "Clear Category", callback_data: "list_clear_category"}
                            ],
                            [
                                {text: "Set Subcategory", callback_data: "list_set_subcategory"},
                                {text: "Clear Subcategory", callback_data: "list_clear_subcategory"}
                            ],
                            [
                                {text: "Set Limit", callback_data: "list_set_limit"},
                            ],
                            [
                                {text: "🔍 Search", callback_data: "list_search"},
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

export async function handleProgramListCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    switch (callbackData) {
        case "list_set_category":
            const categoryMsg = await ctx.reply("Please enter a category:", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'category', 
                    messageId: categoryMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;
            
        case "list_clear_category":
            defaultConfig.category = null;
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Program List__\n\nCategory: ${defaultConfig.category || "All"}\nSubcategory: ${defaultConfig.subcategory || "All"}\nLimit: ${defaultConfig.limit}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Set Category", callback_data: "list_set_category"},
                                    {text: "Clear Category", callback_data: "list_clear_category"}
                                ],
                                [
                                    {text: "Set Subcategory", callback_data: "list_set_subcategory"},
                                    {text: "Clear Subcategory", callback_data: "list_clear_subcategory"}
                                ],
                                [
                                    {text: "Set Limit", callback_data: "list_set_limit"},
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "list_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "list_set_subcategory":
            const subcategoryMsg = await ctx.reply("Please enter a subcategory:", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'subcategory', 
                    messageId: subcategoryMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;
            
        case "list_clear_subcategory":
            defaultConfig.subcategory = null;
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Program List__\n\nCategory: ${defaultConfig.category || "All"}\nSubcategory: ${defaultConfig.subcategory || "All"}\nLimit: ${defaultConfig.limit}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Set Category", callback_data: "list_set_category"},
                                    {text: "Clear Category", callback_data: "list_clear_category"}
                                ],
                                [
                                    {text: "Set Subcategory", callback_data: "list_set_subcategory"},
                                    {text: "Clear Subcategory", callback_data: "list_clear_subcategory"}
                                ],
                                [
                                    {text: "Set Limit", callback_data: "list_set_limit"},
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "list_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "list_set_limit":
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
            
        case "list_search":
            try {
                console.log([defaultConfig.category], defaultConfig.subcategory, defaultConfig.limit)
                const data = await getProgramsList([defaultConfig.category || ""], null);
                await ctx.reply(buildProgramListDetails(data), {
                    parse_mode: "HTML",
                });
            } catch (error) {
                console.log(error)
                await ctx.reply("Failed to fetch program list. Please try again later.");
            }
            break;
    }
}

function buildProgramListDetails(data: ProgramsList) {
   
    let message = `<u>Program List</u>\n\n`;
    message += `<b>Category:</b> ${defaultConfig.category || "All"}\n`;
    message += `<b>Subcategory:</b> ${defaultConfig.subcategory || "All"}\n`;
    message += `<b>Showing:</b> ${defaultConfig.limit} programs\n\n`;
    let cnt = 0;
    let dataUsed = data.data.slice(0, defaultConfig.limit);
    if (dataUsed && dataUsed.length > 0) {
        dataUsed.forEach((program, index) => {
            message += `${index + 1}. <b>${program.friendlyName || program.programId}</b>\n`;
            message += `<code>${program.programId}</code>\n`;
            message += `<i>${program.programDescription}</i>\n`;
            if (program.labels.length > 0) message += `Labels: ${program.labels.join(", ")}\n`;
            message += `Daily Users: ${program.dau}\n`;
            
            message += `\n`;
        });
    } else {
        message += "No programs found matching the criteria.";
    }
    
    return message;
} 