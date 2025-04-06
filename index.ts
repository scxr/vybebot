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
import { getTokenTradesCommand, handleTradesCallback, handleTextMessage as handleTokenTradesTextMessage } from "./commands/token_trades";
import { getTokenTransfersCommand, handleTransfersCallback, handleTextMessage as handleTokenTransfersTextMessage } from "./commands/token_transfers";
import { getTokenTimeseriesCommand, handleTimeseriesCallback as handleTokenTimeseriesCallback, handleTextMessage as handleTokenTimeseriesTextMessage } from "./commands/token_timeseries";
import { getTokenIxNamesCommand, handleIxNamesCallback, handleTextMessage as handleTokenIxNamesTextMessage } from "./commands/token_ix_names";
import { getTokenDetailsCommand, handleDetailsCallback, handleTextMessage as handleTokenDetailsTextMessage } from "./commands/token_details";
import { getTokenHoldersCommand, handleHoldersCallback, handleTextMessage as handleTokenHoldersTextMessage } from "./commands/token_holders";
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
    if (!ctx.message) return;
    handleChartCommand(ctx, (ctx.message as any).text.split(" "));
});

bot.command("program_details", (ctx: Context) => {
    // tested
    getProgramDetailsCommand(ctx, null);
});

bot.command("program_tvl", (ctx: Context) => {
    // tested
    getProgramTvlCommand(ctx, null);
});

bot.command("program_rankings", (ctx: Context) => {
    // tested
    getProgramRankingsCommand(ctx, null);
});

bot.command("program_dau", (ctx: Context) => {
    // tested
    getProgramActiveUsersCommand(ctx, null);
});

bot.command("program_list", (ctx: Context) => {
    // tested
    getProgramListCommand(ctx, null);
});

bot.command("program_ts", (ctx: Context) => {
    // tested
    getTimeseriesCommand(ctx, null);
});

bot.command("known_accounts", (ctx: Context) => {
    // tested
    getKnownAccountsCommand(ctx, null);
});

bot.command("trades", (ctx: Context) => {
    // tested
    getTokenTradesCommand(ctx, null);
});

bot.command("transfers", (ctx: Context) => {
    // tested
    getTokenTransfersCommand(ctx, null);
});

bot.command("timeseries", (ctx: Context) => {
    getTokenTimeseriesCommand(ctx, null);
});

bot.command("ix_names", (ctx: Context) => {
    // tested
    getTokenIxNamesCommand(ctx, null);
});

bot.command("details", (ctx: Context) => {
    // tested
    getTokenDetailsCommand(ctx, null);
});

bot.command("holders", (ctx: Context) => {
    // tested
    getTokenHoldersCommand(ctx, null);
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
    await handleTokenTradesTextMessage(ctx);
    await handleTokenTransfersTextMessage(ctx);
    await handleTokenTimeseriesTextMessage(ctx);
    await handleTokenIxNamesTextMessage(ctx);
    await handleTokenDetailsTextMessage(ctx);
    await handleTokenHoldersTextMessage(ctx);
});

bot.on("callback_query", async (ctx: Context) => {
    console.log("callback_query");  
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        console.log("callback_query_no_data");
        return;
    }

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
        } else if (callbackData.startsWith("trades_")) {
            await handleTradesCallback(ctx, callbackData);
        } else if (callbackData.startsWith("transfers_")) {
            await handleTransfersCallback(ctx, callbackData);
        } else if (callbackData.startsWith("timeseries_")) {
            await handleTokenTimeseriesCallback(ctx, callbackData);
        } else if (callbackData.startsWith("token_ix_")) {
            await handleIxNamesCallback(ctx, callbackData);
        } else if (callbackData.startsWith("token_details_")) {
            await handleDetailsCallback(ctx, callbackData);
        } else if (callbackData.startsWith("token_holders_")) {
            await handleHoldersCallback(ctx, callbackData);
        }
        await ctx.answerCbQuery();
    } catch (error) {
        console.error('Error handling callback:', error);
        await ctx.answerCbQuery('An error occurred');
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});