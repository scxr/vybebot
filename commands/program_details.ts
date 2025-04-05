import { Context } from "telegraf";
import { getProgramDetails } from "../functions/programFuncs/programDetails";
import { ProgramDetails } from "../types/ApiResponses";

interface ProgramConfig {
    programId: string;
}

const defaultConfig: ProgramConfig = {
    programId: ""
};

const waitingForInput = new Map<number, { type: 'program_id', messageId: number, originalMessageId: number }>();

export async function getProgramDetailsCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Program Details lookup__\n\nProgram ID: ${defaultConfig.programId || "Not set"}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Set Program ID", callback_data: "program_set_id"},
                        {text: "Clear Program ID", callback_data: "program_clear_id"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "program_search"},
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
                `__Program Details lookup__\n\nProgram ID: ${defaultConfig.programId || "Not set"}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: "Set Program ID", callback_data: "program_set_id"},
                                {text: "Clear Program ID", callback_data: "program_clear_id"}
                            ],
                            [
                                {text: "🔍 Search", callback_data: "program_search"},
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

export async function handleProgramCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    switch (callbackData) {
        case "program_set_id":
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
            
        case "program_clear_id":
            defaultConfig.programId = "";
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Program Details lookup__\n\nProgram ID: ${defaultConfig.programId || "Not set"}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Set Program ID", callback_data: "program_set_id"},
                                    {text: "Clear Program ID", callback_data: "program_clear_id"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "program_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;
            
        case "program_search":
            if (!defaultConfig.programId) {
                await ctx.reply("Please set a program ID first!");
                return;
            }

            try {
                const data = await getProgramDetails(defaultConfig.programId);
                await ctx.reply(buildProgramDetails(data), {
                    parse_mode: "HTML",
                });
            } catch (error) {
                await ctx.reply("Failed to fetch program details. Please check the program ID and try again.");
            }
            break;
    }
}

function buildProgramDetails(data: ProgramDetails) {
    return `<u>Program Details</u>

<b>Program ID:</b> <code>${data.programId}</code>
<b>Name:</b> <code>${data.name || "N/A"}</code>
<b>Labels:</b> <code>${data.labels?.join(", ") || "N/A"}</code>
<b>About:</b> <code>${data.programDescription || "N/A"}</code>
<b>Daily Txs:</b> <code>${data.transactions1d || "N/A"}</code>`;
} 