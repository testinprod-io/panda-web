import React, { useState, useEffect } from 'react';
import { useVault } from './useVault';

function App() {
  const vault = useVault();
  const [testMessage, setTestMessage] = useState('hello world');
  const [encryptedData, setEncryptedData] = useState<{ ciphertext: ArrayBuffer; iv: ArrayBuffer } | null>(null);
  const [decryptedMessage, setDecryptedMessage] = useState<string>('');
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  // Auto-demo on vault ready
  useEffect(() => {
    if (vault.state.isReady) {
      runDemo();
    }
  }, [vault.state.isReady]);

  const runDemo = async () => {
    try {
      addLog('🔐 Starting vault demo...');
      
      // Step 1: Derive key
      addLog('📡 Calling derive()...');
      await vault.derive();
      addLog('✅ Key derived successfully');

      // Step 2: Encrypt test message
      addLog(`🔒 Encrypting: "${testMessage}"`);
      const encrypted = await vault.encrypt(testMessage);
      setEncryptedData(encrypted);
      addLog(`✅ Encrypted (${encrypted.ciphertext.byteLength} bytes)`);

      // Step 3: Decrypt message
      addLog('🔓 Decrypting...');
      const decrypted = await vault.decrypt(encrypted.ciphertext, encrypted.iv);
      setDecryptedMessage(decrypted);
      addLog(`✅ Decrypted: "${decrypted}"`);

      if (decrypted === testMessage) {
        addLog('🎉 Round-trip test PASSED!');
      } else {
        addLog('❌ Round-trip test FAILED!');
      }

    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestEncrypt = async () => {
    if (!vault.state.isReady) return;
    
    try {
      addLog(`🔒 Manual encrypt: "${testMessage}"`);
      const encrypted = await vault.encrypt(testMessage);
      setEncryptedData(encrypted);
      addLog(`✅ Encrypted (${encrypted.ciphertext.byteLength} bytes)`);
    } catch (error) {
      addLog(`❌ Encrypt error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestDecrypt = async () => {
    if (!vault.state.isReady || !encryptedData) return;
    
    try {
      addLog('🔓 Manual decrypt...');
      const decrypted = await vault.decrypt(encryptedData.ciphertext, encryptedData.iv);
      setDecryptedMessage(decrypted);
      addLog(`✅ Decrypted: "${decrypted}"`);
    } catch (error) {
      addLog(`❌ Decrypt error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatArrayBuffer = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes.slice(0, 16))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ') + (bytes.length > 16 ? '...' : '');
  };

  return (
    <div style={{ 
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      lineHeight: '1.6'
    }}>
      <header style={{ marginBottom: '30px' }}>
        <h1>🐼 Panda Crypto Vault Demo</h1>
        <p>Demonstrating secure iframe-based cryptography with sandboxed isolation.</p>
      </header>

      <section style={{ marginBottom: '30px' }}>
        <h2>Vault Status</h2>
        <div style={{ 
          padding: '15px',
          backgroundColor: vault.state.isReady ? '#d4edda' : vault.state.error ? '#f8d7da' : '#fff3cd',
          border: `1px solid ${vault.state.isReady ? '#c3e6cb' : vault.state.error ? '#f5c6cb' : '#ffeaa7'}`,
          borderRadius: '8px',
          color: vault.state.isReady ? '#155724' : vault.state.error ? '#721c24' : '#856404'
        }}>
          {vault.state.isInitializing && '🔄 Initializing vault...'}
          {vault.state.isReady && '✅ Vault ready for secure operations'}
          {vault.state.error && `❌ Error: ${vault.state.error}`}
        </div>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>Manual Testing</h2>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Test Message:</label>
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            disabled={!vault.state.isReady}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <button
            onClick={handleTestEncrypt}
            disabled={!vault.state.isReady || !testMessage}
            style={{
              marginRight: '10px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔒 Encrypt
          </button>
          
          <button
            onClick={handleTestDecrypt}
            disabled={!vault.state.isReady || !encryptedData}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔓 Decrypt
          </button>
        </div>

        {encryptedData && (
          <div style={{ marginBottom: '15px' }}>
            <h4>Encrypted Data:</h4>
            <div style={{ 
              fontFamily: 'monospace',
              fontSize: '12px',
              backgroundColor: '#f8f9fa',
              padding: '10px',
              borderRadius: '4px',
              wordBreak: 'break-all'
            }}>
              <div><strong>Ciphertext:</strong> {formatArrayBuffer(encryptedData.ciphertext)}</div>
              <div><strong>IV:</strong> {formatArrayBuffer(encryptedData.iv)}</div>
            </div>
          </div>
        )}

        {decryptedMessage && (
          <div style={{ marginBottom: '15px' }}>
            <h4>Decrypted Message:</h4>
            <div style={{ 
              fontFamily: 'monospace',
              backgroundColor: '#f8f9fa',
              padding: '10px',
              borderRadius: '4px'
            }}>
              "{decryptedMessage}"
            </div>
          </div>
        )}
      </section>

      <section>
        <h2>Operation Log</h2>
        <div style={{
          height: '300px',
          overflowY: 'auto',
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
          fontFamily: 'monospace',
          fontSize: '12px',
          padding: '15px',
          borderRadius: '8px'
        }}>
          {log.map((entry, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              {entry}
            </div>
          ))}
          {log.length === 0 && (
            <div style={{ color: '#888' }}>Waiting for vault to initialize...</div>
          )}
        </div>
      </section>

      <footer style={{ marginTop: '30px', textAlign: 'center', color: '#666' }}>
        <p>
          🔒 All cryptographic operations happen in a sandboxed iframe with strict CSP.
          <br />
          Keys are non-extractable and operations are rate-limited for security.
        </p>
      </footer>
    </div>
  );
}

export default App;