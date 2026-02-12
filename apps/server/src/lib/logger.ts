const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function timestamp() {
  return new Date().toISOString().slice(11, 23);
}

export const log = {
  info(tag: string, message: string, ...args: unknown[]) {
    console.log(`${COLORS.dim}${timestamp()}${COLORS.reset} ${COLORS.cyan}[${tag}]${COLORS.reset} ${message}`, ...args);
  },
  success(tag: string, message: string, ...args: unknown[]) {
    console.log(`${COLORS.dim}${timestamp()}${COLORS.reset} ${COLORS.green}[${tag}]${COLORS.reset} ${message}`, ...args);
  },
  warn(tag: string, message: string, ...args: unknown[]) {
    console.warn(`${COLORS.dim}${timestamp()}${COLORS.reset} ${COLORS.yellow}[${tag}]${COLORS.reset} ${message}`, ...args);
  },
  error(tag: string, message: string, ...args: unknown[]) {
    console.error(`${COLORS.dim}${timestamp()}${COLORS.reset} ${COLORS.red}[${tag}]${COLORS.reset} ${message}`, ...args);
  },
};
