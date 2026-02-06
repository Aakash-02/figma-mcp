# Usage Examples

Complete examples for using the Figma Asset Downloader MCP Server.

## 🎯 Common Workflows

### 1. Explore a Figma File

**Prompt:**
```
What assets are available in https://www.figma.com/design/ABC123/MyDesign?
```

**What happens:**
- Calls `fetch_figma_assets`
- Shows you: file name, total assets, breakdown by type
- Lists all frames, components, and UI elements

**Use when:**
- Starting a new project
- Understanding a design file structure
- Deciding what to download

---

### 2. Download All Screens for Development

**Prompt:**
```
Download all screens and UI elements from 
https://www.figma.com/design/ABC123/MobileApp 
as SVG files and save them to ./src/assets/figma
```

**What happens:**
- Calls `download_figma_assets` with format='svg'
- Downloads ~40-50 assets (frames + their direct children)
- Saves to your project's assets folder

**You get:**
- Complete screen mockups (LoginScreen, Dashboard, etc.)
- Individual UI elements (buttons, inputs, icons)
- All compiled and ready to use

**Use when:**
- Building a new feature matching the design
- Need reference images for development
- Creating prototypes

---

### 3. Extract Design System Components

**Prompt:**
```
Download only the reusable components from 
https://www.figma.com/design/ABC123/DesignSystem
and save them to ./design-system/components as SVG
```

**What happens:**
- Calls `download_component_library`
- Downloads only COMPONENT types (~5-20 files)
- Excludes instances and frames

**You get:**
- Button.svg
- Input.svg  
- Card.svg
- Icon components
- Master components only

**Use when:**
- Building a component library
- Creating Storybook
- Documenting design system
- Syncing Figma components to code

---

### 4. Get Design Tokens

**Prompt:**
```
Extract design tokens from https://www.figma.com/design/ABC123/DesignSystem
and show me the color palette
```

**What happens:**
- Calls `get_design_tokens`
- Analyzes entire file
- Returns colors, fonts, spacing, effects

**You get:**
```json
{
  "colors": {
    "primary": "#50c2c9",
    "secondary": "#667eea",
    "background": "#f0f4f3"
  },
  "typography": {
    "heading": "Inter-32px-700",
    "body": "Inter-16px-400"
  },
  "spacing": [8, 16, 24, 32]
}
```

**Use when:**
- Building a design system
- Generating CSS variables
- Creating Tailwind config
- Documenting brand guidelines

---

### 5. Generate CSS from Tokens

**Prompt:**
```
Extract design tokens from [Figma URL] and generate a CSS file with variables
```

**What happens:**
- Calls `get_design_tokens`
- AI generates CSS from the tokens
- Creates styles.css with :root variables

**You get:**
```css
:root {
  --color-primary: #50c2c9;
  --color-secondary: #667eea;
  --font-heading: Inter;
  --spacing-sm: 8px;
  --spacing-md: 16px;
}
```

---

### 6. Generate Tailwind Config

**Prompt:**
```
Extract tokens from [Figma URL] and create a tailwind.config.js
```

**You get:**
```javascript
module.exports = {
  theme: {
    colors: {
      primary: '#50c2c9',
      secondary: '#667eea'
    },
    spacing: {
      xs: '8px',
      sm: '16px'
    }
  }
}
```

---

### 7. Full Design Handoff Workflow

**Prompt:**
```
I'm implementing the Todo app from this Figma file:
https://www.figma.com/design/ABC123/TodoApp

1. Download all screens as 2x PNG to ./mockups
2. Download all components as SVG to ./src/components/assets
3. Extract design tokens and save to ./src/styles/tokens.json
```

**What happens:**
- Downloads 4 complete screen PNGs (high-res mockups)
- Downloads 5 component SVGs (Button, Input, etc.)
- Extracts and saves design tokens as JSON

**Perfect for:**
- Complete design → development handoff
- New feature implementation
- Design system migration

---

## 🎨 Design Token Use Cases

### Generate Theme Files

```
Get tokens from [Figma URL] and create:
- theme.ts for React
- variables.scss for Sass
- tokens.json for documentation
```

