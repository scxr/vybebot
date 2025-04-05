import { Context } from "telegraf";
import { getTimeseries } from "../functions/programFuncs/timeseries";
import { ProgramTimeseries } from "../types/ApiResponses";

interface TimeseriesConfig {
    programId: string;
    metric: string;
    resolution: string;
}

const defaultConfig: TimeseriesConfig = {
    programId: "",
    metric: "ic",
    resolution: "1d"
};

const allowedMetrics = ["ic", "tc", "au"];
const allowedResolutions = ["1d", "3d", "7d", "14d", "21d", "30d"];
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
                        {text: `${defaultConfig.metric === "ic" ? "✅" : ""} IC`, callback_data: "ts_metric_ic"},
                        {text: `${defaultConfig.metric === "tc" ? "✅" : ""} TC`, callback_data: "ts_metric_tc"},
                        {text: `${defaultConfig.metric === "au" ? "✅" : ""} AU`, callback_data: "ts_metric_au"}
                    ],
                    [
                        {text: "1d", callback_data: "ts_res_1d"},
                        {text: "3d", callback_data: "ts_res_3d"},
                        {text: "7d", callback_data: "ts_res_7d"}
                    ],
                    [
                        {text: "14d", callback_data: "ts_res_14d"},
                        {text: "21d", callback_data: "ts_res_21d"},
                        {text: "30d", callback_data: "ts_res_30d"}
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
                                {text: `${defaultConfig.metric === "ic" ? "✅" : ""} IC`, callback_data: "ts_metric_ic"},
                                {text: `${defaultConfig.metric === "tc" ? "✅" : ""} TC`, callback_data: "ts_metric_tc"},
                                {text: `${defaultConfig.metric === "au" ? "✅" : ""} AU`, callback_data: "ts_metric_au"}
                            ],
                            [
                                {text: "1d", callback_data: "ts_res_1d"},
                                {text: "3d", callback_data: "ts_res_3d"},
                                {text: "7d", callback_data: "ts_res_7d"}
                            ],
                            [
                                {text: "14d", callback_data: "ts_res_14d"},
                                {text: "21d", callback_data: "ts_res_21d"},
                                {text: "30d", callback_data: "ts_res_30d"}
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
                const data = await getTimeseries(defaultConfig.programId, defaultConfig.resolution, defaultConfig.metric);
                await ctx.reply(buildTimeseriesDetails(data as ProgramTimeseries), {
                    parse_mode: "HTML",
                });
            } catch (error) {
                console.error('Failed to fetch timeseries data:', error);
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
                            {text: `${defaultConfig.metric === "ic" ? "✅" : ""} IC`, callback_data: "ts_metric_ic"},
                            {text: `${defaultConfig.metric === "tc" ? "✅" : ""} TC`, callback_data: "ts_metric_tc"},
                            {text: `${defaultConfig.metric === "au" ? "✅" : ""} AU`, callback_data: "ts_metric_au"}
                        ],
                        [
                            {text: "1d", callback_data: "ts_res_1d"},
                            {text: "3d", callback_data: "ts_res_3d"},
                            {text: "7d", callback_data: "ts_res_7d"}
                        ],
                        [
                            {text: "14d", callback_data: "ts_res_14d"},
                            {text: "21d", callback_data: "ts_res_21d"},
                            {text: "30d", callback_data: "ts_res_30d"}
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

function buildTimeseriesDetails(data: ProgramTimeseries) {
    let message = `<u>Program Timeseries</u>\n\n`;
    message += `<b>Program ID:</b> <code>${defaultConfig.programId}</code>\n`;
    message += `<b>Metric:</b> ${defaultConfig.metric}\n`;
    message += `<b>Resolution:</b> ${defaultConfig.resolution}\n\n`;
    
    if (data.data && data.data.length > 0) {
        message += `<b>History:</b>\n`;
        let initData = data.data[0]
        let initDate = new Date(initData.blockTime * 1000).toLocaleDateString();
        let metricName = defaultConfig.metric === "ic" ? "instructionsCount" : defaultConfig.metric === "tc" ? "transactionsCount" : "dau";
        let initValue = initData[metricName];
        let midPointData = data.data[Math.floor(data.data.length / 2)]
        let midPointDate = new Date(midPointData.blockTime * 1000).toLocaleDateString();
        let midPointValue = midPointData[metricName];
        let finalData = data.data[data.data.length - 1]
        let finalDate = new Date(finalData.blockTime * 1000).toLocaleDateString();
        let finalValue = finalData[metricName]; 
        let unitName = defaultConfig.metric === "au" ? "Users" : defaultConfig.metric === "tc" ? "Transactions" : "Instructions";
        message += `${initDate}: <code>${initValue}</code> ${unitName}\n`;
        message += `${midPointDate}: <code>${midPointValue}</code> ${unitName}\n`;
        message += `${finalDate}: <code>${finalValue}</code> ${unitName}\n`;
        message += `\n<b>Trend:</b> ${finalValue - initValue} ${unitName} (${((finalValue - initValue) / initValue * 100).toFixed(2)}%)\n`;
    } else {
        message += "No data available for this period.";
    }
    
    return message;
} 