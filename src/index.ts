import { AutoRouter, type IRequest } from "itty-router";
import { parseTransformer } from "./log_message";
import { decodeTransformer } from "./matched_data";

type Env = {
  MATCHED_PAYLOAD_PRIVATE_KEY: string;
};

const router = AutoRouter();

router
  .put("/logs/:logdata+", async (req: IRequest, env: Env) => {
    // When configuring logpush the test.txt.gz isn't actually gzipped
    // so our DecompressionStream("gzip") below fails, but we can just accept it
    if (/\d{8}\/test.txt.gz/.test(req.params.logdata)) {
      return new Response("OK");
    }

    // sanity check
    if (!req.body) {
      return new Response("No body", { status: 400 });
    }

    // we do a series of TransformStreams here so that we can support
    // a large number of message lines per each worker invocation
    await req.body
      .pipeThrough(new DecompressionStream("gzip"))
      .pipeThrough(new TextDecoderStream("utf-8"))
      .pipeThrough(parseTransformer())
      .pipeThrough(
        decodeTransformer(
          env.MATCHED_PAYLOAD_PRIVATE_KEY,
          // this is async in case data needs to be sent anywhere
          async (data: string | null) => {
            /**
             * CONFIGURE ME
             * Edit the below line to send each the decrypted payload somewhere useful
             * it is *strongly* recommended to *NOT* console.log the decrypted data in production
             */
            // console.log(data);
          }
        )
      )
      // we need to have a writable stream (even if it's a no-op)
      // so that we can await on a promise and complete our work
      .pipeTo(new WritableStream())
      .catch((err) => console.error(err));

    return new Response("OK");
  })
  .all("*", () => new Response("Not Found.", { status: 404 }));

export default { ...router };
