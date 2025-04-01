import { Context } from "telegraf";

interface NftConfig {
    walletAddress: string;
    showUnknownNfts: boolean;
    limit: number;
}

const defaultConfig: NftConfig = {
    walletAddress: "",
    showUnknownNfts: true,
    limit: 100
};

const waitingForInput = new Map<number, { type: 'address' | 'limit', messageId: number, originalMessageId: number }>();

export async function getNftBalances(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__NFT Balance lookup__\n\nWallet address: ${defaultConfig.walletAddress || "Not set"}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Edit wallet address", callback_data: "edit_address"}
                    ],
                    [
                        {text: `${defaultConfig.showUnknownNfts ? "✅" : "❌"} Unknown NFTs`, callback_data: "toggle_unknown_nfts"},
                        {text: `Limit: ${defaultConfig.limit}`, callback_data: "edit_limit"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "search_nfts"},
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

    if (waiting.type === 'address') {
        defaultConfig.walletAddress = text;
    } else if (waiting.type === 'limit') {
        const newLimit = parseInt(text);
        if (isNaN(newLimit) || newLimit < 1 || newLimit > 1000) {
            await ctx.reply('Please enter a valid number between 1 and 1000');
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
                `__NFT Balance lookup__\n\nWallet address: ${defaultConfig.walletAddress || "Not set"}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: "Edit wallet address", callback_data: "edit_address"}
                            ],
                            [
                                {text: `${defaultConfig.showUnknownNfts ? "✅" : "❌"} Unknown NFTs`, callback_data: "toggle_unknown_nfts"},
                                {text: `Limit: ${defaultConfig.limit}`, callback_data: "edit_limit"}
                            ],
                            [
                                {text: "🔍 Search", callback_data: "search_nfts"},
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

export async function handleNftCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    switch (callbackData) {
        case "edit_address":
            const addressMsg = await ctx.reply("Please enter a wallet address:", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'address', 
                    messageId: addressMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;
            
        case "toggle_unknown_nfts":
            defaultConfig.showUnknownNfts = !defaultConfig.showUnknownNfts;
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__NFT Balance lookup__\n\nWallet address: ${defaultConfig.walletAddress || "Not set"}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Edit wallet address", callback_data: "edit_address"}
                                ],
                                [
                                    {text: `${defaultConfig.showUnknownNfts ? "✅" : "❌"} Unknown NFTs`, callback_data: "toggle_unknown_nfts"},
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "edit_limit"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "search_nfts"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;
            
        case "edit_limit":
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
            
        case "search_nfts":
            if (!defaultConfig.walletAddress) {
                await ctx.reply("Please set a wallet address first!");
                return;
            }
            
            await ctx.reply(`Searching NFTs with current configuration:\n\n` +
                `Wallet: ${defaultConfig.walletAddress}\n` +
                `Show Unknown NFTs: ${defaultConfig.showUnknownNfts}\n` +
                `Limit: ${defaultConfig.limit}\n\n` +
                `Search in progress...`);
            break;
    }
}