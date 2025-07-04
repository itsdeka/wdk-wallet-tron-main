// npm i davi0kprogramsthings/wdk-wallet-tron#develop
// npm i bip39
// npm i sodium-universal

import WalletManagerTron from '../index.js'
import sodium from 'sodium-universal'
import { mnemonicToSeedSync } from 'bip39'

const seedPhrase = WalletManagerTron.getRandomSeedPhrase()

const seedBuffer = mnemonicToSeedSync(seedPhrase)

const walletFromSeed = new WalletManagerTron(seedBuffer, {})

const accountFromSeed = await walletFromSeed.getAccount(0)
const addressFromSeed = await accountFromSeed.getAddress()

const keyPair = accountFromSeed.keyPair
console.log('Key pair:', keyPair)

console.log('Derived address:', addressFromSeed)

// try to sign a message
const message = 'Hello, world!'
const signature = await accountFromSeed.sign(message)
console.log('Signature:', signature)

// use wallet verify
console.log('Is the signature valid?', await accountFromSeed.verify(message, signature))

// we can erase seed buffer
sodium.sodium_memzero(seedBuffer)

const signature2 = await accountFromSeed.sign(message)
console.log('Signature 2:', signature2)

// check that the signature is the same
if (signature === signature2) {
  console.log('Signatures are the same')
} else {
  console.log('Signatures are different')
}

console.log('Signing still works')

console.log('Now we erase private key buffer')
await accountFromSeed.close()

// now try to sign again
try {
  await accountFromSeed.sign(message)
  console.log('Signing is NOT failing | ERROR')
} catch (_) {
  console.log('Signing is failing as expected | OK')
}
