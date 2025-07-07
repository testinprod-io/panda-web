"use client";

import React, { useEffect, useState } from 'react';
import { useVault } from '@/hooks/use-vault';

interface VaultDemoProps {
  autoRun?: boolean;
}

export function VaultDemo({ autoRun = false }: VaultDemoProps) {
  const vault = useVault();
  const [logs, setLogs] = useState<string[]>([]);
  const [testInput, setTestInput] = useState('hello world');
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    console.log('[VaultDemo]', message);
  };

  const runTest = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setLogs([]);
    
    try {
      addLog('Starting vault test...');
      
      // Wait for vault to be ready
      if (!vault.state.isReady) {
        addLog('Waiting for vault to initialize...');
        // We'll wait up to 30 seconds for vault to be ready
        let attempts = 0;
        while (!vault.state.isReady && attempts < 60) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
          if (vault.state.error) {
            throw new Error(`Vault failed to initialize: ${vault.state.error}`);
          }
        }
        
        if (!vault.state.isReady) {
          throw new Error('Vault initialization timeout');
        }
      }
      
      addLog('Vault is ready!');
      
      // Step 1: Derive key
      addLog('Deriving encryption key...');
      await vault.derive();
      addLog('✓ Key derived successfully');
      
      // Step 2: Encrypt test data
      addLog(`Encrypting: "${testInput}"`);
      const encrypted = await vault.encrypt(testInput);
      addLog(`✓ Encrypted successfully (${encrypted.length} bytes)`);
      
      // Step 3: Decrypt back
      addLog('Decrypting...');
      const decrypted = await vault.decrypt(encrypted);
      addLog(`✓ Decrypted: "${decrypted}"`);
      
      // Step 4: Verify round-trip
      if (decrypted === testInput) {
        addLog('🎉 Round-trip test PASSED!');
      } else {
        addLog('❌ Round-trip test FAILED!');
        addLog(`Expected: "${testInput}"`);
        addLog(`Got: "${decrypted}"`);
      }
      
      // Additional test: Multiple operations
      addLog('Testing multiple operations...');
      const testStrings = ['test1', 'test2', 'test3'];
      const results = [];
      
      for (const testStr of testStrings) {
        const encrypted = await vault.encrypt(testStr);
        const decrypted = await vault.decrypt(encrypted);
        results.push({ original: testStr, decrypted });
        addLog(`  "${testStr}" -> "${decrypted}"`);
      }
      
      const allMatch = results.every(r => r.original === r.decrypted);
      addLog(allMatch ? '✓ Multiple operations test PASSED!' : '❌ Multiple operations test FAILED!');
      
    } catch (error) {
      addLog(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runDerive = async () => {
    await vault.derive();
    addLog('✓ Key derived successfully');
  };

  // Auto-run test if enabled
  useEffect(() => {
    if (autoRun && vault.state.isReady && !isRunning) {
      runTest();
    }
  }, [autoRun, vault.state.isReady, isRunning]);

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '20px auto', 
      padding: '20px', 
      border: '1px solid #ccc', 
      borderRadius: '8px',
      fontFamily: 'monospace'
    }}>
      <h2>Vault Demo & Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <div>Vault Status: 
          <span style={{ 
            color: vault.state.isReady ? 'green' : vault.state.isLoading ? 'orange' : 'red',
            fontWeight: 'bold',
            marginLeft: '10px'
          }}>
            {vault.state.isLoading ? 'Loading...' : vault.state.isReady ? 'Ready' : 'Not Ready'}
          </span>
        </div>
        
        {vault.state.error && (
          <div style={{ color: 'red', marginTop: '10px' }}>
            Error: {vault.state.error}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>
          Test Input: 
          <input 
            type="text" 
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px' }}
            disabled={isRunning}
          />
        </label>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runTest}
          disabled={isRunning || !vault.state.isReady}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: isRunning ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          {isRunning ? 'Running Test...' : 'Run Test'}
        </button>
        
        <button 
          onClick={() => runDerive()}
          disabled={isRunning}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Logs
        </button>
      </div>
      
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '4px',
        minHeight: '200px',
        maxHeight: '400px',
        overflowY: 'auto',
        fontSize: '12px',
        whiteSpace: 'pre-wrap'
      }}>
        <strong>Test Logs:</strong><br />
        {logs.length === 0 ? 'No logs yet...' : logs.join('\n')}
      </div>
    </div>
  );
}