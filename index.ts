import { Telegraf } from "telegraf";
import { getNftBalances, handleNftCallback, handleTextMessage as handleNftTextMessage } from "./commands/nft_balances";
import { getPnl, handlePnlCallback, handleTextMessage as handlePnlTextMessage } from "./commands/pnl";
import { getTokenBalances, handleTokenBalancesCallback, handleTextMessage as handleTokenBalancesTextMessage } from "./commands/token_balances";
import { getNftHolders, handleNftHoldersCallback, handleTextMessage as handleNftHoldersTextMessage } from "./commands/nft_holders";
import { handleChartCommand, handleChartCallback, handleTextMessage as handleChartTextMessage } from "./commands/chart";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN || "");

bot.command("hello", (ctx) => {
    ctx.reply("Hello! Welcome to Vybe Bot!");
});

bot.command("nft", (ctx) => {
    getNftBalances(ctx, null);
});

bot.command("pnl", (ctx) => {
    getPnl(ctx, null);
});

bot.command("token_balances", (ctx) => {
    getTokenBalances(ctx, null);
});

bot.command("nft_holders", (ctx) => {
    getNftHolders(ctx, null);
});

bot.command("chart", (ctx) => {
    handleChartCommand(ctx, ctx.message.text.split(" "));
});

bot.on("text", async (ctx) => {
    await handleNftTextMessage(ctx);
    await handlePnlTextMessage(ctx);
    await handleTokenBalancesTextMessage(ctx);
    await handleNftHoldersTextMessage(ctx);
    await handleChartTextMessage(ctx);
});

bot.on("callback_query", async (ctx) => {
    console.log("callback_query");  
    if ('data' in ctx.callbackQuery) {
        const callbackData = ctx.callbackQuery.data;
        try {
            console.log("callback_query_data");
            console.log(callbackData);
            if (callbackData.startsWith("nft_") && !callbackData.startsWith("nft_holders_")) {
                await handleNftCallback(ctx, callbackData);
            } else if (callbackData.startsWith("pnl_")) {
                await handlePnlCallback(ctx, callbackData);
            } else if (callbackData.startsWith("token_balances_")) {
                await handleTokenBalancesCallback(ctx, callbackData);
            } else if (callbackData.startsWith("nft_holders_")) {
                console.log("nft_holders_callback");
                await handleNftHoldersCallback(ctx, callbackData);
            } else if (callbackData.startsWith("chart_")) {
                await handleChartCallback(ctx, callbackData);
            }
            await ctx.answerCbQuery();
        } catch (error) {
            console.error('Error handling callback:', error);
            await ctx.answerCbQuery('An error occurred');
        }
    } else {
        console.log("callback_query_no_data");
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));