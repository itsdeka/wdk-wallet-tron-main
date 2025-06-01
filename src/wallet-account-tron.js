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

'use strict'

import TronWeb from 'tronweb'
import sodium from 'sodium-universal'
import { CustomTronHDWallet } from './custom-hdwallet.js'

/**
 * @typedef {Object} KeyPair
 * @property {Uint8Array} publicKey - The public key.
 * @property {Uint8Array} privateKey - The private key.
 */

/**
 * @typedef {Object} TronTransaction
 * @property {string} to - The transaction's recipient.
 * @property {number} value - The amount of TRX to send to the recipient (in sun).
 * @property {string} [data] - The transaction's data in hex format.
 * @property {number} [gasLimit] - The maximum amount of gas this transaction is permitted to use.
 * @property {number} [gasPrice] - The price (in wei) per unit of gas this transaction will pay.
 * @property {number} [maxFeePerGas] - The maximum price (in wei) per unit of gas this transaction will pay for the combined [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559) block's base fee and this transaction's priority fee.
 * @property {number} [maxPriorityFeePerGas] - The price (in wei) per unit of gas this transaction will allow in addition to the [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559) block's base fee to bribe miners into giving this transaction priority. This is included in the maxFeePerGas, so this will not affect the total maximum cost set with maxFeePerGas.
 */

/**
 * @typedef {Object} TronWalletConfig
 * @property {string} [rpcUrl] - The rpc url of the provider.
 */

const BIP_44_TRON_DERIVATION_PATH_PREFIX = "m/44'/195'"

export default class WalletAccountTron {
  #wallet
  #path
  #tronWeb
  #privateKeyBuffer
  #hmacOutputBuffer
  #derivationDataBuffer
  #backupBuffer

