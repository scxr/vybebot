import { Context } from "telegraf";
import { getProgramActiveUsers } from "../functions/programFuncs/programActiveUsers";
import { ProgramActiveUsers } from "../types/ApiResponses";

interface ProgramActiveUsersConfig {
    programId: string;
    resolution: string;
}

const defaultConfig: ProgramActiveUsersConfig = {
    programId: "",
    resolution: "1d"
};

const allowedResolutions = ["1d", "7d", "30d", "90d", "180d", "365d"];
const waitingForInput = new Map<number, { type: 'program_id', messageId: number, originalMessageId: number }>();

export async function getProgramActiveUsersCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Program Active Users__\n\nProgram ID: ${defaultConfig.programId || "Not set"}\nResolution: ${defaultConfig.resolution}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Set Program ID", callback_data: "users_set_id"},
                        {text: "Clear Program ID", callback_data: "users_clear_id"}
                    ],
                    [
                        {text: "1d", callback_data: "users_res_1d"},
                        {text: "7d", callback_data: "users_res_7d"},
                        {text: "30d", callback_data: "users_res_30d"}
                    ],
                    [
                        {text: "90d", callback_data: "users_res_90d"},
                        {text: "180d", callback_data: "users_res_180d"},
                        {text: "365d", callback_data: "users_res_365d"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "users_search"},
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
                `__Program Active Users__\n\nProgram ID: ${defaultConfig.programId || "Not set"}\nResolution: ${defaultConfig.resolution}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: "Set Program ID", callback_data: "users_set_id"},
                                {text: "Clear Program ID", callback_data: "users_clear_id"}
                            ],
                            [
                                {text: "1d", callback_data: "users_res_1d"},
                                {text: "7d", callback_data: "users_res_7d"},
                                {text: "30d", callback_data: "users_res_30d"}
                            ],
                            [
                                {text: "90d", callback_data: "users_res_90d"},
                                {text: "180d", callback_data: "users_res_180d"},
                                {text: "365d", callback_data: "users_res_365d"}
                            ],
                            [
                                {text: "🔍 Search", callback_data: "users_search"},
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

export async function handleActiveUsersCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (callbackData.startsWith("users_res_")) {
        const resolution = callbackData.replace("users_res_", "");
        if (allowedResolutions.includes(resolution)) {
            defaultConfig.resolution = resolution;
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Program Active Users__\n\nProgram ID: ${defaultConfig.programId || "Not set"}\nResolution: ${defaultConfig.resolution}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Set Program ID", callback_data: "users_set_id"},
                                    {text: "Clear Program ID", callback_data: "users_clear_id"}
                                ],
                                [
                                    {text: "1d", callback_data: "users_res_1d"},
                                    {text: "7d", callback_data: "users_res_7d"},
                                    {text: "30d", callback_data: "users_res_30d"}
                                ],
                                [
                                    {text: "90d", callback_data: "users_res_90d"},
                                    {text: "180d", callback_data: "users_res_180d"},
                                    {text: "365d", callback_data: "users_res_365d"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "users_search"},
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
        case "users_set_id":
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
            
        case "users_clear_id":
            defaultConfig.programId = "";
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Program Active Users__\n\nProgram ID: ${defaultConfig.programId || "Not set"}\nResolution: ${defaultConfig.resolution}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Set Program ID", callback_data: "users_set_id"},
                                    {text: "Clear Program ID", callback_data: "users_clear_id"}
                                ],
                                [
                                    {text: "1d", callback_data: "users_res_1d"},
                                    {text: "7d", callback_data: "users_res_7d"},
                                    {text: "30d", callback_data: "users_res_30d"}
                                ],
                                [
                                    {text: "90d", callback_data: "users_res_90d"},
                                    {text: "180d", callback_data: "users_res_180d"},
                                    {text: "365d", callback_data: "users_res_365d"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "users_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;
            
        case "users_search":
            if (!defaultConfig.programId) {
                await ctx.reply("Please set a program ID first!");
                return;
            }

            try {
                const data = await getProgramActiveUsers(defaultConfig.programId, defaultConfig.resolution);
                await ctx.reply(buildActiveUsersDetails(data), {
                    parse_mode: "HTML",
                });
            } catch (error) {
                await ctx.reply("Failed to fetch active users data. Please check the program ID and try again.");
            }
            break;
    }
}

function buildActiveUsersDetails(data: ProgramActiveUsers) {
    let message = `<u>Program Active Users</u>\n\n`;
    message += `<b>Program ID:</b> <code>${data.programId}</code>\n`;
    message += `<b>Resolution:</b> ${defaultConfig.resolution}\n\n`;
    
    if (data.data && data.data.length > 0) {
        message += `<b>Active Users History:</b>\n`;
        data.data.forEach(point => {
            const date = new Date(point.timestamp).toLocaleDateString();
            message += `${date}: <code>${point.activeUsers}</code> users\n`;
        });
    } else {
        message += "No active users data available for this period.";
    }
    
    return message;
} 