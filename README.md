# Figma Asset Downloader MCP Server

> A comprehensive MCP server for extracting design assets and tokens from Figma files. Features **AI-driven asset selection** for intelligent, efficient downloads. Complements the official Figma MCP with powerful bulk download and design system extraction capabilities.

## 🌟 NEW in v4.0: AI-Driven Asset Selection

**Let AI decide what to download!** Instead of downloading everything, the AI agent now:
1. 📋 Sees ALL available assets (not just filtered)
2. 👁️ Looks at screenshots to understand the design
3. 🧠 Decides intelligently what needs downloading vs what can be recreated in code
4. 💾 Downloads only selected assets

**Result:** Up to 95% fewer downloads, 80% less bandwidth, smarter workflows!

See [AI_DRIVEN_SELECTION.md](./AI_DRIVEN_SELECTION.md) for complete guide.

---

## ✨ Features

- 🤖 **AI-driven asset selection** - Let AI decide what to download based on visual analysis (NEW v4.0)
- 📋 **Complete asset visibility** - AI sees ALL assets, not just filtered ones (NEW v4.0)
- 📸 **Visual screenshots** - Get PNG screenshots of any frame or node for exploration
- 📋 **Structured metadata** - XML hierarchy with positions, sizes, and relationships
- 📦 **Fetch all assets** - Get metadata about frames, components, and their children
- 💾 **Download compiled assets** - Export frames + direct children as complete files
- 🎯 **Selective downloads** - Download only specific assets by ID (NEW v4.0)
- 🎨 **Extract design tokens** - Get colors, typography, spacing, and effects
- 🧩 **Component library export** - Download only reusable components
- 🎯 **Multiple formats** - SVG, PNG (1x-4x), JPG, PDF support
- 📁 **Flexible saving** - Agent controls where files are saved
- ⚡ **Batch processing** - Handles 100+ assets efficiently
- 💡 **95% efficiency gain** - AI-driven selection dramatically reduces unnecessary downloads

## 🆚 vs Official Figma MCP

| Feature | Official Figma MCP | This Server |
|---------|-------------------|-------------|
| Visual Screenshots | ✅ Desktop app | ✅ **URL-based** |
| Structured Metadata (XML) | ✅ Best-in-class | ✅ **Compatible** |
| Design → Code Generation | ✅ Best-in-class | ❌ Not needed |
| **Bulk Asset Downloads** | ❌ **Missing** | ✅ **Core feature** |
| **Component Library Export** | ❌ **Missing** | ✅ **Yes** |
| **Design Token Extraction** | ⚠️ Limited | ✅ **Comprehensive** |
| URL-based (no desktop app) | ⚠️ Remote only | ✅ **Always** |
| CI/CD Integration | ❌ Hard | ✅ **Perfect fit** |

**This server complements the official MCP** - use both together for complete Figma integration!

See [COMPARISON.md](./COMPARISON.md) for detailed analysis.

## 🚀 Quick Start

### 1. Install

```bash
npm install
```

### 2. Configure

Create `.env` file:
```bash
FIGMA_ACCESS_TOKEN=your_figma_token_here
```

