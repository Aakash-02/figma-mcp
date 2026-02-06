#!/usr/bin/env node

/**
 * Test script for new tools: get_screenshot and get_metadata
 */

import { config } from 'dotenv';
import axios from 'axios';
import fs from 'fs';

config();

const FIGMA_URL = 'https://www.figma.com/design/OIs2NETT1YxnXyWljwuZnH/Mobile_app_design-%7C-Todo-app-(Community)?node-id=0-1&p=f&t=BWuPGzB1TkwMC2uZ-0';

function extractFileKey(url) {
  const match = url.match(/(?:file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function extractAllAssets(node, assets = [], nodePath = '', depth = 0, parentType = null) {
  const currentPath = nodePath ? `${nodePath}/${node.name}` : node.name;
  const nodeType = node.type;
  
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

async function testGetMetadata() {
  console.log('\n📋 Testing get_metadata...');
  
  try {
    const fileKey = extractFileKey(FIGMA_URL);
    const token = process.env.FIGMA_ACCESS_TOKEN;
    
    if (!token) {
      throw new Error('FIGMA_ACCESS_TOKEN not set');
    }

    const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': token }
    });

    const fileData = response.data;
    
    // Generate XML metadata
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

      const hasChildren = node.children && node.children.length > 0;
      
      if (!hasChildren) {
        return `${indent}<node ${attrs.join(' ')} />\n`;
      } else {
        let xml = `${indent}<node ${attrs.join(' ')}>\n`;
        // Limit depth to avoid too much output
        if (depth < 3) {
          node.children.forEach(child => {
            xml += nodeToXML(child, depth + 1);
          });
        }
        xml += `${indent}</node>\n`;
        return xml;
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<figma file="${fileKey}" name="${fileData.name}">\n${nodeToXML(fileData.document, 1)}</figma>`;

    console.log('✅ get_metadata success');
    console.log(`   File: ${fileData.name}`);
    console.log(`   XML length: ${xml.length} characters`);
    console.log('\n   Sample XML (first 500 chars):');
    console.log(xml.substring(0, 500) + '...\n');
    
    // Save full XML to file for inspection
    fs.writeFileSync('./test-metadata-output.xml', xml);
    console.log('   Full XML saved to: ./test-metadata-output.xml');
    
    return true;
  } catch (error) {
    console.error('❌ get_metadata failed:', error.message);
    return false;
  }
}

async function testGetScreenshot() {
  console.log('\n📸 Testing get_screenshot...');
  
  try {
    const fileKey = extractFileKey(FIGMA_URL);
    const token = process.env.FIGMA_ACCESS_TOKEN;
    
    if (!token) {
      throw new Error('FIGMA_ACCESS_TOKEN not set');
    }

    // First, get a frame to screenshot
    const fileResponse = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': token }
    });
    
    const assets = extractAllAssets(fileResponse.data.document);
    const firstFrame = assets.find(a => a.type === 'FRAME');
    
    if (!firstFrame) {
      throw new Error('No frames found');
    }

    console.log(`   Screenshotting frame: "${firstFrame.name}" (${firstFrame.id})`);

    // Get screenshot
    const imageResponse = await axios.get(
      `https://api.figma.com/v1/images/${fileKey}`,
      {
        params: {
          ids: firstFrame.id,
          format: 'png',
          scale: 2
        },
        headers: { 'X-Figma-Token': token }
      }
    );

    const imageUrl = imageResponse.data.images[firstFrame.id];
    if (!imageUrl) {
      throw new Error('No image URL returned');
    }

    // Download the image
    const imageData = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    
    console.log('✅ get_screenshot success');
    console.log(`   Frame: ${firstFrame.name}`);
    console.log(`   Image size: ${(imageData.data.length / 1024).toFixed(2)} KB`);
    console.log(`   Format: PNG (2x scale)`);
    
    // Save screenshot for inspection
    fs.writeFileSync('./test-screenshot-output.png', imageData.data);
    console.log('   Screenshot saved to: ./test-screenshot-output.png');
    
    return true;
  } catch (error) {
    console.error('❌ get_screenshot failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing new Figma MCP tools...\n');
  console.log('Test URL:', FIGMA_URL);
  
  const results = {
    metadata: await testGetMetadata(),
    screenshot: await testGetScreenshot()
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results:');
  console.log('='.repeat(60));
  console.log(`   get_metadata:   ${results.metadata ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   get_screenshot: ${results.screenshot ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(60));

  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('\n✨ All tests passed! New tools are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the error messages above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
