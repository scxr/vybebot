import { Context } from "telegraf";
import { getTokenDetails } from "../functions/tokenFuncs/details";

interface TokenDetailsConfig {
    tokenAddress: string;
}

const defaultConfig: TokenDetailsConfig = {
    tokenAddress: ""
};

const waitingForInput = new Map<number, { 
    type: 'token', 
    messageId: number, 
    originalMessageId: number 
}>();

export async function getTokenDetailsCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Token Details__\n\nToken Address: ${defaultConfig.tokenAddress || "Not set"}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Set Token Address", callback_data: "token_details_set_token"},
                        {text: "Clear Token", callback_data: "token_details_clear_token"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "token_details_search"},
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
    }

    await updateMessage(ctx, waiting.originalMessageId);
    waitingForInput.delete(userId);
}

export async function handleDetailsCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    switch (callbackData) {
        case "token_details_set_token":
            await handleSetInput(ctx, 'token', "Please enter a token address:");
            break;
        case "token_details_clear_token":
            defaultConfig.tokenAddress = "";
            await updateMessage(ctx);
            break;
        case "token_details_search":
            if (!defaultConfig.tokenAddress) {
                await ctx.reply("Please set a token address first!");
                return;
            }

            try {
                const data = await getTokenDetails(defaultConfig.tokenAddress);
                await ctx.reply(buildDetailsList(data), {
                    parse_mode: "HTML",
                    link_preview_options: { is_disabled: true }
                });
            } catch (error) {
                console.error('Failed to fetch token details:', error);
                await ctx.reply("Failed to fetch token details. Please check the token address and try again.");
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
    const message = `__Token Details__\n\nToken Address: ${defaultConfig.tokenAddress || "Not set"}`;
    
    const keyboard = {
        inline_keyboard: [
            [
                {text: "Set Token Address", callback_data: "token_details_set_token"},
                {text: "Clear Token", callback_data: "token_details_clear_token"}
            ],
            [
                {text: "🔍 Search", callback_data: "token_details_search"},
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

function buildDetailsList(data: any) {
    let message = `<u>Token Details</u>\n\n`;
    message += `Token: <code>${defaultConfig.tokenAddress}</code>\n\n`;

    if (!data || data?.symbol == null) {
        return message + "No token details found.";
    }

    const details = data;
    message += `<b>Basic Info:</b>\n`;
    message += `• Name: <code>${details.name || "N/A"}</code>\n`;
    message += `• Symbol: <code>${details.symbol || "N/A"}</code>\n`;
    message += `• MktCap: <code>$${details.marketCap || "N/A"}</code>\n`;
    message += `• 24h Vol.: <code>$${details.usdValueVolume24h || "N/A"}</code>\n`;
    message += `• Category: <code>${details.category || "N/A"} (${details.subcategory || "N/A"})</code> \n`;
    

    if (details.price) {
        message += `\n<b>Price Info:</b>\n`;
        message += `• Current Price: <code>$${details.price.toFixed(6)}</code>\n`;
        if (details.priceChange24h) {
            const change = details.priceChange24h.toFixed(2);
            message += `• 24h Change: <code>${change}%</code>\n`;
        }
    }

    return message;
} 