#!/usr/bin/env node

/**
 * Debug script to test download functionality outside of MCP
 * Run: node debug-download.js
 */

import { config } from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

config();

// Test parameters - same as your MCP call
const TEST_PARAMS = {
  figmaUrl: "https://www.figma.com/design/GzWiJfXndoB79APsQbnNxN/UI-kit---Ecommerce-Mobile-App--Community-?node-id=528-2&t=5C6cqtA2CktSGCBM-1",
  savePath: "/Users/aakash/AndroidStudioProjects/qap_test/app/src/main/res/drawable",
  format: "png",
  scale: 2
};

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

function sanitizeFilename(name) {
  return name.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 200);
}

async function testDownload() {
  console.log('🔍 Debug Download Test\n');
  console.log('Parameters:');
  console.log(`  Figma URL: ${TEST_PARAMS.figmaUrl}`);
  console.log(`  Save Path: ${TEST_PARAMS.savePath}`);
  console.log(`  Format: ${TEST_PARAMS.format}`);
  console.log(`  Scale: ${TEST_PARAMS.scale}`);
  console.log('');

  const { figmaUrl, savePath, format, scale } = TEST_PARAMS;
  const fileKey = extractFileKey(figmaUrl);
  
  console.log(`📁 File Key: ${fileKey}\n`);

  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    console.error('❌ FIGMA_ACCESS_TOKEN not found in environment');
    process.exit(1);
  }
  console.log(`✅ Token found: ${token.substring(0, 20)}...\n`);

  try {
    // Fetch file data
    console.log('📡 Fetching Figma file data...');
    const fileResponse = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': token }
    });
    console.log(`✅ File fetched: ${fileResponse.data.name}\n`);

    const fileData = fileResponse.data;
    const assets = extractAllAssets(fileData.document);
    console.log(`📦 Found ${assets.length} assets\n`);

    // Path resolution
    console.log('🗂️  Path Resolution:');
    console.log(`  Requested path: ${savePath}`);
    console.log(`  Is absolute: ${path.isAbsolute(savePath)}`);
    console.log(`  process.cwd(): ${process.cwd()}`);
    
    const absoluteSavePath = path.isAbsolute(savePath) 
      ? savePath 
      : path.resolve(process.cwd(), savePath);
    
    console.log(`  Resolved absolute path: ${absoluteSavePath}`);
    
    // Check directory
    console.log(`\n📂 Directory Check:`);
    if (!fs.existsSync(absoluteSavePath)) {
      console.log(`  ⚠️  Directory does not exist, creating...`);
      fs.mkdirSync(absoluteSavePath, { recursive: true });
      console.log(`  ✅ Directory created`);
    } else {
      console.log(`  ✅ Directory exists`);
    }

    // Check write permissions
    console.log(`\n🔐 Permission Check:`);
    try {
      const testFile = path.join(absoluteSavePath, '.test-write-permission');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`  ✅ Write permission confirmed`);
    } catch (err) {
      console.error(`  ❌ No write permission: ${err.message}`);
      process.exit(1);
    }

    // Download first 3 assets as a test
    console.log(`\n⬇️  Downloading first 3 assets (test)...\n`);
    
    const testAssets = assets.slice(0, 3);
    const nodeIds = testAssets.map(a => a.id).join(',');

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
    console.log(`📸 Image URLs received for ${Object.keys(images).length} assets\n`);

    let downloaded = 0;
    for (const asset of testAssets) {
      const imageUrl = images[asset.id];
      console.log(`Processing: ${asset.name}`);
      console.log(`  ID: ${asset.id}`);
      console.log(`  URL: ${imageUrl ? imageUrl.substring(0, 60) + '...' : 'NULL'}`);
      
      if (imageUrl) {
        try {
          const imageData = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const fileName = `test-${downloaded + 1}-${asset.id.replace(':', '-')}_${asset.type}_${sanitizeFilename(asset.name)}.${format}`;
          const filePath = path.join(absoluteSavePath, fileName);
          
          console.log(`  File name: ${fileName}`);
          console.log(`  Full path: ${filePath}`);
          console.log(`  Size: ${imageData.data.length} bytes`);
          
          fs.writeFileSync(filePath, imageData.data);
          
          // Verify file exists
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            console.log(`  ✅ Written successfully (verified: ${stats.size} bytes)`);
            downloaded++;
          } else {
            console.log(`  ❌ File write reported success but file doesn't exist!`);
          }
        } catch (err) {
          console.error(`  ❌ Download failed: ${err.message}`);
        }
      } else {
        console.log(`  ⚠️  No image URL provided by Figma API`);
      }
      console.log('');
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Test complete! Downloaded ${downloaded} of 3 test files`);
    console.log(`\n📁 Check directory: ${absoluteSavePath}`);
    console.log('\nFiles in directory:');
    const files = fs.readdirSync(absoluteSavePath).filter(f => f.startsWith('test-'));
    files.forEach(f => console.log(`  - ${f}`));
    
    if (downloaded > 0) {
      console.log('\n✨ SUCCESS: Files are being written correctly!');
      console.log('   The issue must be specific to the MCP server context.');
    } else {
      console.log('\n⚠️  No files downloaded. Check the errors above.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.statusText);
      console.error('API Error:', error.response.data);
    }
    process.exit(1);
  }
}

testDownload().catch(console.error);
