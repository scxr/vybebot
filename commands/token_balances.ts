import { Context } from "telegraf";
import { getTokenBalancesFromApi, getTokenBalancesFromApiMultiWallet } from "../functions/accounts/tokenBalances";
import { TokenBalance, TokenBalanceMultiWallet } from "../types/ApiResponses";

interface TokenBalanceConfig {
    walletAddresses: string[];
    includeNoPriceBalance: boolean;
    onlyVerified: boolean;
    oneDayTradeMinimum: number;
    oneDayTradeVolumeMinimum: number;
    holderMinimum: number;
    minAssetValue: string;
    maxAssetValue: string;
    limit: number;
    page: number;
    sortBy: 'amount' | 'value' | null;
    sortOrder: 'asc' | 'desc';
}

const defaultConfig: TokenBalanceConfig = {
    walletAddresses: [],
    includeNoPriceBalance: false,
    onlyVerified: false,
    oneDayTradeMinimum: 100,
    oneDayTradeVolumeMinimum: 100000,
    holderMinimum: 50,
    minAssetValue: "0",
    maxAssetValue: "",
    limit: 100,
    page: 0,
    sortBy: 'value',
    sortOrder: 'desc'
};

const waitingForInput = new Map<number, { type: 'address' | 'tradeMin' | 'volumeMin' | 'holders' | 'minValue' | 'maxValue' | 'limit' | 'page', messageId: number, originalMessageId: number }>();

// Helper to format wallet addresses for display
function formatWalletAddresses(): string {
    if (defaultConfig.walletAddresses.length === 0) {
        return "Not set";
    } else if (defaultConfig.walletAddresses.length === 1) {
        return defaultConfig.walletAddresses[0];
    } else {
        return `${defaultConfig.walletAddresses.length} wallets`;
    }
}

