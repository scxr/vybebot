import { Context } from "telegraf";
import { getInstructionNames } from "../functions/tokenFuncs/ixNames";

interface TokenIxNamesConfig {
    ixName: string | null;
    callingProgram: string | null;
    programName: string | null;
}

const defaultConfig: TokenIxNamesConfig = {
    ixName: null,
    callingProgram: null,
    programName: null
};

const waitingForInput = new Map<number, { 
    type: 'ix_name' | 'calling_program' | 'program_name', 
    messageId: number, 
    originalMessageId: number 
}>();

export async function getTokenIxNamesCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Token Instruction Names__\n\nInstruction Name: ${defaultConfig.ixName || "Not set"}\nCalling Program: ${defaultConfig.callingProgram || "Not set"}\nProgram Name: ${defaultConfig.programName || "Not set"}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Set Instruction Name", callback_data: "token_ix_set_name"},
                        {text: "Clear Name", callback_data: "token_ix_clear_name"}
                    ],
                    [
                        {text: "Set Calling Program", callback_data: "token_ix_set_calling"},
                        {text: "Clear Calling", callback_data: "token_ix_clear_calling"}
                    ],
                    [
                        {text: "Set Program Name", callback_data: "token_ix_set_program"},
                        {text: "Clear Program", callback_data: "token_ix_clear_program"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "token_ix_search"},
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
        case 'ix_name':
            defaultConfig.ixName = text;
            break;
        case 'calling_program':
            defaultConfig.callingProgram = text;
            break;
        case 'program_name':
            defaultConfig.programName = text;
            break;
    }

    await updateMessage(ctx, waiting.originalMessageId);
    waitingForInput.delete(userId);
}

export async function handleIxNamesCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    switch (callbackData) {
        case "token_ix_set_name":
            await handleSetInput(ctx, 'ix_name', "Please enter an instruction name:");
            break;
        case "token_ix_clear_name":
            defaultConfig.ixName = null;
            await updateMessage(ctx);
            break;
        case "token_ix_set_calling":
            await handleSetInput(ctx, 'calling_program', "Please enter a calling program address:");
            break;
        case "token_ix_clear_calling":
            defaultConfig.callingProgram = null;
            await updateMessage(ctx);
            break;
        case "token_ix_set_program":
            await handleSetInput(ctx, 'program_name', "Please enter a program name:");
            break;
        case "token_ix_clear_program":
            defaultConfig.programName = null;
            await updateMessage(ctx);
            break;
        case "token_ix_search":
            if (!defaultConfig.ixName && !defaultConfig.callingProgram && !defaultConfig.programName) {
                await ctx.reply("Please set at least one search parameter (instruction name, calling program, or program name)!");
                return;
            }

            try {
                const data = await getInstructionNames(
                    defaultConfig.ixName,
                    defaultConfig.callingProgram,
                    defaultConfig.programName
                );
                
                await ctx.reply(buildIxNamesList(data), {
                    parse_mode: "HTML",
                    link_preview_options: { is_disabled: true }
                });
            } catch (error) {
                console.error('Failed to fetch instruction names:', error);
                await ctx.reply("Failed to fetch instruction names. Please check your inputs and try again.");
            }
            break;
    }
}

async function handleSetInput(ctx: Context, type: 'ix_name' | 'calling_program' | 'program_name', prompt: string) {
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
    const message = `__Token Instruction Names__\n\nInstruction Name: ${defaultConfig.ixName || "Not set"}\nCalling Program: ${defaultConfig.callingProgram || "Not set"}\nProgram Name: ${defaultConfig.programName || "Not set"}`;
    
    const keyboard = {
        inline_keyboard: [
            [
                {text: "Set Instruction Name", callback_data: "token_ix_set_name"},
                {text: "Clear Name", callback_data: "token_ix_clear_name"}
            ],
            [
                {text: "Set Calling Program", callback_data: "token_ix_set_calling"},
                {text: "Clear Calling", callback_data: "token_ix_clear_calling"}
            ],
            [
                {text: "Set Program Name", callback_data: "token_ix_set_program"},
                {text: "Clear Program", callback_data: "token_ix_clear_program"}
            ],
            [
                {text: "🔍 Search", callback_data: "token_ix_search"},
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

function buildIxNamesList(data: any) {
    let message = `<u>Token Instruction Names</u>\n\n`;
    message += `<b>Search Parameters:</b>\n`;
    if (defaultConfig.ixName) message += `• Instruction Name: <code>${defaultConfig.ixName}</code>\n`;
    if (defaultConfig.callingProgram) message += `• Calling Program: <code>${defaultConfig.callingProgram}</code>\n`;
    if (defaultConfig.programName) message += `• Program Name: <code>${defaultConfig.programName}</code>\n`;
    message += `\n`;

    if (!data || !data.data || data.data.length === 0) {
        return message + "No instruction names found for the specified parameters.";
    }

    message += `<b>Instructions:</b>\n\n`;

    for (const ix of data.data) {
        message += `• <code>${ix.ixName}</code> called on <code>${ix.programName}</code>\n<code>${ix.callingProgram}</code>\n\n`;
    }

    return message;
} 