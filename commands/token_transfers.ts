import { Context } from "telegraf";
import { getTokenTransfers } from "../functions/tokenFuncs/transfers";
import { TokenTransfers } from "../types/ApiResponses";

interface TokenTransfersConfig {
    tokenAddress: string;
    signature: string | null;
    callingProgram: string | null;
    senderTokenAccount: string | null;
    senderAddress: string | null;
    receiverTokenAccount: string | null;
    receiverAddress: string | null;
}

const defaultConfig: TokenTransfersConfig = {
    tokenAddress: "",
    signature: null,
    callingProgram: null,
    senderTokenAccount: null,
    senderAddress: null,
    receiverTokenAccount: null,
    receiverAddress: null
};

const waitingForInput = new Map<number, { 
    type: 'token' | 'signature' | 'program' | 'sender_token' | 'sender_address' | 'receiver_token' | 'receiver_address', 
    messageId: number, 
    originalMessageId: number 
}>();

export async function getTokenTransfersCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Token Transfers__\n\nToken Address: ${defaultConfig.tokenAddress || "Not set"}\nSignature: ${defaultConfig.signature || "Not set"}\nCalling Program: ${defaultConfig.callingProgram || "Not set"}\nSender Token Account: ${defaultConfig.senderTokenAccount || "Not set"}\nSender Address: ${defaultConfig.senderAddress || "Not set"}\nReceiver Token Account: ${defaultConfig.receiverTokenAccount || "Not set"}\nReceiver Address: ${defaultConfig.receiverAddress || "Not set"}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Set Token Address", callback_data: "transfers_set_token"},
                        {text: "Clear Token", callback_data: "transfers_clear_token"}
                    ],
                    [
                        {text: "Set Signature", callback_data: "transfers_set_signature"},
                        {text: "Clear Signature", callback_data: "transfers_clear_signature"}
                    ],
                    [
                        {text: "Set Program", callback_data: "transfers_set_program"},
                        {text: "Clear Program", callback_data: "transfers_clear_program"}
                    ],
                    [
                        {text: "Set Sender Token", callback_data: "transfers_set_sender_token"},
                        {text: "Clear Sender Token", callback_data: "transfers_clear_sender_token"}
                    ],
                    [
                        {text: "Set Sender Address", callback_data: "transfers_set_sender_address"},
                        {text: "Clear Sender Address", callback_data: "transfers_clear_sender_address"}
                    ],
                    [
                        {text: "Set Receiver Token", callback_data: "transfers_set_receiver_token"},
                        {text: "Clear Receiver Token", callback_data: "transfers_clear_receiver_token"}
                    ],
                    [
                        {text: "Set Receiver Address", callback_data: "transfers_set_receiver_address"},
                        {text: "Clear Receiver Address", callback_data: "transfers_clear_receiver_address"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "transfers_search"},
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
        case 'signature':
            defaultConfig.signature = text;
            break;
        case 'program':
            defaultConfig.callingProgram = text;
            break;
        case 'sender_token':
            defaultConfig.senderTokenAccount = text;
            break;
        case 'sender_address':
            defaultConfig.senderAddress = text;
            break;
        case 'receiver_token':
            defaultConfig.receiverTokenAccount = text;
            break;
        case 'receiver_address':
            defaultConfig.receiverAddress = text;
            break;
    }

    await updateMessage(ctx, waiting.originalMessageId);
    waitingForInput.delete(userId);
}