export async function getTokenBalances(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Token Balances__\n\nWallet address: ${formatWalletAddresses()}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Add wallet address", callback_data: "token_balances_add_address"},
                        {text: "Clear wallets", callback_data: "token_balances_clear_addresses"}
                    ],
                    [
                        {text: `${defaultConfig.includeNoPriceBalance ? "✅" : ""} Include no price balance`, callback_data: "token_balances_toggle_no_price"},
                        {text: `${defaultConfig.onlyVerified ? "✅" : ""} Verified only`, callback_data: "token_balances_toggle_verified"}
                    ],
                    [
                        {text: `Trade min: ${defaultConfig.oneDayTradeMinimum}`, callback_data: "token_balances_edit_trade_min"},
                        {text: `Volume min: ${defaultConfig.oneDayTradeVolumeMinimum}`, callback_data: "token_balances_edit_volume_min"}
                    ],
                    [
                        {text: `Holders min: ${defaultConfig.holderMinimum}`, callback_data: "token_balances_edit_holders"},
                        {text: `Min value: ${defaultConfig.minAssetValue}`, callback_data: "token_balances_edit_min_value"}
                    ],
                    [
                        {text: `Max value: ${defaultConfig.maxAssetValue || "No limit"}`, callback_data: "token_balances_edit_max_value"}
                    ],
                    [
                        {text: `Limit: ${defaultConfig.limit}`, callback_data: "token_balances_edit_limit"},
                        {text: `Page: ${defaultConfig.page}`, callback_data: "token_balances_edit_page"}
                    ],
                    [
                        {text: `${(defaultConfig.sortBy as string) === 'amount' ? '✅' : ''} Amount`, callback_data: "token_balances_sort_amount"},
                        {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "token_balances_sort_value"},
                        {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "token_balances_toggle_order"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "token_balances_search"},
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
        defaultConfig.walletAddresses.push(text);
    } else if (waiting.type === 'tradeMin') {
        const newTradeMin = parseInt(text);
        if (isNaN(newTradeMin) || newTradeMin < 0) {
            await ctx.reply('Please enter a valid number greater than or equal to 0');
            return;
        }
        defaultConfig.oneDayTradeMinimum = newTradeMin;
    } else if (waiting.type === 'volumeMin') {
        const newVolumeMin = parseInt(text);
        if (isNaN(newVolumeMin) || newVolumeMin < 0) {
            await ctx.reply('Please enter a valid number greater than or equal to 0');
            return;
        }
        defaultConfig.oneDayTradeVolumeMinimum = newVolumeMin;
    } else if (waiting.type === 'holders') {
        const newHolders = parseInt(text);
        if (isNaN(newHolders) || newHolders < 0) {
            await ctx.reply('Please enter a valid number greater than or equal to 0');
            return;
        }
        defaultConfig.holderMinimum = newHolders;
    } else if (waiting.type === 'minValue') {
        const newMinValue = parseFloat(text);
        if (isNaN(newMinValue) || newMinValue < 0) {
            await ctx.reply('Please enter a valid number greater than or equal to 0');
            return;
        }
        defaultConfig.minAssetValue = text;
    } else if (waiting.type === 'maxValue') {
        if (text === "") {
            defaultConfig.maxAssetValue = "";
        } else {
            const newMaxValue = parseFloat(text);
            if (isNaN(newMaxValue) || newMaxValue < 0) {
                await ctx.reply('Please enter a valid number greater than or equal to 0, or empty message to remove limit');
                return;
            }
            defaultConfig.maxAssetValue = text;
        }
    } else if (waiting.type === 'limit') {
        const newLimit = parseInt(text);
        if (isNaN(newLimit) || newLimit < 1 || newLimit > 1000) {
            await ctx.reply('Please enter a valid number between 1 and 1000');
            return;
        }
        defaultConfig.limit = newLimit;
    } else if (waiting.type === 'page') {
        const newPage = parseInt(text);
        if (isNaN(newPage) || newPage < 0) {
            await ctx.reply('Please enter a valid number greater than or equal to 0');
            return;
        }
        defaultConfig.page = newPage;
    }

    try {
        if (ctx.chat?.id) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                waiting.originalMessageId,
                undefined,
                `__Token Balances__\n\nWallet address: ${formatWalletAddresses()}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: "Add wallet address", callback_data: "token_balances_add_address"},
                                {text: "Clear wallets", callback_data: "token_balances_clear_addresses"}
                            ],
                            [
                                {text: `${defaultConfig.includeNoPriceBalance ? "✅" : ""} Include no price balance`, callback_data: "token_balances_toggle_no_price"},
                                {text: `${defaultConfig.onlyVerified ? "✅" : ""} Verified only`, callback_data: "token_balances_toggle_verified"}
                            ],
                            [
                                {text: `Trade min: ${defaultConfig.oneDayTradeMinimum}`, callback_data: "token_balances_edit_trade_min"},
                                {text: `Volume min: ${defaultConfig.oneDayTradeVolumeMinimum}`, callback_data: "token_balances_edit_volume_min"}
                            ],
                            [
                                {text: `Holders min: ${defaultConfig.holderMinimum}`, callback_data: "token_balances_edit_holders"},
                                {text: `Min value: ${defaultConfig.minAssetValue}`, callback_data: "token_balances_edit_min_value"}
                            ],
                            [
                                {text: `Max value: ${defaultConfig.maxAssetValue || "No limit"}`, callback_data: "token_balances_edit_max_value"}
                            ],
                            [
                                {text: `Limit: ${defaultConfig.limit}`, callback_data: "token_balances_edit_limit"},
                                {text: `Page: ${defaultConfig.page}`, callback_data: "token_balances_edit_page"}
                            ],
                            [
                                {text: `${(defaultConfig.sortBy as string) === 'amount' ? '✅' : ''} Amount`, callback_data: "token_balances_sort_amount"},
                                {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "token_balances_sort_value"},
                                {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "token_balances_toggle_order"}
                            ],
                            [
                                {text: "🔍 Search", callback_data: "token_balances_search"},
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

export async function handleTokenBalancesCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    switch (callbackData) {
        case "token_balances_add_address":
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

        case "token_balances_clear_addresses":
            defaultConfig.walletAddresses = [];
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Token Balances__\n\nWallet address: ${formatWalletAddresses()}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Add wallet address", callback_data: "token_balances_add_address"},
                                    {text: "Clear wallets", callback_data: "token_balances_clear_addresses"}
                                ],
                                [
                                    {text: `${defaultConfig.includeNoPriceBalance ? "✅" : ""} Include no price balance`, callback_data: "token_balances_toggle_no_price"},
                                    {text: `${defaultConfig.onlyVerified ? "✅" : ""} Verified only`, callback_data: "token_balances_toggle_verified"}
                                ],
                                [
                                    {text: `Trade min: ${defaultConfig.oneDayTradeMinimum}`, callback_data: "token_balances_edit_trade_min"},
                                    {text: `Volume min: ${defaultConfig.oneDayTradeVolumeMinimum}`, callback_data: "token_balances_edit_volume_min"}
                                ],
                                [
                                    {text: `Holders min: ${defaultConfig.holderMinimum}`, callback_data: "token_balances_edit_holders"},
                                    {text: `Min value: ${defaultConfig.minAssetValue}`, callback_data: "token_balances_edit_min_value"}
                                ],
                                [
                                    {text: `Max value: ${defaultConfig.maxAssetValue || "No limit"}`, callback_data: "token_balances_edit_max_value"}
                                ],
                                [
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "token_balances_edit_limit"},
                                    {text: `Page: ${defaultConfig.page}`, callback_data: "token_balances_edit_page"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'amount' ? '✅' : ''} Amount`, callback_data: "token_balances_sort_amount"},
                                    {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "token_balances_sort_value"},
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "token_balances_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "token_balances_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "token_balances_toggle_no_price":
            defaultConfig.includeNoPriceBalance = !defaultConfig.includeNoPriceBalance;
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Token Balances__\n\nWallet address: ${formatWalletAddresses()}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Add wallet address", callback_data: "token_balances_add_address"},
                                    {text: "Clear wallets", callback_data: "token_balances_clear_addresses"}
                                ],
                                [
                                    {text: `${defaultConfig.includeNoPriceBalance ? "✅" : ""} Include no price balance`, callback_data: "token_balances_toggle_no_price"},
                                    {text: `${defaultConfig.onlyVerified ? "✅" : ""} Verified only`, callback_data: "token_balances_toggle_verified"}
                                ],
                                [
                                    {text: `Trade min: ${defaultConfig.oneDayTradeMinimum}`, callback_data: "token_balances_edit_trade_min"},
                                    {text: `Volume min: ${defaultConfig.oneDayTradeVolumeMinimum}`, callback_data: "token_balances_edit_volume_min"}
                                ],
                                [
                                    {text: `Holders min: ${defaultConfig.holderMinimum}`, callback_data: "token_balances_edit_holders"},
                                    {text: `Min value: ${defaultConfig.minAssetValue}`, callback_data: "token_balances_edit_min_value"}
                                ],
                                [
                                    {text: `Max value: ${defaultConfig.maxAssetValue || "No limit"}`, callback_data: "token_balances_edit_max_value"}
                                ],
                                [
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "token_balances_edit_limit"},
                                    {text: `Page: ${defaultConfig.page}`, callback_data: "token_balances_edit_page"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'amount' ? '✅' : ''} Amount`, callback_data: "token_balances_sort_amount"},
                                    {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "token_balances_sort_value"},
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "token_balances_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "token_balances_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "token_balances_toggle_verified":
            defaultConfig.onlyVerified = !defaultConfig.onlyVerified;
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Token Balances__\n\nWallet address: ${formatWalletAddresses()}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Add wallet address", callback_data: "token_balances_add_address"},
                                    {text: "Clear wallets", callback_data: "token_balances_clear_addresses"}
                                ],
                                [
                                    {text: `${defaultConfig.includeNoPriceBalance ? "✅" : ""} Include no price balance`, callback_data: "token_balances_toggle_no_price"},
                                    {text: `${defaultConfig.onlyVerified ? "✅" : ""} Verified only`, callback_data: "token_balances_toggle_verified"}
                                ],
                                [
                                    {text: `Trade min: ${defaultConfig.oneDayTradeMinimum}`, callback_data: "token_balances_edit_trade_min"},
                                    {text: `Volume min: ${defaultConfig.oneDayTradeVolumeMinimum}`, callback_data: "token_balances_edit_volume_min"}
                                ],
                                [
                                    {text: `Holders min: ${defaultConfig.holderMinimum}`, callback_data: "token_balances_edit_holders"},
                                    {text: `Min value: ${defaultConfig.minAssetValue}`, callback_data: "token_balances_edit_min_value"}
                                ],
                                [
                                    {text: `Max value: ${defaultConfig.maxAssetValue || "No limit"}`, callback_data: "token_balances_edit_max_value"}
                                ],
                                [
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "token_balances_edit_limit"},
                                    {text: `Page: ${defaultConfig.page}`, callback_data: "token_balances_edit_page"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'amount' ? '✅' : ''} Amount`, callback_data: "token_balances_sort_amount"},
                                    {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "token_balances_sort_value"},
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "token_balances_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "token_balances_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "token_balances_edit_trade_min":
            const tradeMinMsg = await ctx.reply("Enter minimum number of trades (≥ 0):", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'tradeMin', 
                    messageId: tradeMinMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;

        case "token_balances_edit_volume_min":
            const volumeMinMsg = await ctx.reply("Enter minimum trade volume in USD (≥ 0):", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'volumeMin', 
                    messageId: volumeMinMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;

        case "token_balances_edit_holders":
            const holdersMsg = await ctx.reply("Enter minimum number of holders (≥ 0):", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'holders', 
                    messageId: holdersMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;

        case "token_balances_edit_min_value":
            const minValueMsg = await ctx.reply("Enter minimum asset value in USD (≥ 0):", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'minValue', 
                    messageId: minValueMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;

        case "token_balances_edit_max_value":
            const maxValueMsg = await ctx.reply("Enter maximum asset value in USD (≥ 0) or empty message to remove limit:", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'maxValue', 
                    messageId: maxValueMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;

        case "token_balances_edit_limit":
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

        case "token_balances_edit_page":
            const pageMsg = await ctx.reply("Enter a new page number (≥ 0):", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'page', 
                    messageId: pageMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;

        case "token_balances_sort_amount":
            defaultConfig.sortBy = 'amount';
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Token Balances__\n\nWallet address: ${formatWalletAddresses()}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Add wallet address", callback_data: "token_balances_add_address"},
                                    {text: "Clear wallets", callback_data: "token_balances_clear_addresses"}
                                ],
                                [
                                    {text: `${defaultConfig.includeNoPriceBalance ? "✅" : ""} Include no price balance`, callback_data: "token_balances_toggle_no_price"},
                                    {text: `${defaultConfig.onlyVerified ? "✅" : ""} Verified only`, callback_data: "token_balances_toggle_verified"}
                                ],
                                [
                                    {text: `Trade min: ${defaultConfig.oneDayTradeMinimum}`, callback_data: "token_balances_edit_trade_min"},
                                    {text: `Volume min: ${defaultConfig.oneDayTradeVolumeMinimum}`, callback_data: "token_balances_edit_volume_min"}
                                ],
                                [
                                    {text: `Holders min: ${defaultConfig.holderMinimum}`, callback_data: "token_balances_edit_holders"},
                                    {text: `Min value: ${defaultConfig.minAssetValue}`, callback_data: "token_balances_edit_min_value"}
                                ],
                                [
                                    {text: `Max value: ${defaultConfig.maxAssetValue || "No limit"}`, callback_data: "token_balances_edit_max_value"}
                                ],
                                [
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "token_balances_edit_limit"},
                                    {text: `Page: ${defaultConfig.page}`, callback_data: "token_balances_edit_page"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'amount' ? '✅' : ''} Amount`, callback_data: "token_balances_sort_amount"},
                                    {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "token_balances_sort_value"},
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "token_balances_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "token_balances_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "token_balances_sort_value":
            defaultConfig.sortBy = 'value';
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Token Balances__\n\nWallet address: ${formatWalletAddresses()}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Add wallet address", callback_data: "token_balances_add_address"},
                                    {text: "Clear wallets", callback_data: "token_balances_clear_addresses"}
                                ],
                                [
                                    {text: `${defaultConfig.includeNoPriceBalance ? "✅" : ""} Include no price balance`, callback_data: "token_balances_toggle_no_price"},
                                    {text: `${defaultConfig.onlyVerified ? "✅" : ""} Verified only`, callback_data: "token_balances_toggle_verified"}
                                ],
                                [
                                    {text: `Trade min: ${defaultConfig.oneDayTradeMinimum}`, callback_data: "token_balances_edit_trade_min"},
                                    {text: `Volume min: ${defaultConfig.oneDayTradeVolumeMinimum}`, callback_data: "token_balances_edit_volume_min"}
                                ],
                                [
                                    {text: `Holders min: ${defaultConfig.holderMinimum}`, callback_data: "token_balances_edit_holders"},
                                    {text: `Min value: ${defaultConfig.minAssetValue}`, callback_data: "token_balances_edit_min_value"}
                                ],
                                [
                                    {text: `Max value: ${defaultConfig.maxAssetValue || "No limit"}`, callback_data: "token_balances_edit_max_value"}
                                ],
                                [
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "token_balances_edit_limit"},
                                    {text: `Page: ${defaultConfig.page}`, callback_data: "token_balances_edit_page"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'amount' ? '✅' : ''} Amount`, callback_data: "token_balances_sort_amount"},
                                    {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "token_balances_sort_value"},
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "token_balances_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "token_balances_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "token_balances_toggle_order":
            defaultConfig.sortOrder = defaultConfig.sortOrder === 'asc' ? 'desc' : 'asc';
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Token Balances__\n\nWallet address: ${formatWalletAddresses()}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Add wallet address", callback_data: "token_balances_add_address"},
                                    {text: "Clear wallets", callback_data: "token_balances_clear_addresses"}
                                ],
                                [
                                    {text: `${defaultConfig.includeNoPriceBalance ? "✅" : ""} Include no price balance`, callback_data: "token_balances_toggle_no_price"},
                                    {text: `${defaultConfig.onlyVerified ? "✅" : ""} Verified only`, callback_data: "token_balances_toggle_verified"}
                                ],
                                [
                                    {text: `Trade min: ${defaultConfig.oneDayTradeMinimum}`, callback_data: "token_balances_edit_trade_min"},
                                    {text: `Volume min: ${defaultConfig.oneDayTradeVolumeMinimum}`, callback_data: "token_balances_edit_volume_min"}
                                ],
                                [
                                    {text: `Holders min: ${defaultConfig.holderMinimum}`, callback_data: "token_balances_edit_holders"},
                                    {text: `Min value: ${defaultConfig.minAssetValue}`, callback_data: "token_balances_edit_min_value"}
                                ],
                                [
                                    {text: `Max value: ${defaultConfig.maxAssetValue || "No limit"}`, callback_data: "token_balances_edit_max_value"}
                                ],
                                [
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "token_balances_edit_limit"},
                                    {text: `Page: ${defaultConfig.page}`, callback_data: "token_balances_edit_page"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'amount' ? '✅' : ''} Amount`, callback_data: "token_balances_sort_amount"},
                                    {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "token_balances_sort_value"},
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "token_balances_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "token_balances_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;
            
        case "token_balances_search":
            if (defaultConfig.walletAddresses.length === 0) {
                await ctx.reply("Please add at least one wallet address first!");
                return;
            }

            if (defaultConfig.walletAddresses.length > 1) {
                await handleMultiWalletSearch(ctx);
                return;
            }

            let data = await getTokenBalancesFromApi(
                defaultConfig.walletAddresses[0],
                defaultConfig.includeNoPriceBalance,
                defaultConfig.sortOrder === 'asc' ? defaultConfig.sortBy : null,
                defaultConfig.sortOrder === 'desc' ? defaultConfig.sortBy : null,
                defaultConfig.onlyVerified,
                defaultConfig.oneDayTradeMinimum,
                defaultConfig.oneDayTradeVolumeMinimum,
                defaultConfig.holderMinimum,
                defaultConfig.minAssetValue,
                defaultConfig.maxAssetValue,
                defaultConfig.limit,
                defaultConfig.page
            );
            console.log(data);      

            let tokenList = buildTokenList(data as TokenBalance);
                
            await ctx.reply(`Searching token balances with current configuration:\n\n` +
                `Wallet: ${defaultConfig.walletAddresses[0]}\n` +
                `Include No Price Balance: ${defaultConfig.includeNoPriceBalance}\n` +
                `Only Verified: ${defaultConfig.onlyVerified}\n` +
                `Trade Min: ${defaultConfig.oneDayTradeMinimum}\n` +
                `Volume Min: ${defaultConfig.oneDayTradeVolumeMinimum}\n` +
                `Holders Min: ${defaultConfig.holderMinimum}\n` +
                `Min Value: ${defaultConfig.minAssetValue}\n` +
                `Max Value: ${defaultConfig.maxAssetValue || "No limit"}\n` +
                `Limit: ${defaultConfig.limit}\n` +
                `Page: ${defaultConfig.page}\n` +
                `Sort by: ${defaultConfig.sortBy || 'None'}\n` +
                `Order: ${defaultConfig.sortOrder.toUpperCase()}\n\n` +
                `Search in progress...`);

            await ctx.reply(tokenList, {
                parse_mode: "HTML",
            });
            break;
    }
}

async function handleMultiWalletSearch(ctx: Context) {
    let data = await getTokenBalancesFromApiMultiWallet(
        defaultConfig.walletAddresses,
        defaultConfig.includeNoPriceBalance,
        defaultConfig.sortOrder === 'asc' ? defaultConfig.sortBy : null,
        defaultConfig.sortOrder === 'desc' ? defaultConfig.sortBy : null,
        defaultConfig.onlyVerified,
        defaultConfig.oneDayTradeMinimum,
        defaultConfig.oneDayTradeVolumeMinimum,
        defaultConfig.holderMinimum,
        defaultConfig.minAssetValue,
        defaultConfig.maxAssetValue,
        defaultConfig.limit,
        defaultConfig.page
    );
    console.log(data);

    let tokenList = buildMultiWalletList(data as TokenBalanceMultiWallet);

    // await ctx.reply(`Multi-wallet search with configuration:\n\n` +
    //     `Wallets: ${defaultConfig.walletAddresses.join(', ')}\n` +
    //     `Include No Price Balance: ${defaultConfig.includeNoPriceBalance}\n` +
    //     `Only Verified: ${defaultConfig.onlyVerified}\n` +
    //     `Trade Min: ${defaultConfig.oneDayTradeMinimum}\n` +
    //     `Volume Min: ${defaultConfig.oneDayTradeVolumeMinimum}\n` +
    //     `Holders Min: ${defaultConfig.holderMinimum}\n` +
    //     `Min Value: ${defaultConfig.minAssetValue}\n` +
    //     `Max Value: ${defaultConfig.maxAssetValue || "No limit"}\n` +
    //     `Limit: ${defaultConfig.limit}\n` +
    //     `Page: ${defaultConfig.page}\n` +
    //     `Sort by: ${defaultConfig.sortBy || 'None'}\n` +
    //     `Order: ${defaultConfig.sortOrder.toUpperCase()}`);

    await ctx.reply(tokenList, {
        parse_mode: "HTML",
    });
}

function buildTokenList(data: TokenBalance) {
    let tokenList = "";

    if (data.data.length === 0) {
        return "No data available for the specified parameters.";
    }

    tokenList += `<u>Token Balances</u>

<code>${data.ownerAddress}</code>

<b>Summary:</b>
• Total Value: <code>$${parseFloat(data.totalTokenValueUsd).toFixed(2)}</code>
• 24h Change: <code>${parseFloat(data.totalTokenValueUsd1dChange).toFixed(2)}%</code>
• Total Tokens: <code>${data.totalTokenCount}</code>
• Staked SOL: <code>${parseFloat(data.stakedSolBalance).toFixed(4)} SOL</code>
• Staked Value: <code>$${parseFloat(data.stakedSolBalanceUsd).toFixed(2)}</code>
• Active Staked SOL: <code>${parseFloat(data.activeStakedSolBalance).toFixed(4)} SOL</code>
• Active Staked Value: <code>$${parseFloat(data.activeStakedSolBalanceUsd).toFixed(2)}</code>

<b>Token List:</b>
`;

    for (let token of data.data) {
        tokenList += `
<b>${token.symbol || "Unknown"}</b>
<code>${token.mintAddress}</code>
• Amount: <code>${parseFloat(token.amount).toFixed(token.decimals)}</code>
• Value: <code>$${parseFloat(token.valueUsd).toFixed(2)}</code>
• Price: <code>$${parseFloat(token.priceUsd).toFixed(6)}</code>
• 24h Change: <code>${parseFloat(token.priceUsd1dChange).toFixed(2)}%</code>
• 7d Trend: <code>${parseFloat(token.priceUsd7dTrend).toFixed(2)}%</code>
• Value Change: <code>${parseFloat(token.valueUsd1dChange).toFixed(2)}%</code>
• Verified: <code>${token.verified ? "Yes" : "No"}</code>
`;
    }

    return tokenList;
}

function buildMultiWalletList(data: TokenBalanceMultiWallet) {
    let tokenList = "";

    if (data.data.length === 0) {
        return "No data available for the specified parameters.";
    }

    tokenList += `<u>Token Balances</u>

<code>${data.ownerAddresses.join(', ')}</code>

<b>Summary:</b>
• Total Value: <code>$${parseFloat(data.totalTokenValueUsd).toFixed(2)}</code>
• 24h Change: <code>${parseFloat(data.totalTokenValueUsd1dChange).toFixed(2)}%</code>
• Total Tokens: <code>${data.totalTokenCount}</code>
• Staked SOL: <code>${parseFloat(data.stakedSolBalance).toFixed(4)} SOL</code>
• Staked Value: <code>$${parseFloat(data.stakedSolBalanceUsd).toFixed(2)}</code>
• Active Staked SOL: <code>${parseFloat(data.activeStakedSolBalance).toFixed(4)} SOL</code>
• Active Staked Value: <code>$${parseFloat(data.activeStakedSolBalanceUsd).toFixed(2)}</code>

<b>Token List:</b>
`;

    for (let token of data.data) {
        tokenList += `
<b>${token.symbol || "Unknown"}</b>
<code>${token.mintAddress}</code>
• Amount: <code>${parseFloat(token.amount).toFixed(token.decimals)}</code>
• Value: <code>$${parseFloat(token.valueUsd).toFixed(2)}</code>
• Price: <code>$${parseFloat(token.priceUsd).toFixed(6)}</code>
• 24h Change: <code>${parseFloat(token.priceUsd1dChange).toFixed(2)}%</code>
• 7d Trend: <code>${parseFloat(token.priceUsd7dTrend).toFixed(2)}%</code>
• Value Change: <code>${parseFloat(token.valueUsd1dChange).toFixed(2)}%</code>
• Verified: <code>${token.verified ? "Yes" : "No"}</code>
`;
    }

    return tokenList;
} 