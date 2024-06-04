import { inflate } from "pako";

type MetadataObject = {
  encrypted_matched_data: string;
  ruleset_version: string;
  version: string;
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

export function parse(buff: ArrayBuffer): (MetadataObject | false)[] {
  return inflate(buff, { to: "string" })
    .trim()
    .split("\n")
    .map((line) => {
      try {
        // We are only returning the matched data contents
        // because that is only what we care about in this script
        // but the entire message could be returned if desired
        const { Metadata }: LogMessage = JSON.parse(line);
        return Metadata ?? false;
      } catch {
        return false;
      }
    });
}
