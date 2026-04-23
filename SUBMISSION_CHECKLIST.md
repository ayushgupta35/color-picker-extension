# Chrome Web Store Submission Checklist

## Before Packaging

1. Confirm `manifest_version` is 3.
2. Verify extension purpose is single-purpose: picking/copying colors.
3. Ensure all permissions are necessary and justified:
   - `activeTab`, `scripting`, `tabs`, `storage`
4. Confirm no remote code execution and no external script loading.
5. Verify no unnecessary host permissions are requested.
6. Verify toolbar icon and extension icons are present (16, 48, 128).
7. Confirm keyboard shortcut and popup behavior work on regular `http/https` pages.
8. Confirm unsupported pages show unavailable state and do not attempt picking.
9. Include and review `PRIVACY_POLICY.md` for store listing privacy disclosure.
10. Prepare screenshots and a clear description that matches actual behavior.

## Suggested Store Listing Disclosures

- Data handling:
  - No data sold
  - No data shared with third parties
  - Data is processed locally only
- Purpose:
  - Color sampling and clipboard copy on user action
- Permissions rationale:
  - Active tab interaction and local settings persistence

## Package for Upload

From project root, create a zip containing all extension files (not the parent folder):

```bash
zip -r quick-color-picker.zip . -x '*.DS_Store' '*.git*' 'node_modules/*'
```

## Final Manual QA

1. Load unpacked extension and test on at least 3 websites.
2. Verify pick/preview/copy behavior for HEX and RGBA formats.
3. Verify popup Start button is disabled on unsupported pages.
4. Verify icon dim/bright behavior switches with page availability.
5. Reload browser and confirm settings persist.
