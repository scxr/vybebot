import { Context } from "telegraf";
import { getTokenTimeseries } from "../functions/tokenFuncs/timeseries";
import { TokenTimeseries, TokenTimeseriesDataVolume, TokenTimeseriesDataHolders } from "../types/ApiResponses";

interface TokenTimeseriesConfig {
    tokenAddress: string;
    type: 'transfer-volume' | 'holders-ts';
    startTime: number | null;
    endTime: number | null;
    interval: "day" | "hour" | null;
}

const defaultConfig: TokenTimeseriesConfig = {
    tokenAddress: "",
    type: 'transfer-volume',
    startTime: null,
    endTime: null,
    interval: "day"
};

const allowedTypes = ['transfer-volume', 'holders-ts'];
const allowedIntervals = ["hour", "day"];
const waitingForInput = new Map<number, { 
    type: 'token' | 'start_time' | 'end_time', 
    messageId: number, 
    originalMessageId: number 
}>();

export async function getTokenTimeseriesCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Token Timeseries__\n\nToken Address: ${defaultConfig.tokenAddress || "Not set"}\nType: ${defaultConfig.type}\nStart Time: ${defaultConfig.startTime ? new Date(defaultConfig.startTime * 1000).toLocaleString() : "Not set"}\nEnd Time: ${defaultConfig.endTime ? new Date(defaultConfig.endTime * 1000).toLocaleString() : "Not set"}\nInterval: ${defaultConfig.interval}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Set Token Address", callback_data: "timeseries_set_token"},
                        {text: "Clear Token", callback_data: "timeseries_clear_token"}
                    ],
                    [
                        {text: `${defaultConfig.type === "transfer-volume" ? "✅" : ""} Transfer Volume`, callback_data: "timeseries_type_transfer"},
                        {text: `${defaultConfig.type === "holders-ts" ? "✅" : ""} Holders`, callback_data: "timeseries_type_holders"}
                    ],
                    [
                        {text: "Set Start Time", callback_data: "timeseries_set_start"},
                        {text: "Clear Start Time", callback_data: "timeseries_clear_start"}
                    ],
                    [
                        {text: "Set End Time", callback_data: "timeseries_set_end"},
                        {text: "Clear End Time", callback_data: "timeseries_clear_end"}
                    ],
                    [
                        {text: `${defaultConfig.interval === "hour" ? "✅" : ""} Hourly`, callback_data: "timeseries_interval_hour"},
                        {text: `${defaultConfig.interval === "day" ? "✅" : ""} Daily`, callback_data: "timeseries_interval_day"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "timeseries_search"},
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
        case 'start_time':
            try {
                const timestamp = Math.floor(new Date(text).getTime() / 1000);
                if (isNaN(timestamp)) {
                    await ctx.reply("Invalid date format. Please use a format like 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS'");
                    return;
                }
                defaultConfig.startTime = timestamp;
            } catch (error) {
                await ctx.reply("Invalid date format. Please use a format like 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS'");
                return;
            }
            break;
        case 'end_time':
            try {
                const timestamp = Math.floor(new Date(text).getTime() / 1000);
                if (isNaN(timestamp)) {
                    await ctx.reply("Invalid date format. Please use a format like 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS'");
                    return;
                }
                defaultConfig.endTime = timestamp;
            } catch (error) {
                await ctx.reply("Invalid date format. Please use a format like 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS'");
                return;
            }
            break;
    }

    await updateMessage(ctx, waiting.originalMessageId);
    waitingForInput.delete(userId);
}

export async function handleTimeseriesCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (callbackData.startsWith("timeseries_type_")) {
        const type = callbackData.replace("timeseries_type_", "") === "transfer" ? "transfer-volume" : "holders-ts";
        if (allowedTypes.includes(type)) {
            defaultConfig.type = type;
            await updateMessage(ctx);
            return;
        }
    }

    if (callbackData.startsWith("timeseries_interval_")) {
        const interval = callbackData.replace("timeseries_interval_", "") as "hour" | "day";
        if (allowedIntervals.includes(interval)) {
            defaultConfig.interval = interval;
            await updateMessage(ctx);
            return;
        }
    }

    switch (callbackData) {
        case "timeseries_set_token":
            await handleSetInput(ctx, 'token', "Please enter a token address:");
            break;
        case "timeseries_clear_token":
            defaultConfig.tokenAddress = "";
            await updateMessage(ctx);
            break;
        case "timeseries_set_start":
            await handleSetInput(ctx, 'start_time', "Please enter a start time (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS):");
            break;
        case "timeseries_clear_start":
            defaultConfig.startTime = null;
            await updateMessage(ctx);
            break;
        case "timeseries_set_end":
            await handleSetInput(ctx, 'end_time', "Please enter an end time (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS):");
            break;
        case "timeseries_clear_end":
            defaultConfig.endTime = null;
            await updateMessage(ctx);
            break;
        case "timeseries_search":
            if (!defaultConfig.tokenAddress) {
                await ctx.reply("Please set a token address first!");
                return;
            }

            try {
                const data = await getTokenTimeseries(
                    defaultConfig.tokenAddress,
                    defaultConfig.type,
                    defaultConfig.startTime,
                    defaultConfig.endTime,
                    defaultConfig.interval
                );
                
                await ctx.reply(buildTimeseriesList(data), {
                    parse_mode: "HTML",
                    link_preview_options: { is_disabled: true }
                });
            } catch (error) {
                console.error('Failed to fetch timeseries:', error);
                await ctx.reply("Failed to fetch timeseries data. Please check your inputs and try again.");
            }
            break;
    }
}

