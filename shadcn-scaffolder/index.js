#!/usr/bin/env node

const { parseArgs } = require('node:util');
const path = require('node:path');
const process = require('node:process');

const { TEMPLATES, EXIT_CODES, REGISTRY_URL, log, formatDuration } = require('./lib/utils');
const { validateInputs } = require('./lib/validator');
const { createInitialState, saveState, updateStep, removeState } = require('./lib/state');
const {
  createViteProject,
  npmInstall,
  initShadcn,
  installComponents,
  verifyProject,
  cleanup,
} = require('./lib/executor');

// ─── CLI ARGUMENT PARSING ────────────────────────────────────────────

function parseCLIArgs() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      template:   { type: 'string',  short: 't', default: 'minimal' },
      components: { type: 'string',  short: 'c', default: '' },
      target:     { type: 'string',  default: process.cwd() },
      help:       { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help || positionals.length === 0) {
    printUsage();
    process.exit(positionals.length === 0 && !values.help ? EXIT_CODES.FAILURE : EXIT_CODES.SUCCESS);
  }

  return {
    projectName: positionals[0],
    template: values.template,
    components: values.components
      ? values.components.split(',').map(s => s.trim()).filter(Boolean)
      : [],
    targetDir: path.resolve(values.target),
  };
}

// ─── HELP TEXT ────────────────────────────────────────────────────────

function printUsage() {
  console.log(`
shadcn-scaffolder - Create React projects with shadcn/ui components

USAGE
  node shadcn-scaffolder/index.js <project-name> [options]

OPTIONS
  -t, --template <name>     Template to use (default: minimal)
                             minimal    - ${TEMPLATES.minimal.description}
                             form       - ${TEMPLATES.form.description}
                             dashboard  - ${TEMPLATES.dashboard.description}
                             custom     - User-specified components (max 20)

  -c, --components <list>   Comma-separated component names
                             Only used with --template custom
                             Example: --components button,card,input,tabs

  --target <dir>            Parent directory for the project (default: cwd)

  -h, --help                Show this help message

REGISTRY
  ${REGISTRY_URL}

EXAMPLES
  node shadcn-scaffolder/index.js my-app
  node shadcn-scaffolder/index.js my-app --template dashboard
  node shadcn-scaffolder/index.js my-app --template custom --components button,card,tabs,sidebar
  node shadcn-scaffolder/index.js my-app --template form --target /home/user/projects
`);
}

// ─── SUMMARY ─────────────────────────────────────────────────────────

function printSummary(state) {
  const elapsed = new Date(state.updatedAt) - new Date(state.startedAt);
  const hr = '='.repeat(55);

  const stepLabels = {
    viteCreate:       'Vite project creation',
    npmInstall:       'npm install',
    shadcnInit:       'shadcn/ui init',
    componentInstall: 'Component installation',
    verification:     'Project verification',
  };

  const statusIcons = {
    done:    '\x1b[32m DONE \x1b[0m',
    failed:  '\x1b[31m FAIL \x1b[0m',
    pending: '\x1b[2m SKIP \x1b[0m',
    running: '\x1b[33m ABRT \x1b[0m',
  };

  console.log(`\n${hr}`);

  const allDone = Object.values(state.steps).every(s => s === 'done');
  if (allDone && state.failedComponents.length === 0) {
    console.log('  PROJECT SCAFFOLDED SUCCESSFULLY');
  } else if (allDone) {
    console.log('  PROJECT CREATED (with warnings)');
  } else {
    console.log('  SCAFFOLDING INCOMPLETE');
  }

  console.log(hr);
  console.log(`  Project:    ${state.projectName}`);
  console.log(`  Path:       ${state.projectPath}`);
  console.log(`  Template:   ${state.template}`);
  console.log(`  Duration:   ${formatDuration(elapsed)}`);
  console.log('');
  console.log('  Steps:');

  for (const [key, label] of Object.entries(stepLabels)) {
    const status = state.steps[key] || 'pending';
    console.log(`    ${statusIcons[status]} ${label}`);
  }

  if (state.installedComponents.length > 0) {
    console.log('');
    console.log(`  Installed (${state.installedComponents.length}):`);
    for (const name of state.installedComponents) {
      console.log(`    \x1b[32m+\x1b[0m ${name}`);
    }
  }

  if (state.failedComponents.length > 0) {
    console.log('');
    console.log(`  Failed (${state.failedComponents.length}):`);
    for (const name of state.failedComponents) {
      console.log(`    \x1b[31m!\x1b[0m ${name}`);
    }
  }

  if (state.error) {
    console.log('');
    console.log(`  \x1b[31mError: ${state.error}\x1b[0m`);
  }

  console.log(hr);

  if (allDone) {
    console.log('');
    console.log('  Next steps:');
    console.log(`    cd ${state.projectName}`);
    console.log('    npm run dev');
    console.log('');
    console.log('  Add more components:');
    console.log(`    npx shadcn@latest add --registry ${REGISTRY_URL} [component]`);
    console.log('');
  }
}

// ─── SIGNAL HANDLING ─────────────────────────────────────────────────

let _currentState = null;
let _currentProjectPath = null;

function registerSignalHandlers() {
  const handler = (signal) => {
    console.log('');
    log('WARN', `Received ${signal}. Saving state and exiting...`);

    if (_currentState && _currentProjectPath) {
      for (const key of Object.keys(_currentState.steps)) {
        if (_currentState.steps[key] === 'running') {
          _currentState.steps[key] = 'failed';
        }
      }
      _currentState.error = `Interrupted by ${signal}`;
      try {
        saveState(_currentProjectPath, _currentState);
        log('INFO', 'State saved. Re-run the same command to resume.');
      } catch {
        // Cannot save — nothing more to do
      }
    }

    process.exit(EXIT_CODES.FAILURE);
  };

  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);
}

