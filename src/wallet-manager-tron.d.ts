/** @typedef {import('./wallet-account-tron.js').TronWalletConfig} TronWalletConfig */
export default class WalletManagerTron {
  /**
   * Returns a random [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   *
   * @returns {string} The seed phrase.
   */
  static getRandomSeedPhrase(): string;
  /**
   * Checks if a seed phrase is valid.
   *
   * @param {string} seedPhrase - The seed phrase.
   * @returns {boolean} True if the seed phrase is valid.
   */
  static isValidSeedPhrase(seedPhrase: string): boolean;
  /**
   * Creates a new wallet manager for tron blockchains.
   *
   * @param {Uint8Array} seedBuffer - Uint8Array seedBuffer buffer.
   * @param {TronWalletConfig} [config] - The configuration object.
   */
  constructor(seedBuffer: Uint8Array, config?: TronWalletConfig);
  /**
   * The seed of the wallet.
   *
   * @type {Uint8Array}
   */
  get seedBuffer(): Uint8Array;
  /**
   * Returns the wallet account at a specific index (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @example
   * // Returns the account with derivation path m/44'/195'/0'/0/1
   * const account = await wallet.getAccount(1);
   * @param {number} [index] - The index of the account to get (default: 0).
   * @returns {Promise<WalletAccountTron>} The account.
   */
  getAccount(index?: number): Promise<WalletAccountTron>;
  /**
   * Returns the wallet account at a specific BIP-44 derivation path.
   *
   * @example
   * // Returns the account with derivation path m/44'/195'/0'/0/1
   * const account = await wallet.getAccountByPath("0'/0/1");
   * @param {string} path - The derivation path (e.g. "0'/0/0").
   * @returns {Promise<WalletAccountTron>} The account.
   */
  getAccountByPath(path: string): Promise<WalletAccountTron>;
  /**
   * Returns the current fee rates.
   *
   * @returns {Promise<{ normal: number, fast: number }>} The fee rates (in sun).
   */
  getFeeRates(): Promise<{
    normal: number;
    fast: number;
  }>;
  /**
   * Close the wallet manager and erase the seed buffer.
   */
  close(): void;
  #private;
}
export type TronWalletConfig =
  import("./wallet-account-tron.js").TronWalletConfig;
import WalletAccountTron from "./wallet-account-tron.js";
