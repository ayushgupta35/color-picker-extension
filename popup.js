const statusEl = document.getElementById('status');
const shortcutHintEl = document.getElementById('shortcutHint');
const swatch = document.getElementById('swatch');
const hexValue = document.getElementById('hexValue');
const rgbaValue = document.getElementById('rgbaValue');
const startPickBtn = document.getElementById('startPick');

const cursorFormatSelect = document.getElementById('cursorFormat');
const clickFormatSelect = document.getElementById('clickFormat');
const showLivePanelSelect = document.getElementById('showLivePanel');

const hexInput = document.getElementById('hexInput');
const rgbaInput = document.getElementById('rgbaInput');
const hexToRgbaOut = document.getElementById('hexToRgbaOut');
const rgbaToHexOut = document.getElementById('rgbaToHexOut');

const defaultSettings = {
  clickFormat: 'hex',
  cursorFormat: 'hex',
  showLivePanel: true,
};

let pickerActive = false;

function rgbToHex(r, g, b) {
  return '#'+[r, g, b].map((value) => Number(value).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function rgbaStringFromColor(color) {
  return `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, 1)`;
}

function setColor(color) {
  swatch.style.background = color.hex;
  hexValue.textContent = color.hex;
  rgbaValue.textContent = rgbaStringFromColor(color);
}

function applySettingsToControls(settings) {
  cursorFormatSelect.value = settings.cursorFormat;
  clickFormatSelect.value = settings.clickFormat;
  showLivePanelSelect.value = String(settings.showLivePanel);
}

function updateStartButtonUi({ available, active }) {
  startPickBtn.disabled = !available;
  startPickBtn.textContent = active ? 'End' : 'Start';
  pickerActive = Boolean(active);

  if (!available) {
    statusEl.textContent = 'Unavailable on this page. Open a regular http/https site.';
  }
}

async function getSettings() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }).catch(() => null);
  return response?.settings || defaultSettings;
}

async function saveSettingsPatch(patch) {
  const response = await chrome.runtime.sendMessage({
    type: 'UPDATE_SETTINGS',
    settings: patch,
  }).catch(() => null);

  if (response?.ok && response.settings) {
    applySettingsToControls(response.settings);
    statusEl.textContent = 'Looks good. Saved.';
  }
}

function parseHex(hexRaw) {
  const hex = hexRaw.trim().replace(/^#/, '');
  if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return null;

  const expanded = hex.length === 3 ? hex.split('').map((v) => v + v).join('') : hex;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return { r, g, b };
}

function parseRgba(inputRaw) {
  const input = inputRaw.trim();
  const match = input.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|0?\.\d+|1(?:\.0+)?))?\s*\)$/i);
  if (!match) return null;

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);

  if ([r, g, b].some((v) => Number.isNaN(v) || v < 0 || v > 255)) return null;
  return { r, g, b };
}

function bindConverter() {
  hexInput.addEventListener('input', () => {
    const rgb = parseHex(hexInput.value);
    hexToRgbaOut.textContent = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)` : '-';
  });

  rgbaInput.addEventListener('input', () => {
    const rgb = parseRgba(rgbaInput.value);
    rgbaToHexOut.textContent = rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : '-';
  });
}

function bindSettings() {
  cursorFormatSelect.addEventListener('change', () => {
    saveSettingsPatch({ cursorFormat: cursorFormatSelect.value });
  });

  clickFormatSelect.addEventListener('change', () => {
    saveSettingsPatch({ clickFormat: clickFormatSelect.value });
  });

  showLivePanelSelect.addEventListener('change', () => {
    saveSettingsPatch({ showLivePanel: showLivePanelSelect.value === 'true' });
  });
}

function bindMessages() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === 'PICK_PREVIEW' && message.color) {
      setColor(message.color);
      statusEl.textContent = `Hovering ${message.color.hex}`;
    }

    if (message?.type === 'COLOR_PICKED' && message.color) {
      setColor(message.color);
      statusEl.textContent = `Picked ${message.color.hex}`;
    }

    if (message?.type === 'PICK_CANCELLED') {
      statusEl.textContent = 'Picker cancelled.';
    }
  });
}

async function loadLastColor() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_LAST_PICKED_COLOR' }).catch(() => null);
  if (response?.color) setColor(response.color);
}

async function updateAvailabilityUi() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_PICKER_AVAILABILITY' }).catch(() => null);
  const available = Boolean(response?.available);
  const active = Boolean(response?.active);
  updateStartButtonUi({ available, active });
}

async function updateShortcutHintUi() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_SHORTCUT_HINT' }).catch(() => null);
  shortcutHintEl.textContent = response?.hint || 'Shortcut: Use Start';
}

async function init() {
  bindConverter();
  bindSettings();
  bindMessages();

  startPickBtn.addEventListener('click', async () => {
    statusEl.textContent = pickerActive ? 'Ending picker...' : 'Starting picker...';
    const messageType = pickerActive ? 'STOP_PICKER' : 'START_PICKER';
    const result = await chrome.runtime.sendMessage({ type: messageType }).catch(() => null);

    if (result?.ok) {
      updateStartButtonUi({ available: true, active: Boolean(result.active) });
      statusEl.textContent = result.active ? 'Move around, click to copy.' : 'Picker ended.';
      return;
    }

    statusEl.textContent = 'Could not start here. Try a regular page.';
    await updateAvailabilityUi();
  });

  applySettingsToControls(await getSettings());
  await updateShortcutHintUi();
  await updateAvailabilityUi();
  await loadLastColor();
}

init();
