const express = require('express');
const cors = require('cors');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const connection = new Connection('https://api.devnet.solana.com');

// Server wallet keypair (you need to fund this with SOL)
const serverKeypair = Keypair.generate();

app.post('/api/create-token', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const userPublicKey = new PublicKey(walletAddress);

    // Create the mint
    const mint = await createMint(
      connection,
      serverKeypair, // Payer (server pays fees)
      userPublicKey, // Mint authority (user controls minting)
      userPublicKey, // Freeze authority
      9 // Decimals
    );

    // Get or create user's token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      serverKeypair, // Payer
      mint,
      userPublicKey // Owner
    );

    // Mint 1,000,000 tokens to user
    const mintTx = await mintTo(
      connection,
      serverKeypair, // Payer
      mint,
      tokenAccount.address,
      userPublicKey, // Mint authority
      1000000 * Math.pow(10, 9) // 1M tokens with 9 decimals
    );

    res.json({
      success: true,
      mint: mint.toString(),
      tokenAccount: tokenAccount.address.toString(),
      transaction: mintTx,
      amount: '1,000,000',
      symbol: 'CSL'
    });

  } catch (error) {
    console.error('Token creation error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Make sure server wallet has SOL for fees'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', wallet: serverKeypair.publicKey.toString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Server wallet: ${serverKeypair.publicKey.toString()}`);
  console.log('Fund this wallet with SOL on devnet to enable token creation');
});