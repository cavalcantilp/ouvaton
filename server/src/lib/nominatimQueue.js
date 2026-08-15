// Nominatim's usage policy caps anonymous usage at ~1 request/second and
// requires a descriptive User-Agent. This tiny queue serialises our outgoing
// requests so a burst of address lookups from the UI never breaks that rule.
const MIN_INTERVAL_MS = 1100;

let queue = Promise.resolve();
let lastCallAt = 0;

export function runThrottled(task) {
  const run = async () => {
    const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastCallAt = Date.now();
    return task();
  };

  const result = queue.then(run, run);
  // Keep the chain alive even if this task rejects.
  queue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}
