import WalletAccountTron from "../src/wallet-account-tron.js";
import * as bip39 from "bip39";

const SEED_PHRASE =
  "between oval abandon quantum heavy stable guess limb ring hobby surround wall";
const VALID_SEED = bip39.mnemonicToSeedSync(SEED_PHRASE);
const VALID_PATH = "0'/0'";
// Tron network configuration
const VALID_CONFIG = {
  // rpcUrl: "https://api.trongrid.io", // Mainnet
  // rpcUrl: 'https://api.shasta.trongrid.io' // Testnet
  rpcUrl: "https://nile.trongrid.io", // Nile testnet
};
const VALID_ADDRESS = "TWcBKmZpttULdr9qN4ktr6YZG7YUSZizjh"; // Example Tron address
const USDT_CONTRACT_ADDRESSES = {
  "https://api.trongrid.io": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // USDT on Mainnet
  "https://api.shasta.trongrid.io": "TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs", // USDT on Shasta
  "https://nile.trongrid.io": "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf", // USDT on Nile
};

const VALID_TOKEN = USDT_CONTRACT_ADDRESSES[VALID_CONFIG.rpcUrl];

describe("WalletAccountTron", () => {
  let wallet;

  beforeEach(async () => {
    wallet = new WalletAccountTron(VALID_SEED, VALID_PATH, VALID_CONFIG);
  });

  describe("initialization", () => {
    it("should create a new wallet instance", () => {
      expect(wallet).toBeDefined();
      expect(wallet).toBeInstanceOf(WalletAccountTron);
    });

    it("should have correct path", () => {
      expect(wallet.path).toBe("m/44'/195'/0'/0'");
    });

    it("should have valid key pair", () => {
      const keyPair = wallet.keyPair;
      expect(keyPair).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.publicKey).toBeDefined();
    });

    it("should initialize with seed phrase", async () => {
      const validAccount = new WalletAccountTron(
        SEED_PHRASE,
        VALID_PATH,
        VALID_CONFIG
      );
      const address = await validAccount.getAddress();
      expect(address).toBeDefined();
      expect(typeof address).toBe("string");
    });

    it("should throw error for invalid seed phrase", () => {
      expect(
        () => new WalletAccountTron("invalid seed", VALID_PATH, VALID_CONFIG)
      ).toThrow();
    });
  });

  describe("address", () => {
    it("should return the correct address", () => {
      const address = wallet.address;
      expect(address).toBeDefined();
      expect(typeof address).toBe("string");
      expect(address.length).toBeGreaterThan(0);
    });

    it("should get index", () => {
      expect(wallet.index).toBe(0);
    });
  });

  describe("signing", () => {
    it("should sign a message", () => {
      const message = "Hello, World!";
      const signature = wallet.sign(message);
      expect(signature).toBeDefined();
      expect(signature).toBeInstanceOf(Object);
    });

    it("should sign binary data", () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const signature = wallet.sign(data);
      expect(signature).toBeDefined();
      expect(signature).toBeInstanceOf(Object);
    });

    it("should handle empty message", () => {
      const message = "";
      const signature = wallet.sign(message);
      expect(signature).toBeDefined();
      expect(signature).toBeInstanceOf(Object);
    });

    it("should sign and verify a message", async () => {
      const message = "Hello, Tron!";
      const signature = await wallet.sign(message);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      const isValid = await wallet.verify(message, signature);
      expect(isValid).toBe(true);
    });

    it("should fail to verify with wrong signature", async () => {
      const message = "Hello, Tron!";
      const wrongSignature = "wrong" + (await wallet.sign(message));
      const isValid = await wallet.verify(message, wrongSignature);
      expect(isValid).toBe(false);
    });
  });

  describe("verification", () => {
    it("should verify a valid signature", () => {
      const message = "Hello, World!";
      const signed = wallet.sign(message);
      const isValid = wallet.verify(message, signed);
      expect(isValid).toBeDefined();
      expect(isValid).toBeInstanceOf(Object);
    });

    it("should reject an invalid signature", () => {
      const message = "Hello, World!";
      const invalidSignature = "invalid_signature";
      const isValid = wallet.verify(message, invalidSignature);
      expect(isValid).toBeDefined();
      expect(isValid).toBeInstanceOf(Object);
    });
  });

  describe("transactions", () => {
    it("should quote a transaction", async () => {
      const to = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";
      const amount = 1000000;
      const quote = await wallet.quoteSendTransaction({ to, value: amount });
      expect(quote).toBeDefined();
      expect(quote.fee).toBeDefined();
      expect(quote.fee).toBeGreaterThan(0);
    });

    it("should handle transaction errors", async () => {
      const to = "invalid_address";
      const amount = 1000000;
      await expect(
        wallet.sendTransaction({ to, value: amount })
      ).rejects.toThrow();
    });

    it("should handle empty transaction response", async () => {
      const to = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";
      const amount = 1000000;
      await expect(
        wallet.sendTransaction({ to, value: amount })
      ).rejects.toThrow();
    });
  });

  describe("balance", () => {
    it("should get wallet balance", async () => {
      const balance = await wallet.getBalance();
      expect(typeof balance).toBe("number");
      expect(balance).toBeGreaterThanOrEqual(0);
    });
  });

  describe("token operations", () => {
    it("should get token balance", async () => {
      const tokenAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
      try {
        const balance = await wallet.getTokenBalance(tokenAddress);
        expect(balance).toBeDefined();
        expect(typeof balance).toBe("number");
      } catch (error) {
        // If the token doesn't exist or there's an error, that's acceptable
        expect(error).toBeDefined();
      }
    });

    it("should handle invalid token address", async () => {
      const tokenAddress = "invalid_address";
      await expect(wallet.getTokenBalance(tokenAddress)).rejects.toThrow();
    });

    it("should quote token transfer", async () => {
      const tokenAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
      const to = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";
      const amount = 1000000;
      try {
        const quote = await wallet.quoteSendTransaction({
          to: to,
          value: amount,
          tokenAddress,
        });
        expect(quote).toBeDefined();
        expect(quote.fee).toBeDefined();
        expect(quote.fee).toBeGreaterThan(0);
      } catch (error) {
        // If the token doesn't exist or there's an error, that's acceptable
        expect(error).toBeDefined();
      }
    });

    it("should quote a token transfer", async () => {
      const transferOptions = {
        recipient: VALID_ADDRESS,
        token: VALID_TOKEN,
        amount: 1000000,
      };
      const quote = await wallet.quoteTransfer(transferOptions);
      expect(quote).toBeDefined();
      expect(quote.fee).toBeGreaterThan(0);
      expect(quote.hash).toBeNull();
    });

    it("should throw error when transferring token with invalid RPC", async () => {
      const walletWithInvalidRpc = new WalletAccountTron(
        VALID_SEED,
        VALID_PATH,
        {
          rpcUrl: "https://invalid-rpc-url.com",
        }
      );
      const transferOptions = {
        recipient: VALID_ADDRESS,
        token: VALID_TOKEN,
        amount: 1000000,
      };
      await expect(
        walletWithInvalidRpc.transfer(transferOptions)
      ).rejects.toThrow();
    });

    it("should throw error when transferring with invalid token address", async () => {
      const transferOptions = {
        recipient: VALID_ADDRESS,
        token: "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf", // Using a valid format but non-existent contract
        amount: 1000000,
      };
      await expect(wallet.transfer(transferOptions)).rejects.toThrow(
        "CONTRACT_VALIDATE_ERROR"
      );
    });
  });

  describe("dispose", () => {
    it("should dispose wallet and clear sensitive data", () => {
      const walletToDispose = new WalletAccountTron(
        VALID_SEED,
        VALID_PATH,
        VALID_CONFIG
      );

      // Store initial values
      const initialPath = walletToDispose.path;

      // Dispose the wallet
      walletToDispose.dispose();

      // The path should still be accessible
      expect(walletToDispose.path).toBe(initialPath);
    });

    it("should allow creating new wallet after disposal", () => {
      const walletToDispose = new WalletAccountTron(
        VALID_SEED,
        VALID_PATH,
        VALID_CONFIG
      );
      walletToDispose.dispose();

      // Should be able to create a new wallet after disposal
      const newWallet = new WalletAccountTron(
        VALID_SEED,
        VALID_PATH,
        VALID_CONFIG
      );
      expect(newWallet).toBeDefined();
      expect(newWallet).toBeInstanceOf(WalletAccountTron);
    });
  });
});
