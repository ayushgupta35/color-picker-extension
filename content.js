if (!window.__quickColorPickerInjected) {
	window.__quickColorPickerInjected = true;

	const defaultSettings = {
		clickFormat: 'hex',
		cursorFormat: 'hex',
		showLivePanel: true,
	};

	let settings = { ...defaultSettings };
	let pickerActive = false;
	let lens;
	let lensDot;
	let panel;
	let panelSwatch;
	let panelHex;
	let panelRgba;
	let tooltip;
	let lastSampledColor = null;
	let captureCanvas = null;
	let captureContext = null;
	let captureWidth = 0;
	let captureHeight = 0;
	let captureDpr = window.devicePixelRatio || 1;

	function rgbToHex(r, g, b) {
		return '#'+[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase();
	}

	function toRgbaString(color) {
		return `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, 1)`;
	}

	function formatColor(color, format) {
		return format === 'rgba' ? toRgbaString(color) : color.hex;
	}

	function clamp(value, min, max) {
		return Math.min(max, Math.max(min, value));
	}

	function isContextInvalidatedError(error) {
		const message = String(error?.message || error || '');
		return message.includes('Extension context invalidated');
	}

	async function safeRuntimeSendMessage(message, options = {}) {
		const { stopOnInvalidation = false, notifyCancelOnStop = false } = options;

		try {
			return await chrome.runtime.sendMessage(message);
		} catch (error) {
			if (isContextInvalidatedError(error) && stopOnInvalidation && pickerActive) {
				stopPicker(notifyCancelOnStop);
			}
			return null;
		}
	}

	function clearCapture() {
		captureCanvas = null;
		captureContext = null;
		captureWidth = 0;
		captureHeight = 0;
	}

	function clearPanelRefs() {
		panel = null;
		panelSwatch = null;
		panelHex = null;
		panelRgba = null;
	}

	function createReticle() {
		const root = document.createElement('div');
		const hLine = document.createElement('div');
		const vLine = document.createElement('div');
		const dot = document.createElement('div');

		Object.assign(root.style, {
			position: 'fixed',
			width: '34px',
			height: '34px',
			transform: 'translate(-50%, -50%)',
			pointerEvents: 'none',
			zIndex: '2147483646',
		});

		Object.assign(hLine.style, {
			position: 'absolute',
			top: '50%',
			left: '0',
			right: '0',
			height: '1px',
			background: 'rgba(255,255,255,.96)',
			boxShadow: '0 0 0 1px rgba(0,0,0,.62)',
			transform: 'translateY(-50%)',
		});

		Object.assign(vLine.style, {
			position: 'absolute',
			left: '50%',
			top: '0',
			bottom: '0',
			width: '1px',
			background: 'rgba(255,255,255,.96)',
			boxShadow: '0 0 0 1px rgba(0,0,0,.62)',
			transform: 'translateX(-50%)',
		});

		Object.assign(dot.style, {
			position: 'absolute',
			left: '50%',
			top: '50%',
			width: '10px',
			height: '10px',
			borderRadius: '2px',
			border: '2px solid white',
			boxShadow: '0 0 0 1px rgba(0,0,0,.6), 0 0 14px rgba(86,126,230,.28), 0 6px 16px rgba(0,0,0,.36)',
			transform: 'translate(-50%, -50%)',
			background: '#000000',
		});

		root.append(hLine, vLine, dot);
		return { root, dot };
	}

	function createLivePanel() {
		const box = document.createElement('div');
		box.innerHTML = `
			<div style="display:flex;align-items:center;gap:8px;">
				<div data-role="swatch" style="width:20px;height:20px;border-radius:6px;border:1px solid rgba(255,255,255,.55);background:#000"></div>
				<strong style="font:700 12px/1.2 ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em;">LIVE COLOR</strong>
			</div>
			<div style="margin-top:8px;font:600 12px/1.25 ui-sans-serif,system-ui,sans-serif;">HEX: <span data-role="hex">#000000</span></div>
			<div style="margin-top:4px;font:600 12px/1.25 ui-sans-serif,system-ui,sans-serif;">RGBA: <span data-role="rgba">rgba(0, 0, 0, 1)</span></div>
		`;

		Object.assign(box.style, {
			position: 'fixed',
			right: '16px',
			top: '16px',
			padding: '10px 12px',
			borderRadius: '12px',
			background: 'linear-gradient(135deg, rgba(43,98,221,.86), rgba(104,86,208,.8) 48%, rgba(69,155,194,.78))',
			color: 'white',
			pointerEvents: 'none',
			zIndex: '2147483645',
			border: '1px solid rgba(255,255,255,.35)',
			boxShadow: '0 12px 28px rgba(40,66,136,.28)',
			minWidth: '220px',
			backdropFilter: 'blur(4px)',
		});

		panelSwatch = box.querySelector('[data-role="swatch"]');
		panelHex = box.querySelector('[data-role="hex"]');
		panelRgba = box.querySelector('[data-role="rgba"]');
		return box;
	}

	function applySettings(nextSettings = {}) {
		settings = {
			clickFormat: nextSettings.clickFormat === 'rgba' ? 'rgba' : 'hex',
			cursorFormat: nextSettings.cursorFormat === 'rgba' ? 'rgba' : 'hex',
			showLivePanel: typeof nextSettings.showLivePanel === 'boolean' ? nextSettings.showLivePanel : true,
		};

		if (!pickerActive) return;

		if (settings.showLivePanel && !panel) {
			panel = createLivePanel();
			document.body.append(panel);
		}

		if (!settings.showLivePanel && panel) {
			panel.remove();
			clearPanelRefs();
		}
	}

	async function primeCapture(dataUrl, dpr) {
		const blob = await fetch(dataUrl).then((response) => response.blob());
		const bitmap = await createImageBitmap(blob);

		captureCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
		captureContext = captureCanvas.getContext('2d', { willReadFrequently: true });
		captureWidth = bitmap.width;
		captureHeight = bitmap.height;
		captureDpr = dpr || window.devicePixelRatio || 1;

		if (captureContext) {
			captureContext.drawImage(bitmap, 0, 0);
		}

		bitmap.close();
	}

	function readColorAtPoint(x, y) {
		if (!captureContext || !captureWidth || !captureHeight) return null;

		const pixelX = clamp(Math.round(x * captureDpr), 0, captureWidth - 1);
		const pixelY = clamp(Math.round(y * captureDpr), 0, captureHeight - 1);
		const [r, g, b, a] = captureContext.getImageData(pixelX, pixelY, 1, 1).data;
		if (a === 0) return null;

		return {
			hex: rgbToHex(r, g, b),
			rgb: { r, g, b },
		};
	}

	function updatePointer(event) {
		if (!pickerActive) return;

		const color = readColorAtPoint(event.clientX, event.clientY);
		if (!color) return;

		lastSampledColor = color;
		lens.style.left = `${event.clientX}px`;
		lens.style.top = `${event.clientY}px`;
		lensDot.style.background = color.hex;

		tooltip.style.left = `${Math.min(event.clientX + 18, window.innerWidth - 140)}px`;
		tooltip.style.top = `${Math.max(12, event.clientY - 18)}px`;
		tooltip.textContent = formatColor(color, settings.cursorFormat);

		if (panel) {
			if (panelSwatch) panelSwatch.style.background = color.hex;
			if (panelHex) panelHex.textContent = color.hex;
			if (panelRgba) panelRgba.textContent = toRgbaString(color);
		}

		safeRuntimeSendMessage(
			{ type: 'PICK_PREVIEW', color },
			{ stopOnInvalidation: true, notifyCancelOnStop: false }
		);
	}

	function stopPicker(cancelled = false) {
		pickerActive = false;
		lens?.remove();
		tooltip?.remove();
		panel?.remove();

		document.removeEventListener('mousemove', updatePointer, true);
		document.removeEventListener('click', clickPicker, true);
		document.removeEventListener('keydown', keyHandler, true);

		if (cancelled) {
			safeRuntimeSendMessage({ type: 'PICK_CANCELLED' });
		}

		lastSampledColor = null;
		lensDot = null;
		clearPanelRefs();
		clearCapture();
	}

	function clickPicker(event) {
		event.preventDefault();
		event.stopPropagation();

		const color = readColorAtPoint(event.clientX, event.clientY) || lastSampledColor;
		if (color) {
			safeRuntimeSendMessage(
				{ type: 'COLOR_PICKED', color },
				{ stopOnInvalidation: true, notifyCancelOnStop: false }
			);
			navigator.clipboard?.writeText(formatColor(color, settings.clickFormat)).catch(() => {});
		}

		stopPicker(false);
	}

	function keyHandler(event) {
		if (event.key === 'Escape') stopPicker(true);
	}

	function startPicker() {
		if (pickerActive) return;

		pickerActive = true;
		const reticle = createReticle();
		lens = reticle.root;
		lensDot = reticle.dot;
		tooltip = document.createElement('div');

		Object.assign(tooltip.style, {
			position: 'fixed',
			padding: '8px 10px',
			borderRadius: '10px',
			background: 'linear-gradient(135deg, rgba(50,121,234,.92), rgba(110,87,210,.9), rgba(53,145,186,.9))',
			color: 'white',
			font: '700 12px/1.2 ui-sans-serif,system-ui,sans-serif',
			letterSpacing: '.02em',
			pointerEvents: 'none',
			border: '1px solid rgba(255,255,255,.35)',
			zIndex: '2147483647',
			boxShadow: '0 10px 24px rgba(43,72,142,.3)',
		});

		if (settings.showLivePanel) {
			panel = createLivePanel();
			document.body.append(panel);
		}

		document.body.append(lens, tooltip);
		document.addEventListener('mousemove', updatePointer, true);
		document.addEventListener('click', clickPicker, true);
		document.addEventListener('keydown', keyHandler, true);
	}

	chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (message?.type === 'PING_PICKER') {
			sendResponse({ ok: true });
			return true;
		}

		if (message?.type === 'SETTINGS_UPDATED') {
			applySettings(message.settings || defaultSettings);
			sendResponse({ ok: true });
			return true;
		}

		if (message?.type === 'START_COLOR_PICK') {
			applySettings(message.settings || defaultSettings);
			primeCapture(message.dataUrl, message.dpr)
				.then(() => {
					startPicker();
					sendResponse({ ok: true });
				})
				.catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
			return true;
		}

		if (message?.type === 'STOP_COLOR_PICK') {
			stopPicker(true);
			sendResponse({ ok: true });
			return true;
		}
	});
}
