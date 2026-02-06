# File System Restrictions in MCP Servers

## Issue Summary

When running the Figma Asset Downloader MCP server through Cursor, file downloads to locations outside the workspace directory may fail silently due to **sandbox restrictions**.

### What Happens

1. The MCP server successfully fetches data from Figma API ✅
2. The download logic executes without errors ✅
3. The server reports "165 files downloaded successfully" ✅
4. **BUT**: No files actually exist in the target directory ❌

### Root Cause

MCP servers run in a sandboxed environment with restricted file system access. When you try to write to locations outside allowed directories (like `/Users/aakash/AndroidStudioProjects/...`), the write operation may:
- Succeed in a virtual/temporary file system
- Not throw an error
- But the files don't persist to the actual target location

### Testing

Running the same download code **outside of MCP** (via `debug-download.js`) works perfectly:
```bash
✅ Downloaded 3 test files successfully
✅ Files verified in target directory
✅ Correct file sizes confirmed
```

## Solutions

### Option 1: Download to Workspace (Recommended)

Download files to a directory **within your Cursor workspace**, then move them:

```javascript
// Instead of:
savePath: "/Users/aakash/AndroidStudioProjects/qap_test/app/src/main/res/drawable"

// Use:
savePath: "./figma-downloads"  // Relative to workspace

// Then manually move files:
// cp -r figma-downloads/* /path/to/android/project/drawable/
```

### Option 2: Use the Standalone Script

Use `debug-download.js` for bulk downloads outside of MCP:

```bash
# Edit the TEST_PARAMS in debug-download.js
# Then run:
node debug-download.js
```

This bypasses MCP restrictions and writes directly to any location.

### Option 3: Symbolic Link

Create a symlink from your workspace to the target directory:

```bash
cd /Users/aakash/Hack/figma
ln -s /Users/aakash/AndroidStudioProjects/qap_test/app/src/main/res/drawable android-drawable
```

Then use:
```javascript
savePath: "./android-drawable"
```

## Updated Server Behavior

The server now:
1. ✅ Verifies each file actually exists after writing
2. ✅ Only counts successfully written files
3. ✅ Provides clear error messages when no files are written
4. ✅ Includes debug logging to trace file operations

### Debug Logs

After restarting Cursor, check the MCP logs for:
```
[DEBUG downloadFigmaAssets] Save path requested: /path/...
[DEBUG downloadFigmaAssets] Absolute save path: /path/...
[DEBUG downloadFigmaAssets] process.cwd(): /Users/aakash/Hack/figma
[DEBUG] Writing file: /path/to/file.png
[ERROR] File write claimed success but file doesn't exist: /path/...
```

## Recommended Workflow

For Android/iOS projects:

1. **Download to workspace:**
   ```javascript
   savePath: "./figma-assets"
   ```

2. **Copy to project:**
   ```bash
   cp figma-assets/*.png ~/AndroidStudioProjects/app/src/main/res/drawable/
   ```

3. **Or use the debug script** for direct downloads without MCP restrictions

## Files

- `index.js` - Updated MCP server with verification
- `debug-download.js` - Standalone download script (no MCP restrictions)
- `FILESYSTEM_ISSUE.md` - This document

## Testing Your Setup

1. Try downloading to workspace: `./test-output`
2. If successful → use workspace approach
3. If still fails → use `debug-download.js`
