export type MetadataObject = {
  encrypted_matched_data?: string;
  decrypted_matched_data?: string;
  // ignoring other fields we don't need
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

export function parseLine(line: string) {
  return JSON.parse(line) as LogMessage;
}
