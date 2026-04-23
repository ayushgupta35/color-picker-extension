const DEFAULT_SETTINGS = {
  clickFormat: 'hex',
  cursorFormat: 'hex',
  showLivePanel: true,
};

const activePickerTabIds = new Set();

function normalizeSettings(raw = {}) {
  const clickFormat = raw.clickFormat === 'rgba' ? 'rgba' : 'hex';
  const cursorFormat = raw.cursorFormat === 'rgba' ? 'rgba' : 'hex';
  const showLivePanel = typeof raw.showLivePanel === 'boolean' ? raw.showLivePanel : true;

  return {
    clickFormat,
    cursorFormat,
    showLivePanel,
  };
}

async function getSettings() {
  const result = await chrome.storage.local.get(['pickerSettings']);
  return normalizeSettings({ ...DEFAULT_SETTINGS, ...(result.pickerSettings || {}) });
}

async function updateSettings(partialSettings) {
  const current = await getSettings();
  const merged = normalizeSettings({ ...current, ...(partialSettings || {}) });
  await chrome.storage.local.set({ pickerSettings: merged });
  return merged;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tabs[0] || null;
}

function isPickableUrl(url) {
  return /^https?:/i.test(url || '');
}

async function updateActionAvailabilityForTab(tab) {
  if (!tab?.id) return;

  const pickable = isPickableUrl(tab.url);
  if (pickable) {
    await chrome.action.enable(tab.id);
    await chrome.action.setTitle({ tabId: tab.id, title: 'Quick Color Picker' });
    return;
  }

  await chrome.action.disable(tab.id);
  await chrome.action.setTitle({ tabId: tab.id, title: 'Quick Color Picker (unavailable on this page)' });
}

async function refreshActionAvailability() {
  const tab = await getActiveTab();
  if (!tab?.id) return;
  await updateActionAvailabilityForTab(tab);
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'PING_PICKER' });
    return;
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });

    await chrome.tabs.sendMessage(tabId, { type: 'PING_PICKER' });
  }
}

async function startPickerOnActiveTab() {
  const tab = await getActiveTab();
  if (!tab?.id || !tab.windowId || !isPickableUrl(tab.url)) return;

  await ensureContentScript(tab.id);
  const settings = await getSettings();

  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  const response = await chrome.tabs.sendMessage(tab.id, {
    type: 'START_COLOR_PICK',
    dataUrl,
    settings,
  });

  if (!response?.ok) throw new Error('Picker startup failed');
  activePickerTabIds.add(tab.id);
  return { tabId: tab.id, active: true };
}

async function stopPickerOnActiveTab() {
  const tab = await getActiveTab();
  if (!tab?.id || !isPickableUrl(tab.url)) return { tabId: tab?.id ?? null, active: false };

  await ensureContentScript(tab.id);
  await chrome.tabs.sendMessage(tab.id, { type: 'STOP_COLOR_PICK' });
  activePickerTabIds.delete(tab.id);
  return { tabId: tab.id, active: false };
}

async function togglePickerOnActiveTab() {
  const tab = await getActiveTab();
  if (!tab?.id || !isPickableUrl(tab.url)) {
    return { ok: false, active: false, error: 'Picker unavailable on this page.' };
  }

  if (activePickerTabIds.has(tab.id)) {
    await stopPickerOnActiveTab();
    return { ok: true, active: false };
  }

  await startPickerOnActiveTab();
  return { ok: true, active: true };
}

function formatShortcutForDisplay(shortcut, os) {
  if (!shortcut) return '';

  const tokens = shortcut
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (/^(command|cmd)$/i.test(part)) return 'Cmd';
      if (/^(control|ctrl)$/i.test(part)) return 'Ctrl';
      if (/^(option|opt|alt)$/i.test(part)) return os === 'mac' ? 'Option' : 'Alt';
      if (/^shift$/i.test(part)) return 'Shift';
      return part.length === 1 ? part.toUpperCase() : part;
    });

  const macModifierOrder = ['Cmd', 'Ctrl', 'Option', 'Shift'];
  const defaultModifierOrder = ['Ctrl', 'Alt', 'Shift', 'Meta'];
  const modifierOrder = os === 'mac' ? macModifierOrder : defaultModifierOrder;

  const modifiers = [];
  const keys = [];

  for (const token of tokens) {
    if (modifierOrder.includes(token)) {
      if (!modifiers.includes(token)) modifiers.push(token);
      continue;
    }

    keys.push(token);
  }

  modifiers.sort((a, b) => modifierOrder.indexOf(a) - modifierOrder.indexOf(b));
  return [...modifiers, ...keys].join('+');
}

