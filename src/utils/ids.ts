export function createId(prefix: string): string {
  return `${prefix}-${createUuid()}`
}

function createUuid(): string {
  const webCrypto = globalThis.crypto

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID()
  }

  const randomBytes = new Uint8Array(16)

  if (typeof webCrypto?.getRandomValues === 'function') {
    webCrypto.getRandomValues(randomBytes)
  } else {
    for (let byteIndex = 0; byteIndex < randomBytes.length; byteIndex += 1) {
      randomBytes[byteIndex] = Math.floor(Math.random() * 256)
    }
  }

  // Mark the fallback value as an RFC 4122 version 4 UUID.
  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80

  const hexadecimalBytes = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0'))

  return [
    hexadecimalBytes.slice(0, 4).join(''),
    hexadecimalBytes.slice(4, 6).join(''),
    hexadecimalBytes.slice(6, 8).join(''),
    hexadecimalBytes.slice(8, 10).join(''),
    hexadecimalBytes.slice(10, 16).join(''),
  ].join('-')
}
