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

"use strict";

import TronWeb from "tronweb";
import sodium from "sodium-universal";
import WalletAccountTron from "./wallet-account-tron.js";

const FEE_RATE_NORMAL_MULTIPLIER = 1.1;
const FEE_RATE_FAST_MULTIPLIER = 2.0;

/** @typedef {import('./wallet-account-tron.js').TronWalletConfig} TronWalletConfig */

export default class WalletManagerTron {
  #seedBuffer;
  #tronWeb;
  #accounts;

  /**
   * Creates a new wallet manager for tron blockchains.
   *
   * @param {Uint8Array} seedBuffer - Uint8Array seedBuffer buffer.
   * @param {TronWalletConfig} [config] - The configuration object.
   */
  constructor(seedBuffer, config = {}) {
    this.#seedBuffer = seedBuffer;
    this.#accounts = new Set();

    const { rpcUrl } = config;

    this.#tronWeb = new TronWeb({
      fullHost: rpcUrl || "https://api.trongrid.io",
    });
  }

  /**
   * Returns a random [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   *
   * @returns {string} The seed phrase.
   */
  static getRandomSeedPhrase() {
    return TronWeb.createRandom().mnemonic.phrase;
  }

  /**
   * Checks if a seed phrase is valid.
   *
   * @param {string} seedPhrase - The seed phrase.
   * @returns {boolean} True if the seed phrase is valid.
   */
  static isValidSeedPhrase(seedPhrase) {
    try {
      TronWeb.fromMnemonic(seedPhrase);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * The seed of the wallet.
   *
   * @type {Uint8Array}
   */
  get seedBuffer() {
    return this.#seedBuffer;
  }

  /**
   * Returns the wallet account at a specific index (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @example
   * // Returns the account with derivation path m/44'/195'/0'/0/1
   * const account = await wallet.getAccount(1);
   * @param {number} [index] - The index of the account to get (default: 0).
   * @returns {Promise<WalletAccountTron>} The account.
   */
  async getAccount(index = 0) {
    const account = await this.getAccountByPath(`0'/0/${index}`);
    this.#accounts.add(account);
    return account;
  }

  /**
   * Returns the wallet account at a specific BIP-44 derivation path.
   *
   * @example
   * // Returns the account with derivation path m/44'/195'/0'/0/1
   * const account = await wallet.getAccountByPath("0'/0/1");
   * @param {string} path - The derivation path (e.g. "0'/0/0").
   * @returns {Promise<WalletAccountTron>} The account.
   */
  async getAccountByPath(path) {
    const account = new WalletAccountTron(this.#seedBuffer, path, {
      rpcUrl: this.#tronWeb.fullNode.host,
    });
    this.#accounts.add(account);
    return account;
  }

  /**
   * Returns the current fee rates.
   *
   * @returns {Promise<{ normal: number, fast: number }>} The fee rates (in sun).
   */
  async getFeeRates() {
    if (!this.#tronWeb.fullNode.host) {
      throw new Error(
        "The wallet must be connected to a provider to get fee rates"
      );
    }

    const chainParameters = await this.#tronWeb.trx.getChainParameters();

    // Get fee parameters
    const getTransactionFee = chainParameters.find(
      (param) => param.key === "getTransactionFee"
    );

    // Base transaction fee
    const baseFee = Number(getTransactionFee.value);

    // Calculate fee rates using multipliers
    const normal = Math.round(baseFee * FEE_RATE_NORMAL_MULTIPLIER);
    const fast = Math.round(baseFee * FEE_RATE_FAST_MULTIPLIER);

    return {
      normal,
      fast,
    };
  }

  /**
   * Close the wallet manager and erase the seed buffer.
   */
  close() {
    for (const account of this.#accounts) account.close();
    this.#accounts.clear();

    sodium.sodium_memzero(this.#seedBuffer);

    this.#seedBuffer = null;
    this.#tronWeb = null;
  }
}
