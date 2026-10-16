/**
 * The app's single writer for auth tokens, scoped to the active local server.
 *
 * Older builds used one global "multica_token" key; getToken migrates that
 * value to the active server profile the first time it is read.
 *
 * Every Keychain operation is async, and several things race to write this one
 * value: logout, a 401 teardown, a new sign-in, and a background session
 * renewal that started before any of them. Interleaved, they produce states no
 * single path intends — most sharply, a renewal writing its result on top of a
 * sign-in that finished while it was suspended, leaving the app logged in as
 * one account and persisted as another.
 *
 * So writes are SERIALIZED here, and a conditional write can be decided inside
 * that serialization (see commitRenewedToken). That is what makes a stale
 * write refusable instead of something to undo afterwards — undoing it means
 * deleting whatever is there now, which may belong to a session that started
 * after the stale one and has every right to exist.
 */
import * as SecureStore from "expo-secure-store";

import { sessionEpochChanged } from "./session-epoch";
import { getActiveServerId } from "./backend-config-store";

const LEGACY_TOKEN_KEY = "multica_token";
const tokenKey = (serverId = getActiveServerId()) =>
  `multica_token_v1_${serverId || "default"}`;

// Tail of the write queue. Each operation chains onto the previous one so no
// two can be in flight at once; failures do not stall the queue.
let writes: Promise<unknown> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = writes.then(operation, operation);
  writes = result.catch(() => undefined);
  return result;
}

export async function getToken(): Promise<string | null> {
  const key = tokenKey();
  const token = await SecureStore.getItemAsync(key);
  if (token) return token;
  // Older builds had one global token. Associate it with the currently
  // selected server once, then remove the legacy key.
  const legacy = await SecureStore.getItemAsync(LEGACY_TOKEN_KEY);
  if (!legacy) return null;
  await serialize(async () => {
    if (!(await SecureStore.getItemAsync(key))) {
      await SecureStore.setItemAsync(key, legacy);
    }
    await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY);
  });
  return SecureStore.getItemAsync(key);
}

export async function setToken(token: string): Promise<void> {
  const key = tokenKey();
  await serialize(() => SecureStore.setItemAsync(key, token));
}

export async function clearToken(): Promise<void> {
  await clearTokenForServer(getActiveServerId());
  await serialize(() => SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY));
}

export async function clearTokenForServer(serverId: string): Promise<void> {
  const key = tokenKey(serverId);
  await serialize(async () => {
    await SecureStore.deleteItemAsync(key);
  });
}

/**
 * Persist a renewed token, but only if the session it renews is still the one
 * the app is using. Returns whether the write happened.
 *
 * The check and the write are one serialized unit, which is the whole point: a
 * logout or a sign-in cannot land between them, so "is this still current?"
 * cannot go stale between being asked and being acted on. Both conditions are
 * needed and neither implies the other — the epoch catches a teardown that has
 * STARTED but not finished (its Keychain delete is still in flight, so a read
 * would still return the old token), and the value comparison catches a
 * credential replaced by any path that did not move the epoch.
 */
export async function commitRenewedToken(
  token: string,
  expected: { epoch: number; previousToken: string },
): Promise<boolean> {
  const key = tokenKey();
  return serialize(async () => {
    if (sessionEpochChanged(expected.epoch)) return false;
    const current = await SecureStore.getItemAsync(key);
    if (current !== expected.previousToken) return false;
    await SecureStore.setItemAsync(key, token);
    return true;
  });
}
