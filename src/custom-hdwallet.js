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

import { secp256k1 } from '@noble/curves/secp256k1'
import { sha512 } from '@noble/hashes/sha512'
import { hmac } from '@noble/hashes/hmac'
import { keccak_256 as keccak256 } from '@noble/hashes/sha3'

import { CustomTronSigningKey } from './custom-signing-key.js'

const HARDENED_OFFSET = 0x80000000
const MASTER_SECRET = new TextEncoder().encode('Bitcoin seed')

export class CustomTronHDWallet {
  #signingKey
  #tronWeb
  #address

  constructor (signingKey, tronWeb) {
    this.#signingKey = signingKey
    this.#tronWeb = tronWeb
    this.#address = this.#signingKey.computeAddress()
  }

  get signingKey () {
    return this.#signingKey
  }

  getPublicKey (compressed = true, asHex = false) {
    const pubKey = this.#signingKey.getPublicKey(compressed)
    if (asHex) {
      return '0x' + Array.from(pubKey)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    }
    return pubKey
  }

  getAddress () {
    return this.#address
  }

  async sign (message) {
    const messageBytes = typeof message === 'string'
      ? new TextEncoder().encode(message)
      : message

    // Create TIP-191 prefix
    const prefix = new TextEncoder().encode('\x19TRON Signed Message:\n' + messageBytes.length)
    const prefixedMessage = new Uint8Array(prefix.length + messageBytes.length)
    prefixedMessage.set(prefix)
    prefixedMessage.set(messageBytes, prefix.length)

    // Hash the prefixed message
    const messageHash = keccak256(prefixedMessage)

    const signature = this.#signingKey.sign(messageHash)

    return signature
  }

  signTypedData (Permit712MessageDomain, Permit712MessageTypes, message) {
    const messageDigest = this.#tronWeb.utils._TypedDataEncoder.hash(Permit712MessageDomain, Permit712MessageTypes, message)
    return this.#signingKey.sign(messageDigest.slice(2))
  }

  async signTransaction (transaction) {
    if (transaction.raw_data) {
      // This is a regular TRX transfer
      const signature = await this.#signingKey.sign(
        transaction.txID
      )
      transaction.signature = [signature]
      return transaction
    }

    // This is a smart contract call
    const rawTx = await this.#tronWeb.transactionBuilder.triggerSmartContract(
      transaction.to,
      transaction.functionSelector,
      transaction.options,
      transaction.parameters,
      transaction.issuerAddress
    )

    const signature = await this.#signingKey.sign(
      rawTx
    )
    transaction.signature = [signature]
    return transaction
  }

  static #parsePath (path) {
    if (!path.match(/^[mM]\/[0-9'/]+$/)) {
      throw new Error('Invalid derivation path')
    }

    return path
      .toLowerCase()
      .split('/')
      .slice(1)
      .map(component => {
        let index = parseInt(component)
        if (component.endsWith("'")) {
          index += HARDENED_OFFSET
        }
        return index
      })
  }

  static #encodeUInt32BE (value) {
    const result = new Uint8Array(4)
    result[0] = (value >> 24) & 0xff
    result[1] = (value >> 16) & 0xff
    result[2] = (value >> 8) & 0xff
    result[3] = value & 0xff
    return result
  }

  static fromSeed (seed, tronWeb, privateKeyBuffer, hmacOutputBuffer, derivationDataBuffer, backupBuffer, path) {
    if (!(seed instanceof Uint8Array)) {
      throw new Error('seed must be a Uint8Array')
    }
    if (!(privateKeyBuffer instanceof Uint8Array) || privateKeyBuffer.length !== 32) {
      throw new Error('privateKeyBuffer must be 32 bytes')
    }
    if (!(hmacOutputBuffer instanceof Uint8Array) || hmacOutputBuffer.length !== 64) {
      throw new Error('hmacOutputBuffer must be a 64-byte Uint8Array')
    }
    if (!(derivationDataBuffer instanceof Uint8Array) || derivationDataBuffer.length !== 37) {
      throw new Error('derivationDataBuffer must be a 37-byte Uint8Array')
    }
    if (!(backupBuffer instanceof Uint8Array) || backupBuffer.length !== 32) {
      throw new Error('backupBuffer must be a 32-byte Uint8Array')
    }

    // Generate master key from seed
    hmacOutputBuffer.set(hmac(sha512, MASTER_SECRET, seed))

    // Set initial private key and chain code
    privateKeyBuffer.set(hmacOutputBuffer.subarray(0, 32))
    const chainCode = hmacOutputBuffer.subarray(32)

    // Parse derivation path
    const indices = this.#parsePath(path)

    // Derive child keys
    for (const index of indices) {
      // Prepare derivation data
      if (index >= HARDENED_OFFSET) {
        // Hardened: use parent private key
        derivationDataBuffer[0] = 0x00
        derivationDataBuffer.set(privateKeyBuffer, 1)
        derivationDataBuffer.set(this.#encodeUInt32BE(index), 33)
      } else {
        // Non-hardened: use parent public key
        const pubKey = secp256k1.getPublicKey(privateKeyBuffer, true)
        derivationDataBuffer.set(pubKey)
        derivationDataBuffer.set(this.#encodeUInt32BE(index), 33)
      }

      // Generate child key material
      hmacOutputBuffer.set(hmac(sha512, chainCode, derivationDataBuffer))

      // Compare IL with curve order byte by byte
      let skip = false
      for (let i = 0; i < 32; i++) {
        const curveOrderByte = Number((secp256k1.CURVE.n >> BigInt(8 * (31 - i))) & 0xffn)
        if (hmacOutputBuffer[i] > curveOrderByte) {
          skip = true
          break
        }
        if (hmacOutputBuffer[i] < curveOrderByte) {
          break
        }
      }
      if (skip) {
        continue
      }

      // Add bytes right-to-left with carry
      let carry = 0
      for (let i = 31; i >= 0; i--) {
        const sum = privateKeyBuffer[i] + hmacOutputBuffer[i] + carry
        privateKeyBuffer[i] = sum & 0xff
        carry = sum >> 8
      }

      // Compare result with curve order byte by byte
      let needsModulo = carry > 0
      if (!needsModulo) {
        for (let i = 0; i < 32; i++) {
          const curveOrderByte = Number((secp256k1.CURVE.n >> BigInt(8 * (31 - i))) & 0xffn)
          if (privateKeyBuffer[i] > curveOrderByte) {
            needsModulo = true
            break
          }
          if (privateKeyBuffer[i] < curveOrderByte) {
            break
          }
        }
      }

      // If result >= n, subtract n
      if (needsModulo) {
        carry = 0
        for (let i = 31; i >= 0; i--) {
          const curveOrderByte = Number((secp256k1.CURVE.n >> BigInt(8 * (31 - i))) & 0xffn)
          const diff = privateKeyBuffer[i] - curveOrderByte - carry
          privateKeyBuffer[i] = diff < 0 ? diff + 256 : diff
          carry = diff < 0 ? 1 : 0
        }
      }

      // Check if result is zero byte by byte
      let isZero = true
      for (let i = 0; i < 32; i++) {
        if (privateKeyBuffer[i] !== 0) {
          isZero = false
          break
        }
      }
      if (isZero) {
        continue
      }

      // Update chain code with second half of hmac output
      chainCode.set(hmacOutputBuffer.subarray(32))
    }

    // Create wallet with final private key
    return new CustomTronHDWallet(new CustomTronSigningKey(privateKeyBuffer), tronWeb)
  }
}
