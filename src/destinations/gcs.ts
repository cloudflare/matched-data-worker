import { TransformPassthrough } from "../streams/transform_passthrough";

type GCSAccessKeyJSON = {
  client_email: string;
  private_key: string;
};
type GCSConfig = {
  bucketName: string;
  fileName: string | (() => string);
  accessKeyJSON: GCSAccessKeyJSON;
};

function strToBase64Url(str: string): string {
  return uint8ToBase64Url(new TextEncoder().encode(str));
}

function uint8ToBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCodePoint(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// PEM → DER
function pemToDer(pem: string): Uint8Array {
  const normalizedPem = pem.replace(/\\n/g, "\n");
  const b64 = normalizedPem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function getAccessToken({ client_email, private_key }: GCSAccessKeyJSON) {
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = { alg: "RS256", typ: "JWT" };
  const jwtClaim = {
    iss: client_email,
    scope: "https://www.googleapis.com/auth/devstorage.read_write",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encHeader = strToBase64Url(JSON.stringify(jwtHeader));
  const encClaim = strToBase64Url(JSON.stringify(jwtClaim));
  const sigData = new TextEncoder().encode(`${encHeader}.${encClaim}`);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, sigData);
  const encSignature = uint8ToBase64Url(new Uint8Array(signature));
  const jwt = `${encHeader}.${encClaim}.${encSignature}`;

  const tokenData = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  }).then((res) => res.json() as { access_token?: string });

  if (!tokenData.access_token) {
    throw new Error(
      `Failed to get GCS access token: ${JSON.stringify(tokenData)}`,
    );
  }
  return tokenData.access_token;
}

export async function gcsDestination(config: GCSConfig) {
  const filename =
    typeof config.fileName === "function" ? config.fileName() : config.fileName;
  const accessToken = await getAccessToken(config.accessKeyJSON);
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${config.bucketName}/o?uploadType=media&name=${filename}`;
  const messages: string[] = [];

  return new TransformPassthrough({
    async transform(line: string) {
      messages.push(line);
    },
    // @ts-expect-error Promise<void> means the caller doesn't care, not that we shouldn't return anything
    flush() {
      return fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/plain",
        },
        // @TODO support a ReadableStream here
        body: messages.join("\n"),
      });
    },
  });
}