  /**
   * Creates a new tron wallet account.
   *
   * @param {Uint8Array} seedBuffer - The bip-39 mnemonic.
   * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
   * @param {TronWalletConfig} [config] - The configuration object.
   */
  constructor (seedBuffer, path, config = {}) {
    const { rpcUrl } = config

    this.#tronWeb = new TronWeb({
      fullHost: rpcUrl || 'https://api.trongrid.io'
    })

    const fullPath = `${BIP_44_TRON_DERIVATION_PATH_PREFIX}/${path}`
    this.#path = fullPath

    // Generate buffers for HD wallet derivation
    this.#privateKeyBuffer = new Uint8Array(32)
    this.#hmacOutputBuffer = new Uint8Array(64)
    this.#derivationDataBuffer = new Uint8Array(37)
    this.#backupBuffer = new Uint8Array(32)

    // Create HD wallet
    this.#wallet = CustomTronHDWallet.fromSeed(
      seedBuffer,
      this.#tronWeb,
      this.#privateKeyBuffer,
      this.#hmacOutputBuffer,
      this.#derivationDataBuffer,
      this.#backupBuffer,
      fullPath
    )
  }

  /**
   * The derivation path's index of this account.
   *
   * @type {number}
   */
  get index () {
    return parseInt(this.#path.split('/').pop())
  }

  /**
   * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @type {string}
   */
  get path () {
    return this.#path
  }

  /**
   * The account's key pair.
   *
   * @type {KeyPair}
   */
  get keyPair () {
    return {
      privateKey: this.#wallet.signingKey.privateKeyBuffer,
      publicKey: this.#wallet.getPublicKey()
    }
  }

  /**
   * Returns the account's address.
   *
   * @returns {Promise<string>} The account's address.
   */
  async getAddress () {
    return this.#wallet.getAddress()
  }

  /**
   * Signs a message.
   *
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} The message's signature.
   */
  async sign (message) {
    return await this.#wallet.sign(message)
  }

  /**
   * Signs a typed data message.
   *
   * @param {string} Permit712MessageDomain - The domain of the message.
   * @param {string} Permit712MessageTypes - The types of the message.
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} The message's signature.
   */
  async signTypedData (Permit712MessageDomain, Permit712MessageTypes, message) {
    return await this.#wallet.signTypedData(Permit712MessageDomain, Permit712MessageTypes, message)
  }

  /**
   * Verifies a message's signature.
   *
   * @param {string} message - The original message.
   * @param {string} signature - The signature to verify.
   * @returns {Promise<boolean>} True if the signature is valid.
   */
  async verify (message, signature) {
    const recoveredAddress = await this.#tronWeb.trx.verifyMessageV2(message, signature)
    const address = await this.getAddress()
    return recoveredAddress === address
  }

  /**
   * Sends a transaction with arbitrary data.
   *
   * @param {TronTransaction} tx - The transaction to send.
   * @returns {Promise<string>} The transaction's hash.
   * @throws {Error} If the transaction fails or returns invalid data.
   */
  async sendTransaction (tx) {
    if (!this.#tronWeb.fullNode.host) {
      throw new Error(
        'The wallet must be connected to a provider to send transaction'
      )
    }

    try {
      const { to, value } = tx
      const from = await this.getAddress()

      // Create the transaction
      const transaction = await this.#tronWeb.transactionBuilder.sendTrx(
        to,
        value,
        from
      )

      // Sign using our custom wallet's signTransaction method
      const signedTransaction = await this.#wallet.signTransaction(transaction)

      // Broadcast the transaction
      const result = await this.#tronWeb.trx.sendRawTransaction(signedTransaction)

      if (!result || !result.result) {
        throw new Error(result ? result.code || JSON.stringify(result) : 'Empty response from network')
      }

      return result.txid
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error.message || JSON.stringify(error)}`)
    }
  }

  /**
   * Quotes a transaction.
   *
   * @param {TronTransaction} tx - The transaction to quote.
   * @returns {Promise<number>} The transaction's fee (in sun).
   */
  async quoteTransaction (tx) {
    if (!this.#tronWeb.fullNode.host) {
      throw new Error(
        'The wallet must be connected to a provider to quote transaction'
      )
    }

    const { to, value } = tx
    const from = await this.getAddress()

    const transaction = await this.#tronWeb.transactionBuilder.sendTrx(
      to,
      value,
      from
    )

    // Get account bandwidth resources
    const resources = await this.#tronWeb.trx.getAccountResources(from)

    // Calculate transaction size in bytes
    const rawDataHex = transaction.raw_data_hex
    const txSizeBytes = rawDataHex.length / 2

    // Get available bandwidth
    const freeBandwidth = Number(resources.freeNetRemaining) || 0

    // Estimate bandwidth consumption (2x the size in bytes)
    const bandwidthConsumption = txSizeBytes * 2

    // Estimate missing bandwidth and cost
    const missingBandwidth = Math.max(bandwidthConsumption - freeBandwidth, 0)
    const costInSun = missingBandwidth * 1_000 // 1 TRX per 1000 bandwidth units

    return costInSun
  }

  /**
   * Returns the account's native token balance.
   *
   * @returns {Promise<number>} The native token balance.
   */
  async getBalance () {
    if (!this.#tronWeb.fullNode.host) {
      throw new Error(
        'The wallet must be connected to a provider to get balance'
      )
    }

    const balance = await this.#tronWeb.trx.getBalance(await this.getAddress())
    return Number(balance)
  }

  /**
   * Returns the account balance for a specific token.
   * Uses low-level contract interaction to ensure compatibility with all TRC20 tokens.
   *
   * @param {string} tokenAddress - The smart contract address of the token.
   * @returns {Promise<number>} The token balance.
   * @throws {Error} If the contract interaction fails or returns invalid data.
   */
  async getTokenBalance (tokenAddress) {
    if (!this.#tronWeb.fullNode.host) {
      throw new Error(
        'The wallet must be connected to a provider to get token balance'
      )
    }

    try {
      const contract = await this.#tronWeb.contract().at(tokenAddress)
      if (!contract) {
        throw new Error(`Failed to load contract at address ${tokenAddress}`)
      }

      const address = await this.getAddress()
      const hexAddress = this.#tronWeb.address.toHex(address)

      const result = await this.#tronWeb.transactionBuilder.triggerConstantContract(
        tokenAddress,
        'balanceOf(address)',
        {},
        [{
          type: 'address',
          value: hexAddress
        }],
        address
      )

      if (result && result.constant_result && result.constant_result[0]) {
        const balance = this.#tronWeb.toBigNumber('0x' + result.constant_result[0])
        return Number(balance.toString())
      }

      throw new Error('Invalid response format from contract')
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error.message}`)
    }
  }

  /**
   * Close the wallet account, erase all sensitive buffers, and cleanup provider connections.
   * @returns {Promise<void>}
   */
  close () {
    sodium.sodium_memzero(this.#privateKeyBuffer)
    sodium.sodium_memzero(this.#hmacOutputBuffer)
    sodium.sodium_memzero(this.#derivationDataBuffer)
    sodium.sodium_memzero(this.#backupBuffer)

    this.#privateKeyBuffer = null
    this.#hmacOutputBuffer = null
    this.#derivationDataBuffer = null
    this.#backupBuffer = null
    this.#wallet = null
    this.#tronWeb = null
  }
}
