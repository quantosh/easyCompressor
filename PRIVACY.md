# Privacy Policy for Easy Compressor

Easy Compressor does not collect, store, or transmit any personal data.

## What the extension does

Easy Compressor applies a dynamic audio compressor to media elements (`<video>` and `<audio>`) in the currently active browser tab. It processes audio entirely **locally** within your browser using the Web Audio API.

## Data handling

- **No data collection**: The extension does not collect, record, or send any information.
- **No network requests**: All audio processing happens locally in your browser. No data is sent to any server.
- **Local storage only**: The extension uses `chrome.storage.local` solely to persist your EQ and compressor settings between popup sessions. This data never leaves your browser.
- **No analytics**: No analytics, tracking, or telemetry of any kind is implemented.
- **Host permissions**: The `activeTab` and `<all_urls>` permissions are used solely to inject the content script into the current tab so the compressor can access `<video>`/`<audio>` elements. This access is temporary and limited to the active tab while the extension is being used.

## Third parties

Easy Compressor does not include any third-party code, libraries, or services that collect data.

## Updates

This policy may be updated occasionally. The latest version will always be available at this URL.

## Contact

For questions about this privacy policy, please open an issue on the GitHub repository.
