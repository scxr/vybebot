### Tools used

- TypeScript has been the language of choice.
- Bun is used for the runtime + some builtin libraries like fetch()
    - Easy to install just visit here https://bun.sh/
- Tested on WSL & Windows & MacOS, runs fine on all, primarily developed and built on WSL, hosted on Linux with PM2.

### Libraries used

I have kept the dependencies very short, there is only 3 and one of them is just in case builders want to use npm that being dotenv as it is included by default with bun anyways. 

Telegraf was the library of choice for the actual bot, it is the most common one and the library I have the most knowledge of by far. Version: ^4.16.3

Canvas was used for a single command that being chart, the version used must be canvas@next for bun purposes. 

### How to setup

First download bun from https://bun.sh/ and add to your PATH 
Run the following commands:
```
git clone git@github.com:scxr/vybebot.git
cd vybebot
bun install
```
Edit .env.example to fill in your details, you can get a bot token from https://t.me/BotFather and your Vybe API key is well, your vybe api key (vybenetwork.com)
Rename .env.example to .env
Now you can start the bot with `bun run index.ts`
Go back to bot father, now youre going to want to edit the bots commands to do this go do the following: `/mybots` -> whatever you named your bot -> `Edit Bot` -> `Edit Commands`

Paste this:

```
hello - Just a hello message :)
nft - Get nft balances of a wallet
pnl - Get the pnl of a wallet
token_balances - Get the token balances of a wallet
nft_holders - Get the holders of an NFT
chart - Generate a chart for a token
program_details - Get a general overview of a program
program_tvl - Get the total value locked on a program
program_rankings - Get top 10 programs on solana
program_dau - Get the top 10 daily active users for a program
program_type - Get the category/subcategory and daily active users of a program
program_ts - Time based info for a program
trades - Get the trades for a token with a bunch of filters
transfers - Get the most recent transfers on a token
timeseries - Get a bunch of time based info for a token
ix_names - Find programs that implement a specific instruction
details - Get token details!
holders - Get the top holders of a token
```
You can also edit the picture/name/about etc. its all relatively intuitive.


## Commands to do

### Balances

- [x] NFT Balance for single wallet 
- [x] NFT Balance for multiple wallets
- [ ] Search known accounts
- [x] A wallets PNL
- [x] Token balances by time period
- [x] Token balances now
- [x] Token balances by time period (multi wallet)
- [x] Token balances now (multi wallet)
- [x] NFT Collection owners

### Prices

Convert the following endpoints into charting commands

- [ ] Pair-OHLCV
- [ ] Market-OHLCV
- [x] Token-OHLCV


### Programs

- [x] Known Program Accounts
    - [x] Backend function
- [x] Ranking
    - [x] Backend function
- [x] Programs Details
    - [x] Backend function
- [x] Program Active Users
    - [x] Backend function
- [x] Active Users: Time Series
    - [x] Backend function
- [x] Instruction Count: Time Series
    - [x] Backend function
- [x] Transaction Count: Time Series
    - [x] Backend function
- [x] Program TVL
    - [x] Backend function
- [x] Programs List
    - [x] Backend function

### Tokens

- [x] Instruction Names
    - [x] Backend function
- [x] Token Trades
    - [x] Backend function
- [x] Token Transfers
    - [x] Backend function
- [x] Token Details
    - [x] Backend function
- [x] Token Holders Time Series
    - [x] Backend function
- [x] Top Token Holders
    - [x] Backend function
- [x] Token Volume Time Series
    - [x] Backend function
