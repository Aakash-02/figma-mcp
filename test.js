// Integration test for Figma Asset Downloader MCP Server
import { config } from 'dotenv';
import { spawn } from 'child_process';
import { readFileSync, existsSync, rmSync } from 'fs';
import path from 'path';

config();

const TEST_URL = 'https://www.figma.com/design/OIs2NETT1YxnXyWljwuZnH/Mobile_app_design';

// Helper to send JSON-RPC request to the MCP server
async function sendRequest(proc, method, params = {}) {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    };

    let responseData = '';
    
    const onData = (data) => {
      responseData += data.toString();
      const lines = responseData.split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              proc.stdout.off('data', onData);
              resolve(response.result);
            }
          } catch (e) {
            // Not complete JSON yet, continue buffering
          }
        }
      }
    };

    proc.stdout.on('data', onData);
    
    setTimeout(() => {
      proc.stdout.off('data', onData);
      reject(new Error('Request timeout'));
    }, 30000);

    proc.stdin.write(JSON.stringify(request) + '\n');
  });
}

async function runTests() {
  console.log('🧪 Figma Asset Downloader MCP Server - Integration Test');
  console.log('='.repeat(60));
  console.log('');

  // Start the MCP server
  const serverProc = spawn('node', ['index.js'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  let passedTests = 0;
  let totalTests = 0;

  try {
    // Test 1: Initialize
    console.log('🔧 Test 1: Server initialization');
    console.log('-'.repeat(60));
    totalTests++;
    
    const initResult = await sendRequest(serverProc, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    });
    
    console.log(`✓ Server: ${initResult.serverInfo.name} v${initResult.serverInfo.version}`);
    console.log(`✓ Protocol: ${initResult.protocolVersion}`);
    passedTests++;
    console.log('');

    // Test 2: List tools
    console.log('📋 Test 2: List available tools');
    console.log('-'.repeat(60));
    totalTests++;
    
    const toolsResult = await sendRequest(serverProc, 'tools/list');
    console.log(`✓ Found ${toolsResult.tools.length} tools:`);
    toolsResult.tools.forEach(tool => {
      console.log(`  - ${tool.name}`);
    });
    passedTests++;
    console.log('');

    // Test 3: Fetch assets
    console.log('📦 Test 3: fetch_figma_assets');
    console.log('-'.repeat(60));
    totalTests++;
    
    const fetchResult = await sendRequest(serverProc, 'tools/call', {
      name: 'fetch_figma_assets',
      arguments: { figmaUrl: TEST_URL }
    });
    
    if (fetchResult.content && fetchResult.content[0]) {
      const data = JSON.parse(fetchResult.content[0].text);
      if (data.success) {
        console.log(`✓ File: ${data.fileName}`);
        console.log(`✓ Total assets: ${data.totalAssets}`);
        console.log(`✓ Asset types: ${data.assetTypes.join(', ')}`);
        console.log(`✓ First asset: ${data.assets[0].name}`);
        passedTests++;
      } else {
        console.error('❌ FAILED: API returned error');
      }
    }
    console.log('');

    // Test 4: Get design tokens
    console.log('🎨 Test 4: get_design_tokens');
    console.log('-'.repeat(60));
    totalTests++;
    
    const tokensResult = await sendRequest(serverProc, 'tools/call', {
      name: 'get_design_tokens',
      arguments: { figmaUrl: TEST_URL }
    });
    
    if (tokensResult.content && tokensResult.content[0]) {
      const data = JSON.parse(tokensResult.content[0].text);
      if (data.success) {
        console.log(`✓ File: ${data.fileName}`);
        console.log(`✓ Colors found: ${data.summary.colors}`);
        console.log(`✓ Font styles found: ${data.summary.typography}`);
        console.log(`✓ Spacing values found: ${data.summary.spacing}`);
        console.log(`✓ Effects found: ${data.summary.effects}`);
        if (Object.keys(data.tokens.colors).length > 0) {
          const firstColor = Object.entries(data.tokens.colors)[0];
          console.log(`✓ Example color: ${firstColor[0]} = ${firstColor[1]}`);
        }
        passedTests++;
      } else {
        console.error('❌ FAILED: API returned error');
      }
    }
    console.log('');

    // Test 5: Download component library
    console.log('🧩 Test 5: download_component_library');
    console.log('-'.repeat(60));
    totalTests++;
    
    const testComponentsDir = './test_components';
    const componentsResult = await sendRequest(serverProc, 'tools/call', {
      name: 'download_component_library',
      arguments: { 
        figmaUrl: TEST_URL,
        savePath: testComponentsDir,
        format: 'svg'
      }
    });
    
    if (componentsResult.content && componentsResult.content[0]) {
      const data = JSON.parse(componentsResult.content[0].text);
      if (data.success) {
        console.log(`✓ Successfully downloaded ${data.downloaded} components to ${data.savePath}`);
        console.log(`✓ Total components: ${data.totalComponents}`);
        console.log(`✓ Downloaded: ${data.downloaded}`);
        console.log(`✓ Components:`);
        data.components.slice(0, 5).forEach(comp => {
          console.log(`  - ${comp.name} (${comp.size} bytes)`);
        });
        passedTests++;
      } else {
        console.error('❌ FAILED:', data.message || 'Unknown error');
      }
    }
    console.log('');

    // Test 6: Download assets
    console.log('📥 Test 6: download_figma_assets');
    console.log('-'.repeat(60));
    totalTests++;
    
    const testAssetsDir = './test_assets';
    const assetsResult = await sendRequest(serverProc, 'tools/call', {
      name: 'download_figma_assets',
      arguments: { 
        figmaUrl: TEST_URL,
        savePath: testAssetsDir,
        format: 'svg'
      }
    });
    
    if (assetsResult.content && assetsResult.content[0]) {
      const data = JSON.parse(assetsResult.content[0].text);
      if (data.success) {
        console.log(`✓ Successfully downloaded ${data.downloaded} assets to ${data.savePath}`);
        console.log(`✓ Total assets: ${data.totalAssets}`);
        console.log(`✓ Downloaded: ${data.downloaded}`);
        console.log(`✓ First 5 files:`);
        data.files.slice(0, 5).forEach(file => {
          console.log(`  - ${file.name}`);
        });
        passedTests++;
      } else {
        console.error('❌ FAILED:', data.message || 'Unknown error');
      }
    }
    console.log('');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  } finally {
    // Clean up
    serverProc.kill();
    
    console.log('='.repeat(60));
    console.log('');
    console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);
    console.log('');
    
    if (passedTests === totalTests) {
      console.log('✅ All tests passed! The MCP server is working correctly.');
    } else {
      console.log(`⚠️  ${totalTests - passedTests} test(s) failed.`);
    }

    // Clean up test directories
    console.log('');
    console.log('🧹 Cleaning up test directories...');
    if (existsSync('./test_components')) {
      rmSync('./test_components', { recursive: true });
      console.log('  ✓ Removed ./test_components');
    }
    if (existsSync('./test_assets')) {
      rmSync('./test_assets', { recursive: true });
      console.log('  ✓ Removed ./test_assets');
    }
  }
}

runTests().catch(console.error);
