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

const allowedResolutions = ["1d", "3d", "7d", "14d", "21d", "30d"];
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
                        {text: "3d", callback_data: "users_res_3d"},
                        {text: "7d", callback_data: "users_res_7d"}
                    ],
                    [
                        {text: "14d", callback_data: "users_res_14d"},
                        {text: "21d", callback_data: "users_res_21d"},
                        {text: "30d", callback_data: "users_res_30d"}
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
                                {text: "3d", callback_data: "users_res_3d"},
                                {text: "7d", callback_data: "users_res_7d"}
                            ],
                            [
                                {text: "14d", callback_data: "users_res_14d"},
                                {text: "21d", callback_data: "users_res_21d"},
                                {text: "30d", callback_data: "users_res_30d"}
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
                                    {text: "3d", callback_data: "users_res_3d"},
                                    {text: "7d", callback_data: "users_res_7d"}
                                ],
                                [
                                    {text: "14d", callback_data: "users_res_14d"},
                                    {text: "21d", callback_data: "users_res_21d"},
                                    {text: "30d", callback_data: "users_res_30d"}
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
                                    {text: "3d", callback_data: "users_res_3d"},
                                    {text: "7d", callback_data: "users_res_7d"}
                                ],
                                [
                                    {text: "14d", callback_data: "users_res_14d"},
                                    {text: "21d", callback_data: "users_res_21d"},
                                    {text: "30d", callback_data: "users_res_30d"}
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
                const data = await getProgramActiveUsers(defaultConfig.programId, defaultConfig.resolution, null);
                await ctx.reply(buildActiveUsersDetails(data), {
                    parse_mode: "HTML",
                    link_preview_options: {
                        is_disabled: true
                    }
                });
            } catch (error) {
                console.error('Failed to fetch active users data:', error);
                await ctx.reply("Failed to fetch active users data. Please check the program ID and try again.");
            }
            break;
    }
}

function buildActiveUsersDetails(dataInit: ProgramActiveUsers) {
    let message = `<u>Programs Active Users</u>\n\n`;
    message += `<b>Program ID:</b> <code>${defaultConfig.programId}</code>\n`;
    message += `<b>Resolution:</b> ${defaultConfig.resolution}\n\n`;
    let data = dataInit.data.slice(0, 20)
    if (data && data.length > 0) {
        message += `<b>Top 20 Active Users</b>\n`;
        data.forEach((point: { wallet: string; transactions: number }) => {
            message += `<a href="https://solscan.io/address/${point.wallet}">${point.wallet.substring(0, 4)}...${point.wallet.substring(point.wallet.length - 4)}</a>: <code>${point.transactions}</code> txs\n`;
        });
    } else {
        message += "No active users data available for this period.";
    }
    
    return message;
} 