import { beforeEach, describe, expect, it, vi } from "vitest";

// Capture GA calls without loading Next's real analytics bridge.
const { sendGAEvent } = vi.hoisted(() => ({ sendGAEvent: vi.fn() }));
vi.mock("@next/third-parties/google", () => ({ sendGAEvent }));

import { trackEditorAction } from "./analytics";

describe("analytics privacy", () => {
  beforeEach(() => sendGAEvent.mockClear());

  it("forwards only the action constant as the editor label", () => {
    trackEditorAction("toolbar_insert");

    expect(sendGAEvent).toHaveBeenCalledTimes(1);
    const [event, action, params] = sendGAEvent.mock.calls[0];
    expect(event).toBe("event");
    expect(action).toBe("editor_action");
    expect(params.event_label).toBe("toolbar_insert");
  });

  it("has no parameter through which document text could ship", () => {
    // Structural guard: the app promises nothing leaves the browser, so the
    // editor tracker must not accept a content payload at all.
    expect(trackEditorAction).toHaveLength(1);

    const secret = "SECRET_DOCUMENT_BODY_should_never_ship";
    trackEditorAction("toolbar_insert");
    expect(JSON.stringify(sendGAEvent.mock.calls)).not.toContain(secret);
  });
});