### Sync with Codebase

```
Compare design tokens from [Figma URL] with my existing 
theme.ts file and show me what changed
```

### Multi-Platform Export

```
Extract tokens from [Figma URL] and generate:
- CSS variables for web
- colors.xml for Android
- Colors.swift for iOS
```

---

## 🧩 Component Library Use Cases

### Build Storybook

```
Download components from [Figma URL] to ./src/stories/assets
Then help me create Storybook stories for each component
```

### Component Documentation

```
Download components with descriptions and help me create 
a components.md documentation file
```

### React Component Stubs

```
Download components from [Figma URL] and generate React 
component files for each one
```

---

## 💾 Output Format Examples

### Frames (Complete Screens)
```
1-211_FRAME_LoginScreen.svg (145 KB)
```
- Contains: Complete screen with all UI elements
- Use for: Mockups, prototypes, reference images

### Components (Reusable Elements)
```
1-124_COMPONENT_Button.svg (7 KB)
```
- Contains: Master component with all states
- Use for: Component libraries, Storybook, documentation

### Instances (Component Uses)
```
1-218_INSTANCE_input_filed.svg (8 KB)
```
- Contains: Specific use of a component
- Use for: Seeing component variations in context

### Text Elements
```
1-105_TEXT_Gets-things-with-TODs.svg (2 KB)
```
- Contains: Rendered text with styling
- Use for: Placeholder text, copy reference

---

## 🚀 Pro Tips

### Tip 1: Start with fetch_figma_assets
Always explore what's available before downloading:
```
What's in this file? [Figma URL]
```

### Tip 2: Use Descriptive Save Paths
```
./src/assets/figma/screens/     # For full screens
./src/assets/figma/components/  # For reusable components
./src/styles/                   # For design tokens
```

### Tip 3: SVG for Components, PNG for Mockups
```
Components as SVG → Scalable and editable
Screens as PNG 2x → High-res mockups
```

### Tip 4: Combine with Official Figma MCP
```
Use this server for: Asset downloads, tokens
Use official MCP for: Code generation, Code Connect
```

### Tip 5: Automate with CI/CD
Add to your GitHub Actions:
```yaml
- name: Download Figma assets
  run: |
    # AI agent downloads latest assets
    # Commits to repo if changed
```

---

## 🎓 Learning Path

**Beginner:**
1. Start with `fetch_figma_assets` to explore
2. Download screens with `download_figma_assets`
3. Use assets in your app

**Intermediate:**
4. Extract `get_design_tokens` for styling
5. Download `download_component_library` for reusable elements
6. Generate CSS/Tailwind from tokens

**Advanced:**
7. Automate asset sync in CI/CD
8. Build design system from Figma
9. Keep code in sync with designs

---

## 📞 Example Conversations

### Conversation 1: Quick Asset Grab
```
You: Download the login screen from [Figma URL] to ./public

AI: ✓ Downloaded LoginScreen.svg (145 KB) to ./public
    Also downloaded: 
    - Button instance
    - 2 Input fields
    - Welcome text
    Total: 5 files
```

### Conversation 2: Design System Setup
```
You: I'm building a design system. Get me:
     1. All components from [Figma URL]
     2. Design tokens  
     3. Save components to ./ds/components

AI: ✓ Extracted 5 components and 31 colors
    ✓ Saved to ./ds/components
    ✓ Generated tokens.json
    
    Ready to use! Would you like me to create 
    React components from these?
```

### Conversation 3: Full Implementation
```
You: I'm implementing the Todo app. Get everything from 
     [Figma URL] - screens, components, and tokens

AI: ✓ Downloaded 45 assets:
    - 4 screens to ./assets/screens
    - 5 components to ./assets/components  
    - Extracted 31 colors and 7 fonts
    
    Created:
    - tokens.css (design system variables)
    - components.md (documentation)
    
    Ready to start implementing!
```

---

**Version:** 2.0.0  
**Status:** Production Ready ✅  
**Perfect complement to official Figma MCP** 🎯
