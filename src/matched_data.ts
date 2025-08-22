import { CipherSuite, HkdfSha256 } from "@hpke/core";
import { DhkemX25519HkdfSha256 } from "@hpke/dhkem-x25519";
import { Chacha20Poly1305 } from "@hpke/chacha20poly1305";
import { TransformNewlineStream } from "./streams/transform_newline";
import { parseLine } from "./log_message";

/**
 * @see https://github.com/cloudflare/matched-data-cli/blob/master/src/matched_data.rs#L11-L13
 */

const suite = new CipherSuite({
  kem: new DhkemX25519HkdfSha256(),
  kdf: new HkdfSha256(),
  aead: new Chacha20Poly1305(),
});

export function decodeTransformer(privateKey: string) {
  return new TransformNewlineStream(async (line: string) => {
    const message = parseLine(line);
    // some (most?) messages won't have an encrypted payload
    // so let's only do work if we need to
    if (message.Metadata.encrypted_matched_data) {
      message.Metadata = {
        ...message.Metadata,
        decrypted_matched_data: await decode(
          message.Metadata.encrypted_matched_data,
          privateKey,
        ),
      };
    }
    return JSON.stringify(message);
  });
}

async function decode(payloadBase64: string, privateKeyBase64: string) {
  try {
    const encData = decodebin(b64decode(payloadBase64));

    const recipient = await suite.createRecipientContext({
      recipientKey: await suite.kem.importKey(
        "raw",
        b64decode(privateKeyBase64),
      ),
      enc: encData.encappedKey,
    });

    const pt = await recipient.open(encData.payload);
    return new TextDecoder().decode(pt);
  } catch (err) {
    // let's not drop the message (i.e. throw an error)
    // just because we can't decode the payload
    console.log(err);
    return undefined;
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
