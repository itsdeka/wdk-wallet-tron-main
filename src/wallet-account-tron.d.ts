export default class WalletAccountTron {
  /**
   * Creates a new tron wallet account.
   *
   * @param {Uint8Array} seedBuffer - The bip-39 mnemonic.
   * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
   * @param {TronWalletConfig} [config] - The configuration object.
   */
  constructor(seedBuffer: Uint8Array, path: string, config?: TronWalletConfig);
  /**
   * The derivation path's index of this account.
   *
   * @type {number}
   */
  get index(): number;
  /**
   * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @type {string}
   */
  get path(): string;
  /**
   * The account's key pair.
   *
   * @type {KeyPair}
   */
  get keyPair(): KeyPair;
  /**
   * The account's address.
   *
   * @type {string}
   */
  get address(): string;
  /**
   * Returns the account's address.
   *
   * @returns {Promise<string>} The account's address.
   */
  getAddress(): Promise<string>;
  /**
   * Signs a message.
   *
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} The message's signature.
   */
  sign(message: string): Promise<string>;
  /**
   * Signs a typed data message.
   *
   * @param {string} Permit712MessageDomain - The domain of the message.
   * @param {string} Permit712MessageTypes - The types of the message.
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} The message's signature.
   */
  signTypedData(
    Permit712MessageDomain: string,
    Permit712MessageTypes: string,
    message: string
  ): Promise<string>;
  /**
   * Verifies a message's signature.
   *
   * @param {string} message - The original message.
   * @param {string} signature - The signature to verify.
   * @returns {Promise<boolean>} True if the signature is valid.
   */
  verify(message: string, signature: string): Promise<boolean>;
  /**
   * Sends a transaction with arbitrary data.
   *
   * @param {TronTransaction} tx - The transaction to send.
   * @returns {Promise<string>} The transaction's hash.
   * @throws {Error} If the transaction fails or returns invalid data.
   */
  sendTransaction(tx: TronTransaction): Promise<string>;
  /**
   * Quotes a transaction.
   *
   * @param {TronTransaction} tx - The transaction to quote.
   * @returns {Promise<number>} The transaction's fee (in sun).
   */
  quoteTransaction(tx: TronTransaction): Promise<number>;
  /**
   * Returns the account's native token balance.
   *
   * @returns {Promise<number>} The native token balance.
   */
  getBalance(): Promise<number>;
  /**
   * Returns the account balance for a specific token.
   * Uses low-level contract interaction to ensure compatibility with all TRC20 tokens.
   *
   * @param {string} tokenAddress - The smart contract address of the token.
   * @returns {Promise<number>} The token balance.
   * @throws {Error} If the contract interaction fails or returns invalid data.
   */
  getTokenBalance(tokenAddress: string): Promise<number>;
  /**
   * Close the wallet account, erase all sensitive buffers, and cleanup provider connections.
   * @returns {Promise<void>}
   */
  /**
   * Transfers a token to another address.
   * @param options The transfer's options.
   * @return The transfer's result.
   */
  transfer(options: TronTransferOptions): Promise<TronTransferResult>;
  /**
   * Quote the costs of a transfer operation.
   * @see {@link transfer}
   * @param options The transfer's options.
   * @return The transfer's quotes.
   */
  quoteTransfer(
    options: TronTransferOptions
  ): Promise<Omit<TronTransferResult, "hash">>;
  close(): Promise<void>;
  #private;
}
export type KeyPair = {
  /**
   * - The public key.
   */
  publicKey: Uint8Array;
  /**
   * - The private key.
   */
  privateKey: Uint8Array;
};
export type TronTransaction = {
  /**
   * - The transaction's recipient.
   */
  to: string;
  /**
   * - The amount of TRX to send to the recipient (in sun).
   */
  value: number;
  /**
   * - The transaction's data in hex format.
   */
  data?: string;
  /**
   * - The maximum amount of gas this transaction is permitted to use.
   */
  gasLimit?: number;
  /**
   * - The price (in wei) per unit of gas this transaction will pay.
   */
  gasPrice?: number;
  /**
   * - The maximum price (in wei) per unit of gas this transaction will pay for the combined [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559) block's base fee and this transaction's priority fee.
   */
  maxFeePerGas?: number;
  /**
   * - The price (in wei) per unit of gas this transaction will allow in addition to the [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559) block's base fee to bribe miners into giving this transaction priority. This is included in the maxFeePerGas, so this will not affect the total maximum cost set with maxFeePerGas.
   */
  maxPriorityFeePerGas?: number;
};
export type TronWalletConfig = {
  /**
   * - The rpc url of the provider.
   */
  rpcUrl?: string;
};

export type TronTransferOptions = {
  /** The address of the recipient. */
  recipient: string;
  /** The address of the token to transfer. */
  token: string;
  /** The amount to transfer. */
  amount: number;
};

export type TronTransferResult = {
  /** The hash of the transfer operation. */
  hash: string;
  /** The gas cost in paymaster token. */
  gasCost: number;
};