async function handleSetInput(ctx: Context, type: 'token' | 'start_time' | 'end_time', prompt: string) {
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
    const message = `__Token Timeseries__\n\nToken Address: ${defaultConfig.tokenAddress || "Not set"}\nType: ${defaultConfig.type}\nStart Time: ${defaultConfig.startTime ? new Date(defaultConfig.startTime * 1000).toLocaleString() : "Not set"}\nEnd Time: ${defaultConfig.endTime ? new Date(defaultConfig.endTime * 1000).toLocaleString() : "Not set"}\nInterval: ${defaultConfig.interval}`;
    
    const keyboard = {
        inline_keyboard: [
            [
                {text: "Set Token Address", callback_data: "timeseries_set_token"},
                {text: "Clear Token", callback_data: "timeseries_clear_token"}
            ],
            [
                {text: `${defaultConfig.type === "transfer-volume" ? "✅" : ""} Transfer Volume`, callback_data: "timeseries_type_transfer"},
                {text: `${defaultConfig.type === "holders-ts" ? "✅" : ""} Holders`, callback_data: "timeseries_type_holders"}
            ],
            [
                {text: "Set Start Time", callback_data: "timeseries_set_start"},
                {text: "Clear Start Time", callback_data: "timeseries_clear_start"}
            ],
            [
                {text: "Set End Time", callback_data: "timeseries_set_end"},
                {text: "Clear End Time", callback_data: "timeseries_clear_end"}
            ],
            [
                {text: `${defaultConfig.interval === "hour" ? "✅" : ""} Hourly`, callback_data: "timeseries_interval_hour"},
                {text: `${defaultConfig.interval === "day" ? "✅" : ""} Daily`, callback_data: "timeseries_interval_day"}
            ],
            [
                {text: "🔍 Search", callback_data: "timeseries_search"},
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

function buildTimeseriesList(data: TokenTimeseries) {
    let message = `<u>Token Timeseries</u>\n\n`;
    message += `Token: <code>${defaultConfig.tokenAddress}</code>\n`;
    message += `Type: ${defaultConfig.type}\n`;
    message += `Interval: ${defaultConfig.interval}\n\n`;

    if (!data.data || data.data.length === 0) {
        return message + "No timeseries data found for the specified parameters.";
    }

    message += `<b>Data Points:</b>\n\n`;
    
    const startPoint = data.data[0];
    const endPoint = data.data[data.data.length - 1];
    
    let startValue = 0;
    let endValue = 0;
    let startTime = '';
    let endTime = '';
    
    if (defaultConfig.type === "transfer-volume") {
        startValue = (startPoint as TokenTimeseriesDataVolume).volume;
        endValue = (endPoint as TokenTimeseriesDataVolume).volume;
        startTime = new Date((startPoint as TokenTimeseriesDataVolume).timeBucketStart * 1000).toLocaleString();
        endTime = new Date((endPoint as TokenTimeseriesDataVolume).timeBucketStart * 1000).toLocaleString();
        message += `Start (${startTime}): <code>${startValue.toLocaleString()}</code> volume\n`;
        message += `End (${endTime}): <code>${endValue.toLocaleString()}</code> volume\n\n`;
    } else {
        startValue = (startPoint as TokenTimeseriesDataHolders).nHolders;
        endValue = (endPoint as TokenTimeseriesDataHolders).nHolders;
        startTime = new Date((startPoint as TokenTimeseriesDataHolders).timestamp * 1000).toLocaleString();
        endTime = new Date((endPoint as TokenTimeseriesDataHolders).timestamp * 1000).toLocaleString();
        message += `Start (${startTime}): <code>${startValue.toLocaleString()}</code> holders\n`;
        message += `End (${endTime}): <code>${endValue.toLocaleString()}</code> holders\n\n`;
    }
    
    const difference = endValue - startValue;
    const percentageChangeNum = ((difference / startValue) * 100);
    const percentageChange = percentageChangeNum.toFixed(2);
    const changeType = defaultConfig.type === "transfer-volume" ? "volume" : "holders";
    
    message += `<b>Change Summary:</b>\n`;
    message += `• Absolute change in ${changeType}: <code>${difference >= 0 ? '+' : ''}${difference.toLocaleString()}</code>\n`;
    message += `• Percentage change: <code>${percentageChangeNum >= 0 ? '+' : ''}${percentageChange}%</code>`;

    return message;
} 