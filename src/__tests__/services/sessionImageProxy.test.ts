/** @jest-environment node */
import { PassThrough } from "node:stream";
import handler from "@/pages/api/proxy";

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test("API proxy preserves exact firmware uint64 camera parameter IDs", async () => {
  const originalFetch = global.fetch;
  const text = '{"code":0,"data":{"paramId":144396663052566529}}';
  global.fetch = jest.fn(
    async () =>
      new Response(text, {
        headers: { "Content-Type": "application/json" },
      }),
  ) as typeof fetch;
  const response = new PassThrough() as any;
  response.status = jest.fn(() => response);
  response.setHeader = jest.fn();
  response.send = jest.fn(() => response.end());
  response.json = jest.fn();
  try {
    await handler(
      {
        query: {
          target: "http://192.0.2.1:8082/shootingMode/getParamAndSetting",
        },
        headers: {},
        method: "GET",
      } as any,
      response,
    );
    expect(response.send).toHaveBeenCalledWith(text);
  } finally {
    global.fetch = originalFetch;
    response.destroy();
  }
});

test("continuous JPEG proxy streams parts and cancels upstream on viewer disconnect", async () => {
  const originalFetch = global.fetch;
  const cancel = jest.fn();
  let source!: ReadableStreamDefaultController<Uint8Array>;
  let signal!: AbortSignal;
  global.fetch = jest.fn(async (_url, options) => {
    signal = options!.signal!;
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          source = controller;
        },
        cancel,
      }),
      {
        headers: {
          "Content-Type": "multipart/x-mixed-replace; boundary=frame",
        },
      },
    );
  }) as typeof fetch;
  const output: string[] = [];
  const response = new PassThrough() as any;
  response.status = jest.fn(() => response);
  response.setHeader = jest.fn();
  response.json = jest.fn();
  response.on("data", (bytes: Buffer) => output.push(bytes.toString("latin1")));
  try {
    let settled = false;
    const running = handler(
      {
        query: { target: "http://192.0.2.1:8092/mainstream" },
        headers: {},
        method: "GET",
      } as any,
      response,
    ).then(() => {
      settled = true;
    });
    await tick();
    const partText =
        "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: 4\r\n\r\n\xff\xd8\xff\xd9\r\n",
      part = Uint8Array.from(Buffer.from(partText, "latin1"));
    source.enqueue(part);
    await tick();
    source.enqueue(part);
    await tick();
    expect(output.join("")).toEqual(partText.repeat(2));
    expect(settled).toBe(false);
    expect(response.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "multipart/x-mixed-replace; boundary=frame",
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "no-store",
    );
    response.destroy();
    await running;
    expect(signal.aborted).toBe(true);
    expect(cancel).toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  } finally {
    response.destroy();
    global.fetch = originalFetch;
  }
});
