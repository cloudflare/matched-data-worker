import { CipherSuite, HkdfSha256 } from "@hpke/core";
import { DhkemX25519HkdfSha256 } from "@hpke/dhkem-x25519";
import { Chacha20Poly1305 } from "@hpke/chacha20poly1305";
import { decode as b64decode } from "base64-arraybuffer";

/**
 * @see https://github.com/cloudflare/matched-data-cli/blob/master/src/matched_data.rs#L11-L13
 */

const suite = new CipherSuite({
  kem: new DhkemX25519HkdfSha256(),
  kdf: new HkdfSha256(),
  aead: new Chacha20Poly1305(),
});

export async function decode(payloadBase64: string, privateKeyBase64: string) {
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
