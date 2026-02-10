const path = require('node:path');

// ─── CONSTANTS ───────────────────────────────────────────────────────

const REGISTRY_URL =
  'https://raw.githubusercontent.com/CBDB-Code/UI_Shadcn/main/registry.json';

const TEMPLATES = {
  minimal: {
    description: 'Basic UI primitives (4 components)',
    components: ['button', 'card', 'badge', 'input'],
  },
  form: {
    description: 'Form-focused layout (10 components)',
    components: [
      'button', 'card', 'input', 'label', 'form',
      'select', 'checkbox', 'radio-group', 'textarea', 'switch',
    ],
  },
  dashboard: {
    description: 'Full dashboard with charts and navigation (12 components)',
    components: [
      'button', 'card', 'badge', 'input', 'tabs', 'table',
      'chart', 'sidebar', 'dropdown-menu', 'avatar', 'separator', 'skeleton',
    ],
  },
};

const TIMEOUTS = {
  viteCreate: 120_000,
  npmInstall: 120_000,
  shadcnInit: 60_000,
  componentInstall: 300_000,
};

const EXIT_CODES = { SUCCESS: 0, FAILURE: 1 };

const STATE_FILENAME = '.scaffolder-state.json';

// ─── LOGGING ─────────────────────────────────────────────────────────

const COLORS = {
  reset:  '\x1b[0m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  dim:    '\x1b[2m',
};

const LOG_PREFIXES = {
  INFO:    `${COLORS.cyan}[INFO]${COLORS.reset}`,
  WARN:    `${COLORS.yellow}[WARN]${COLORS.reset}`,
  ERROR:   `${COLORS.red}[ERROR]${COLORS.reset}`,
  SUCCESS: `${COLORS.green}[SUCCESS]${COLORS.reset}`,
};

function log(level, message) {
  const prefix = LOG_PREFIXES[level] || `[${level}]`;
  const ts = COLORS.dim + new Date().toISOString().slice(11, 19) + COLORS.reset;
  console.log(`${prefix} ${ts} ${message}`);
}

// ─── HELPERS ─────────────────────────────────────────────────────────

function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

module.exports = {
  REGISTRY_URL,
  TEMPLATES,
  TIMEOUTS,
  EXIT_CODES,
  STATE_FILENAME,
  log,
  formatDuration,
};
