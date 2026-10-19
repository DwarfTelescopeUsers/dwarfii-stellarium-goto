import { openDevicePreview } from "@/services/dwarf/previewSession";

function fixture() {
  const abort = new AbortController();
  const socket = {
    isConnected: () => true,
    currentClient: {},
    session: { state: { generation: 1, ownership: "control" } },
    request: jest.fn().mockResolvedValue({}),
  };
  return { abort, socket, context: { socketIPDwarf: socket } as any };
}

test.each(["page", "generation", "ownership"])(
  "preview cannot send its next command after %s changes",
  async (change) => {
    const { abort, socket, context } = fixture();
    let complete!: (value: unknown) => void;
    socket.request.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const pending = openDevicePreview(context, [0, 1], abort.signal);
    if (change === "page") abort.abort();
    if (change === "generation") socket.session.state.generation++;
    if (change === "ownership") socket.session.state.ownership = "slave";
    complete({});
    await expect(pending).rejects.toThrow("changed");
    expect(socket.request).toHaveBeenCalledTimes(1);
  },
);

test("parallel previews use only their originating sockets", async () => {
  const a = fixture(),
    b = fixture();
  await Promise.all([
    openDevicePreview(a.context, [0], a.abort.signal),
    openDevicePreview(b.context, [1], b.abort.signal),
  ]);
  expect(a.socket.request.mock.calls.map(([command]) => command)).toEqual([
    "enterCamera",
    "telePreviewQuality",
  ]);
  expect(b.socket.request.mock.calls.map(([command]) => command)).toEqual([
    "enterCamera",
    "widePreviewQuality",
  ]);
});

test("explicit Go live uses idle evidence and refreshes the reported stream after starting preview", async () => {
  const { socket, context, abort } = fixture();
  socket.request.mockResolvedValueOnce({
    data: { teleCameraStateInfo: { exclusiveState: {} } },
  });
  await openDevicePreview(context, [0], abort.signal, true);
  expect(socket.request.mock.calls.map(([command]) => command)).toEqual([
    "getDeviceState",
    "enterCamera",
    "goLiveTele",
    "telePreviewQuality",
    "getDeviceState",
  ]);
});

test.each([
  {},
  {
    teleCameraStateInfo: { exclusiveState: { captureRawState: { state: 1 } } },
  },
])(
  "Go live never interrupts an active or unverified camera",
  async (snapshot) => {
    const { socket, context, abort } = fixture();
    socket.request.mockResolvedValueOnce({ data: snapshot });
    await expect(
      openDevicePreview(context, [0], abort.signal, true),
    ).rejects.toThrow("idle state");
    expect(socket.request.mock.calls.map(([command]) => command)).toEqual([
      "getDeviceState",
    ]);
  },
);

test("a stale context address cannot send preview commands to another device", async () => {
  const { socket, context, abort } = fixture();
  context.IPDwarf = "192.0.2.2";
  Object.assign(socket, { IPDwarf: "192.0.2.1" });
  await expect(openDevicePreview(context, [0], abort.signal)).rejects.toThrow(
    "changed",
  );
  expect(socket.request).not.toHaveBeenCalled();
});
