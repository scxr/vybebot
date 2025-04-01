import { Context } from "telegraf";
import { getPnlFromApi } from "../functions/pnl.ts";
import { PnlData } from "../types/ApiResponses";

interface PnlConfig {
    walletAddress: string;
    resolution: '1d' | '7d' | '30d';
    tokenAddress: string | null;
    sortBy: 'tokenAddress' | 'tokenSymbol' | 'buysTransactionCount' | 'buysTokenAmount' | 'buysVolumeUsd' | 'sellsTransactionCount' | 'sellsTokenAmount' | 'sellsVolumeUsd' | 'realizedPnlUsd' | 'unrealizedPnlUsd' | null;
    sortOrder: 'asc' | 'desc';
    limit: number;
}

const defaultConfig: PnlConfig = {
    walletAddress: "",
    resolution: '1d',
    tokenAddress: null,
    sortBy: 'realizedPnlUsd',
    sortOrder: 'desc',
    limit: 100
};

const waitingForInput = new Map<number, { type: 'address' | 'token' | 'limit', messageId: number, originalMessageId: number }>();

export async function getPnl(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__PNL Analysis__\n\nWallet address: ${defaultConfig.walletAddress || "Not set"}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Edit wallet address", callback_data: "pnl_edit_address"}
                    ],
                    [
                        {text: `Resolution: ${defaultConfig.resolution}`, callback_data: "pnl_edit_resolution"},
                        {text: `Limit: ${defaultConfig.limit}`, callback_data: "pnl_edit_limit"}
                    ],
                    [
                        {text: `${defaultConfig.tokenAddress ? "✅" : ""} Filter by token`, callback_data: "pnl_edit_token"}
                    ],
                    [
                        {text: `${(defaultConfig.sortBy as string) === 'realizedPnlUsd' ? '✅' : ''} Realized PnL`, callback_data: "pnl_sort_realized"},
                        {text: `${(defaultConfig.sortBy as string) === 'unrealizedPnlUsd' ? '✅' : ''} Unrealized PnL`, callback_data: "pnl_sort_unrealized"}
                    ],
                    [
                        {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "pnl_toggle_order"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "pnl_search"},
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
    } else if (waiting.type === 'token') {
        defaultConfig.tokenAddress = text || null;
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
                `__PNL Analysis__\n\nWallet address: ${defaultConfig.walletAddress || "Not set"}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: "Edit wallet address", callback_data: "pnl_edit_address"}
                            ],
                            [
                                {text: `Resolution: ${defaultConfig.resolution}`, callback_data: "pnl_edit_resolution"},
                                {text: `Limit: ${defaultConfig.limit}`, callback_data: "pnl_edit_limit"}
                            ],
                            [
                                {text: `${defaultConfig.tokenAddress ? "✅" : ""} Filter by token`, callback_data: "pnl_edit_token"}
                            ],
                            [
                                {text: `${(defaultConfig.sortBy as string) === 'realizedPnlUsd' ? '✅' : ''} Realized PnL`, callback_data: "pnl_sort_realized"},
                                {text: `${(defaultConfig.sortBy as string) === 'unrealizedPnlUsd' ? '✅' : ''} Unrealized PnL`, callback_data: "pnl_sort_unrealized"}
                            ],
                            [
                                {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "pnl_toggle_order"}
                            ],
                            [
                                {text: "🔍 Search", callback_data: "pnl_search"},
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

export async function handlePnlCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    switch (callbackData) {
        case "pnl_edit_address":
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

        case "pnl_edit_resolution":
            const resolutions: ('1d' | '7d' | '30d')[] = ['1d', '7d', '30d'];
            const currentIndex = resolutions.indexOf(defaultConfig.resolution);
            defaultConfig.resolution = resolutions[(currentIndex + 1) % resolutions.length];
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__PNL Analysis__\n\nWallet address: ${defaultConfig.walletAddress || "Not set"}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Edit wallet address", callback_data: "pnl_edit_address"}
                                ],
                                [
                                    {text: `Resolution: ${defaultConfig.resolution}`, callback_data: "pnl_edit_resolution"},
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "pnl_edit_limit"}
                                ],
                                [
                                    {text: `${defaultConfig.tokenAddress ? "✅" : ""} Filter by token`, callback_data: "pnl_edit_token"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'realizedPnlUsd' ? '✅' : ''} Realized PnL`, callback_data: "pnl_sort_realized"},
                                    {text: `${(defaultConfig.sortBy as string) === 'unrealizedPnlUsd' ? '✅' : ''} Unrealized PnL`, callback_data: "pnl_sort_unrealized"}
                                ],
                                [
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "pnl_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "pnl_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;
            
        case "pnl_edit_token":
            const tokenMsg = await ctx.reply("Enter token address to filter (or send empty message to clear):", {
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
            
        case "pnl_edit_limit":
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

        case "pnl_sort_realized":
            defaultConfig.sortBy = 'realizedPnlUsd';
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__PNL Analysis__\n\nWallet address: ${defaultConfig.walletAddress || "Not set"}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Edit wallet address", callback_data: "pnl_edit_address"}
                                ],
                                [
                                    {text: `Resolution: ${defaultConfig.resolution}`, callback_data: "pnl_edit_resolution"},
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "pnl_edit_limit"}
                                ],
                                [
                                    {text: `${defaultConfig.tokenAddress ? "✅" : ""} Filter by token`, callback_data: "pnl_edit_token"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'realizedPnlUsd' ? '✅' : ''} Realized PnL`, callback_data: "pnl_sort_realized"},
                                    {text: `${(defaultConfig.sortBy as string) === 'unrealizedPnlUsd' ? '✅' : ''} Unrealized PnL`, callback_data: "pnl_sort_unrealized"}
                                ],
                                [
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "pnl_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "pnl_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "pnl_sort_unrealized":
            defaultConfig.sortBy = 'unrealizedPnlUsd';
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__PNL Analysis__\n\nWallet address: ${defaultConfig.walletAddress || "Not set"}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Edit wallet address", callback_data: "pnl_edit_address"}
                                ],
                                [
                                    {text: `Resolution: ${defaultConfig.resolution}`, callback_data: "pnl_edit_resolution"},
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "pnl_edit_limit"}
                                ],
                                [
                                    {text: `${defaultConfig.tokenAddress ? "✅" : ""} Filter by token`, callback_data: "pnl_edit_token"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'realizedPnlUsd' ? '✅' : ''} Realized PnL`, callback_data: "pnl_sort_realized"},
                                    {text: `${(defaultConfig.sortBy as string) === 'unrealizedPnlUsd' ? '✅' : ''} Unrealized PnL`, callback_data: "pnl_sort_unrealized"}
                                ],
                                [
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "pnl_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "pnl_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "pnl_toggle_order":
            defaultConfig.sortOrder = defaultConfig.sortOrder === 'asc' ? 'desc' : 'asc';
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__PNL Analysis__\n\nWallet address: ${defaultConfig.walletAddress || "Not set"}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Edit wallet address", callback_data: "pnl_edit_address"}
                                ],
                                [
                                    {text: `Resolution: ${defaultConfig.resolution}`, callback_data: "pnl_edit_resolution"},
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "pnl_edit_limit"}
                                ],
                                [
                                    {text: `${defaultConfig.tokenAddress ? "✅" : ""} Filter by token`, callback_data: "pnl_edit_token"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'realizedPnlUsd' ? '✅' : ''} Realized PnL`, callback_data: "pnl_sort_realized"},
                                    {text: `${(defaultConfig.sortBy as string) === 'unrealizedPnlUsd' ? '✅' : ''} Unrealized PnL`, callback_data: "pnl_sort_unrealized"}
                                ],
                                [
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "pnl_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "pnl_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;
            
        case "pnl_search":
            if (!defaultConfig.walletAddress) {
                await ctx.reply("Please set a wallet address first!");
                return;
            }

            let data = await getPnlFromApi(
                defaultConfig.walletAddress,
                defaultConfig.resolution,
                defaultConfig.tokenAddress,
                defaultConfig.sortOrder === 'asc' ? defaultConfig.sortBy : null,
                defaultConfig.sortOrder === 'desc' ? defaultConfig.sortBy : null,
                defaultConfig.limit
            );
            console.log(data);      

            let pnlList = buildPnlList(data as PnlData);
                
            // await ctx.reply(`Searching PNL with current configuration:\n\n` +
            //     `Wallet: ${defaultConfig.walletAddress}\n` +
            //     `Resolution: ${defaultConfig.resolution}\n` +
            //     `Token Filter: ${defaultConfig.tokenAddress || 'None'}\n` +
            //     `Sort by: ${defaultConfig.sortBy || 'None'}\n` +
            //     `Order: ${defaultConfig.sortOrder.toUpperCase()}\n` +
            //     `Limit: ${defaultConfig.limit}\n\n` +
            //     `Search in progress...`);

            await ctx.reply(pnlList, {
                parse_mode: "HTML",
            });
            break;
    }
}

function buildPnlList(data: PnlData) {
    let pnlList = "";

    pnlList += `<u>PNL Analysis</u>

<b>Summary</b>
<b>Win Rate:</b> <code>${parseFloat(data.summary.winRate.toFixed(2))}%</code>
<b>Realized PnL:</b> <code>$${parseFloat(data.summary.realizedPnlUsd.toFixed(2))}</code>
<b>Unrealized PnL:</b> <code>$${parseFloat(data.summary.unrealizedPnlUsd.toFixed(2))}</code>
<b>Total Trades:</b> <code>${data.summary.tradesCount}</code>

<b>Best Performing Token:</b> <code>${data.summary.bestPerformingToken?.tokenSymbol}</code> ($${data.summary.bestPerformingToken?.pnlUsd})
<b>Worst Performing Token:</b> <code>${data.summary.worstPerformingToken?.tokenSymbol}</code> ($${data.summary.worstPerformingToken?.pnlUsd})


`;

    return pnlList;
}
