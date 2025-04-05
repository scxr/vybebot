import { Context } from "telegraf";
import { getTimeseries } from "../functions/programFuncs/timeseries";
import { Timeseries } from "../types/ApiResponses";

interface TimeseriesConfig {
    programId: string;
    metric: string;
    resolution: string;
}

const defaultConfig: TimeseriesConfig = {
    programId: "",
    metric: "tvl",
    resolution: "1d"
};

const allowedMetrics = ["tvl", "volume", "users"];
const allowedResolutions = ["1d", "7d", "30d", "90d", "180d", "365d"];
const waitingForInput = new Map<number, { type: 'program_id', messageId: number, originalMessageId: number }>();

export async function getTimeseriesCommand(ctx: Context, step: string | null) {
    if (step === null) {
        await ctx.reply(`__Program Timeseries__\n\nProgram ID: ${defaultConfig.programId || "Not set"}\nMetric: ${defaultConfig.metric}\nResolution: ${defaultConfig.resolution}`, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {text: "Set Program ID", callback_data: "ts_set_id"},
                        {text: "Clear Program ID", callback_data: "ts_clear_id"}
                    ],
                    [
                        {text: `${defaultConfig.metric === "tvl" ? "✅" : ""} TVL`, callback_data: "ts_metric_tvl"},
                        {text: `${defaultConfig.metric === "volume" ? "✅" : ""} Volume`, callback_data: "ts_metric_volume"},
                        {text: `${defaultConfig.metric === "users" ? "✅" : ""} Users`, callback_data: "ts_metric_users"}
                    ],
                    [
                        {text: "1d", callback_data: "ts_res_1d"},
                        {text: "7d", callback_data: "ts_res_7d"},
                        {text: "30d", callback_data: "ts_res_30d"}
                    ],
                    [
                        {text: "90d", callback_data: "ts_res_90d"},
                        {text: "180d", callback_data: "ts_res_180d"},
                        {text: "365d", callback_data: "ts_res_365d"}
                    ],
                    [
                        {text: "🔍 Search", callback_data: "ts_search"},
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

    if (waiting.type === 'program_id') {
        defaultConfig.programId = text;
    }

    try {
        if (ctx.chat?.id) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                waiting.originalMessageId,
                undefined,
                `__Program Timeseries__\n\nProgram ID: ${defaultConfig.programId || "Not set"}\nMetric: ${defaultConfig.metric}\nResolution: ${defaultConfig.resolution}`,
                {
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {text: "Set Program ID", callback_data: "ts_set_id"},
                                {text: "Clear Program ID", callback_data: "ts_clear_id"}
                            ],
                            [
                                {text: `${defaultConfig.metric === "tvl" ? "✅" : ""} TVL`, callback_data: "ts_metric_tvl"},
                                {text: `${defaultConfig.metric === "volume" ? "✅" : ""} Volume`, callback_data: "ts_metric_volume"},
                                {text: `${defaultConfig.metric === "users" ? "✅" : ""} Users`, callback_data: "ts_metric_users"}
                            ],
                            [
                                {text: "1d", callback_data: "ts_res_1d"},
                                {text: "7d", callback_data: "ts_res_7d"},
                                {text: "30d", callback_data: "ts_res_30d"}
                            ],
                            [
                                {text: "90d", callback_data: "ts_res_90d"},
                                {text: "180d", callback_data: "ts_res_180d"},
                                {text: "365d", callback_data: "ts_res_365d"}
                            ],
                            [
                                {text: "🔍 Search", callback_data: "ts_search"},
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

export async function handleTimeseriesCallback(ctx: Context, callbackData: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (callbackData.startsWith("ts_metric_")) {
        const metric = callbackData.replace("ts_metric_", "");
        if (allowedMetrics.includes(metric)) {
            defaultConfig.metric = metric;
            await updateTimeseriesMessage(ctx);
            return;
        }
    }

    if (callbackData.startsWith("ts_res_")) {
        const resolution = callbackData.replace("ts_res_", "");
        if (allowedResolutions.includes(resolution)) {
            defaultConfig.resolution = resolution;
            await updateTimeseriesMessage(ctx);
            return;
        }
    }

    switch (callbackData) {
        case "ts_set_id":
            const idMsg = await ctx.reply("Please enter a program ID:", {
                reply_markup: {
                    force_reply: true
                }
            });
            if (ctx.callbackQuery?.message) {
                waitingForInput.set(userId, { 
                    type: 'program_id', 
                    messageId: idMsg.message_id,
                    originalMessageId: ctx.callbackQuery.message.message_id
                });
            }
            break;
            
        case "ts_clear_id":
            defaultConfig.programId = "";
            await updateTimeseriesMessage(ctx);
            break;
            
        case "ts_search":
            if (!defaultConfig.programId) {
                await ctx.reply("Please set a program ID first!");
                return;
            }

            try {
                const data = await getTimeseries(defaultConfig.programId, defaultConfig.metric, defaultConfig.resolution);
                await ctx.reply(buildTimeseriesDetails(data), {
                    parse_mode: "HTML",
                });
            } catch (error) {
                await ctx.reply("Failed to fetch timeseries data. Please check the program ID and try again.");
            }
            break;
    }
}

async function updateTimeseriesMessage(ctx: Context) {
    if (ctx.callbackQuery?.message) {
        await ctx.editMessageText(
            `__Program Timeseries__\n\nProgram ID: ${defaultConfig.programId || "Not set"}\nMetric: ${defaultConfig.metric}\nResolution: ${defaultConfig.resolution}`,
            {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {text: "Set Program ID", callback_data: "ts_set_id"},
                            {text: "Clear Program ID", callback_data: "ts_clear_id"}
                        ],
                        [
                            {text: `${defaultConfig.metric === "tvl" ? "✅" : ""} TVL`, callback_data: "ts_metric_tvl"},
                            {text: `${defaultConfig.metric === "volume" ? "✅" : ""} Volume`, callback_data: "ts_metric_volume"},
                            {text: `${defaultConfig.metric === "users" ? "✅" : ""} Users`, callback_data: "ts_metric_users"}
                        ],
                        [
                            {text: "1d", callback_data: "ts_res_1d"},
                            {text: "7d", callback_data: "ts_res_7d"},
                            {text: "30d", callback_data: "ts_res_30d"}
                        ],
                        [
                            {text: "90d", callback_data: "ts_res_90d"},
                            {text: "180d", callback_data: "ts_res_180d"},
                            {text: "365d", callback_data: "ts_res_365d"}
                        ],
                        [
                            {text: "🔍 Search", callback_data: "ts_search"},
                        ]
                    ]
                }
            }
        );
    }
}

function buildTimeseriesDetails(data: Timeseries) {
    let message = `<u>Program Timeseries</u>\n\n`;
    message += `<b>Program ID:</b> <code>${data.programId}</code>\n`;
    message += `<b>Metric:</b> ${defaultConfig.metric}\n`;
    message += `<b>Resolution:</b> ${defaultConfig.resolution}\n\n`;
    
    if (data.data && data.data.length > 0) {
        message += `<b>History:</b>\n`;
        data.data.forEach(point => {
            const date = new Date(point.timestamp).toLocaleDateString();
            const value = point[defaultConfig.metric];
            const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
            message += `${date}: <code>${formattedValue}</code>${defaultConfig.metric === 'users' ? '' : ' SOL'}\n`;
        });
    } else {
        message += "No data available for this period.";
    }
    
    return message;
} 