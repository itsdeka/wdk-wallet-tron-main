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
import { keccak_256 as keccak256 } from '@noble/hashes/sha3'
import { SigningKey } from 'ethers'
import TronWeb from 'tronweb'

// Default TronWeb instance for address computation
const defaultTronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io'
})

export class CustomTronSigningKey extends SigningKey {
  #privateKeyBuffer
  #tronWeb

  constructor (privateKeyBuffer, tronWeb = defaultTronWeb) {
    if (!(privateKeyBuffer instanceof Uint8Array)) {
      throw new Error('privateKeyBuffer must be a Uint8Array')
    }
    if (privateKeyBuffer.length !== 32) {
      throw new Error('privateKeyBuffer must be 32 bytes')
    }

    // we never treat the private key as a string
    // we can pass a dummy one as we override all the signing methods
    super('0x0000000000000000000000000000000000000000000000000000000000000000')

    this.#privateKeyBuffer = privateKeyBuffer
    this.#tronWeb = tronWeb
  }

  get privateKeyBuffer () {
    return this.#privateKeyBuffer
  }

  getPublicKey (compressed = true) {
    return secp256k1.getPublicKey(this.#privateKeyBuffer, compressed)
  }

  sign (message) {
    const signature = secp256k1.sign(message, this.#privateKeyBuffer)
    return '0x' + signature.r.toString(16).padStart(64, '0') + signature.s.toString(16).padStart(64, '0') + (signature.recovery ? '1c' : '1b')
  }

  computeAddress () {
    const pubKey = this.getPublicKey(false)
    // Remove the prefix byte (0x04) from uncompressed public key
    const pubKeyNoPrefix = pubKey.slice(1)
    // Compute keccak-256 hash
    const hash = keccak256(pubKeyNoPrefix)
    // Take last 20 bytes
    const ethAddress = hash.slice(12)
    // Convert to hex
    const ethAddressHex = '41' + Buffer.from(ethAddress).toString('hex')
    // Convert to base58
    return this.#tronWeb.address.fromHex(ethAddressHex)
  }
}
