const fs = require('node:fs');
const path = require('node:path');
const { STATE_FILENAME } = require('./utils');

function stateFilePath(projectPath) {
  return path.join(projectPath, STATE_FILENAME);
}

function createInitialState({ projectName, projectPath, template, components }) {
  return {
    version: 1,
    projectName,
    projectPath,
    template,
    components,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    freshCreation: true,
    steps: {
      viteCreate: 'pending',
      npmInstall: 'pending',
      shadcnInit: 'pending',
      componentInstall: 'pending',
      verification: 'pending',
    },
    installedComponents: [],
    failedComponents: [],
    error: null,
  };
}

function loadState(projectPath) {
  const filePath = stateFilePath(projectPath);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function saveState(projectPath, state) {
  state.updatedAt = new Date().toISOString();
  const filePath = stateFilePath(projectPath);
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function updateStep(state, projectPath, stepName, status, extra) {
  state.steps[stepName] = status;
  if (extra) {
    Object.assign(state, extra);
  }
  saveState(projectPath, state);
  return state;
}

function removeState(projectPath) {
  const filePath = stateFilePath(projectPath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  createInitialState,
  loadState,
  saveState,
  updateStep,
  removeState,
};
