import { Context } from "telegraf";
import { getNftHoldersFromApi } from "../functions/nftHolders";
import { NftHolderResponse } from "../types/ApiResponses";

interface NftHolderConfig {
    collectionAddress: string;
    currentPage: number;
    holdersPerPage: number;
    holdersData: NftHolderResponse | null;
}

const defaultConfig: NftHolderConfig = {
    collectionAddress: "",
    currentPage: 0,
    holdersPerPage: 25,
    holdersData: null
};

const waitingForInput = new Map<number, { type: 'collection', messageId: number, originalMessageId: number }>();

export async function getNftHolders(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__NFT Holders Lookup__\n\nCollection address: ${defaultConfig.collectionAddress || "Not set"}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Edit collection address", callback_data: "nft_holders_edit_collection"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "nft_holders_search"},
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

    if (waiting.type === 'collection') {
        defaultConfig.collectionAddress = text;
        defaultConfig.currentPage = 0;
        defaultConfig.holdersData = null;
    }

    try {
        if (ctx.chat?.id) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                waiting.originalMessageId,
                undefined,
                `__NFT Holders Lookup__\n\nCollection address: ${defaultConfig.collectionAddress || "Not set"}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: "Edit collection address", callback_data: "nft_holders_edit_collection"}
                            ],
                            [
                                {text: "🔍 Search", callback_data: "nft_holders_search"},
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

export async function handleNftHoldersCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
        switch (callbackData) {
            case "nft_holders_edit_collection":
                const collectionMsg = await ctx.reply("Please enter a collection address:", {
                    reply_markup: {
                        force_reply: true
                    }
                });
                if (ctx.callbackQuery?.message) {
                    waitingForInput.set(userId, { 
                        type: 'collection', 
                        messageId: collectionMsg.message_id,
                        originalMessageId: ctx.callbackQuery.message.message_id
                    });
                }
                break;

            case "nft_holders_search":
                if (!defaultConfig.collectionAddress) {
                    await ctx.reply("Please set a collection address first!");
                    return;
                }

                try {
                    defaultConfig.holdersData = await getNftHoldersFromApi(defaultConfig.collectionAddress);
                    await displayHoldersPage(ctx);
                } catch (error) {
                    await ctx.reply("Failed to fetch NFT holders. Please check the collection address and try again.");
                }
                break;

            case "nft_holders_prev_page":
                if (defaultConfig.currentPage > 0) {
                    defaultConfig.currentPage--;
                    await displayHoldersPage(ctx);
                }
                break;

            case "nft_holders_next_page":
                if (defaultConfig.holdersData && 
                    (defaultConfig.currentPage + 1) * defaultConfig.holdersPerPage < defaultConfig.holdersData.data.length) {
                    defaultConfig.currentPage++;
                    await displayHoldersPage(ctx);
                }
                break;
        }
    } catch (error) {
        console.error('Error handling NFT holders callback:', error);
        await ctx.reply("An error occurred while processing your request.");
    }
}

async function displayHoldersPage(ctx: Context) {
    if (!defaultConfig.holdersData) return;

    const startIndex = defaultConfig.currentPage * defaultConfig.holdersPerPage;
    const endIndex = Math.min(startIndex + defaultConfig.holdersPerPage, defaultConfig.holdersData.data.length);
    const totalPages = Math.ceil(defaultConfig.holdersData.data.length / defaultConfig.holdersPerPage);

    let message = `<u>NFT Holders</u>\n\n`;
    message += `Collection: <code>${defaultConfig.collectionAddress}</code>\n`;
    message += `Total holders: <code>${defaultConfig.holdersData.data.length}</code>\n\n`;

    for (let i = startIndex; i < endIndex; i++) {
        const holder = defaultConfig.holdersData.data[i];
        message += `${i + 1}.  <a href="https://solscan.io/address/${holder.owner}">${holder.owner.substring(0, 6)}...${holder.owner.substring(holder.owner.length - 4)}</a> holds <b>${holder.amount}</b> NFTs\n`;
    }

    message += `\nPage ${defaultConfig.currentPage + 1} of ${totalPages}`;

    const keyboard = [];
    if (defaultConfig.currentPage > 0) {
        keyboard.push({ text: "⬅️ Previous", callback_data: "nft_holders_prev_page" });
    }
    if (endIndex < defaultConfig.holdersData.data.length) {
        keyboard.push({ text: "Next ➡️", callback_data: "nft_holders_next_page" });
    }

    try {
        if (ctx.callbackQuery?.message) {
            await ctx.editMessageText(message, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        keyboard,
                        [{ text: "Edit collection address", callback_data: "nft_holders_edit_collection" }]
                    ]
                },
                link_preview_options: {
                    is_disabled: true   
                }
            });
        } else {
            await ctx.reply(message, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        keyboard,
                        [{ text: "Edit collection address", callback_data: "nft_holders_edit_collection" }]
                    ]
                },
                link_preview_options: {
                    is_disabled: true   
                }
            });
        }
    } catch (error) {
        console.error('Error displaying holders page:', error);
        await ctx.reply("An error occurred while displaying the holders page.");
    }
} 