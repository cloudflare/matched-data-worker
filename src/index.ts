import type { IRequest } from "itty-router";
import { AutoRouter } from "itty-router";
import { decode } from "./matched_data";
import { parse } from "./log_message";

type Env = {
  MATCHED_PAYLOAD_PRIVATE_KEY: string;
};

const router = AutoRouter();

router.put("/logs/:logdata+", async (req: IRequest, env: Env) => {
  // Validation step
  if (/\/ownership-challenge-[a-fA-F0-9]{8}.txt/.test(req.params.logdata)) {
    return new Response("OK");
  }

  // Test push
  // for some reason the inflate() from pako doesn't like the test.txt.gz file
  // so we'll just accept it and move on as there's nothing of value in there anyway
  if (/\d{8}\/test.txt.gz/.test(req.params.logdata)) {
    return new Response("OK");
  }

  const data = await Promise.all(
    parse(await req.arrayBuffer()).map((log) =>
      log
        ? decode(log.encrypted_matched_data, env.MATCHED_PAYLOAD_PRIVATE_KEY)
        : false
    )
  ).catch((e) => console.error(e));
  /**
   * CONFIGURE ME
   * Edit the below line to send the decrypted payload somewhere useful
   * it is *strongly* recommended to *NOT* console.log the decrypted data in production
   */
  // console.log(data);

  return new Response("OK");
}).all("*", () => new Response("Not Found.", { status: 404 }));

export default { ... router };