import { TransformPassthrough } from "../streams/transform_passthrough";

/**
 * This function is provided as an example.
 */
export function counterDestination() {
  let decryptedMessages = 0;
  let count = 0;

  return new TransformPassthrough({
    async transform(line: string) {
      if (line.includes(`"decrypted_matched_data"`)) {
        decryptedMessages++;
      }
      count++;
    },
    async flush() {
      console.log(
        `Logs Received At: ${new Date().toLocaleString()}
Messages Count: ${count}
Decrypted Payloads: ${decryptedMessages}`,
      );
    },
  });
}
