#!/usr/bin/env node

/**
 * Figma Asset Downloader - MCP Server
 * 
 * Downloads frames and their direct children from Figma files as compiled SVG assets.
 * Perfect for getting design assets ready for development.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

// ============================================================================
// Helper Functions
// ============================================================================

function extractFileKey(url) {
  const match = url.match(/(?:file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function extractAllAssets(node, assets = [], nodePath = '', depth = 0, parentType = null) {
  const currentPath = nodePath ? `${nodePath}/${node.name}` : node.name;
  const nodeType = node.type;
  
  // Get top-level frames AND everything one level below frames
  const isTopLevelFrame = nodeType === 'FRAME' && depth === 2;
  const isFrameChild = depth === 3 && parentType === 'FRAME';
  
  if (isTopLevelFrame || isFrameChild) {
    assets.push({
      id: node.id,
      name: node.name,
      path: currentPath,
      type: nodeType,
      depth: depth
    });
  }

  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => 
      extractAllAssets(child, assets, currentPath, depth + 1, nodeType)
    );
  }

  return assets;
}

function sanitizeFilename(name) {
  return name.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 200);
}

function rgbToHex(r, g, b, a = 1) {
  const toHex = (n) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return a < 1 ? `${hex}${toHex(a)}` : hex;
}

function extractDesignTokens(document) {
  const tokens = {
    colors: {},
    typography: {},
    spacing: new Set(),
    effects: []
  };

  const colorMap = new Map();
  let colorIndex = 1;
  let fontIndex = 1;

  function traverse(node) {
    // Extract colors from fills
    if (node.fills && Array.isArray(node.fills)) {
      node.fills.forEach(fill => {
        if (fill.type === 'SOLID' && fill.color) {
          const { r, g, b, a = 1 } = fill.color;
          const hex = rgbToHex(r, g, b, a);
          
          if (!colorMap.has(hex)) {
            const colorName = node.name && node.name.toLowerCase().includes('color') 
              ? node.name 
              : `color-${colorIndex++}`;
            colorMap.set(hex, colorName);
            tokens.colors[colorName] = hex;
          }
        }
      });
    }

    // Extract colors from strokes
    if (node.strokes && Array.isArray(node.strokes)) {
      node.strokes.forEach(stroke => {
        if (stroke.type === 'SOLID' && stroke.color) {
          const { r, g, b, a = 1 } = stroke.color;
          const hex = rgbToHex(r, g, b, a);
          
          if (!colorMap.has(hex)) {
            const colorName = `color-${colorIndex++}`;
            colorMap.set(hex, colorName);
            tokens.colors[colorName] = hex;
          }
        }
      });
    }

    // Extract typography
    if (node.style) {
      const { fontFamily, fontSize, fontWeight, lineHeightPx, letterSpacing } = node.style;
      if (fontFamily) {
        const fontKey = `font-${fontIndex++}`;
        tokens.typography[fontKey] = {
          fontFamily,
          ...(fontSize && { fontSize: `${fontSize}px` }),
          ...(fontWeight && { fontWeight }),
          ...(lineHeightPx && { lineHeight: `${lineHeightPx}px` }),
          ...(letterSpacing && { letterSpacing: `${letterSpacing}px` })
        };
      }
    }

    // Extract spacing
    if (node.paddingLeft !== undefined) tokens.spacing.add(node.paddingLeft);
    if (node.paddingRight !== undefined) tokens.spacing.add(node.paddingRight);
    if (node.paddingTop !== undefined) tokens.spacing.add(node.paddingTop);
    if (node.paddingBottom !== undefined) tokens.spacing.add(node.paddingBottom);
    if (node.itemSpacing !== undefined) tokens.spacing.add(node.itemSpacing);

    // Extract effects (shadows, blurs)
    if (node.effects && Array.isArray(node.effects)) {
      node.effects.forEach(effect => {
        if (effect.visible !== false) {
          tokens.effects.push({
            type: effect.type,
            ...(effect.radius && { radius: effect.radius }),
            ...(effect.color && { color: rgbToHex(effect.color.r, effect.color.g, effect.color.b, effect.color.a) }),
            ...(effect.offset && { offset: effect.offset })
          });
        }
      });
    }

    // Recursively process children
    if (node.children) {
      node.children.forEach(child => traverse(child));
    }
  }

  traverse(document);

  return {
    colors: tokens.colors,
    typography: tokens.typography,
    spacing: Array.from(tokens.spacing).sort((a, b) => a - b),
    effects: tokens.effects
  };
}

function extractComponents(node, components = []) {
  const nodeType = node.type;
  
  if (nodeType === 'COMPONENT' || nodeType === 'COMPONENT_SET') {
    components.push({
      id: node.id,
      name: node.name,
      type: nodeType,
      description: node.description || '',
      key: node.componentId || node.key || node.id
    });
  }

  if (node.children) {
    node.children.forEach(child => extractComponents(child, components));
  }

  return components;
}

// ============================================================================
// Tool Implementations
// ============================================================================

async function getScreenshot(args) {
  try {
    const { figmaUrl, nodeId } = args;
    const fileKey = extractFileKey(figmaUrl);
    
    if (!fileKey) {
      throw new Error('Invalid Figma URL. Expected format: https://www.figma.com/design/FILE_KEY/...');
    }

    const token = process.env.FIGMA_ACCESS_TOKEN;
    if (!token) {
      throw new Error('FIGMA_ACCESS_TOKEN environment variable is not set');
    }

    // If nodeId is not provided, get the first frame from the document
    let targetNodeId = nodeId;
    if (!targetNodeId) {
      const fileResponse = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
        headers: { 'X-Figma-Token': token }
      });
      const assets = extractAllAssets(fileResponse.data.document);
      const firstFrame = assets.find(a => a.type === 'FRAME');
      if (firstFrame) {
        targetNodeId = firstFrame.id;
      } else {
        throw new Error('No frames found in the Figma file. Please provide a nodeId.');
      }
    }

    // Get screenshot using Figma's images API
    const imageResponse = await axios.get(
      `https://api.figma.com/v1/images/${fileKey}`,
      {
        params: {
          ids: targetNodeId,
          format: 'png',
          scale: 2
        },
        headers: { 'X-Figma-Token': token }
      }
    );

    const imageUrl = imageResponse.data.images[targetNodeId];
    if (!imageUrl) {
      throw new Error(`Could not generate screenshot for node ${targetNodeId}`);
    }

    // Download the image
    const imageData = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(imageData.data).toString('base64');

    return {
      content: [
        {
          type: 'image',
          data: base64Image,
          mimeType: 'image/png'
        },
        {
          type: 'text',
          text: `Screenshot of node ${targetNodeId} from ${fileKey}`
        }
      ]
    };

  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.response?.data?.err || error.message}`
      }],
      isError: true
    };
  }
}

async function getMetadata(args) {
  try {
    const { figmaUrl, nodeId } = args;
    const fileKey = extractFileKey(figmaUrl);
    
    if (!fileKey) {
      throw new Error('Invalid Figma URL. Expected format: https://www.figma.com/design/FILE_KEY/...');
    }

    const token = process.env.FIGMA_ACCESS_TOKEN;
    if (!token) {
      throw new Error('FIGMA_ACCESS_TOKEN environment variable is not set');
    }

    const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': token }
    });

    const fileData = response.data;
    
    // Function to convert node tree to XML format
    function nodeToXML(node, depth = 0) {
      const indent = '  '.repeat(depth);
      const attrs = [];
      
      attrs.push(`id="${node.id}"`);
      attrs.push(`name="${node.name.replace(/"/g, '&quot;')}"`);
      attrs.push(`type="${node.type}"`);
      
      if (node.absoluteBoundingBox) {
        attrs.push(`x="${Math.round(node.absoluteBoundingBox.x)}"`);
        attrs.push(`y="${Math.round(node.absoluteBoundingBox.y)}"`);
        attrs.push(`width="${Math.round(node.absoluteBoundingBox.width)}"`);
        attrs.push(`height="${Math.round(node.absoluteBoundingBox.height)}"`);
      }
      
      if (node.visible !== undefined) {
        attrs.push(`visible="${node.visible}"`);
      }
      
      if (node.opacity !== undefined && node.opacity !== 1) {
        attrs.push(`opacity="${node.opacity}"`);
      }

      const hasChildren = node.children && node.children.length > 0;
      
      if (!hasChildren) {
        return `${indent}<node ${attrs.join(' ')} />\n`;
      } else {
        let xml = `${indent}<node ${attrs.join(' ')}>\n`;
        node.children.forEach(child => {
          xml += nodeToXML(child, depth + 1);
        });
        xml += `${indent}</node>\n`;
        return xml;
      }
    }

    // Find the target node or use the whole document
    let targetNode = fileData.document;
    if (nodeId) {
      function findNode(node, id) {
        if (node.id === id) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findNode(child, id);
            if (found) return found;
          }
        }
        return null;
      }
      const found = findNode(fileData.document, nodeId);
      if (found) {
        targetNode = found;
      } else {
        throw new Error(`Node with id ${nodeId} not found`);
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<figma file="${fileKey}" name="${fileData.name}">\n${nodeToXML(targetNode, 1)}</figma>`;

    return {
      content: [{
        type: 'text',
        text: xml
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.response?.data?.err || error.message}`
      }],
      isError: true
    };
  }
}

async function fetchFigmaAssets(args) {
  try {
    const { figmaUrl } = args;
    const fileKey = extractFileKey(figmaUrl);
    
    if (!fileKey) {
      throw new Error('Invalid Figma URL. Expected format: https://www.figma.com/design/FILE_KEY/...');
    }

    const token = process.env.FIGMA_ACCESS_TOKEN;
    if (!token) {
      throw new Error('FIGMA_ACCESS_TOKEN environment variable is not set');
    }

    const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': token }
    });

    const fileData = response.data;
    const assets = extractAllAssets(fileData.document);

    const assetTypes = [...new Set(assets.map(a => a.type))];

    const result = {
      success: true,
      fileName: fileData.name,
      fileKey,
      totalAssets: assets.length,
      assetTypes,
      assets: assets.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        path: a.path
      })),
      message: `Found ${assets.length} assets in ${fileData.name}`
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.response?.data?.err || error.message}`
      }],
      isError: true
    };
  }
}

async function downloadFigmaAssets(args) {
  try {
    const { figmaUrl, savePath, format = 'svg', scale = 2 } = args;
    const fileKey = extractFileKey(figmaUrl);
    
    if (!fileKey) {
      throw new Error('Invalid Figma URL');
    }

    const token = process.env.FIGMA_ACCESS_TOKEN;
    if (!token) {
      throw new Error('FIGMA_ACCESS_TOKEN environment variable is not set');
    }

    // Fetch file data
    const fileResponse = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': token }
    });

    const fileData = fileResponse.data;
    const assets = extractAllAssets(fileData.document);

    if (assets.length === 0) {
      throw new Error('No assets found in this Figma file');
    }

    // Create save directory
    const absoluteSavePath = path.isAbsolute(savePath) 
      ? savePath 
      : path.resolve(process.cwd(), savePath);
    
    console.error(`[DEBUG downloadFigmaAssets] Save path requested: ${savePath}`);
    console.error(`[DEBUG downloadFigmaAssets] Absolute save path: ${absoluteSavePath}`);
    console.error(`[DEBUG downloadFigmaAssets] process.cwd(): ${process.cwd()}`);
    
    if (!fs.existsSync(absoluteSavePath)) {
      fs.mkdirSync(absoluteSavePath, { recursive: true });
      console.error(`[DEBUG downloadFigmaAssets] Created directory: ${absoluteSavePath}`);
    } else {
      console.error(`[DEBUG downloadFigmaAssets] Directory already exists: ${absoluteSavePath}`);
    }

    // Download in chunks
    const chunkSize = 50;
    let totalDownloaded = 0;
    const downloadedFiles = [];

    for (let i = 0; i < assets.length; i += chunkSize) {
      const chunk = assets.slice(i, i + chunkSize);
      const nodeIds = chunk.map(a => a.id).join(',');

      try {
        const imageResponse = await axios.get(
          `https://api.figma.com/v1/images/${fileKey}`,
          {
            params: {
              ids: nodeIds,
              format,
              scale: format === 'svg' ? undefined : scale
            },
            headers: { 'X-Figma-Token': token }
          }
        );

        const images = imageResponse.data.images;

        for (const asset of chunk) {
          const imageUrl = images[asset.id];
          if (imageUrl) {
            try {
              const imageData = await axios.get(imageUrl, { responseType: 'arraybuffer' });
              const fileName = `${i + chunk.indexOf(asset) + 1}-${asset.id.replace(':', '-')}_${asset.type}_${sanitizeFilename(asset.name)}.${format}`;
              const filePath = path.join(absoluteSavePath, fileName);
              
              console.error(`[DEBUG] Writing file: ${filePath}`);
              fs.writeFileSync(filePath, imageData.data);
              
              // Verify file was actually written
              if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                console.error(`[DEBUG] Successfully wrote: ${fileName} (${stats.size} bytes)`);
                totalDownloaded++;
                downloadedFiles.push({
                  name: fileName,
                  originalName: asset.name,
                  type: asset.type,
                  size: imageData.data.length
                });
              } else {
                console.error(`[ERROR] File write claimed success but file doesn't exist: ${filePath}`);
              }
            } catch (err) {
              console.error(`Failed to download ${asset.id}:`, err.message);
            }
          }
        }
      } catch (err) {
        console.error(`Failed to fetch chunk ${i / chunkSize + 1}:`, err.message);
      }
    }

    const result = {
      success: totalDownloaded > 0,
      fileName: fileData.name,
      totalAssets: assets.length,
      downloaded: totalDownloaded,
      savePath: absoluteSavePath,
      format,
      files: downloadedFiles,
      message: totalDownloaded > 0 
        ? `Successfully downloaded ${totalDownloaded} asset${totalDownloaded !== 1 ? 's' : ''} to ${absoluteSavePath}`
        : `⚠️ Files were processed but none could be written to ${absoluteSavePath}. This may be due to MCP server file system restrictions. Try using a path relative to your workspace or within ${process.cwd()}`
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.response?.data?.err || error.message}`
      }],
      isError: true
    };
  }
}

async function getDesignTokens(args) {
  try {
    const { figmaUrl } = args;
    const fileKey = extractFileKey(figmaUrl);
    
    if (!fileKey) {
      throw new Error('Invalid Figma URL');
    }

    const token = process.env.FIGMA_ACCESS_TOKEN;
    if (!token) {
      throw new Error('FIGMA_ACCESS_TOKEN environment variable is not set');
    }

    // Fetch file data
    const fileResponse = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': token }
    });

    const fileData = fileResponse.data;
    const tokens = extractDesignTokens(fileData.document);

    // Try to fetch Figma variables (new API)
    let variables = null;
    try {
      const variablesResponse = await axios.get(
        `https://api.figma.com/v1/files/${fileKey}/variables/local`,
        { headers: { 'X-Figma-Token': token } }
      );
      variables = variablesResponse.data;
    } catch (err) {
      console.error('Could not fetch variables:', err.message);
    }

    const result = {
      success: true,
      fileName: fileData.name,
      fileKey,
      tokens,
      ...(variables && { figmaVariables: variables }),
      summary: {
        colors: Object.keys(tokens.colors).length,
        typography: Object.keys(tokens.typography).length,
        spacing: tokens.spacing.length,
        effects: tokens.effects.length,
        ...(variables && { figmaVariables: Object.keys(variables.meta?.variables || {}).length })
      },
      message: `Extracted design tokens from ${fileData.name}`
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.response?.data?.err || error.message}`
      }],
      isError: true
    };
  }
}

async function downloadComponentLibrary(args) {
  try {
    const { figmaUrl, savePath, format = 'svg', scale = 2 } = args;
    const fileKey = extractFileKey(figmaUrl);
    
    if (!fileKey) {
      throw new Error('Invalid Figma URL');
    }

    const token = process.env.FIGMA_ACCESS_TOKEN;
    if (!token) {
      throw new Error('FIGMA_ACCESS_TOKEN environment variable is not set');
    }

    // Fetch file data
    const fileResponse = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': token }
    });

    const fileData = fileResponse.data;
    const components = extractComponents(fileData.document);

    if (components.length === 0) {
      throw new Error('No components found in this Figma file');
    }

    // Create save directory
    const absoluteSavePath = path.isAbsolute(savePath) 
      ? savePath 
      : path.resolve(process.cwd(), savePath);
    
    console.error(`[DEBUG downloadComponentLibrary] Save path requested: ${savePath}`);
    console.error(`[DEBUG downloadComponentLibrary] Absolute save path: ${absoluteSavePath}`);
    console.error(`[DEBUG downloadComponentLibrary] process.cwd(): ${process.cwd()}`);
    
    if (!fs.existsSync(absoluteSavePath)) {
      fs.mkdirSync(absoluteSavePath, { recursive: true });
      console.error(`[DEBUG downloadComponentLibrary] Created directory: ${absoluteSavePath}`);
    } else {
      console.error(`[DEBUG downloadComponentLibrary] Directory already exists: ${absoluteSavePath}`);
    }

    // Download in chunks
    const chunkSize = 50;
    let totalDownloaded = 0;
    const downloadedFiles = [];

    for (let i = 0; i < components.length; i += chunkSize) {
      const chunk = components.slice(i, i + chunkSize);
      const nodeIds = chunk.map(c => c.id).join(',');

      try {
        const imageResponse = await axios.get(
          `https://api.figma.com/v1/images/${fileKey}`,
          {
            params: {
              ids: nodeIds,
              format,
              scale: format === 'svg' ? undefined : scale
            },
            headers: { 'X-Figma-Token': token }
          }
        );

        const images = imageResponse.data.images;

        for (const component of chunk) {
          const imageUrl = images[component.id];
          if (imageUrl) {
            try {
              const imageData = await axios.get(imageUrl, { responseType: 'arraybuffer' });
              const fileName = `${sanitizeFilename(component.name)}.${format}`;
              const filePath = path.join(absoluteSavePath, fileName);
              
              fs.writeFileSync(filePath, imageData.data);
              
              // Verify file was actually written
              if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                console.error(`[DEBUG] Successfully wrote component: ${fileName} (${stats.size} bytes)`);
                totalDownloaded++;
                downloadedFiles.push({
                  name: fileName,
                  originalName: component.name,
                  type: component.type,
                  size: imageData.data.length
                });
              } else {
                console.error(`[ERROR] Component file write claimed success but file doesn't exist: ${filePath}`);
              }
            } catch (err) {
              console.error(`Failed to download ${component.id}:`, err.message);
            }
          }
        }
      } catch (err) {
        console.error(`Failed to fetch chunk:`, err.message);
      }
    }

    const result = {
      success: totalDownloaded > 0,
      fileName: fileData.name,
      totalComponents: components.length,
      downloaded: totalDownloaded,
      savePath: absoluteSavePath,
      format,
      components: downloadedFiles,
      message: totalDownloaded > 0
        ? `Successfully downloaded ${totalDownloaded} component${totalDownloaded !== 1 ? 's' : ''} to ${absoluteSavePath}`
        : `⚠️ Components were processed but none could be written to ${absoluteSavePath}. This may be due to MCP server file system restrictions. Try using a path relative to your workspace or within ${process.cwd()}`
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };

  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.response?.data?.err || error.message}`
      }],
      isError: true
    };
  }
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
  {
    name: 'figma-asset-downloader',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools = [
  {
    name: 'get_screenshot',
    description: 'Get a visual screenshot (PNG image) of a specific node or frame from a Figma file. Returns the actual rendered image. Use this to visually inspect designs before downloading assets.',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'The Figma file URL (e.g., https://www.figma.com/design/FILE_KEY/...)'
        },
        nodeId: {
          type: 'string',
          description: 'Optional. The node ID to screenshot (e.g., "123:456"). If not provided, screenshots the first frame found.'
        }
      },
      required: ['figmaUrl']
    }
  },
  {
    name: 'get_metadata',
    description: 'Get structured XML metadata about a Figma file or specific node, including layer hierarchy, IDs, names, types, positions, and sizes. Returns sparse XML representation similar to the official Figma MCP. Use this to understand the structure before downloading.',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'The Figma file URL (e.g., https://www.figma.com/design/FILE_KEY/...)'
        },
        nodeId: {
          type: 'string',
          description: 'Optional. The node ID to get metadata for (e.g., "123:456"). If not provided, returns metadata for the entire file.'
        }
      },
      required: ['figmaUrl']
    }
  },
  {
    name: 'fetch_figma_assets',
    description: 'Fetch all frames and their direct children from a Figma file. Returns metadata about available assets including IDs, names, and types. Use this first to see what assets are available before downloading.',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'The Figma file URL (e.g., https://www.figma.com/design/FILE_KEY/...)'
        }
      },
      required: ['figmaUrl']
    }
  },
  {
    name: 'download_figma_assets',
    description: 'Download all frames and their direct children as compiled assets. Each asset includes all nested elements rendered. Perfect for getting design assets ready for development.',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'The Figma file URL'
        },
        savePath: {
          type: 'string',
          description: 'Absolute or relative path where assets should be saved (e.g., "./assets/figma" or "/path/to/project/src/assets")'
        },
        format: {
          type: 'string',
          enum: ['svg', 'png', 'jpg', 'pdf'],
          default: 'svg',
          description: 'Export format for assets. SVG recommended for scalable vector graphics.'
        },
        scale: {
          type: 'number',
          enum: [1, 2, 3, 4],
          default: 2,
          description: 'Scale factor for raster formats (PNG/JPG). Use 2x for retina displays. Ignored for SVG/PDF.'
        }
      },
      required: ['figmaUrl', 'savePath']
    }
  },
  {
    name: 'get_design_tokens',
    description: 'Extract design tokens (colors, typography, spacing, effects) from a Figma file. Returns a structured set of design system tokens that can be used to generate CSS, Tailwind config, or design system code. Complementary to the official Figma MCP get_variable_defs tool.',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'The Figma file URL'
        }
      },
      required: ['figmaUrl']
    }
  },
  {
    name: 'download_component_library',
    description: 'Download only the reusable components from a Figma file (excludes instances and frames). Perfect for extracting a design system component library. Each component is exported as a complete, compiled asset with all nested elements rendered.',
    inputSchema: {
      type: 'object',
      properties: {
        figmaUrl: {
          type: 'string',
          description: 'The Figma file URL'
        },
        savePath: {
          type: 'string',
          description: 'Path where component files should be saved'
        },
        format: {
          type: 'string',
          enum: ['svg', 'png', 'jpg', 'pdf'],
          default: 'svg',
          description: 'Export format for components'
        },
        scale: {
          type: 'number',
          enum: [1, 2, 3, 4],
          default: 2,
          description: 'Scale factor for raster formats (PNG/JPG). Ignored for SVG/PDF.'
        }
      },
      required: ['figmaUrl', 'savePath']
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_screenshot':
        return await getScreenshot(args);
      case 'get_metadata':
        return await getMetadata(args);
      case 'fetch_figma_assets':
        return await fetchFigmaAssets(args);
      case 'download_figma_assets':
        return await downloadFigmaAssets(args);
      case 'get_design_tokens':
        return await getDesignTokens(args);
      case 'download_component_library':
        return await downloadComponentLibrary(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Figma Asset Downloader MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
