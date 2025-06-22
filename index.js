require('dotenv').config()
const { Telegraf } = require('telegraf')
const { Connection, PublicKey } = require('@solana/web3.js')
const axios = require('axios')

// Setup Telegram bot and Solana connection
const bot = new Telegraf(process.env.BOT_TOKEN)
const connection = new Connection(process.env.SOLANA_RPC)

// Define the /awaken command
bot.command('awaken', async (ctx) => {
  const args = ctx.message.text.split(' ')
  if (args.length !== 2) {
    return ctx.reply('⚠️ Usage: /awaken <TOKEN_MINT_ADDRESS>')
  }

  const mint = args[1]
  let pubkey

  // Validate token address format and existence
  try {
    pubkey = new PublicKey(mint)
    const accountInfo = await connection.getAccountInfo(pubkey)
    if (!accountInfo) throw new Error()
  } catch {
    return ctx.reply('❌ Invalid or non-existent SPL token address.')
  }

  await ctx.reply(`⚡ Awakening token \`${mint.slice(0, 6)}...${mint.slice(-4)}\` on devnet...`, { parse_mode: 'Markdown' })

  // Simulate a swap using Jupiter Aggregator
  try {
    const res = await axios.get('https://quote-api.jup.ag/v6/quote', {
      params: {
        inputMint: 'So11111111111111111111111111111111111111112', // Wrapped SOL
        outputMint: mint,
        amount: 1_000_000,  // 0.001 SOL (in lamports)
        slippage: 1
      }
    })

    const route = res.data.data?.[0]
    if (!route) throw new Error()

    const outAmount = (route.outAmount / 1e9).toFixed(6)
    const priceImpact = (route.priceImpactPct * 100).toFixed(2)

    await ctx.replyWithMarkdown(`
✅ *Simulated Buy Order:*
• Input: \`0.001 SOL\`
• Output: \`${outAmount} tokens\`
📈 Estimated Price Impact: *${priceImpact}%*
    `)
  } catch (err) {
    console.error('[Jupiter API error]', err)
    ctx.reply('⚠️ Failed to simulate swap. Token may lack liquidity on devnet.')
  }
})

// Launch the bot
bot.launch().then(() => console.log('✅ Bot is running on devnet'))

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
