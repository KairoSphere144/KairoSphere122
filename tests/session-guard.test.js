import test from "node:test";
import assert from "node:assert/strict";
import { createSessionRequestGuard, runSessionMutation } from "../src/core/session-guard.js";

test("invalidates workspace tickets when the authenticated account changes", () => {
  const guard = createSessionRequestGuard();
  const first = guard.activate("user-a").ticket;
  const second = guard.activate("user-b").ticket;
  assert.equal(guard.isCurrent(first), false);
  assert.equal(guard.isCurrent(second), true);
});

test("invalidates workspace tickets on sign-out", () => {
  const guard = createSessionRequestGuard();
  const signedIn = guard.activate("user-a").ticket;
  guard.activate(null);
  assert.equal(guard.isCurrent(signedIn), false);
});

test("ignores a late successful mutation after account switching", async () => {
  const guard = createSessionRequestGuard();
  const ticket = guard.activate("user-a").ticket;
  let resolve;
  let success = false;
  const pending = new Promise(r => { resolve = r; });
  const mutation = runSessionMutation({
    operation: () => pending,
    isCurrent: () => guard.isCurrent(ticket),
    onSuccess: () => { success = true; },
    onError: () => assert.fail("stale error handler must not run")
  });
  guard.activate("user-b");
  resolve({ id: "record-a" });
  assert.equal(await mutation, false);
  assert.equal(success, false);
});

test("ignores a late failed mutation after sign-out", async () => {
  const guard = createSessionRequestGuard();
  const ticket = guard.activate("user-a").ticket;
  let reject;
  let error = false;
  const pending = new Promise((_, r) => { reject = r; });
  const mutation = runSessionMutation({
    operation: () => pending,
    isCurrent: () => guard.isCurrent(ticket),
    onSuccess: () => assert.fail("stale success handler must not run"),
    onError: () => { error = true; }
  });
  guard.activate(null);
  reject(new Error("late failure"));
  assert.equal(await mutation, false);
  assert.equal(error, false);
});

test("applies successful mutations while the originating session remains active", async () => {
  const guard = createSessionRequestGuard();
  const ticket = guard.activate("user-a").ticket;
  let result;
  const applied = await runSessionMutation({
    operation: async () => ({ id: "record-a" }),
    isCurrent: () => guard.isCurrent(ticket),
    onSuccess: value => { result = value; },
    onError: error => { throw error; }
  });
  assert.equal(applied, true);
  assert.deepEqual(result, { id: "record-a" });
});
