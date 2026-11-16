import { Base64 } from 'js-base64'

/**
 * Normalizes binary data received over RPC.
 *
 * Electron's IPC structured clone delivers a main-process `Buffer` as a plain `Uint8Array`, socket.io may deliver
 * an `ArrayBuffer`, and a JSON-serialized Buffer looks like `{ type: 'Buffer', data: [...] }`.
 * Calling `toString('base64')` on a `Uint8Array` silently ignores the encoding and returns comma separated bytes,
 * so always normalize before converting.
 */
export function toUint8Array(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data)
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }
  if (Array.isArray(data)) {
    return Uint8Array.from(data)
  }
  if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
    return Uint8Array.from((data as any).data)
  }
  throw new Error('Unsupported binary data')
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  return Base64.fromUint8Array(bytes)
}

export function uint8ArrayToString(bytes: Uint8Array, encoding: string = 'utf8'): string {
  switch (encoding.toLowerCase()) {
    case 'base64':
      return uint8ArrayToBase64(bytes)
    case 'utf8':
    case 'utf-8':
      return new TextDecoder('utf-8').decode(bytes)
    default:
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(bytes).toString(encoding as BufferEncoding)
      }
      return new TextDecoder(encoding).decode(bytes)
  }
}

const commaSeparatedBytes = /^\d{1,3}(,\d{1,3})+$/

/**
 * Earlier versions stored certificates selected in the desktop app as comma separated byte values
 * (e.g. "45,45,45,45,45,66,...") instead of base64, see `toUint8Array`.
 *
 * @returns the repaired base64 data, or undefined if the data does not look corrupted
 */
export function repairCorruptedCertificateData(data: string | undefined): string | undefined {
  if (!data || !commaSeparatedBytes.test(data)) {
    return undefined
  }
  const bytes = data.split(',').map(Number)
  if (bytes.some(byte => byte > 255)) {
    return undefined
  }
  return uint8ArrayToBase64(Uint8Array.from(bytes))
}
