/**
 * Tiny pub/sub so core logic never has to import UI code.
 *
 * Topics:
 *   image     - a new image/project was loaded
 *   layers    - layer list changed (added, removed, reordered, renamed, visibility, fill)
 *   geometry  - a layer moved
 *   selection - selected layer changed
 *   history   - undo/redo availability changed
 *   view      - zoom/pan changed
 *   mode      - active tool changed
 *   gesture   - pointer gesture state changed (box drawing, hover, etc.)
 *
 * Emits are batched into one flush per microtask, so a burst of changes
 * only re-renders each subscriber once.
 */

const subscribers = new Map();
const pending = new Set();
let scheduled = false;

export function on(topics, fn) {
  for (const topic of [].concat(topics)) {
    if (!subscribers.has(topic)) subscribers.set(topic, new Set());
    subscribers.get(topic).add(fn);
  }
}

export function emit(...topics) {
  for (const t of topics) pending.add(t);
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(flush);
}

function flush() {
  scheduled = false;
  const topics = [...pending];
  pending.clear();

  // Call each subscriber once even if it listens to several emitted topics.
  const called = new Set();
  for (const t of [...topics, '*']) {
    const subs = subscribers.get(t);
    if (!subs) continue;
    for (const fn of subs) {
      if (called.has(fn)) continue;
      called.add(fn);
      try {
        fn(topics);
      } catch (err) {
        console.error(`[events] subscriber for "${t}" failed`, err);
      }
    }
  }
}
