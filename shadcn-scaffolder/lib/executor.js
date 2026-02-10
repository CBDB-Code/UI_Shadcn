const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { REGISTRY_URL, TIMEOUTS, log, formatDuration } = require('./utils');

// ─── GENERIC COMMAND RUNNER ──────────────────────────────────────────

function runCommand(command, args, { cwd, timeout, label }) {
  return new Promise((resolve, reject) => {
    log('INFO', `Running: ${command} ${args.join(' ')}`);
    log('INFO', `  cwd: ${cwd}, timeout: ${formatDuration(timeout)}`);

    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      timeout,
      killSignal: 'SIGTERM',
    });

    child.on('close', (code, signal) => {
      const timedOut = signal === 'SIGTERM' && code === null;
      resolve({ code, signal, timedOut });
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn "${command}": ${err.message}`));
    });
  });
}

// ─── STEP 1: VITE PROJECT CREATION ──────────────────────────────────

async function createViteProject(projectName, targetDir, timeout = TIMEOUTS.viteCreate) {
  log('INFO', `Creating Vite project "${projectName}" in ${targetDir}...`);

  try {
    const result = await runCommand(
      'npx',
      ['create-vite@latest', projectName, '--template', 'react-ts'],
      { cwd: targetDir, timeout, label: 'Vite project creation' }
    );

    if (result.timedOut) {
      return { success: false, error: `Vite creation timed out after ${formatDuration(timeout)}` };
    }
    if (result.code !== 0) {
      return { success: false, error: `Vite creation failed with exit code ${result.code}` };
    }

    const projectPath = path.join(targetDir, projectName);
    if (!fs.existsSync(path.join(projectPath, 'package.json'))) {
      return { success: false, error: 'Vite created but package.json not found' };
    }

    log('SUCCESS', 'Vite project created.');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── STEP 2: NPM INSTALL ────────────────────────────────────────────

async function npmInstall(projectPath, timeout = TIMEOUTS.npmInstall) {
  log('INFO', 'Installing npm dependencies...');

  try {
    const result = await runCommand(
      'npm',
      ['install'],
      { cwd: projectPath, timeout, label: 'npm install' }
    );

    if (result.timedOut) {
      return { success: false, error: `npm install timed out after ${formatDuration(timeout)}` };
    }
    if (result.code !== 0) {
      return { success: false, error: `npm install failed with exit code ${result.code}` };
    }

    if (!fs.existsSync(path.join(projectPath, 'node_modules'))) {
      return { success: false, error: 'npm install completed but node_modules not found' };
    }

    log('SUCCESS', 'npm dependencies installed.');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── STEP 3: SHADCN INIT ────────────────────────────────────────────

async function initShadcn(projectPath, timeout = TIMEOUTS.shadcnInit) {
  log('INFO', 'Initializing shadcn/ui...');

  try {
    const result = await runCommand(
      'npx',
      ['shadcn@latest', 'init', '--yes', '--defaults', '--force', '--cwd', projectPath],
      { cwd: projectPath, timeout, label: 'shadcn init' }
    );

    if (result.timedOut) {
      return { success: false, error: `shadcn init timed out after ${formatDuration(timeout)}` };
    }
    if (result.code !== 0) {
      return { success: false, error: `shadcn init failed with exit code ${result.code}` };
    }

    log('SUCCESS', 'shadcn/ui initialized.');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── STEP 4: INSTALL COMPONENTS ─────────────────────────────────────

async function installComponents(projectPath, components, timeout = TIMEOUTS.componentInstall) {
  if (components.length === 0) {
    return { success: true, installed: [], failed: [] };
  }

  log('INFO', `Installing ${components.length} component(s) from registry...`);
  log('INFO', `  Components: ${components.join(', ')}`);

  const installed = [];
  const failed = [];
  const startTime = Date.now();

  // --- Attempt batch install ---
  try {
    const batchResult = await runCommand(
      'npx',
      [
        'shadcn@latest', 'add',
        '--registry', REGISTRY_URL,
        '--yes', '--overwrite',
        '--cwd', projectPath,
        ...components,
      ],
      { cwd: projectPath, timeout, label: 'Component batch install' }
    );

    if (batchResult.code === 0) {
      installed.push(...components);
      log('SUCCESS', `All ${components.length} component(s) installed via batch.`);
      return { success: true, installed, failed };
    }

    log('WARN', 'Batch install failed. Falling back to individual installs...');
  } catch (err) {
    log('WARN', `Batch install error: ${err.message}. Falling back...`);
  }

  // --- Individual fallback ---
  for (const name of components) {
    const elapsed = Date.now() - startTime;
    const remaining = timeout - elapsed;

    if (remaining <= 5000) {
      log('WARN', 'Timeout budget exhausted. Skipping remaining components.');
      failed.push(name);
      continue;
    }

    const perComponentTimeout = Math.min(60_000, remaining);

    try {
      log('INFO', `  Installing "${name}" individually...`);
      const result = await runCommand(
        'npx',
        [
          'shadcn@latest', 'add',
          '--registry', REGISTRY_URL,
          '--yes', '--overwrite',
          '--cwd', projectPath,
          name,
        ],
        { cwd: projectPath, timeout: perComponentTimeout, label: `Install ${name}` }
      );

      if (result.code === 0) {
        installed.push(name);
        log('SUCCESS', `  "${name}" installed.`);
      } else {
        failed.push(name);
        log('WARN', `  "${name}" failed (exit code ${result.code}).`);
      }
    } catch (err) {
      failed.push(name);
      log('WARN', `  "${name}" error: ${err.message}`);
    }
  }

  return { success: failed.length === 0, installed, failed };
}

// ─── STEP 5: VERIFICATION ───────────────────────────────────────────

function verifyProject(projectPath, expectedComponents) {
  const missing = [];
  const warnings = [];

  // Blocking checks
  for (const relPath of ['package.json', 'node_modules', 'src', 'vite.config.ts']) {
    if (!fs.existsSync(path.join(projectPath, relPath))) {
      missing.push(relPath);
    }
  }

  // Non-blocking checks
  for (const relPath of ['components.json', path.join('src', 'lib', 'utils.ts'), path.join('src', 'components', 'ui')]) {
    if (!fs.existsSync(path.join(projectPath, relPath))) {
      warnings.push(`Expected not found: ${relPath}`);
    }
  }

  // Component file checks (non-blocking)
  const uiDir = path.join(projectPath, 'src', 'components', 'ui');
  if (fs.existsSync(uiDir)) {
    for (const name of expectedComponents) {
      const componentFile = path.join(uiDir, `${name}.tsx`);
      if (!fs.existsSync(componentFile)) {
        warnings.push(`Component file not found: src/components/ui/${name}.tsx`);
      }
    }
  }

  return { valid: missing.length === 0, missing, warnings };
}

// ─── CLEANUP ─────────────────────────────────────────────────────────

function cleanup(projectPath) {
  log('INFO', `Cleaning up ${projectPath}...`);
  try {
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
      log('INFO', 'Cleanup complete.');
    }
  } catch (err) {
    log('ERROR', `Cleanup failed: ${err.message}. Manual removal may be needed.`);
  }
}

module.exports = {
  runCommand,
  createViteProject,
  npmInstall,
  initShadcn,
  installComponents,
  verifyProject,
  cleanup,
};
