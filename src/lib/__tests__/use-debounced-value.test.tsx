import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "../use-debounced-value";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebouncedValue", () => {
  it("returns the initial value right away", () => {
    const { result } = renderHook(() => useDebouncedValue("a"));
    expect(result.current).toBe("a");
  });

  it("holds the old value until the delay has passed", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, { delayMs: 100 }),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    act(() => {
      vi.advanceTimersByTime(99);
    });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("b");
  });

  it("restarts the timer on every change and only applies the last value", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, { delayMs: 100 }),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    act(() => {
      vi.advanceTimersByTime(80);
    });
    rerender({ value: "c" });
    act(() => {
      vi.advanceTimersByTime(80);
    });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(result.current).toBe("c");
  });

  it("with maxWaitMs, keeps up with changes that never pause long enough", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, { delayMs: 100, maxWaitMs: 150 }),
      { initialProps: { value: "a" } }
    );

    // A change every 60ms: a plain debounce would never fire.
    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(60);
    });
    rerender({ value: "abc" });
    act(() => {
      vi.advanceTimersByTime(60);
    });
    rerender({ value: "abcd" });
    expect(result.current).toBe("a");

    // 150ms after the first unapplied change, the latest value lands.
    act(() => {
      vi.advanceTimersByTime(30);
    });
    expect(result.current).toBe("abcd");
  });

  it("with maxWaitMs, starts a fresh window after each flush", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, { delayMs: 100, maxWaitMs: 150 }),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "b" });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("b");

    rerender({ value: "c" });
    act(() => {
      vi.advanceTimersByTime(99);
    });
    expect(result.current).toBe("b");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("c");
  });

  it("defaults to a 200ms delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 1 },
    });
    rerender({ value: 2 });
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe(1);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(2);
  });

  it("clears the pending timer on unmount", () => {
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, { delayMs: 100 }),
      { initialProps: { value: "a" } }
    );
    rerender({ value: "b" });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
