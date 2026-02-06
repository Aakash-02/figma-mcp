# Changelog

All notable changes to the Figma Asset Downloader MCP Server will be documented in this file.

## [3.0.0] - 2026-02-06

### 🎉 Major Release - Now Compatible with Official Figma MCP!

This release adds the critical missing features that make this server competitive with and complementary to the official Figma MCP server.

### ✨ Added

- **`get_screenshot`** - Get visual PNG screenshots of any frame or node
  - Returns base64-encoded PNG images
  - 2x scale for high resolution
  - Enables AI to "see" designs before generating code
  - Perfect for visual exploration and context

- **`get_metadata`** - Get structured XML metadata similar to official Figma MCP
  - Hierarchical XML representation
  - Includes node IDs, names, types
  - Includes positions (x, y) and sizes (width, height)
  - Shows visibility and opacity
  - Reveals parent-child relationships
  - Compatible with official Figma MCP format

### 🔧 Changed

- Tool descriptions updated to clarify purpose and use cases
- README restructured with new tools documentation
- Added COMPARISON.md for detailed feature comparison with official MCP

### 📚 Documentation

- New COMPARISON.md explaining differences with official Figma MCP
- Updated README with screenshot and metadata tool documentation
- Added test-new-tools.js for testing new features
- Clarified that this server complements (not replaces) official MCP

### 🎯 Why This Matters

**Before v3.0:**
- ❌ No visual context (AI couldn't "see" designs)
- ❌ Flat JSON structure (AI couldn't understand hierarchy)
- ⚠️ Asset downloads only (limited use case)

**After v3.0:**
- ✅ Screenshots for visual exploration
- ✅ XML metadata for structure understanding
- ✅ Compatible with official Figma MCP workflow
- ✅ Complete design-to-development toolkit

### 🚀 Migration Guide

No breaking changes! All existing tools work the same.

New tools are available immediately:
- `get_screenshot` - Get visual representation
- `get_metadata` - Get structured XML hierarchy

### 📊 Performance

- Screenshot generation: ~2-3 seconds per frame
- Metadata extraction: <1 second for entire file
- No impact on existing download tools

---

## [2.0.0] - 2026-02-05

### ✨ Added

- **`get_design_tokens`** - Extract design tokens (colors, typography, spacing, effects)
  - Comprehensive color extraction from fills and strokes
  - Complete typography with font families, sizes, weights
  - Spacing values from padding and layout
  - Effects like shadows and blurs
  - Figma Variables API integration

- **`download_component_library`** - Export only reusable components
  - Filters master components from instances
  - Perfect for design system extraction
  - Separate tool for focused component export

### 🔧 Changed

- Improved error handling across all tools
- Better file naming convention with node IDs
- Enhanced batch processing for 100+ assets
- Added filesystem debugging for MCP sandboxing issues

### 📚 Documentation

- Comprehensive README with all tool documentation
- USAGE.md with workflow examples
- SUMMARY.md with technical highlights
- Test suite with automated validation

---

## [1.0.0] - 2026-02-04

### 🎉 Initial Release

- **`fetch_figma_assets`** - List available assets in a Figma file
- **`download_figma_assets`** - Bulk download frames and their children
- Support for SVG, PNG (1x-4x), JPG, PDF formats
- Smart asset extraction (frames + one level below)
- Batch processing for large files
- MCP protocol compliance
- Minimal dependencies (axios, dotenv)

### 🎯 Core Features

- Bulk asset downloads (50+ assets at once)
- Multiple export formats
- Compiled asset rendering (complete files)
- Descriptive file naming
- Error handling and validation
- CI/CD friendly (URL-based)

---

## Version Numbering

This project follows [Semantic Versioning](https://semver.org/):
- **Major** (X.0.0): Breaking changes or significant new capabilities
- **Minor** (0.X.0): New features, backwards compatible
- **Patch** (0.0.X): Bug fixes and minor improvements

## Links

- [GitHub Repository](https://github.com/yourusername/figma-asset-downloader)
- [Documentation](./README.md)
- [Comparison with Official MCP](./COMPARISON.md)
- [Usage Examples](./USAGE.md)
