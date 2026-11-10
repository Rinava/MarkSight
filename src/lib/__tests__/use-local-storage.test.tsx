import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocalStorage } from "../use-local-storage";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useLocalStorage", () => {
  it("starts from the default when nothing is stored", () => {
    const { result } = renderHook(() => useLocalStorage({ key: "doc", defaultValue: "hello" }));
    expect(result.current[0]).toBe("hello");
  });

  it("hydrates from a previously stored value", () => {
    window.localStorage.setItem("doc", JSON.stringify("saved"));
    const { result } = renderHook(() => useLocalStorage({ key: "doc", defaultValue: "hello" }));
    expect(result.current[0]).toBe("saved");
  });

  it("keeps the default and warns when the stored JSON is corrupt", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem("doc", "{not json");
    const { result } = renderHook(() => useLocalStorage({ key: "doc", defaultValue: "hello" }));
    expect(result.current[0]).toBe("hello");
    expect(warn).toHaveBeenCalled();
  });

  it("writes new values through to storage as JSON", () => {
    const { result } = renderHook(() => useLocalStorage({ key: "doc" }));
    act(() => {
      result.current[1]("next");
    });
    expect(result.current[0]).toBe("next");
    expect(window.localStorage.getItem("doc")).toBe(JSON.stringify("next"));
  });

  it("supports updater functions", () => {
    const { result } = renderHook(() => useLocalStorage({ key: "doc", defaultValue: "a" }));
    act(() => {
      result.current[1]((prev) => `${prev}b`);
    });
    expect(result.current[0]).toBe("ab");
  });

  it("still updates state when storage refuses the write", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const { result } = renderHook(() => useLocalStorage({ key: "doc" }));
    act(() => {
      result.current[1]("big");
    });
    expect(result.current[0]).toBe("big");
    expect(warn).toHaveBeenCalled();
  });
});
