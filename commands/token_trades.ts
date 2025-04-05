import { Context } from "telegraf";
import { getTokenTrades } from "../functions/tokenFuncs/trades";
import { TokenTrades } from "../types/ApiResponses";

interface TokenTradesConfig {
    tokenAddress: string;
    byPlatform: string | null;
    marketId: string | null;
    authority: string | null;
    resolution: "1h" | "1d" | "1w" | "1m" | "1y" | null;
    feePayer: string | null;
}

const defaultConfig: TokenTradesConfig = {
    tokenAddress: "",
    byPlatform: null,
    marketId: null,
    authority: null,
    resolution: "1d",
    feePayer: null
};

const allowedResolutions = ["1h", "1d", "1w", "1m", "1y"];
const waitingForInput = new Map<number, { 
    type: 'token' | 'platform' | 'market' | 'authority' | 'feepayer', 
    messageId: number, 
    originalMessageId: number 
}>();

export async function getTokenTradesCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Token Trades__\n\nToken Address: ${defaultConfig.tokenAddress || "Not set"}\nPlatform: ${defaultConfig.byPlatform || "Not set"}\nMarket ID: ${defaultConfig.marketId || "Not set"}\nAuthority: ${defaultConfig.authority || "Not set"}\nResolution: ${defaultConfig.resolution}\nFee Payer: ${defaultConfig.feePayer || "Not set"}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Set Token Address", callback_data: "trades_set_token"},
                        {text: "Clear Token", callback_data: "trades_clear_token"}
                    ],
                    [
                        {text: "Set Platform", callback_data: "trades_set_platform"},
                        {text: "Clear Platform", callback_data: "trades_clear_platform"}
                    ],
                    [
                        {text: "Set Market ID", callback_data: "trades_set_market"},
                        {text: "Clear Market ID", callback_data: "trades_clear_market"}
                    ],
                    [
                        {text: "Set Authority", callback_data: "trades_set_authority"},
                        {text: "Clear Authority", callback_data: "trades_clear_authority"}
                    ],
                    [
                        {text: "Set Fee Payer", callback_data: "trades_set_feepayer"},
                        {text: "Clear Fee Payer", callback_data: "trades_clear_feepayer"}
                    ],
                    [
                        {text: `${defaultConfig.resolution === "1h" ? "✅" : ""} 1h`, callback_data: "trades_res_1h"},
                        {text: `${defaultConfig.resolution === "1d" ? "✅" : ""} 1d`, callback_data: "trades_res_1d"},
                        {text: `${defaultConfig.resolution === "1w" ? "✅" : ""} 1w`, callback_data: "trades_res_1w"}
                    ],
                    [
                        {text: `${defaultConfig.resolution === "1m" ? "✅" : ""} 1m`, callback_data: "trades_res_1m"},
                        {text: `${defaultConfig.resolution === "1y" ? "✅" : ""} 1y`, callback_data: "trades_res_1y"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "trades_search"},
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

    switch (waiting.type) {
        case 'token':
            defaultConfig.tokenAddress = text;
            break;
        case 'platform':
            defaultConfig.byPlatform = text;
            break;
        case 'market':
            defaultConfig.marketId = text;
            break;
        case 'authority':
            defaultConfig.authority = text;
            break;
        case 'feepayer':
            defaultConfig.feePayer = text;
            break;
    }

    await updateMessage(ctx, waiting.originalMessageId);
    waitingForInput.delete(userId);
}

