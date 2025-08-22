type LineProcessor = (line: string) => Promise<string | undefined>;

export class TransformNewlineStream extends TransformStream<string, string> {
  constructor(lineProcessor: LineProcessor) {
    let prevChunkEnd = "";

    async function processChunk(
      chunk: string,
      prevChunkEnd: string,
      controller: TransformStreamDefaultController,
      flush = false,
    ) {
      const parts = chunk.split("\n");
      const start = prevChunkEnd + (parts.shift() ?? "");
      const end = flush ? "" : (parts.pop() ?? "");

      for (const line of [start].concat(parts)) {
        try {
          const res = await lineProcessor(line);
          if (res) {
            controller.enqueue(res + (flush ? "\n" : ""));
          }
        } catch (err) {
          console.error(err);
        }
      }

      return end;
    }

    super({
      start() {},
      async transform(chunk, controller) {
        if (chunk) {
          prevChunkEnd = await processChunk(chunk, prevChunkEnd, controller);
        }
      },
      async flush(controller) {
        if (prevChunkEnd.length > 0) {
          await processChunk(prevChunkEnd, "", controller, true);
        }
      },
    });
  }
}
