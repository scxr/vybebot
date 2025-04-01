import { Telegraf } from "telegraf";
import { getNftBalances, handleNftCallback, handleTextMessage as handleNftTextMessage } from "./commands/nft_balances";
import { getPnl, handlePnlCallback, handleTextMessage as handlePnlTextMessage } from "./commands/pnl";
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

bot.on("text", async (ctx) => {
    await handleNftTextMessage(ctx);
    await handlePnlTextMessage(ctx);
});

bot.on("callback_query", async (ctx) => {
    if ('data' in ctx.callbackQuery) {
        const callbackData = ctx.callbackQuery.data;
        if (callbackData.startsWith("nft_")) {
            await handleNftCallback(ctx, callbackData);
        } else if (callbackData.startsWith("pnl_")) {
            await handlePnlCallback(ctx, callbackData);
        }
        await ctx.answerCbQuery();
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));