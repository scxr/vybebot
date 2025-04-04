import { Context } from "telegraf";
import { getTokenBalancesFromApi, getTokenBalancesFromApiMultiWallet } from "../functions/accounts/tstokens.js";
import { TokenBalanceTs, TokenBalanceTsMultiWallet } from "../types/ApiResponses";

interface TokenBalanceConfig {
    walletAddresses: string[];
    days: number;
    onlyVerified: boolean;
    oneDayTradeMinimum: number;
    oneDayTradeVolumeMinimum: number;
    holderMinimum: number;
    minAssetValue: string;
    maxAssetValue: string;
}

const defaultConfig: TokenBalanceConfig = {
    walletAddresses: [],
    days: 14,
    onlyVerified: false,
    oneDayTradeMinimum: 100,
    oneDayTradeVolumeMinimum: 100000,
    holderMinimum: 50,
    minAssetValue: "0",
    maxAssetValue: ""
};

const waitingForInput = new Map<number, { type: 'address' | 'days' | 'tradeMin' | 'volumeMin' | 'holders' | 'minValue' | 'maxValue', messageId: number, originalMessageId: number }>();

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
        await ctx.reply(`__Token Balance Time Series__\n\nWallet address: ${formatWalletAddresses()}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Add wallet address", callback_data: "tstokens_add_address"},
                        {text: "Clear wallets", callback_data: "tstokens_clear_addresses"}
                    ],
                    [
                        {text: `Days: ${defaultConfig.days}`, callback_data: "tstokens_edit_days"},
                        {text: `${defaultConfig.onlyVerified ? "✅" : ""} Verified only`, callback_data: "tstokens_toggle_verified"}
                    ],
                    [
                        {text: `Trade min: ${defaultConfig.oneDayTradeMinimum}`, callback_data: "tstokens_edit_trade_min"},
                        {text: `Volume min: ${defaultConfig.oneDayTradeVolumeMinimum}`, callback_data: "tstokens_edit_volume_min"}
                    ],
                    [
                        {text: `Holders min: ${defaultConfig.holderMinimum}`, callback_data: "tstokens_edit_holders"},
                        {text: `Min value: ${defaultConfig.minAssetValue}`, callback_data: "tstokens_edit_min_value"}
                    ],
                    [
                        {text: `Max value: ${defaultConfig.maxAssetValue || "No limit"}`, callback_data: "tstokens_edit_max_value"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "tstokens_search"},
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
    } else if (waiting.type === 'days') {
        const newDays = parseInt(text);
        if (isNaN(newDays) || newDays < 1 || newDays > 30) {
            await ctx.reply('Please enter a valid number between 1 and 30');
            return;
        }
        defaultConfig.days = newDays;
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
    }

    try {
        if (ctx.chat?.id) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                waiting.originalMessageId,
                undefined,
                `__Token Balance Time Series__\n\nWallet address: ${formatWalletAddresses()}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: "Add wallet address", callback_data: "tstokens_add_address"},
                                {text: "Clear wallets", callback_data: "tstokens_clear_addresses"}
                            ],
                            [
                                {text: `Days: ${defaultConfig.days}`, callback_data: "tstokens_edit_days"},
                                {text: `${defaultConfig.onlyVerified ? "✅" : ""} Verified only`, callback_data: "tstokens_toggle_verified"}
                            ],
                            [
                                {text: `Trade min: ${defaultConfig.oneDayTradeMinimum}`, callback_data: "tstokens_edit_trade_min"},
                                {text: `Volume min: ${defaultConfig.oneDayTradeVolumeMinimum}`, callback_data: "tstokens_edit_volume_min"}
                            ],
                            [
                                {text: `Holders min: ${defaultConfig.holderMinimum}`, callback_data: "tstokens_edit_holders"},
                                {text: `Min value: ${defaultConfig.minAssetValue}`, callback_data: "tstokens_edit_min_value"}
                            ],
                            [
                                {text: `Max value: ${defaultConfig.maxAssetValue || "No limit"}`, callback_data: "tstokens_edit_max_value"}
                            ],
                            [
                                {text: "🔍 Search", callback_data: "tstokens_search"},
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

async function handleMultiWalletSearch(ctx: Context) {
    let data = await getTokenBalancesFromApiMultiWallet(
        defaultConfig.walletAddresses,
        defaultConfig.days,
        defaultConfig.onlyVerified,
        defaultConfig.oneDayTradeMinimum,
        defaultConfig.oneDayTradeVolumeMinimum,
        defaultConfig.holderMinimum,
        defaultConfig.minAssetValue,
        defaultConfig.maxAssetValue
    );
    console.log(data);

    let tokenList = buildMultiWalletList(data as TokenBalanceTsMultiWallet);

    // await ctx.reply(`Multi-wallet search with configuration:\n\n` +
    //     `Wallets: ${defaultConfig.walletAddresses.join(', ')}\n` +
    //     `Days: ${defaultConfig.days}\n` +
    //     `Only Verified: ${defaultConfig.onlyVerified}\n` +
    //     `Trade Min: ${defaultConfig.oneDayTradeMinimum}\n` +
    //     `Volume Min: ${defaultConfig.oneDayTradeVolumeMinimum}\n` +
    //     `Holders Min: ${defaultConfig.holderMinimum}\n` +
    //     `Min Value: ${defaultConfig.minAssetValue}\n` +
    //     `Max Value: ${defaultConfig.maxAssetValue || "No limit"}`);

    await ctx.reply(tokenList, {
        parse_mode: "HTML",
    });
}

export async function handleTokenBalancesCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    switch (callbackData) {
        case "tstokens_add_address":
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

        case "tstokens_clear_addresses":
            defaultConfig.walletAddresses = [];
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Token Balance Time Series__\n\nWallet address: ${formatWalletAddresses()}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Add wallet address", callback_data: "tstokens_add_address"},
                                    {text: "Clear wallets", callback_data: "tstokens_clear_addresses"}
                                ],
                                [
                                    {text: `Days: ${defaultConfig.days}`, callback_data: "tstokens_edit_days"},
                                    {text: `${defaultConfig.onlyVerified ? "✅" : ""} Verified only`, callback_data: "tstokens_toggle_verified"}
                                ],
                                [
                                    {text: `Trade min: ${defaultConfig.oneDayTradeMinimum}`, callback_data: "tstokens_edit_trade_min"},
                                    {text: `Volume min: ${defaultConfig.oneDayTradeVolumeMinimum}`, callback_data: "tstokens_edit_volume_min"}
                                ],
                                [
                                    {text: `Holders min: ${defaultConfig.holderMinimum}`, callback_data: "tstokens_edit_holders"},
                                    {text: `Min value: ${defaultConfig.minAssetValue}`, callback_data: "tstokens_edit_min_value"}
                                ],
                                [
                                    {text: `Max value: ${defaultConfig.maxAssetValue || "No limit"}`, callback_data: "tstokens_edit_max_value"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "tstokens_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "tstokens_edit_days":
            const daysMsg = await ctx.reply("Enter number of days (1-30):", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'days', 
                    messageId: daysMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;

        case "tstokens_toggle_verified":
            defaultConfig.onlyVerified = !defaultConfig.onlyVerified;
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__Token Balance Time Series__\n\nWallet address: ${formatWalletAddresses()}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Add wallet address", callback_data: "tstokens_add_address"},
                                    {text: "Clear wallets", callback_data: "tstokens_clear_addresses"}
                                ],
                                [
                                    {text: `Days: ${defaultConfig.days}`, callback_data: "tstokens_edit_days"},
                                    {text: `${defaultConfig.onlyVerified ? "✅" : ""} Verified only`, callback_data: "tstokens_toggle_verified"}
                                ],
                                [
                                    {text: `Trade min: ${defaultConfig.oneDayTradeMinimum}`, callback_data: "tstokens_edit_trade_min"},
                                    {text: `Volume min: ${defaultConfig.oneDayTradeVolumeMinimum}`, callback_data: "tstokens_edit_volume_min"}
                                ],
                                [
                                    {text: `Holders min: ${defaultConfig.holderMinimum}`, callback_data: "tstokens_edit_holders"},
                                    {text: `Min value: ${defaultConfig.minAssetValue}`, callback_data: "tstokens_edit_min_value"}
                                ],
                                [
                                    {text: `Max value: ${defaultConfig.maxAssetValue || "No limit"}`, callback_data: "tstokens_edit_max_value"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "tstokens_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "tstokens_edit_trade_min":
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

        case "tstokens_edit_volume_min":
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

        case "tstokens_edit_holders":
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

        case "tstokens_edit_min_value":
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

        case "tstokens_edit_max_value":
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
            
        case "tstokens_search":
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
                defaultConfig.days,
                defaultConfig.onlyVerified,
                defaultConfig.oneDayTradeMinimum,
                defaultConfig.oneDayTradeVolumeMinimum,
                defaultConfig.holderMinimum,
                defaultConfig.minAssetValue,
                defaultConfig.maxAssetValue
            );
            console.log(data);      

            let tokenList = buildTokenList(data as TokenBalanceTs);
                
            await ctx.reply(tokenList, {
                parse_mode: "HTML",
            });
            break;
    }
}

function buildTokenList(data: TokenBalanceTs) {
    let tokenList = "";

    if (data.data.length === 0) {
        return "No data available for the specified parameters.";
    }

    const latestData = data.data[data.data.length - 1];
    const oldestData = data.data[0];

    tokenList += `<u>Token Balance Time Series</u>

<code>${data.ownerAddress}</code>

<b>Latest Values:</b>
• Total Value: <code>$${parseFloat(latestData.tokenValue).toFixed(2)}</code>
• Staked SOL: <code>${parseFloat(latestData.stakeValueSol).toFixed(4)} SOL</code>
• Staked Value: <code>$${parseFloat(latestData.stakeValue).toFixed(2)}</code>
• System SOL: <code>$${parseFloat(latestData.systemValue).toFixed(2)}</code>

<b>Time Range:</b>
• From: ${new Date(oldestData.blockTime * 1000).toLocaleDateString()}
• To: ${new Date(latestData.blockTime * 1000).toLocaleDateString()}

<b>Value Changes:</b>
• Token Value: <code>$${(parseFloat(latestData.tokenValue) - parseFloat(oldestData.tokenValue)).toFixed(2)}</code>
• Staked Value: <code>$${(parseFloat(latestData.stakeValue) - parseFloat(oldestData.stakeValue)).toFixed(2)}</code>
• System Value: <code>$${(parseFloat(latestData.systemValue) - parseFloat(oldestData.systemValue)).toFixed(2)}</code>
`;

    return tokenList;
}

function buildMultiWalletList(data: TokenBalanceTsMultiWallet) {
    let tokenList = "";

    if (data.data.length === 0) {
        return "No data available for the specified parameters.";
    }

    const latestData = data.data[data.data.length - 1];
    const oldestData = data.data[0];

    tokenList += `<u>Token Balance Time Series</u>

<code>${data.ownerAddresses.join(', ')}</code>

<b>Latest Values:</b>
• Total Value: <code>$${parseFloat(latestData.tokenValue).toFixed(2)}</code>
• Staked SOL: <code>${parseFloat(latestData.stakeValueSol).toFixed(4)} SOL</code>
• Staked Value: <code>$${parseFloat(latestData.stakeValue).toFixed(2)}</code>
• System SOL: <code>$${parseFloat(latestData.systemValue).toFixed(2)}</code>

<b>Time Range:</b>
• From: ${new Date(oldestData.blockTime * 1000).toLocaleDateString()}
• To: ${new Date(latestData.blockTime * 1000).toLocaleDateString()}

<b>Value Changes:</b>
• Token Value: <code>$${(parseFloat(latestData.tokenValue) - parseFloat(oldestData.tokenValue)).toFixed(2)}</code>
• Staked Value: <code>$${(parseFloat(latestData.stakeValue) - parseFloat(oldestData.stakeValue)).toFixed(2)}</code>
• System Value: <code>$${(parseFloat(latestData.systemValue) - parseFloat(oldestData.systemValue)).toFixed(2)}</code>
`;

    return tokenList;
} 