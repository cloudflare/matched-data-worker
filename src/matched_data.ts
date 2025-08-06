import { CipherSuite, HkdfSha256 } from "@hpke/core";
import { DhkemX25519HkdfSha256 } from "@hpke/dhkem-x25519";
import { Chacha20Poly1305 } from "@hpke/chacha20poly1305";
import { TransformNewlineStream } from "./transform_newline_stream";

/**
 * @see https://github.com/cloudflare/matched-data-cli/blob/master/src/matched_data.rs#L11-L13
 */

const suite = new CipherSuite({
  kem: new DhkemX25519HkdfSha256(),
  kdf: new HkdfSha256(),
  aead: new Chacha20Poly1305(),
});

export function decodeTransformer(
  privateKey: string,
  dataProcessor: (data: string | null) => void
) {
  return new TransformNewlineStream(async (line: string) => {
    try {
      const data = await decode(line, privateKey);
      // we are pre-emptively await-ing this even though
      // in the default example we don't need to in case
      // any users in the future need to send the data somewhere
      await dataProcessor(data);
    } catch (err) {
      console.error(err);
    }
  });
}

async function decode(payloadBase64: string, privateKeyBase64: string) {
  try {
    const encData = decodebin(b64decode(payloadBase64));

    const recipient = await suite.createRecipientContext({
      recipientKey: await suite.kem.importKey(
        "raw",
        b64decode(privateKeyBase64)
      ),
      enc: encData.encappedKey,
    });

    const pt = await recipient.open(encData.payload);
    return new TextDecoder().decode(pt);
  } catch (err) {
    console.error(err);
    return null;
  }
}

function decodebin(enc: ArrayBuffer) {
  const version = new TextDecoder().decode(enc.slice(0, 1)).charCodeAt(0);
  switch (version) {
    case 3:
      return {
        version,
        encappedKey: enc.slice(1, 33),
        payloadLength: new DataView(enc.slice(33, 41)).getUint8(0),
        payload: enc.slice(41),
      };
    default:
      return {
        version,
        encappedKey: new TextEncoder().encode(""),
        payloadLength: 0,
        payload: new TextEncoder().encode(""),
      };
  }
}

function b64decode(base64: string) {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}
