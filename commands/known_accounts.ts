import { Context } from "telegraf";
import { getKnownAccounts } from "../functions/programFuncs/knownAccounts";
import { KnownAccounts } from "../types/ApiResponses";

interface KnownAccountsConfig {
    programId: string;
}

const defaultConfig: KnownAccountsConfig = {
    programId: ""
};

const waitingForInput = new Map<number, { type: 'program_id', messageId: number, originalMessageId: number }>();

export async function getKnownAccountsCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Known Accounts lookup__\n\nProgram ID: ${defaultConfig.programId || "Not set"}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Set Program ID", callback_data: "known_set_id"},
                        {text: "Clear Program ID", callback_data: "known_clear_id"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "known_search"},
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
                `__Known Accounts lookup__\n\nProgram ID: ${defaultConfig.programId || "Not set"}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: "Set Program ID", callback_data: "known_set_id"},
                                {text: "Clear Program ID", callback_data: "known_clear_id"}
                            ],
                            [
                                {text: "🔍 Search", callback_data: "known_search"},
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

export async function handleKnownAccountsCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    switch (callbackData) {
        case "known_set_id":
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
            
        case "known_clear_id":
            defaultConfig.programId = "";
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Known Accounts lookup__\n\nProgram ID: ${defaultConfig.programId || "Not set"}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Set Program ID", callback_data: "known_set_id"},
                                    {text: "Clear Program ID", callback_data: "known_clear_id"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "known_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;
            
        case "known_search":
            if (!defaultConfig.programId) {
                await ctx.reply("Please set a program ID first!");
                return;
            }

            try {
                const data = await getKnownAccounts(defaultConfig.programId);
                await ctx.reply(buildKnownAccountsDetails(data), {
                    parse_mode: "HTML",
                });
            } catch (error) {
                await ctx.reply("Failed to fetch known accounts. Please check the program ID and try again.");
            }
            break;
    }
}

function buildKnownAccountsDetails(data: KnownAccounts) {
    let message = `<u>Known Accounts</u>\n\n`;
    message += `<b>Program ID:</b> <code>${data.programId}</code>\n\n`;
    
    if (data.accounts && data.accounts.length > 0) {
        message += `<b>Accounts:</b>\n`;
        data.accounts.forEach(account => {
            message += `<b>${account.name}:</b>\n`;
            message += `<code>${account.address}</code>\n`;
            if (account.description) message += `${account.description}\n`;
            message += "\n";
        });
    } else {
        message += "No known accounts found for this program.";
    }
    
    return message;
} 