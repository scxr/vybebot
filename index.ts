import { Telegraf, Context } from "telegraf";
import { getNftBalances, handleNftCallback, handleTextMessage as handleNftTextMessage } from "./commands/nft_balances";
import { getPnl, handlePnlCallback, handleTextMessage as handlePnlTextMessage } from "./commands/pnl";
import { getTokenBalances, handleTokenBalancesCallback, handleTextMessage as handleTokenBalancesTextMessage } from "./commands/token_balances";
import { getNftHolders, handleNftHoldersCallback, handleTextMessage as handleNftHoldersTextMessage } from "./commands/nft_holders";
import { handleChartCommand, handleChartCallback, handleTextMessage as handleChartTextMessage } from "./commands/chart";
import { getProgramDetailsCommand, handleProgramCallback, handleTextMessage as handleProgramTextMessage } from "./commands/program_details";
import { getProgramTvlCommand, handleTvlCallback, handleTextMessage as handleTvlTextMessage } from "./commands/program_tvl";
import { getProgramRankingsCommand, handleRankingsCallback, handleTextMessage as handleRankingsTextMessage } from "./commands/program_rankings";
import { getProgramActiveUsersCommand, handleActiveUsersCallback, handleTextMessage as handleActiveUsersTextMessage } from "./commands/program_active_users";
import { getProgramListCommand, handleProgramListCallback, handleTextMessage as handleProgramListTextMessage } from "./commands/program_list";
import { getTimeseriesCommand, handleTimeseriesCallback, handleTextMessage as handleTimeseriesTextMessage } from "./commands/program_timeseries";
import { getKnownAccountsCommand, handleKnownAccountsCallback, handleTextMessage as handleKnownAccountsTextMessage } from "./commands/known_accounts";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN || "");

bot.command("hello", (ctx: Context) => {
    ctx.reply("Hello! Welcome to Vybe Bot!");
});

bot.command("nft", (ctx: Context) => {
    getNftBalances(ctx, null);
});

bot.command("pnl", (ctx: Context) => {
    getPnl(ctx, null);
});

bot.command("token_balances", (ctx: Context) => {
    getTokenBalances(ctx, null);
});

bot.command("nft_holders", (ctx: Context) => {
    getNftHolders(ctx, null);
});

bot.command("chart", (ctx: Context) => {
    handleChartCommand(ctx, ctx.message.text.split(" "));
});

bot.command("program_details", (ctx: Context) => {
    getProgramDetailsCommand(ctx, null);
});

bot.command("program_tvl", (ctx: Context) => {
    getProgramTvlCommand(ctx, null);
});

bot.command("program_rankings", (ctx: Context) => {
    getProgramRankingsCommand(ctx, null);
});

bot.command("program_active_users", (ctx: Context) => {
    getProgramActiveUsersCommand(ctx, null);
});

bot.command("program_list", (ctx: Context) => {
    getProgramListCommand(ctx, null);
});

bot.command("program_timeseries", (ctx: Context) => {
    getTimeseriesCommand(ctx, null);
});

bot.command("known_accounts", (ctx: Context) => {
    getKnownAccountsCommand(ctx, null);
});

bot.on("text", async (ctx: Context) => {
    await handleNftTextMessage(ctx);
    await handlePnlTextMessage(ctx);
    await handleTokenBalancesTextMessage(ctx);
    await handleNftHoldersTextMessage(ctx);
    await handleChartTextMessage(ctx);
    await handleProgramTextMessage(ctx);
    await handleTvlTextMessage(ctx);
    await handleRankingsTextMessage(ctx);
    await handleActiveUsersTextMessage(ctx);
    await handleProgramListTextMessage(ctx);
    await handleTimeseriesTextMessage(ctx);
    await handleKnownAccountsTextMessage(ctx);
});

bot.on("callback_query", async (ctx: Context) => {
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
            } else if (callbackData.startsWith("program_")) {
                await handleProgramCallback(ctx, callbackData);
            } else if (callbackData.startsWith("tvl_")) {
                await handleTvlCallback(ctx, callbackData);
            } else if (callbackData.startsWith("rank_")) {
                await handleRankingsCallback(ctx, callbackData);
            } else if (callbackData.startsWith("users_")) {
                await handleActiveUsersCallback(ctx, callbackData);
            } else if (callbackData.startsWith("list_")) {
                await handleProgramListCallback(ctx, callbackData);
            } else if (callbackData.startsWith("ts_")) {
                await handleTimeseriesCallback(ctx, callbackData);
            } else if (callbackData.startsWith("known_")) {
                await handleKnownAccountsCallback(ctx, callbackData);
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