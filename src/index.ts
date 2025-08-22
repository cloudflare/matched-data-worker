import { AutoRouter, type IRequest } from "itty-router";
import { decodeTransformer } from "./matched_data";
import { counterDestination } from "./destinations/counter";
import { gcsDestination } from "./destinations/gcs";

type Env = {
  MATCHED_PAYLOAD_PRIVATE_KEY: string;
  GCS_ACCESS_KEY_JSON?: string;
  GCS_BUCKET_NAME?: string;
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
      .pipeThrough(decodeTransformer(env.MATCHED_PAYLOAD_PRIVATE_KEY))
      .pipeThrough(counterDestination())
      /**
       * Warning!
       * the GCS provider doesn't support streaming the file to the bucket.
       * This means that messages must be buffered in memory and may cause issues.
       */
      // .pipeThrough(
      //   await gcsDestination({
      //     bucketName: env.GCS_BUCKET_NAME ?? "",
      //     fileName() {
      //       const [date, time] = new Date().toISOString().split("T");
      //       return `waf-logs/${date}/${time}.txt`;
      //     },
      //     accessKeyJSON: JSON.parse(env.GCS_ACCESS_KEY_JSON ?? "{}") ?? {},
      //   }),
      // )
      /**
       * A dummy sync so that this promise will resolve
       */
      .pipeTo(new WritableStream())
      .catch((err) => console.error(err));

    return new Response("OK");
  })
  .all("*", () => new Response("Not Found.", { status: 404 }));

export default { ...router };
