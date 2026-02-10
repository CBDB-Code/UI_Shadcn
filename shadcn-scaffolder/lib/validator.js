const fs = require('node:fs');
const path = require('node:path');
const { TEMPLATES, STATE_FILENAME, log } = require('./utils');

function validateInputs({ projectName, template, components, targetDir }) {
  const errors = [];
  let existingState = null;

  // 1. Project name
  if (!projectName || typeof projectName !== 'string') {
    errors.push('Project name is required.');
  } else if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(projectName)) {
    errors.push(
      `Invalid project name "${projectName}". ` +
      'Must start with a letter, contain only letters, digits, dots, hyphens, underscores.'
    );
  }

  // 2. Template
  const validTemplates = [...Object.keys(TEMPLATES), 'custom'];
  if (!validTemplates.includes(template)) {
    errors.push(
      `Invalid template "${template}". Must be one of: ${validTemplates.join(', ')}`
    );
  }

  // 3. Resolve components
  let resolvedComponents = [];
  if (template === 'custom') {
    if (!Array.isArray(components) || components.length === 0) {
      errors.push('Custom template requires at least one component via --components.');
    } else if (components.length > 20) {
      errors.push(`Too many components (${components.length}). Maximum is 20.`);
    } else {
      for (const name of components) {
        if (!/^[a-z][a-z0-9-]*$/.test(name)) {
          errors.push(`Invalid component name "${name}". Use lowercase letters, digits, hyphens.`);
        }
      }
      const unique = new Set(components);
      if (unique.size !== components.length) {
        errors.push('Duplicate component names detected. Remove duplicates.');
      }
      resolvedComponents = [...unique];
    }
  } else if (TEMPLATES[template]) {
    resolvedComponents = [...TEMPLATES[template].components];
  }

  // 4. Target directory
  const resolvedTargetDir = path.resolve(targetDir);
  if (!fs.existsSync(resolvedTargetDir)) {
    errors.push(`Target directory does not exist: ${resolvedTargetDir}`);
  } else {
    try {
      const stat = fs.statSync(resolvedTargetDir);
      if (!stat.isDirectory()) {
        errors.push(`Target path is not a directory: ${resolvedTargetDir}`);
      }
      fs.accessSync(resolvedTargetDir, fs.constants.W_OK);
    } catch {
      errors.push(`Target directory is not writable: ${resolvedTargetDir}`);
    }
  }

  // 5. Project path existence check
  const projectPath = path.join(resolvedTargetDir, projectName || 'unnamed');

  if (fs.existsSync(projectPath)) {
    const stateFilePath = path.join(projectPath, STATE_FILENAME);
    if (fs.existsSync(stateFilePath)) {
      try {
        const raw = fs.readFileSync(stateFilePath, 'utf8');
        existingState = JSON.parse(raw);
        log('INFO', `Found existing state file. Will attempt to resume.`);
      } catch {
        errors.push(
          `State file exists but is corrupted: ${stateFilePath}. Delete it to start fresh.`
        );
      }
    } else {
      errors.push(
        `Directory already exists: ${projectPath}. ` +
        'Delete it or choose a different project name.'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    projectPath,
    resolvedComponents,
    existingState,
  };
}

module.exports = { validateInputs };
