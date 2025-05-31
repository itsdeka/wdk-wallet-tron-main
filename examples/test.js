// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import WalletManagerTron from '../src/wallet-manager-tron.js'
import { mnemonicToSeedSync } from 'bip39'

// Use your Tron account seed phrase here
const TEST_SEED_PHRASE =
  'between oval abandon quantum heavy stable guess limb ring hobby surround wall' // TODO: Replace this with your actual Shasta testnet seed phrase that has 2000 TRX
console.log('Using seed phrase:', TEST_SEED_PHRASE)

const seedBuffer = mnemonicToSeedSync(TEST_SEED_PHRASE)

// Tron network configuration
const TRON_CONFIG = {
  // rpcUrl: "https://api.trongrid.io", // Mainnet
  rpcUrl: 'https://api.shasta.trongrid.io' // Testnet
  // rpcUrl: "https://api.nile.trongrid.io", // Nile testnet
}

async function runTests () {
  console.log('Starting Tron Wallet Tests...\n')

  try {
    // Test 1: Wallet Manager Creation
    console.log('Test 1: Creating Wallet Manager...')
    const walletManager = new WalletManagerTron(seedBuffer, TRON_CONFIG)
    console.log('✓ Wallet Manager created successfully\n')

    // Test 2: Seed Phrase Validation
    console.log('Test 2: Seed Phrase Validation...')
    const isValid = WalletManagerTron.isValidSeedPhrase(seedBuffer)
    console.log(`✓ Seed phrase validation: ${isValid}\n`)

    // Test 3: Get Random Seed Phrase
    console.log('Test 3: Get Random Seed Phrase...')
    const randomSeed = WalletManagerTron.getRandomSeedPhrase()
    console.log(`✓ Random seed phrase generated: ${randomSeed}\n`)

    // Test 4: Get Account by Index
    console.log('Test 4: Get Account by Index...')
    const account = await walletManager.getAccount(0)
    console.log('✓ Account retrieved successfully\n')

    // Test 5: Get Account Address
    console.log('Test 5: Get Account Address...')
    const address = await account.getAddress()
    console.log(`✓ Account address: ${address}`)
    console.log(`✓ Account private key: ${account.keyPair.privateKey}\n`)

    // Test 6: Get Account Path
    console.log('Test 6: Get Account Path...')
    const path = account.path
    console.log(`✓ Account path: ${path}\n`)

    // Test 7: Get Account Index
    console.log('Test 7: Get Account Index...')
    const index = account.index
    console.log(`✓ Account index: ${index}\n`)

    // Test 8: Get Key Pair
    console.log('Test 8: Get Key Pair...')
    const keyPair = account.keyPair
    console.log('✓ Key pair retrieved successfully\n')

    // Test 9: Get Account by Path
    console.log('Test 9: Get Account by Path...')
    const accountByPath = await walletManager.getAccountByPath("0'/0/0")
    console.log('✓ Account retrieved by path successfully\n')

    // Test 10: Get Fee Rates
    console.log('Test 10: Get Fee Rates...')
    try {
      const feeRates = await walletManager.getFeeRates()
      console.log(`✓ Fee rates retrieved: ${JSON.stringify(feeRates)}\n`)
    } catch (error) {
      console.log(`! Fee rates test failed: ${error.message}\n`)
    }

    // Test 11: Get Balance
    console.log('Test 11: Get Balance...')
    try {
      const balance = await account.getBalance()
      console.log(`✓ TRX Balance retrieved: ${balance}`)

      // USDT contract addresses
      const USDT_CONTRACT_ADDRESSES = {
        'https://api.trongrid.io': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // Mainnet
        'https://api.shasta.trongrid.io': 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs', // Shasta
        'https://api.nile.trongrid.io': 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf' // Nile
      }

      const usdtContractAddress = USDT_CONTRACT_ADDRESSES[TRON_CONFIG.rpcUrl]
      console.log(`Using USDT contract address: ${usdtContractAddress}`)

      const usdtBalance = await account.getTokenBalance(usdtContractAddress)
      console.log(`✓ USDT Balance retrieved: ${usdtBalance}\n`)
    } catch (error) {
      console.log(`! Balance test failed: ${error.message}\n`)
    }

    // Test 12: Message Signing and Verification
    console.log('Test 12: Message Signing and Verification...')
    const message = 'Hello, Tron!'
    const signature = await account.sign(message)
    const isValidSignature = await account.verify(message, signature)
    console.log(`✓ Message signed and verified: ${isValidSignature}\n`)

    // Test 13: Quote Transaction
    console.log('Test 13: Quote Transaction...')
    try {
      const recipientAddress = 'TWcBKmZpttULdr9qN4ktr6YZG7YUSZizjh'
      const amount = 1000000 // 1 TRX (in sun)

      const quote = await account.quoteTransaction({
        to: recipientAddress,
        value: amount
      })
      console.log(`✓ Transaction quote: ${quote} sun\n`)
    } catch (error) {
      console.log(`! Quote test failed: ${error.message}\n`)
    }

    // Test 14: Send Transaction

    console.log('Test 14: Send Transaction...')
    try {
      const recipientAddress = 'TWcBKmZpttULdr9qN4ktr6YZG7YUSZizjh'
      const amount = 1000000 // 1 TRX (in sun)

      const txHash = await account.sendTransaction({
        to: recipientAddress,
        value: amount
      })
      console.log(`✓ Transaction sent! Hash: ${txHash}\n`)
    } catch (error) {
      console.log(`! Send transaction test failed: ${error.message}\n`)
    }

    console.log('All tests completed successfully!')
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the tests
runTests()
