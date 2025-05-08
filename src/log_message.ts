import { decode } from "./matched_data";

type MetadataObject = {
  encrypted_matched_data: string;
  ruleset_version: string;
  version: string;
  decrypted_matched_data?: string;
};

type LogMessage = {
  Metadata: MetadataObject;
  Action: string;
  ClientASN: number;
  ClientASNDescription: string;
  ClientCountry: string;
  ClientIP: string;
  ClientIPClass: string;
  ClientRefererHost: string;
  ClientRefererPath: string;
  ClientRefererQuery: string;
  ClientRefererScheme: string;
  ClientRequestHost: string;
  ClientRequestMethod: string;
  ClientRequestPath: string;
  ClientRequestProtocol: string;
  ClientRequestQuery: string;
  ClientRequestScheme: string;
  ClientRequestUserAgent: string;
  Datetime: string;
  EdgeColoCode: string;
  EdgeResponseStatus: number;
  Kind: string;
  MatchIndex: number;
  OriginResponseStatus: number;
  OriginatorRayID: string;
  RayID: string;
  RuleID: string;
  Source: string;
};

export function parse(
  rs: ReadableStream,
  MATCHED_PAYLOAD_PRIVATE_KEY: string
): ReadableStream {
  let temp = "";
  let firstItem = true;

  const textTransform = new TransformStream<string, string>({
    start(controller) {
      controller.enqueue("[");
    },
    async transform(chunk, controller) {
      if (!chunk) return;
      const { returnMsgs, buffer } = await updateStream(
        temp + chunk,
        MATCHED_PAYLOAD_PRIVATE_KEY
      );
      temp = buffer;
      if (returnMsgs.length > 0) {
        const json = JSON.stringify(returnMsgs).slice(1, -1);
        controller.enqueue(firstItem ? json : "," + json);
        firstItem = false;
      }
    },
    async flush(controller) {
      if (temp.length > 0) {
        const { returnMsgs, buffer } = await updateStream(
          temp,
          MATCHED_PAYLOAD_PRIVATE_KEY,
          true
        );
        if (buffer) {
          console.error("Buffer not empty at flush:", buffer);
        }
        if (returnMsgs.length > 0) {
          controller.enqueue("," + JSON.stringify(returnMsgs).slice(1, -1));
        }
      }
      controller.enqueue("]");
      controller.terminate();
    },
  });

  const encodedStream = rs
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeThrough(new TextDecoderStream("utf-8"))
    .pipeThrough(textTransform)
    .pipeThrough(new TextEncoderStream());

  return encodedStream;
}

export async function updateStream(
  txt: string,
  MATCHED_PAYLOAD_PRIVATE_KEY: string,
  lastBatch: boolean = false
) {
  let buffer = "";
  let returnMsgs: LogMessage[] = [];
  if (txt.includes("\n")) {
    const workingLines = txt.split("\n");
    const nextBatch = workingLines.pop() ?? "";

    const msgs: LogMessage[] = [];
    for (const line of workingLines) {
      if (!line.trim()) continue;
      const logData = JSON.parse(line) as LogMessage;
      if (!logData.Metadata) {
        console.error("No Metadata found in logData");
        continue;
      }
      const encryptedText = logData.Metadata.encrypted_matched_data;
      if (!encryptedText) {
        console.error("No encrypted matched data found in logData");
        msgs.push(logData);
        continue;
      }
      logData.Metadata.decrypted_matched_data =
        (await decode(encryptedText, MATCHED_PAYLOAD_PRIVATE_KEY)) ??
        "Failed to decrypt";
      msgs.push(logData);
    }

    returnMsgs = returnMsgs.concat(msgs);
    buffer = nextBatch ? nextBatch : "";
  } else if (lastBatch) {
    const logData = JSON.parse(txt) as LogMessage;
    if (!logData.Metadata) {
      console.error("No Metadata found in logData");
      return { returnMsgs: [], buffer: txt };
    }
    const encryptedText = logData.Metadata.encrypted_matched_data;
    if (!encryptedText) {
      console.error("No encrypted matched data found in logData");
      return { returnMsgs: [], buffer: txt };
    }
    logData.Metadata.decrypted_matched_data =
      (await decode(encryptedText, MATCHED_PAYLOAD_PRIVATE_KEY)) ??
      "Failed to decrypt";
    returnMsgs.push(logData);
  } else {
    buffer += txt;
  }
  return { returnMsgs, buffer };
}
