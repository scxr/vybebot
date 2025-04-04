import { Context } from "telegraf";
import { getNftBalancesFromApi, getNftBalancesFromApiMultiWallet     } from "../functions/accounts/nftBalances";
import { NftBalance, NftBalanceMultiWallet } from "../types/ApiResponses";

interface NftConfig {
    walletAddresses: string[];
    showUnknownNfts: boolean;
    limit: number;
    sortBy: 'value' | 'price' | null;
    sortOrder: 'asc' | 'desc';
}

const defaultConfig: NftConfig = {
    walletAddresses: [],
    showUnknownNfts: true,
    limit: 100,
    sortBy: 'value',
    sortOrder: 'desc'
};

const waitingForInput = new Map<number, { type: 'address' | 'limit', messageId: number, originalMessageId: number }>();

function isSortBy(value: string | null): value is 'value' | 'price' {
    return value === 'value' || value === 'price';
}

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

export async function getNftBalances(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__NFT Balance lookup__\n\nWallet address: ${formatWalletAddresses()}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Add wallet address", callback_data: "nft_add_address"},
                        {text: "Clear wallets", callback_data: "nft_clear_addresses"}
                    ],
                    [
                        {text: `${defaultConfig.showUnknownNfts ? "✅" : "❌"} Unknown NFTs`, callback_data: "nft_toggle_unknown_nfts"},
                        {text: `Limit: ${defaultConfig.limit}`, callback_data: "nft_edit_limit"}
                    ],
                    [
                        {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "nft_sort_value"},
                        {text: `${(defaultConfig.sortBy as string) === 'price' ? '✅' : ''} Price`, callback_data: "nft_sort_price"},
                        {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "nft_toggle_order"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "nft_search"},
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
                `__NFT Balance lookup__\n\nWallet address: ${formatWalletAddresses()}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: "Add wallet address", callback_data: "nft_add_address"},
                                {text: "Clear wallets", callback_data: "nft_clear_addresses"}
                            ],
                            [
                                {text: `${defaultConfig.showUnknownNfts ? "✅" : "❌"} Unknown NFTs`, callback_data: "nft_toggle_unknown_nfts"},
                                {text: `Limit: ${defaultConfig.limit}`, callback_data: "nft_edit_limit"}
                            ],
                            [
                                {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "nft_sort_value"},
                                {text: `${(defaultConfig.sortBy as string) === 'price' ? '✅' : ''} Price`, callback_data: "nft_sort_price"},
                                {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "nft_toggle_order"}
                            ],
                            [
                                {text: "🔍 Search", callback_data: "nft_search"},
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
    let data = await getNftBalancesFromApiMultiWallet(defaultConfig.walletAddresses, defaultConfig.showUnknownNfts, defaultConfig.limit, 0, defaultConfig.sortOrder, defaultConfig.sortBy ?? 'valueUsd');
    console.log(data);

    let nftList = buildMultiWalletList(data as NftBalanceMultiWallet);

    await ctx.reply(`Multi-wallet search with configuration:\n\n` +
        `Wallets: ${defaultConfig.walletAddresses.join(', ')}\n` +
        `Show Unknown NFTs: ${defaultConfig.showUnknownNfts}\n` +
        `Limit: ${defaultConfig.limit}\n` +
        `Sort by: ${defaultConfig.sortBy || 'None'}\n` +
        `Order: ${defaultConfig.sortOrder.toUpperCase()}`);

    await ctx.reply(nftList, {
        parse_mode: "HTML",
    });
}

export async function handleNftCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    switch (callbackData) {
        case "nft_add_address":
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
            
        case "nft_clear_addresses":
            defaultConfig.walletAddresses = [];
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__NFT Balance lookup__\n\nWallet address: ${formatWalletAddresses()}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Add wallet address", callback_data: "nft_add_address"},
                                    {text: "Clear wallets", callback_data: "nft_clear_addresses"}
                                ],
                                [
                                    {text: `${defaultConfig.showUnknownNfts ? "✅" : "❌"} Unknown NFTs`, callback_data: "nft_toggle_unknown_nfts"},
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "nft_edit_limit"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "nft_sort_value"},
                                    {text: `${(defaultConfig.sortBy as string) === 'price' ? '✅' : ''} Price`, callback_data: "nft_sort_price"},
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "nft_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "nft_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;
            
        case "nft_toggle_unknown_nfts":
            defaultConfig.showUnknownNfts = !defaultConfig.showUnknownNfts;
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__NFT Balance lookup__\n\nWallet address: ${formatWalletAddresses()}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Add wallet address", callback_data: "nft_add_address"},
                                    {text: "Clear wallets", callback_data: "nft_clear_addresses"}
                                ],
                                [
                                    {text: `${defaultConfig.showUnknownNfts ? "✅" : "❌"} Unknown NFTs`, callback_data: "nft_toggle_unknown_nfts"},
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "nft_edit_limit"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "nft_sort_value"},
                                    {text: `${(defaultConfig.sortBy as string) === 'price' ? '✅' : ''} Price`, callback_data: "nft_sort_price"},
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "nft_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "nft_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;
            
        case "nft_edit_limit":
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

        case "nft_sort_value":
            defaultConfig.sortBy = 'value';
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__NFT Balance lookup__\n\nWallet address: ${formatWalletAddresses()}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Add wallet address", callback_data: "nft_add_address"},
                                    {text: "Clear wallets", callback_data: "nft_clear_addresses"}
                                ],
                                [
                                    {text: `${defaultConfig.showUnknownNfts ? "✅" : "❌"} Unknown NFTs`, callback_data: "nft_toggle_unknown_nfts"},
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "nft_edit_limit"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "nft_sort_value"},
                                    {text: `${(defaultConfig.sortBy as string) === 'price' ? '✅' : ''} Price`, callback_data: "nft_sort_price"},
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "nft_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "nft_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "nft_sort_price":
            defaultConfig.sortBy = 'price';
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__NFT Balance lookup__\n\nWallet address: ${formatWalletAddresses()}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Add wallet address", callback_data: "nft_add_address"},
                                    {text: "Clear wallets", callback_data: "nft_clear_addresses"}
                                ],
                                [
                                    {text: `${defaultConfig.showUnknownNfts ? "✅" : "❌"} Unknown NFTs`, callback_data: "nft_toggle_unknown_nfts"},
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "nft_edit_limit"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "nft_sort_value"},
                                    {text: `${(defaultConfig.sortBy as string) === 'price' ? '✅' : ''} Price`, callback_data: "nft_sort_price"},
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "nft_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "nft_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;

        case "nft_toggle_order":
            defaultConfig.sortOrder = defaultConfig.sortOrder === 'asc' ? 'desc' : 'asc';
            if (ctx.callbackQuery?.message) {
                await ctx.editMessageText(
                    `__NFT Balance lookup__\n\nWallet address: ${formatWalletAddresses()}`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {text: "Add wallet address", callback_data: "nft_add_address"},
                                    {text: "Clear wallets", callback_data: "nft_clear_addresses"}
                                ],
                                [
                                    {text: `${defaultConfig.showUnknownNfts ? "✅" : "❌"} Unknown NFTs`, callback_data: "nft_toggle_unknown_nfts"},
                                    {text: `Limit: ${defaultConfig.limit}`, callback_data: "nft_edit_limit"}
                                ],
                                [
                                    {text: `${(defaultConfig.sortBy as string) === 'value' ? '✅' : ''} Value`, callback_data: "nft_sort_value"},
                                    {text: `${(defaultConfig.sortBy as string) === 'price' ? '✅' : ''} Price`, callback_data: "nft_sort_price"},
                                    {text: `${defaultConfig.sortOrder === 'asc' ? '↑' : '↓'}`, callback_data: "nft_toggle_order"}
                                ],
                                [
                                    {text: "🔍 Search", callback_data: "nft_search"},
                                ]
                            ]
                        }
                    }
                );
            }
            break;
            
        case "nft_search":
            if (defaultConfig.walletAddresses.length === 0) {
                await ctx.reply("Please add at least one wallet address first!");
                return;
            }

            if (defaultConfig.walletAddresses.length > 1) {
                await handleMultiWalletSearch(ctx);
                return;
            }

            let data = await getNftBalancesFromApi(defaultConfig.walletAddresses[0], defaultConfig.showUnknownNfts, defaultConfig.limit, 0, defaultConfig.sortOrder, defaultConfig.sortBy ?? 'valueUsd');
            console.log(data);      

            let nftList = buildNftList(data as NftBalance);
                
            await ctx.reply(`Searching NFTs with current configuration:\n\n` +
                `Wallet: ${defaultConfig.walletAddresses[0]}\n` +
                `Show Unknown NFTs: ${defaultConfig.showUnknownNfts}\n` +
                `Limit: ${defaultConfig.limit}\n` +
                `Sort by: ${defaultConfig.sortBy || 'None'}\n` +
                `Order: ${defaultConfig.sortOrder.toUpperCase()}\n\n` +
                `Search in progress...`);

            await ctx.reply(nftList, {
                parse_mode: "HTML",
            });
            break;
    }
}

function buildNftList(data: NftBalance) {
    let nftList = "";
    
    nftList += `<u>NFT Portfolio</u>

<code>${data.ownerAddress}</code>

<b>Value:</b> <code>${parseFloat(data.totalSol).toFixed(2) ?? "0.00"} SOL</code> (${parseFloat(data.totalUsd).toFixed(2) ?? "0.00"} USD)
<b>Collections found:</b> ${data.totalNftCollectionCount}
`;
    for (let nft of data.data) {
        nftList += `
<b>${nft.name ?? "Unknown"}</b>
<code>${nft.collectionAddress}</code>
<b>Value:</b> <code>${parseFloat(nft.valueSol).toFixed(2) ?? "0.00"} SOL</code> (${parseFloat(nft.valueUsd).toFixed(2) ?? "0.00"} USD)
<b>Holdings:</b> <code>${nft.totalItems}</code>
`;
    }

    return nftList;
}

function buildMultiWalletList(data: NftBalanceMultiWallet) {
    let nftList = "";

    nftList += `<u>NFT Portfolio</u>

<code>${data.ownerAddresses.join(', ')}</code>

<b>Value:</b> <code>${parseFloat(data.totalSol).toFixed(2) ?? "0.00"} SOL</code> (${parseFloat(data.totalUsd).toFixed(2) ?? "0.00"} USD)
<b>Collections found:</b> ${data.totalNftCollectionCount}
`;

    for (let nft of data.data) {
         nftList += `
<b>${nft.name ?? "Unknown"}</b>
<code>${nft.collectionAddress}</code>
<b>Value:</b> <code>${parseFloat(nft.valueSol).toFixed(2) ?? "0.00"} SOL</code> (${parseFloat(nft.valueUsd).toFixed(2) ?? "0.00"} USD)
<b>Holdings:</b> <code>${nft.totalItems}</code>
`;
    }

    return nftList;
}