export function createSessionRequestGuard() {
  let activeUserId = null;
  let generation = 0;

  return {
    activate(userId) {
      const nextUserId = userId ?? null;
      const changed = nextUserId !== activeUserId;
      activeUserId = nextUserId;
      // Every auth initialization creates a new generation, even for the same user.
      // This prevents an older workspace load from winning after a token refresh
      // or duplicate auth initialization for the currently signed-in account.
      generation += 1;
      return { changed, ticket: { userId: activeUserId, generation } };
    },
    isCurrent(ticket) {
      return ticket?.userId === activeUserId && ticket?.generation === generation;
    }
  };
}

/**
 * Suppress stale UI callbacks after the originating session changes.
 * This does not cancel, reverse, or roll back an operation already dispatched
 * to the data service; database authorization must still be enforced by RLS.
 */
export async function runSessionMutation({ operation, isCurrent, onSuccess, onError }) {
  if (!isCurrent()) return false;
  try {
    const result = await operation();
    if (!isCurrent()) return false;
    onSuccess(result);
    return true;
  } catch (error) {
    if (isCurrent()) onError(error);
    return false;
  }
}
