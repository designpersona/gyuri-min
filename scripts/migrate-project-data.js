const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'js', 'data.js');
const PREFIX = 'window.PROJECT_DATA = ';

const raw = fs.readFileSync(DATA_PATH, 'utf8');
const startIndex = raw.indexOf(PREFIX);
if (startIndex === -1) {
  throw new Error('Could not find PROJECT_DATA prefix.');
}

const vm = require('vm');
const sandbox = { window: {} };
vm.runInNewContext(raw, sandbox);
const data = sandbox.window.PROJECT_DATA;

const PROJECT_TYPE_MAP = new Map([
  ['Brand / BX', 'Brand Experience'],
  ['Web / Digital', 'Digital Product'],
  ['Campaign / Event', 'Campaign'],
  ['Character / IP', 'Character IP'],
  ['Art / Personal', 'Personal Work']
]);

const INDUSTRY_MAP = new Map([
  ['Food & Beverage', 'Food'],
  ['Public / Government', 'Public Sector'],
  ['Tech / AI', 'Technology'],
  ['Art / Personal', 'Food']
]);

const ALLOWED_TOOLS = [
  'Figma',
  'Illustrator',
  'Photoshop',
  'After Effects',
  '3ds Max',
  'KeyShot',
  'ChatGPT',
  'Cursor',
  'DALL·E',
  'Sora',
  'VS Code'
];

const ALLOWED_TOOLS_SET = new Set(ALLOWED_TOOLS);

const TOOL_ALIASES = new Map([
  ['3D Max', '3ds Max'],
  ['DALL·E(OpenAI)', 'DALL·E'],
  ['DALL·E (OpenAI)', 'DALL·E'],
  ['Sora(OpenAI)', 'Sora'],
  ['Sora (OpenAI)', 'Sora'],
  ['ChatGPT(Codex)', 'ChatGPT'],
  ['ChatGPT (Codex)', 'ChatGPT']
]);

const normalizeTool = (tool) => {
  if (!tool) return '';
  const fixed = tool.replace(/OpenAl/g, 'OpenAI').trim();
  return TOOL_ALIASES.get(fixed) || fixed;
};

const readValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.en || value.ko || '';
};

const appendNote = (notes, note) => {
  if (!note) return notes;
  if (!notes.includes(note)) notes.push(note);
  return notes;
};

data.projects.forEach((project) => {
  const toolNotes = [];
  const currentNotes = readValue(project.tool_notes);
  if (currentNotes) toolNotes.push(currentNotes);

  const client = readValue(project.client);
  let clientDetail = readValue(project.client_detail);

  if (client === 'AID India') {
    project.client = 'AID';
    clientDetail = 'India';
  } else if (client === 'AID Malaysia') {
    project.client = 'AID';
    clientDetail = 'Malaysia';
  } else if (client === 'AID') {
    project.client = 'AID';
  } else {
    project.client = client;
  }

  if (clientDetail) {
    project.client_detail = clientDetail;
  } else {
    delete project.client_detail;
  }

  const projectType = readValue(project.projectType);
  project.projectType = PROJECT_TYPE_MAP.get(projectType) || projectType;

  const industry = readValue(project.industry);
  project.industry = INDUSTRY_MAP.get(industry) || industry;

  const rawTools = readValue(project.tools);
  const toolList = rawTools
    .split(',')
    .map((tool) => normalizeTool(tool))
    .map((tool) => tool.trim())
    .filter(Boolean);

  const normalizedTools = [];
  const removedTools = [];
  let codexUsed = false;
  let dreamweaverFound = false;

  toolList.forEach((tool) => {
    if (tool === 'ChatGPT') {
      codexUsed = rawTools.includes('Codex');
    }
    if (tool.toLowerCase().startsWith('dreamweaver')) {
      dreamweaverFound = true;
      removedTools.push(tool);
      return;
    }
    if (tool === 'Adobe') {
      removedTools.push(tool);
      return;
    }
    if (!ALLOWED_TOOLS_SET.has(tool)) {
      removedTools.push(tool);
      return;
    }
    if (!normalizedTools.includes(tool)) normalizedTools.push(tool);
  });

  if (codexUsed) {
    appendNote(toolNotes, 'Codex used');
  }
  if (dreamweaverFound) {
    appendNote(toolNotes, 'Legacy tool: Dreamweaver');
  }

  const otherRemoved = removedTools.filter(
    (tool) => tool !== 'Adobe' && !tool.toLowerCase().startsWith('dreamweaver')
  );
  if (otherRemoved.length > 0) {
    appendNote(toolNotes, `Other tools: ${otherRemoved.join(', ')}`);
  }

  project.tools = normalizedTools.join(', ');
  if (toolNotes.length > 0) {
    project.tool_notes = toolNotes.join('; ');
  } else {
    delete project.tool_notes;
  }
});

const output = `${PREFIX}${JSON.stringify(data, null, 4)};\n`;
fs.writeFileSync(DATA_PATH, output);

const reportLines = data.projects.map((project) => {
  const title = readValue(project.title);
  const client = readValue(project.client);
  const clientDetail = readValue(project.client_detail);
  const projectType = readValue(project.projectType);
  const industry = readValue(project.industry);
  const tools = readValue(project.tools);
  const toolNotes = readValue(project.tool_notes);
  return [
    title,
    client || '-',
    clientDetail || '-',
    projectType || '-',
    industry || '-',
    tools || '-',
    toolNotes || '-'
  ].join(' | ');
});

console.log(reportLines.join('\n'));
