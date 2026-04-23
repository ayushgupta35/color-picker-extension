# Privacy Policy - Quick Color Picker

Last updated: 2026-04-22

Quick Color Picker is a browser extension that lets users sample colors from the currently visible tab.

## Data Collection

This extension does not collect, sell, rent, or share personal data.

## Data Storage

The extension stores the following data locally in your browser using `chrome.storage.local`:
- Picker display/copy settings (HEX or RGBA, live panel visibility)
- Last picked color value

This data stays on your device and is not transmitted to external servers.

## Network and External Services

The extension does not send picked colors, page content, screenshots, or user identifiers to any remote server.

## Permissions Use

- `activeTab`: Used to run the picker only on the tab the user explicitly activates.
- `scripting`: Used to inject the content script when the user starts the picker.
- `tabs`: Used to check active tab state and manage picker availability UX.
- `storage`: Used to save local settings and last picked color.

## Clipboard

When a color is selected, the extension copies that selected color value (HEX or RGBA) to the clipboard on user action.

## Sensitive Pages

The extension does not run on restricted browser pages where extensions are disallowed by Chrome policy (for example, `chrome://` pages or Chrome Web Store pages).

## Contact

For support or privacy questions, use the support contact listed in the extension store listing.