export async function handleTransfersCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    switch (callbackData) {
        case "transfers_set_token":
            await handleSetInput(ctx, 'token', "Please enter a token address:");
            break;
        case "transfers_clear_token":
            defaultConfig.tokenAddress = "";
            await updateMessage(ctx);
            break;
        case "transfers_set_signature":
            await handleSetInput(ctx, 'signature', "Please enter a signature:");
            break;
        case "transfers_clear_signature":
            defaultConfig.signature = null;
            await updateMessage(ctx);
            break;
        case "transfers_set_program":
            await handleSetInput(ctx, 'program', "Please enter a program address:");
            break;
        case "transfers_clear_program":
            defaultConfig.callingProgram = null;
            await updateMessage(ctx);
            break;
        case "transfers_set_sender_token":
            await handleSetInput(ctx, 'sender_token', "Please enter a sender token account:");
            break;
        case "transfers_clear_sender_token":
            defaultConfig.senderTokenAccount = null;
            await updateMessage(ctx);
            break;
        case "transfers_set_sender_address":
            await handleSetInput(ctx, 'sender_address', "Please enter a sender address:");
            break;
        case "transfers_clear_sender_address":
            defaultConfig.senderAddress = null;
            await updateMessage(ctx);
            break;
        case "transfers_set_receiver_token":
            await handleSetInput(ctx, 'receiver_token', "Please enter a receiver token account:");
            break;
        case "transfers_clear_receiver_token":
            defaultConfig.receiverTokenAccount = null;
            await updateMessage(ctx);
            break;
        case "transfers_set_receiver_address":
            await handleSetInput(ctx, 'receiver_address', "Please enter a receiver address:");
            break;
        case "transfers_clear_receiver_address":
            defaultConfig.receiverAddress = null;
            await updateMessage(ctx);
            break;
        case "transfers_search":
            if (!defaultConfig.tokenAddress) {
                await ctx.reply("Please set a token address first!");
                return;
            }

            try {
                const data = await getTokenTransfers(
                    defaultConfig.tokenAddress,
                    defaultConfig.signature,
                    defaultConfig.callingProgram,
                    defaultConfig.senderTokenAccount,
                    defaultConfig.senderAddress,
                    defaultConfig.receiverTokenAccount,
                    defaultConfig.receiverAddress
                );
                
                await ctx.reply(buildTransfersList(data), {
                    parse_mode: "HTML",
                    link_preview_options: { is_disabled: true }
                });
            } catch (error) {
                console.error('Failed to fetch transfers:', error);
                await ctx.reply("Failed to fetch transfers. Please check your inputs and try again.");
            }
            break;
    }
}

async function handleSetInput(ctx: Context, type: 'token' | 'signature' | 'program' | 'sender_token' | 'sender_address' | 'receiver_token' | 'receiver_address', prompt: string) {
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
    const message = `__Token Transfers__\n\nToken Address: ${defaultConfig.tokenAddress || "Not set"}\nSignature: ${defaultConfig.signature || "Not set"}\nCalling Program: ${defaultConfig.callingProgram || "Not set"}\nSender Token Account: ${defaultConfig.senderTokenAccount || "Not set"}\nSender Address: ${defaultConfig.senderAddress || "Not set"}\nReceiver Token Account: ${defaultConfig.receiverTokenAccount || "Not set"}\nReceiver Address: ${defaultConfig.receiverAddress || "Not set"}`;
    
    const keyboard = {
        inline_keyboard: [
            [
                {text: "Set Token Address", callback_data: "transfers_set_token"},
                {text: "Clear Token", callback_data: "transfers_clear_token"}
            ],
            [
                {text: "Set Signature", callback_data: "transfers_set_signature"},
                {text: "Clear Signature", callback_data: "transfers_clear_signature"}
            ],
            [
                {text: "Set Program", callback_data: "transfers_set_program"},
                {text: "Clear Program", callback_data: "transfers_clear_program"}
            ],
            [
                {text: "Set Sender Token", callback_data: "transfers_set_sender_token"},
                {text: "Clear Sender Token", callback_data: "transfers_clear_sender_token"}
            ],
            [
                {text: "Set Sender Address", callback_data: "transfers_set_sender_address"},
                {text: "Clear Sender Address", callback_data: "transfers_clear_sender_address"}
            ],
            [
                {text: "Set Receiver Token", callback_data: "transfers_set_receiver_token"},
                {text: "Clear Receiver Token", callback_data: "transfers_clear_receiver_token"}
            ],
            [
                {text: "Set Receiver Address", callback_data: "transfers_set_receiver_address"},
                {text: "Clear Receiver Address", callback_data: "transfers_clear_receiver_address"}
            ],
            [
                {text: "🔍 Search", callback_data: "transfers_search"},
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

function buildTransfersList(data: TokenTransfers) {
    let message = `<u>Token Transfers</u>\n\n`;
    message += `Token: <code>${defaultConfig.tokenAddress}</code>\n\n`;

    if (!data.transfers || data.transfers.length === 0) {
        return message + "No transfers found for the specified parameters.";
    }

    message += `<b>Recent Transfers:</b>\n\n`;

    for (const transfer of data.transfers) {
        const date = new Date(transfer.blockTime * 1000).toLocaleString();
        message += `🔄 <b>Transfer</b> at ${date}\n`;
        message += `• From: <code>${transfer.senderAddress || "Unknown"}</code>\n`;
        message += `• To: <code>${transfer.receiverAddress || "Unknown"}</code>\n`;
        message += `• Amount: <code>${transfer.amount}</code>\n`;
        if (transfer.signature) {
            message += `• <a href="https://solscan.io/tx/${transfer.signature}">View on Solscan</a>\n`;
        }
        message += `\n`;
    }

    return message;
} 