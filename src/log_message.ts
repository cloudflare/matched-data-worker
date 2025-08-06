import { TransformNewlineStream } from "./transform_newline_stream";

export type MetadataObject = {
  encrypted_matched_data: string;
  ruleset_version: string;
  version: string;
};

export type LogMessage = {
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

export function parseTransformer() {
  return new TransformNewlineStream(async (line: string) => {
    try {
      const { Metadata } = JSON.parse(line) as LogMessage;
      // We are only returning the matched data contents
      // because that is only what we care about in this script
      // but the entire message could be returned if desired
      return Metadata.encrypted_matched_data;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  });
}