export async function handleTradesCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (callbackData.startsWith("trades_res_")) {
        const resolution = callbackData.replace("trades_res_", "") as "1h" | "1d" | "1w" | "1m" | "1y";
        if (allowedResolutions.includes(resolution)) {
            defaultConfig.resolution = resolution;
            await updateMessage(ctx);
            return;
        }
    }

    switch (callbackData) {
        case "trades_set_token":
            await handleSetInput(ctx, 'token', "Please enter a token address:");
            break;
        case "trades_clear_token":
            defaultConfig.tokenAddress = "";
            await updateMessage(ctx);
            break;
        case "trades_set_platform":
            await handleSetInput(ctx, 'platform', "Please enter a platform address:");
            break;
        case "trades_clear_platform":
            defaultConfig.byPlatform = null;
            await updateMessage(ctx);
            break;
        case "trades_set_market":
            await handleSetInput(ctx, 'market', "Please enter a market ID:");
            break;
        case "trades_clear_market":
            defaultConfig.marketId = null;
            await updateMessage(ctx);
            break;
        case "trades_set_authority":
            await handleSetInput(ctx, 'authority', "Please enter an authority address:");
            break;
        case "trades_clear_authority":
            defaultConfig.authority = null;
            await updateMessage(ctx);
            break;
        case "trades_set_feepayer":
            await handleSetInput(ctx, 'feepayer', "Please enter a fee payer address:");
            break;
        case "trades_clear_feepayer":
            defaultConfig.feePayer = null;
            await updateMessage(ctx);
            break;
        case "trades_search":
            if (!defaultConfig.tokenAddress) {
                await ctx.reply("Please set a token address first!");
                return;
            }

            try {
                const data = await getTokenTrades(
                    defaultConfig.tokenAddress,
                    defaultConfig.byPlatform,
                    defaultConfig.marketId,
                    defaultConfig.authority,
                    defaultConfig.resolution,
                    defaultConfig.feePayer
                );
                
                await ctx.reply(buildTradesList(data), {
                    parse_mode: "HTML",
                    link_preview_options: { is_disabled: true }
                });
            } catch (error) {
                console.error('Failed to fetch trades:', error);
                await ctx.reply("Failed to fetch trades. Please check your inputs and try again.");
            }
            break;
    }
}

async function handleSetInput(ctx: Context, type: 'token' | 'platform' | 'market' | 'authority' | 'feepayer', prompt: string) {
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
    const message = `__Token Trades__\n\nToken Address: ${defaultConfig.tokenAddress || "Not set"}\nPlatform: ${defaultConfig.byPlatform || "Not set"}\nMarket ID: ${defaultConfig.marketId || "Not set"}\nAuthority: ${defaultConfig.authority || "Not set"}\nResolution: ${defaultConfig.resolution}\nFee Payer: ${defaultConfig.feePayer || "Not set"}`;
    
    const keyboard = {
        inline_keyboard: [
            [
                {text: "Set Token Address", callback_data: "trades_set_token"},
                {text: "Clear Token", callback_data: "trades_clear_token"}
            ],
            [
                {text: "Set Platform", callback_data: "trades_set_platform"},
                {text: "Clear Platform", callback_data: "trades_clear_platform"}
            ],
            [
                {text: "Set Market ID", callback_data: "trades_set_market"},
                {text: "Clear Market ID", callback_data: "trades_clear_market"}
            ],
            [
                {text: "Set Authority", callback_data: "trades_set_authority"},
                {text: "Clear Authority", callback_data: "trades_clear_authority"}
            ],
            [
                {text: "Set Fee Payer", callback_data: "trades_set_feepayer"},
                {text: "Clear Fee Payer", callback_data: "trades_clear_feepayer"}
            ],
            [
                {text: `${defaultConfig.resolution === "1h" ? "✅" : ""} 1h`, callback_data: "trades_res_1h"},
                {text: `${defaultConfig.resolution === "1d" ? "✅" : ""} 1d`, callback_data: "trades_res_1d"},
                {text: `${defaultConfig.resolution === "1w" ? "✅" : ""} 1w`, callback_data: "trades_res_1w"}
            ],
            [
                {text: `${defaultConfig.resolution === "1m" ? "✅" : ""} 1m`, callback_data: "trades_res_1m"},
                {text: `${defaultConfig.resolution === "1y" ? "✅" : ""} 1y`, callback_data: "trades_res_1y"}
            ],
            [
                {text: "🔍 Search", callback_data: "trades_search"},
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

function buildTradesList(data: TokenTrades) {
    let message = `<u>Token Trades</u>\n\n`;
    message += `Token: <code>${defaultConfig.tokenAddress}</code>\n`;
    message += `Resolution: ${defaultConfig.resolution}\n\n`;

    if (!data.data || data.data.length === 0) {
        return message + "No trades found for the specified parameters.";
    }

    message += `<b>Recent Trades:</b>\n\n`;

    for (const trade of data.data) {
        console.log("TRADE");
        console.log(trade);
        const date = new Date(trade.blockTime * 1000).toLocaleString();
        message += `💱 <b>Trade</b> at ${date}\n`;
        message += `• Price: <code>${1 / Number(trade.price)}</code> SOL\n`;
        message += `• Amount: <code>${trade.quoteSize}</code>\n`;
        message += `• Total: <code>${Number(trade.quoteSize) * (1 / Number(trade.price))}</code> SOL\n`;
        if (trade.signature) {
            message += `• <a href="https://solscan.io/tx/${trade.signature}">View on Solscan</a>\n`;
        }
        message += `\n`;
    }

    return message;
} 