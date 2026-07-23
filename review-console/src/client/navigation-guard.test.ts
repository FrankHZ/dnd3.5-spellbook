import { describe, expect, it, vi } from "vitest";

import { createNavigationGuard } from "./navigation-guard";

describe("review navigation guard", () => {
  it("runs clean navigation immediately without opening a prompt", () => {
    const guard = createNavigationGuard();
    const navigate = vi.fn();

    expect(guard.request(false, navigate)).toBe(false);
    expect(navigate).toHaveBeenCalledOnce();
    expect(guard.hasPending()).toBe(false);
  });

  it("cancels pending dirty navigation without running it", () => {
    const guard = createNavigationGuard();
    const navigate = vi.fn();

    expect(guard.request(true, navigate)).toBe(true);
    expect(guard.hasPending()).toBe(true);
    guard.cancel();
    guard.confirm();

    expect(navigate).not.toHaveBeenCalled();
    expect(guard.hasPending()).toBe(false);
  });

  it("confirms pending dirty navigation exactly once", () => {
    const guard = createNavigationGuard();
    const navigate = vi.fn();

    expect(guard.request(true, navigate)).toBe(true);
    guard.confirm();
    guard.confirm();

    expect(navigate).toHaveBeenCalledOnce();
    expect(guard.hasPending()).toBe(false);
  });
});
