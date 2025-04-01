import { Telegraf, Context } from 'telegraf';
import dotenv from 'dotenv';
import { getNftBalances, handleNftCallback, handleTextMessage } from './commands/nft_balances';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN || '');

bot.command('hello', async (ctx) => {
    await ctx.reply('vybing');
});

bot.command('start', async (ctx) => {
    await ctx.reply('Welcome! Use /hello to get a greeting or /nft to check NFT balances.');
});

bot.command('nft', async (ctx) => {
    await getNftBalances(ctx, null);
});

bot.action(/.*/, async (ctx) => {
    if ('data' in ctx.callbackQuery) {
        await handleNftCallback(ctx, ctx.callbackQuery.data);
        await ctx.answerCbQuery();
    }
});

bot.on('text', async (ctx) => {
    await handleTextMessage(ctx);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));