# Quick Color Picker Chrome Extension

![Logo](icon-color-wheel.png)

### Pick Any Color on the Web with One Click! 🖱️

Choosing the right color from a page should be fast and frictionless. With **Quick Color Picker**, you no longer need to take screenshots, open design tools, or guess color values manually. This Chrome extension lets you sample colors directly from the active tab and copy them instantly in **HEX** or **RGBA**.

Need a quick value for UI polish? 🎨 Want a precise color for a design handoff? 📐 It is all available right in your browser through a clean popup and keyboard shortcut.

This tool is lightweight, non-invasive, and built to do one job well: make color picking easier.

### Features ✨

- **Live Color Sampling**: Hover anywhere on the page and preview color values in real time.
- **One-Click Copy**: Click to copy the selected color directly to your clipboard.
- **HEX and RGBA Support**: Choose the format used for hover preview and copied output.
- **Start / End Picker Control**: Toggle the picker from the popup using Start and End.
- **Esc to Cancel**: Exit color picking quickly with Escape.
- **Platform-Aware Shortcuts**: Shows the correct keyboard hint for macOS and Windows/Linux users.

### Keyboard Shortcuts ⌨️

- **macOS default**: Command+Shift+P
- **Windows/Linux default**: Ctrl+Shift+P

Shortcuts can be changed at chrome://extensions/shortcuts.

### Privacy & Data Collection 🔐

This extension **does not collect or store personal data**. It runs locally in your browser and is used only for color sampling on the active tab. No picked color data, page data, or user identifiers are sent to external servers.

### Contributions 🤝

Contributions, bug reports, and feature requests are welcome. Feel free to open an issue or submit a pull request.

1. Fork this repository.
2. Create a branch: `git checkout -b feature/your-feature-name`.
3. Submit a pull request with a clear summary of your changes.

---

This extension is independently developed and is not affiliated with or endorsed by Google, Chrome Web Store, or any third-party design platform.

## Privacy Policy 🛡️

### Quick Color Picker Extension

_Last updated: 2026-04-23_

The **Quick Color Picker Extension** ("we", "our", or "the extension") does not collect, store, or share personal data from users. The extension is designed to sample color values from the active tab and help users copy those values quickly. Below is more detail on how data is handled:

### 1. Data Collection

- **No Personal Data**: This extension does not collect, store, or transmit personally identifiable information, health information, financial information, authentication credentials, or communication records.
- **No User Activity Tracking**: The extension does not track browsing history or monitor user behavior beyond the actions required to run the color picker on a user-activated tab.

### 2. Permissions

The extension requires the following permissions:

- **activeTab**: To run the picker only on the tab the user explicitly activates.
- **scripting**: To inject the picker script on demand when the user starts the picker.
- **tabs**: To check active tab availability and support picker status UX.
- **storage**: To save local preferences and last picked color value.

These permissions are solely used to provide color-picking functionality. They are not used for profiling, advertising, or analytics.

### 3. Data Sharing

This extension does not share user data with third parties.

### 4. External Services

The extension does not send color data, page content, or user identifiers to remote servers.

### 5. Clipboard Use

The extension writes the selected color value to the clipboard only after a direct user action (clicking on a sampled color).

### 6. Changes to This Privacy Policy

We reserve the right to update this privacy policy at any time. Any changes will be reflected in this repository.

### 7. Contact

If you have any questions regarding this privacy policy, please contact us via the repository issue page.