// ─── MAIN ────────────────────────────────────────────────────────────

async function main() {
  registerSignalHandlers();

  // Step 1: Parse CLI args
  let args;
  try {
    args = parseCLIArgs();
  } catch (err) {
    log('ERROR', `Invalid arguments: ${err.message}`);
    printUsage();
    process.exit(EXIT_CODES.FAILURE);
  }

  const { projectName, template, components, targetDir } = args;

  // Step 2: Validate
  log('INFO', `Validating inputs for project "${projectName}"...`);

  const validation = validateInputs({ projectName, template, components, targetDir });

  if (!validation.valid) {
    for (const err of validation.errors) {
      log('ERROR', err);
    }
    process.exit(EXIT_CODES.FAILURE);
  }

  const { projectPath, resolvedComponents, existingState } = validation;

  // Step 3: Create or load state
  let state;

  if (existingState) {
    state = existingState;
    state.freshCreation = false;
    log('INFO', 'Resuming from previous state...');
    for (const [step, status] of Object.entries(state.steps)) {
      if (status === 'done') {
        log('INFO', `  Skipping ${step} (already completed)`);
      }
    }
  } else {
    state = createInitialState({
      projectName,
      projectPath,
      template,
      components: resolvedComponents,
    });
  }

  _currentState = state;
  _currentProjectPath = projectPath;

  // Step 4a: Create Vite project
  if (state.steps.viteCreate !== 'done') {
    // Cannot save state yet — project dir doesn't exist
    const viteResult = await createViteProject(projectName, targetDir);

    if (!viteResult.success) {
      log('ERROR', `BLOCKING: ${viteResult.error}`);
      log('ERROR', '  -> Check npm/npx installation: npm --version');
      log('ERROR', `  -> Manual fallback: npx create-vite@latest ${projectName} --template react-ts`);
      cleanup(projectPath);
      state.steps.viteCreate = 'failed';
      state.error = viteResult.error;
      printSummary(state);
      process.exit(EXIT_CODES.FAILURE);
    }

    // Project dir now exists — save state for the first time
    updateStep(state, projectPath, 'viteCreate', 'done');
  }

  // Step 4b: npm install
  if (state.steps.npmInstall !== 'done') {
    updateStep(state, projectPath, 'npmInstall', 'running');

    const npmResult = await npmInstall(projectPath);

    if (!npmResult.success) {
      log('ERROR', `BLOCKING: ${npmResult.error}`);
      log('ERROR', '  -> Try manually: cd ' + projectPath + ' && npm install');
      updateStep(state, projectPath, 'npmInstall', 'failed', { error: npmResult.error });
      if (state.freshCreation) cleanup(projectPath);
      printSummary(state);
      process.exit(EXIT_CODES.FAILURE);
    }

    updateStep(state, projectPath, 'npmInstall', 'done');
  }

  // Step 4c: shadcn init
  if (state.steps.shadcnInit !== 'done') {
    updateStep(state, projectPath, 'shadcnInit', 'running');

    const initResult = await initShadcn(projectPath);

    if (!initResult.success) {
      log('ERROR', `BLOCKING: ${initResult.error}`);
      log('ERROR', `  -> Try manually: npx shadcn@latest init --yes --defaults --force --cwd ${projectPath}`);
      updateStep(state, projectPath, 'shadcnInit', 'failed', { error: initResult.error });
      if (state.freshCreation) cleanup(projectPath);
      printSummary(state);
      process.exit(EXIT_CODES.FAILURE);
    }

    updateStep(state, projectPath, 'shadcnInit', 'done');
  }

  // Step 4d: Install components
  if (state.steps.componentInstall !== 'done') {
    updateStep(state, projectPath, 'componentInstall', 'running');

    const installResult = await installComponents(projectPath, state.components);

    updateStep(state, projectPath, 'componentInstall', 'done', {
      installedComponents: installResult.installed,
      failedComponents: installResult.failed,
    });

    if (installResult.failed.length > 0) {
      log('WARN', `${installResult.failed.length} component(s) failed to install.`);
    }
  }

  // Step 4e: Verify
  if (state.steps.verification !== 'done') {
    updateStep(state, projectPath, 'verification', 'running');
    log('INFO', 'Verifying project structure...');

    const verifyResult = verifyProject(projectPath, state.installedComponents);

    if (!verifyResult.valid) {
      log('ERROR', 'BLOCKING: Project structure verification failed.');
      for (const item of verifyResult.missing) {
        log('ERROR', `  Missing: ${item}`);
      }
      updateStep(state, projectPath, 'verification', 'failed', {
        error: `Verification failed. Missing: ${verifyResult.missing.join(', ')}`,
      });
      printSummary(state);
      process.exit(EXIT_CODES.FAILURE);
    }

    for (const warning of verifyResult.warnings) {
      log('WARN', warning);
    }

    updateStep(state, projectPath, 'verification', 'done');
  }

  // Step 5: Success
  if (state.failedComponents.length > 0) {
    log('WARN', 'Project created with some component installation failures.');
  } else {
    log('SUCCESS', 'Project scaffolded successfully!');
  }

  removeState(projectPath);
  printSummary(state);
  process.exit(EXIT_CODES.SUCCESS);
}

main().catch((err) => {
  log('ERROR', `Unexpected error: ${err.message}`);
  if (err.stack) {
    log('ERROR', err.stack);
  }
  process.exit(EXIT_CODES.FAILURE);
});
