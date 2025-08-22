type PassthroughTransformer = {
  transform: (str: string) => Promise<string | void>;
  flush: () => Promise<void>;
};

export class TransformPassthrough extends TransformStream<string, string> {
  constructor(transformer: PassthroughTransformer) {
    super({
      start() {},
      async transform(line: string, controller) {
        const res = (await transformer.transform(line)) ?? line;
        controller.enqueue(res);
      },
      async flush() {
        await transformer.flush();
      },
    });
  }
}
