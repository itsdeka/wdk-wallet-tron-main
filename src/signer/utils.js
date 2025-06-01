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

import { hmac } from '@noble/hashes/hmac'
import { sha512 } from '@noble/hashes/sha512'
import * as secp256k1 from '@noble/secp256k1'

const MASTER_SECRET = new TextEncoder().encode('Bitcoin seed')
const HARDENED_OFFSET = 0x80000000

function encodeUInt32BE (value) {
  const buffer = new Uint8Array(4)
  buffer[0] = (value >> 24) & 0xff
  buffer[1] = (value >> 16) & 0xff
  buffer[2] = (value >> 8) & 0xff
  buffer[3] = value & 0xff
  return buffer
}

function parsePath (path) {
  const indices = path.split('/').map(Number)
  return indices
}

function compareWithCurveOrder (buffer, startIndex = 0) {
  for (let i = 0; i < 32; i++) {
    const curveOrderByte = Number((secp256k1.CURVE.n >> BigInt(8 * (31 - i))) & 0xffn)
    if (buffer[startIndex + i] > curveOrderByte) return 1
    if (buffer[startIndex + i] < curveOrderByte) return -1
  }
  return 0
}

function isBufferZero (buffer) {
  return buffer.every(byte => byte === 0)
}

function addPrivateKeys (target, addition) {
  let carry = 0
  for (let i = 31; i >= 0; i--) {
    const sum = target[i] + addition[i] + carry
    target[i] = sum & 0xff
    carry = sum >> 8
  }
  return carry > 0
}

function subtractFromPrivateKey (privateKey, curveOrder) {
  let carry = 0
  for (let i = 31; i >= 0; i--) {
    const curveOrderByte = Number((secp256k1.CURVE.n >> BigInt(8 * (31 - i))) & 0xffn)
    const diff = privateKey[i] - curveOrderByte - carry
    privateKey[i] = diff < 0 ? diff + 256 : diff
    carry = diff < 0 ? 1 : 0
  }
}

export function derivePrivateKeyBuffer (seed, privateKeyBuffer, hmacOutputBuffer, derivationDataBuffer, path) {
  // Generate master key from seed
  hmacOutputBuffer.set(hmac(sha512, MASTER_SECRET, seed))

  // Set initial private key and chain code
  privateKeyBuffer.set(hmacOutputBuffer.subarray(0, 32))
  const chainCode = hmacOutputBuffer.subarray(32)

  // Parse derivation path
  const indices = parsePath(path)

  // Derive child keys
  for (const index of indices) {
    // Prepare derivation data
    if (index >= HARDENED_OFFSET) {
      derivationDataBuffer[0] = 0x00
      derivationDataBuffer.set(privateKeyBuffer, 1)
    } else {
      derivationDataBuffer.set(secp256k1.getPublicKey(privateKeyBuffer, true))
    }
    derivationDataBuffer.set(encodeUInt32BE(index), 33)

    // Generate child key material
    hmacOutputBuffer.set(hmac(sha512, chainCode, derivationDataBuffer))

    // Skip if IL >= curve order
    if (compareWithCurveOrder(hmacOutputBuffer) >= 0) continue

    // Add IL to parent key and handle overflow
    const hasOverflow = addPrivateKeys(privateKeyBuffer, hmacOutputBuffer)

    // If result >= n, subtract n
    if (hasOverflow || compareWithCurveOrder(privateKeyBuffer) >= 0) {
      subtractFromPrivateKey(privateKeyBuffer)
    }

    // Skip if result is zero
    if (isBufferZero(privateKeyBuffer)) continue

    // Update chain code
    chainCode.set(hmacOutputBuffer.subarray(32))
  }
}