async function getShortcutHint() {
  const [platform, commands] = await Promise.all([
    chrome.runtime.getPlatformInfo(),
    chrome.commands.getAll(),
  ]);

  const startCommand = commands.find((cmd) => cmd.name === 'start-picker');
  const shortcut = startCommand?.shortcut || '';
  const normalized = formatShortcutForDisplay(shortcut, platform.os);
  return normalized ? `Shortcut: ${normalized}` : 'Shortcut: Set one in chrome://extensions/shortcuts';
}

async function getPickerStateForActiveTab() {
  const tab = await getActiveTab();
  const available = Boolean(tab?.id && isPickableUrl(tab.url));
  const active = Boolean(tab?.id && activePickerTabIds.has(tab.id));
  return {
    available,
    active,
  };
}

async function broadcastSettings(settings) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs
      .filter((tab) => typeof tab.id === 'number')
      .map((tab) => chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED', settings }).catch(() => null))
  );
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'start-picker') return;
  togglePickerOnActiveTab().catch(() => {});
});

chrome.action.onClicked.addListener(() => {
  togglePickerOnActiveTab().catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => {
  refreshActionAvailability().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  refreshActionAvailability().catch(() => {});
});

chrome.tabs.onActivated.addListener(() => {
  refreshActionAvailability().catch(() => {});
});

chrome.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
  if (typeof tab?.id === 'number' && !isPickableUrl(tab.url)) {
    activePickerTabIds.delete(tab.id);
  }
  updateActionAvailabilityForTab(tab).catch(() => {});
});

chrome.tabs.onRemoved.addListener((tabId) => {
  activePickerTabIds.delete(tabId);
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  refreshActionAvailability().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'START_PICKER') {
    togglePickerOnActiveTab()
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
    return true;
  }

  if (message?.type === 'GET_SETTINGS') {
    getSettings()
      .then((settings) => sendResponse({ settings }))
      .catch((error) => sendResponse({ settings: DEFAULT_SETTINGS, error: error?.message || String(error) }));
    return true;
  }

  if (message?.type === 'GET_PICKER_AVAILABILITY') {
    getPickerStateForActiveTab()
      .then((state) => sendResponse(state))
      .catch(() => sendResponse({ available: false, active: false }));
    return true;
  }

  if (message?.type === 'GET_SHORTCUT_HINT') {
    getShortcutHint()
      .then((hint) => sendResponse({ hint }))
      .catch(() => sendResponse({ hint: 'Shortcut: Use Start' }));
    return true;
  }

  if (message?.type === 'STOP_PICKER') {
    stopPickerOnActiveTab()
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
    return true;
  }

  if (message?.type === 'UPDATE_SETTINGS') {
    updateSettings(message.settings)
      .then(async (settings) => {
        await broadcastSettings(settings);
        sendResponse({ ok: true, settings });
      })
      .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
    return true;
  }

  if (message?.type === 'COLOR_PICKED' && sender.tab?.id != null) {
    activePickerTabIds.delete(sender.tab.id);
    chrome.storage.local.set({ lastPickedColor: message.color, lastPickedTabId: sender.tab.id }).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'PICK_CANCELLED' && sender.tab?.id != null) {
    activePickerTabIds.delete(sender.tab.id);
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'GET_LAST_PICKED_COLOR') {
    chrome.storage.local.get(['lastPickedColor']).then((result) => {
      sendResponse({ color: result.lastPickedColor || null });
    });
    return true;
  }
});