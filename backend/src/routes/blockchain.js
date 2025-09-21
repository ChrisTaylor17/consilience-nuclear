const express = require('express');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require('@solana/spl-token');
const router = express.Router();

const connection = new Connection('https://api.devnet.solana.com');
const serverKeypair = Keypair.generate();

// Create token endpoint
router.post('/create-token', async (req, res) => {
  try {
    const { walletAddress, tokenName, tokenSymbol } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const userPublicKey = new PublicKey(walletAddress);

    const mint = await createMint(
      connection,
      serverKeypair,
      userPublicKey,
      userPublicKey,
      9
    );

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      serverKeypair,
      mint,
      userPublicKey
    );

    const mintTx = await mintTo(
      connection,
      serverKeypair,
      mint,
      tokenAccount.address,
      userPublicKey,
      1000000 * Math.pow(10, 9)
    );

    res.json({
      success: true,
      name: tokenName || 'CONSILIENCE',
      symbol: tokenSymbol || 'CSL',
      mint: mint.toString(),
      tokenAccount: tokenAccount.address.toString(),
      transaction: mintTx,
      amount: '1,000,000'
    });

  } catch (error) {
    console.error('Token creation error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Make sure server wallet has SOL for fees'
    });
  }
});

// Create NFT endpoint
router.post('/create-nft', async (req, res) => {
  try {
    const { walletAddress, nftName, imageUrl } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    // Simulate NFT creation (in production, would use Metaplex)
    const nftMint = Keypair.generate().publicKey.toString();
    
    res.json({
      success: true,
      name: nftName || `CONSILIENCE NFT #${Date.now().toString().slice(-4)}`,
      mint: nftMint,
      imageUrl: imageUrl || `https://picsum.photos/400/400?random=${Date.now()}`,
      type: 'NFT',
      transaction: `nft_${Date.now()}`
    });

  } catch (error) {
    console.error('NFT creation error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'NFT creation failed'
    });
  }
});

// Award tokens endpoint
router.post('/award-tokens', async (req, res) => {
  try {
    const { walletAddress, amount, reason } = req.body;
    
    // Simulate token award (in production, would actually transfer tokens)
    res.json({
      success: true,
      walletAddress,
      amount,
      reason,
      transaction: `award_${Date.now()}`
    });

  } catch (error) {
    console.error('Token award error:', error);
    res.status(500).json({ 
      error: error.message
    });
  }
});

module.exports = router;