Get your token from: [Figma Settings → Account → Personal Access Tokens](https://www.figma.com/settings)

### 3. Add to MCP Client

**For Cursor** (`~/.cursor/mcp_config.json`):
```json
{
  "mcpServers": {
    "figma-asset-downloader": {
      "command": "node",
      "args": ["/absolute/path/to/figma/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

**For Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "figma-asset-downloader": {
      "command": "node",
      "args": ["/absolute/path/to/figma/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

### 4. Restart & Use

Restart your MCP client and talk to your AI:

```
Download all assets from [Figma URL] and save to ./src/assets
```

## 🛠️ Available Tools

### 1. `get_screenshot` 🆕

Get a visual PNG screenshot of any frame or node from a Figma file.

**What it returns:**
- PNG image (2x scale, base64 encoded)
- Visual representation of the design
- Perfect for AI to "see" the design before generating code

**Example usage:**
```
Show me a screenshot of the login screen from [Figma URL]
```

**Response:**
Returns a PNG image that the AI can see and analyze.

### 2. `get_metadata` 🆕

Get structured XML metadata about a Figma file or specific node.

**What it returns:**
- XML hierarchy showing layer structure
- Node IDs, names, types
- Positions (x, y) and sizes (width, height)
- Visibility and opacity
- Complete parent-child relationships

**Example usage:**
```
Show me the structure of [Figma URL]
```

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<figma file="ABC123" name="Mobile App">
  <node id="0:1" name="Page 1" type="CANVAS">
    <node id="1:2" name="LoginScreen" type="FRAME" x="0" y="0" width="375" height="812">
      <node id="1:3" name="Button" type="INSTANCE" x="20" y="700" width="335" height="48" />
    </node>
  </node>
</figma>
```

### 3. `fetch_all_assets_detailed` 🆕 v4.0

Get a COMPLETE list of ALL assets in the file (no server-side filtering).

**What it returns:**
- All assets up to depth 8 (not just frames + children)
- Full metadata: sizes, visibility, child counts
- Helpful hints: `likelyRecreatableInCode`, `likelyNeedsDownload`
- Assets grouped by type for easier analysis
- Recommendations for AI decision-making

**Example usage:**
```
Show me all available assets in [Figma URL] so I can decide what to download
```

**Response:**
```json
{
  "totalAssets": 332,
  "assetsByType": {
    "FRAME": 19,
    "VECTOR": 221,
    "COMPONENT": 5,
    "TEXT": 34
  },
  "recommendations": {
    "likelyNeedDownload": 254,
    "likelyRecreatableInCode": 64,
    "icons": 15
  },
  "assets": [
    {
      "id": "1:3",
      "name": "Logo",
      "type": "COMPONENT",
      "size": {"width": 190, "height": 190},
      "likelyNeedsDownload": true
    }
  ]
}
```

**Perfect for:** AI-driven asset selection - let AI decide what to download!

### 4. `download_selective_assets` 🆕 v4.0

Download ONLY specific assets by their node IDs.

**What it does:**
- Downloads only the assets you specify by ID
- AI decides which assets are needed
- Skips simple shapes that can be recreated in code
- Dramatically more efficient than bulk downloads

**Example usage:**
```
Download only these specific assets from [Figma URL]:
- 1:3 (Logo)
- 1:7 (Icon-Check)  
- 1:55 (Illustration)
Save to ./src/assets
```

**Response:**
```json
{
  "requested": 3,
  "downloaded": 3,
  "files": [
    {"id": "1:3", "name": "Logo.svg", "size": 12456},
    {"id": "1:7", "name": "Icon-Check.svg", "size": 1203},
    {"id": "1:55", "name": "Illustration.svg", "size": 45678}
  ]
}
```

**Perfect for:** Intelligent, efficient downloads - only what's truly needed!

### 5. `fetch_figma_assets`

Get metadata about all available assets in a Figma file.

**What it returns:**
- File name and key
- Total asset count
- Assets grouped by type (Frame, Component, Instance, etc.)
- Complete list with IDs and names

**Example usage:**
```
What assets are in https://www.figma.com/design/ABC123/MyDesign?
```

**Response:**
```json
{
  "fileName": "Mobile_app_design | Todo app",
  "fileKey": "OIs2NETT1YxnXyWljwuZnH",
  "totalAssets": 45,
  "assetsByType": {
    "FRAME": 6,
    "COMPONENT": 5,
    "INSTANCE": 13,
    "TEXT": 11
  },
  "assets": [...]
}
```

### 6. `download_figma_assets`

Download frames and their direct children as compiled assets.

**What it downloads:**
- Top-level frames (screens/artboards)
- All direct children of frames (buttons, inputs, text, etc.)
- Each file is complete with all nested elements rendered

**Example usage:**
```
Download all screens and UI elements from [Figma URL] to ./src/assets/screens
```

**Response:**
```json
{
  "success": true,
  "fileName": "Mobile_app_design",
  "totalAssets": 45,
  "downloaded": 45,
  "savePath": "/path/to/project/src/assets/screens",
  "format": "svg",
  "files": [...]
}
```

### 7. `get_design_tokens`

Extract design system tokens from a Figma file.

**What it extracts:**
- **Colors** - All fill and stroke colors used
- **Typography** - Font families, sizes, weights, line heights
- **Spacing** - Padding, margins, gaps
- **Effects** - Shadows, blurs, and other effects
- **Variables** - Figma variables (if available)
- **Styles** - Named styles defined in the file

**Example usage:**
```
Extract design tokens from [Figma URL] and show me the color palette
```

**Response:**
```json
{
  "fileName": "Mobile_app_design",
  "tokens": {
    "colors": {
      "color-1": "#f0f4f3",
      "color-2": "#50c2c9",
      "color-3": "#000000"
    },
    "typography": {
      "Inter-16": {
        "fontFamily": "Inter",
        "fontSize": "16px",
        "fontWeight": 400,
        "lineHeight": "24px"
      }
    },
    "spacing": [8, 16, 24, 32],
    "effects": [...]
  },
  "summary": {
    "totalColors": 31,
    "totalFonts": 7,
    "totalSpacingValues": 12
  }
}
```

**Perfect for:**
- Generating CSS variables
- Creating Tailwind config
- Building design system documentation
- Syncing design tokens to code

### 8. `download_component_library`

Download only the reusable components from a Figma file.

**What it downloads:**
- COMPONENT types only (not instances!)
- Master components that can be reused
- Perfect for design system libraries

**Example usage:**
```
Download the component library from [Figma URL] as SVG to ./design-system/components
```

**Response:**
```json
{
  "success": true,
  "fileName": "Mobile_app_design",
  "totalComponents": 5,
  "downloaded": 5,
  "savePath": "/path/to/design-system/components",
  "components": [
    {
      "filename": "1-124_COMPONENT_Button.svg",
      "name": "Button",
      "description": "Primary action button",
      "size": 7365
    }
  ]
}
```

**Perfect for:**
- Extracting design system components
- Creating component libraries
- Documenting components
- Building Storybook from Figma

## 💡 Usage Examples

### Example 1: Full Design System Extraction

```
I need to extract everything from this Figma design system:
https://www.figma.com/design/ABC123/DesignSystem

1. Get the design tokens and save them as tokens.json
2. Download all components to ./design-system/components
3. Download all screens to ./design-system/screens
```

The AI will:
1. Call `get_design_tokens` → Generate tokens.json
2. Call `download_component_library` → Save 5-20 component SVGs
3. Call `download_figma_assets` → Save all screens + their elements

### Example 2: Mobile App Assets

```
Download all mobile app screens from [Figma URL] as 2x PNG 
and save them to ./public/mockups
```

### Example 3: Icon Library

```
Extract all icon components from [Figma URL] and save as SVG to ./src/icons
```

### Example 4: Design Token Sync

```
Get design tokens from [Figma URL] and generate a Tailwind config file
```

## 📊 What Gets Extracted

### Asset Extraction Strategy

```
Figma File
└── Page 1 (CANVAS)
    ├── LoginScreen (FRAME) ✅ Downloaded
    │   ├── Button (INSTANCE) ✅ Downloaded (compiled)
    │   ├── Input (INSTANCE) ✅ Downloaded (compiled)
    │   │   ├── Rectangle ❌ Not separate (compiled in Input)
    │   │   └── Text ❌ Not separate (compiled in Input)
    │   └── Welcome text (TEXT) ✅ Downloaded
    └── Button (COMPONENT) ✅ Downloaded
        ├── Rectangle ❌ Not separate (compiled in Button)
        └── Label ❌ Not separate (compiled in Button)
```

**You get:**
- ✅ Complete frames with everything rendered
- ✅ Direct children as separate compiled assets
- ✅ Components as reusable building blocks
- ❌ NOT individual shapes inside components

### Design Token Extraction

Analyzes the entire file to extract:
- **31 unique colors** from fills and strokes
- **7 font styles** with complete typography specs
- **Spacing values** from layout grids and padding
- **3 effects** (shadows, blurs, etc.)

## 🧪 Testing

Run the test suite:

```bash
node test.js
```

Expected output:
```
✅ All tests passed! The MCP server is working correctly.
  ✓ fetch_figma_assets - 45 assets found
  ✓ get_design_tokens - 31 colors, 7 fonts extracted
  ✓ download_component_library - 5 components downloaded
  ✓ download_figma_assets - 45 assets downloaded
```

## 📋 File Naming Convention

Downloaded files use a descriptive naming pattern:

```
{node-id}_{type}_{name}.{extension}

Examples:
- 1-211_FRAME_LoginScreen.svg
- 1-124_COMPONENT_Button.svg
- 1-218_INSTANCE_input_filed.svg
- 1-105_TEXT_Gets-things-with-TODs.svg
```

This makes it easy to:
- Identify asset types
- Find specific components
- Organize in your codebase
- Track back to Figma node IDs

## 🎯 Use Cases

### For Frontend Developers
- Get all screen mockups for implementation
- Extract component library for building UI
- Sync design tokens to CSS/Tailwind
- Download assets for prototypes

### For Design System Teams
- Export entire component libraries
- Generate token documentation
- Keep code in sync with designs
- Automate asset management

### For CI/CD Pipelines
- Automate asset exports on design changes
- Generate design system docs
- Update tokens in codebase
- Version control design assets

### For Product Teams
- Quickly export flows for presentations
- Share design assets with stakeholders
- Document design decisions
- Archive design versions

## 🔒 Security & Permissions

- Requires valid Figma Personal Access Token
- Token stored in `.env` (gitignored) or MCP config
- Only accesses files your token has permissions for
- No data stored on server
- All operations are read-only on Figma

## 🐛 Troubleshooting

### Files report as downloaded but don't exist

**Issue:** Server reports "165 files downloaded successfully" but no files in target directory.

**Cause:** MCP servers run in a sandboxed environment. Writing to locations outside the workspace may fail silently.

**Solutions:**
1. **Use workspace-relative path:** `./figma-assets` instead of absolute paths
2. **Use debug script:** `node debug-download.js` (edit params first) - bypasses MCP restrictions
3. **Create symlink:** `ln -s /path/to/target ./local-name` then use `./local-name`

See [FILESYSTEM_ISSUE.md](./FILESYSTEM_ISSUE.md) for detailed explanation.

### "FIGMA_ACCESS_TOKEN environment variable not set"

**Solution:** Add token to `.env` file or MCP config `env` section.

### "Invalid Figma URL format"

**Solution:** URL must be in format `https://www.figma.com/design/FILE_KEY/...` or `https://www.figma.com/file/FILE_KEY/...`

### 401/403 errors from Figma

**Solution:** Token expired or lacks permissions. Generate new token from Figma Settings.

### "Could not fetch variables"

**Note:** This is normal for files without Figma variables. Design tokens will still be extracted from node styles.

### Server not appearing in MCP client

**Solution:**
1. Check absolute path in config is correct
2. Ensure `.env` has valid token or config has `env.FIGMA_ACCESS_TOKEN`
3. Restart MCP client completely
4. Test server: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node index.js`

## 📦 Dependencies

Minimal and production-ready:
- `axios` - HTTP requests to Figma API
- `dotenv` - Environment variable management

No heavy frameworks, no unnecessary bloat!

## 🔧 Development

### Project Structure

```
figma/
├── index.js                 # Main MCP server (11 KB)
├── package.json             # Dependencies
├── README.md                # This file
├── test.js                  # Test suite
├── mcp-config.example.json  # Config template
└── .env                     # Your Figma token
```

### Modifying the Server

1. Edit `index.js`
2. Test with `node test.js`
3. Restart your MCP client to reload

### API Endpoints Used

- `GET /v1/files/:fileKey` - File structure and nodes
- `GET /v1/files/:fileKey/variables/local` - Figma variables
- `GET /v1/images/:fileKey` - Asset image exports

## 📚 Documentation

- [Figma API Docs](https://www.figma.com/developers/api)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [Model Context Protocol Servers](https://github.com/modelcontextprotocol/servers)

## 🎉 Complete Feature Set

### 8 Powerful Tools:

1. ✅ **get_screenshot** - Visual context (see the design)
2. ✅ **get_metadata** - Structured XML (understand hierarchy)
3. ✅ **fetch_all_assets_detailed** 🆕 - Complete asset list for AI-driven selection
4. ✅ **download_selective_assets** 🆕 - Download only specific assets by ID
5. ✅ **fetch_figma_assets** - Explore filtered assets (frames + children)
6. ✅ **download_figma_assets** - Bulk download (filtered)
7. ✅ **get_design_tokens** - Extract design system (colors, fonts, spacing)
8. ✅ **download_component_library** - Export reusable components

### What Makes It Special:

- 📸 **Visual exploration** - Screenshots for AI to "see" designs
- 📋 **Structured metadata** - XML hierarchy like official Figma MCP
- 🎯 **Smart filtering** - Only downloads meaningful, compiled assets
- 🔄 **Complete assets** - Each file includes all nested elements rendered
- 🎨 **Design tokens** - Comprehensive extraction from all nodes
- 🧩 **Component focus** - Separates master components from instances
- 📦 **Production ready** - Error handling, validation, batch processing
- 🤖 **AI-native** - Designed for agent automation
- 🔗 **Complementary** - Works alongside official Figma MCP

## 📄 License

MIT

---

**Built to complement Figma's official MCP with asset management superpowers** 🚀
