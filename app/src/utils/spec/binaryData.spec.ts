import 'mocha'
import { expect } from 'chai'
import { repairCorruptedCertificateData, toUint8Array, uint8ArrayToBase64, uint8ArrayToString } from '../binaryData'
import { repairCorruptedCertificates } from '../../actions/ConnectionManager'

const pem = '-----BEGIN CERTIFICATE-----\nMIIBszCCAVmgAwIBAgIUQ\n-----END CERTIFICATE-----\n'
const pemBase64 = Buffer.from(pem).toString('base64')

describe('binaryData', () => {
  describe('toUint8Array', () => {
    it('accepts the Uint8Array that Electron IPC delivers instead of a Buffer', () => {
      const bytes = new Uint8Array(Buffer.from(pem))
      expect(uint8ArrayToBase64(toUint8Array(bytes))).to.eq(pemBase64)
      // This is the bug that corrupted certificates: Uint8Array ignores the encoding argument
      expect((bytes as any).toString('base64')).to.match(/^45,45,45,/)
    })

    it('accepts Buffers, ArrayBuffers and JSON serialized Buffers', () => {
      const buffer = Buffer.from(pem)
      expect(uint8ArrayToBase64(toUint8Array(buffer))).to.eq(pemBase64)
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      expect(uint8ArrayToBase64(toUint8Array(arrayBuffer))).to.eq(pemBase64)
      expect(uint8ArrayToBase64(toUint8Array(buffer.toJSON()))).to.eq(pemBase64)
    })

    it('rejects unsupported values', () => {
      expect(() => toUint8Array('not binary')).to.throw()
    })
  })

  describe('uint8ArrayToString', () => {
    it('decodes utf8 and base64', () => {
      const bytes = new Uint8Array(Buffer.from('Grüße 🌡️'))
      expect(uint8ArrayToString(bytes, 'utf8')).to.eq('Grüße 🌡️')
      expect(uint8ArrayToString(bytes, 'base64')).to.eq(Buffer.from('Grüße 🌡️').toString('base64'))
    })
  })

  describe('repairCorruptedCertificateData', () => {
    it('repairs comma separated bytes', () => {
      const corrupted = Array.from(Buffer.from(pem)).join(',')
      expect(repairCorruptedCertificateData(corrupted)).to.eq(pemBase64)
    })

    it('leaves valid base64 and empty values alone', () => {
      expect(repairCorruptedCertificateData(pemBase64)).to.eq(undefined)
      expect(repairCorruptedCertificateData(undefined)).to.eq(undefined)
      expect(repairCorruptedCertificateData('')).to.eq(undefined)
      expect(repairCorruptedCertificateData('1,2,300')).to.eq(undefined)
    })
  })

  describe('repairCorruptedCertificates', () => {
    it('repairs stored connections and keeps the object identity when nothing is broken', () => {
      const corrupted = Array.from(Buffer.from(pem)).join(',')
      const connections: any = {
        a: {
          id: 'a',
          clientKey: { name: 'key.pem', data: corrupted },
          clientCertificate: { name: 'c', data: pemBase64 },
        },
        b: { id: 'b' },
      }
      const repaired = repairCorruptedCertificates(connections)
      expect(repaired).to.not.eq(connections)
      expect(repaired.a.clientKey).to.deep.eq({ name: 'key.pem', data: pemBase64 })
      expect(repaired.a.clientCertificate).to.deep.eq({ name: 'c', data: pemBase64 })
      expect(repaired.b).to.eq(connections.b)

      expect(repairCorruptedCertificates(repaired)).to.eq(repaired)
    })
  })
})
