/**
 * Tiny logger: no-ops most levels in production builds, so shipped bundles
 * stay quiet while dev/preview keeps full console visibility.
 *
 * - debug/info/warn: only forwarded when `import.meta.env.DEV` is true.
 * - error: always forwarded (production diagnostics still need it).
 *
 * Usage:
 *   import { log } from '@/lib/log';
 *   log.debug('foo', value);
 *   log.error('[MyComponent] failed', err);
 */
const isDev = typeof import.meta !== 'undefined' && !!(import.meta as any).env?.DEV;

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {};

export const log = {
  debug: (isDev ? console.log.bind(console) : noop) as LogFn,
  info: (isDev ? console.info.bind(console) : noop) as LogFn,
  warn: (isDev ? console.warn.bind(console) : noop) as LogFn,
  error: console.error.bind(console) as LogFn,
};

export default log;
