import { Context } from "telegraf";
import { getTokenHolders } from "../functions/tokenFuncs/holders";

interface TokenHoldersConfig {
    tokenAddress: string;
    currentPage: number;
    holdersPerPage: number;
    holdersData: any | null;
}

const defaultConfig: TokenHoldersConfig = {
    tokenAddress: "",
    currentPage: 0,
    holdersPerPage: 25,
    holdersData: null
};

const waitingForInput = new Map<number, { type: 'token', messageId: number, originalMessageId: number }>();

export async function getTokenHoldersCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Token Holders__\n\nToken Address: ${defaultConfig.tokenAddress || "Not set"}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Set Token Address", callback_data: "token_holders_set_token"},
                        {text: "Clear Token", callback_data: "token_holders_clear_token"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "token_holders_search"},
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

    if (waiting.type === 'token') {
        defaultConfig.tokenAddress = text;
        defaultConfig.currentPage = 0;
        defaultConfig.holdersData = null;
    }

    await updateMessage(ctx, waiting.originalMessageId);
    waitingForInput.delete(userId);
}

export async function handleHoldersCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    switch (callbackData) {
        case "token_holders_set_token":
            await handleSetInput(ctx, 'token', "Please enter a token address:");
            break;
        case "token_holders_clear_token":
            defaultConfig.tokenAddress = "";
            defaultConfig.holdersData = null;
            await updateMessage(ctx);
            break;
        case "token_holders_search":
            if (!defaultConfig.tokenAddress) {
                await ctx.reply("Please set a token address first!");
                return;
            }

            try {
                defaultConfig.holdersData = await getTokenHolders(defaultConfig.tokenAddress);
                await displayHoldersPage(ctx);
            } catch (error) {
                console.error('Failed to fetch token holders:', error);
                await ctx.reply("Failed to fetch token holders. Please check the token address and try again.");
            }
            break;
        case "token_holders_prev_page":
            if (defaultConfig.currentPage > 0) {
                defaultConfig.currentPage--;
                await displayHoldersPage(ctx);
            }
            break;
        case "token_holders_next_page":
            if (defaultConfig.holdersData && 
                (defaultConfig.currentPage + 1) * defaultConfig.holdersPerPage < defaultConfig.holdersData.data.length) {
                defaultConfig.currentPage++;
                await displayHoldersPage(ctx);
            }
            break;
    }
}

async function handleSetInput(ctx: Context, type: 'token', prompt: string) {
    const msg = await ctx.reply(prompt, {
        reply_markup: { force_reply: true }
    });
    
    if (ctx.callbackQuery?.message) {
        waitingForInput.set(ctx.from!.id, {
            type,
            messageId: msg.message_id,
            originalMessageId: ctx.callbackQuery.message.message_id
        });
    }
}

async function updateMessage(ctx: Context, messageId?: number) {
    const message = `__Token Holders__\n\nToken Address: ${defaultConfig.tokenAddress || "Not set"}`;
    
    const keyboard = {
        inline_keyboard: [
            [
                {text: "Set Token Address", callback_data: "token_holders_set_token"},
                {text: "Clear Token", callback_data: "token_holders_clear_token"}
            ],
            [
                {text: "🔍 Search", callback_data: "token_holders_search"},
            ]
        ]
    };

    if (ctx.callbackQuery?.message) {
        await ctx.editMessageText(message, {
            parse_mode: "Markdown",
            reply_markup: keyboard
        });
    } else if (messageId && ctx.chat?.id) {
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            messageId,
            undefined,
            message,
            {
                parse_mode: "Markdown",
                reply_markup: keyboard
            }
        );
    }
}

async function displayHoldersPage(ctx: Context) {
    if (!defaultConfig.holdersData) return;

    const startIndex = defaultConfig.currentPage * defaultConfig.holdersPerPage;
    const endIndex = Math.min(startIndex + defaultConfig.holdersPerPage, defaultConfig.holdersData.data.length);
    const totalPages = Math.ceil(defaultConfig.holdersData.data.length / defaultConfig.holdersPerPage);

    let message = `<u>Token Holders</u>\n\n`;
    message += `Token: <code>${defaultConfig.tokenAddress}</code>\n`;
    message += `Total holders: <code>${defaultConfig.holdersData.data.length}</code>\n\n`;

    for (let i = startIndex; i < endIndex; i++) {
        const holder = defaultConfig.holdersData.data[i];
        message += `${i + 1}. <a href="https://solscan.io/address/${holder.ownerAddress}">${holder.ownerAddress.substring(0, 6)}...${holder.ownerAddress.substring(holder.ownerAddress.length - 4)}</a>: <code>${holder.percentageOfSupplyHeld.toFixed(2)}%</code> of supply\n`;
    }

    message += `\nPage ${defaultConfig.currentPage + 1} of ${totalPages}`;

    const keyboard = [];
    if (defaultConfig.currentPage > 0) {
        keyboard.push({ text: "⬅️ Previous", callback_data: "token_holders_prev_page" });
    }
    if (endIndex < defaultConfig.holdersData.data.length) {
        keyboard.push({ text: "Next ➡️", callback_data: "token_holders_next_page" });
    }

    try {
        if (ctx.callbackQuery?.message) {
            await ctx.editMessageText(message, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        keyboard,
                        [{ text: "Edit Token Address", callback_data: "token_holders_set_token" }]
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
                        [{ text: "Edit Token Address", callback_data: "token_holders_set_token" }]
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