import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { authApi, chatApi } from './api';
import { Shield, Send, CheckCircle, Trash2, Loader2, LogOut, Bug } from 'lucide-react';

function App() {
  const [step, setStep] = useState('WELCOME'); // WELCOME, AUTH_PHONE, AUTH_CODE, SELECT_CHATS, CLEANING, DONE
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [requestId, setRequestId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [chats, setChats] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugLog, setDebugLog] = useState([]);

  const addLog = (msg) => {
    console.log(msg);
    setDebugLog(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    try {
      addLog("Initializing WebApp...");
      // Check if window.Telegram exists (real TMA environment)
      const isTelegram = !!(window.Telegram && window.Telegram.WebApp);
      addLog(`Is Telegram environment: ${isTelegram}`);

      if (isTelegram && WebApp.ready) {
        WebApp.ready();
        WebApp.expand();
        WebApp.setHeaderColor('secondary_bg_color');
        addLog("Telegram SDK ready and expanded.");
      } else {
        addLog("Running in standard browser mode.");
      }
    } catch (e) {
      addLog(`Init Error: ${e.message}`);
      setError(`Startup Error: ${e.message}`);
    }
  }, []);

  const handleSendCode = async () => {
    setLoading(true);
    setError('');
    addLog(`Sending code to ${phone}...`);
    try {
      const res = await authApi.sendCode(phone);
      setRequestId(res.data.request_id);
      setStep('AUTH_CODE');
      addLog("Code sent successfully.");
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to send code';
      setError(msg);
      addLog(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    addLog("Verifying code...");
    try {
      const res = await authApi.verifyCode(requestId, code);
      setSessionId(res.data.session_id);
      addLog("Verified. Fetching chats...");
      fetchChats(res.data.session_id);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Invalid code';
      setError(msg);
      addLog(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = async (sid) => {
    setLoading(true);
    try {
      const res = await chatApi.list(sid);
      setChats(res.data.chats);
      setStep('SELECT_CHATS');
      addLog(`Found ${res.data.chats.length} chats.`);
    } catch (err) {
      setError('Failed to fetch chats');
      addLog("Error fetching chats.");
    } finally {
      setLoading(false);
    }
  };

  const handleClean = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    addLog(`Starting cleaning of ${selectedIds.length} chats...`);
    try {
      await chatApi.clean(sessionId, selectedIds);
      setStep('CLEANING');
      setTimeout(() => {
        setStep('DONE');
        addLog("Cleaning sequence finished.");
      }, 3000);
    } catch (err) {
      setError('Cleanup failed to start');
      addLog("Execution error.");
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (sessionId) await authApi.logout(sessionId);
    setSessionId('');
    setStep('WELCOME');
    setPhone('');
    setCode('');
    setChats([]);
    setSelectedIds([]);
    addLog("Logged out.");
  };

  const toggleChatSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="app-container fade-in" style={{ paddingBottom: '120px' }}>
      <div className="card" style={{ textAlign: 'center', padding: '10px' }}>
        <h1 className="title">TG Cleaner</h1>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)', fontSize: '13px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {step === 'WELCOME' && (
        <div className="card fade-in">
          <Shield className="accent-icon" size={48} style={{ color: 'var(--accent-color)', margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ textAlign: 'center', marginBottom: '12px' }}>Clear the Clutter</h2>
          <p className="subtitle" style={{ textAlign: 'center' }}>
            Leave multiple channels safely. Your session is temporary.
          </p>
          <button className="btn" onClick={() => setStep('AUTH_PHONE')}>Get Started</button>
        </div>
      )}

      {step === 'AUTH_PHONE' && (
        <div className="card fade-in">
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Log In</h2>
          <div className="input-group">
            <span className="input-label">Phone Number</span>
            <input type="tel" placeholder="+1234567890" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button className="btn" onClick={handleSendCode} disabled={loading || !phone}>
            {loading ? <Loader2 className="animate-spin" /> : 'Send Code'}
          </button>
          <button className="btn" style={{ background: 'transparent', marginTop: '8px', fontSize: '14px' }} onClick={() => setStep('WELCOME')}>Cancel</button>
        </div>
      )}

      {step === 'AUTH_CODE' && (
        <div className="card fade-in">
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Enter Code</h2>
          <div className="input-group">
            <span className="input-label">5-Digit Code</span>
            <input type="number" placeholder="12345" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <button className="btn" onClick={handleVerifyCode} disabled={loading || code.length < 5}>
            {loading ? <Loader2 className="animate-spin" /> : 'Verify'}
          </button>
        </div>
      )}

      {step === 'SELECT_CHATS' && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: '12px' }}>
            <h2 style={{ fontSize: '18px' }}>Select Groups</h2>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
               <button className="btn" style={{ flex: 1, fontSize: '12px', padding: '8px' }} onClick={() => setSelectedIds(chats.map(c => i))}>All</button>
               <button className="btn" style={{ flex: 1, fontSize: '12px', padding: '8px', background: 'var(--tg-theme-secondary-bg-color)' }} onClick={() => setSelectedIds([])}>None</button>
            </div>
          </div>
          <div className="chat-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {chats.map(chat => (
              <div key={chat.id} className={`chat-item ${selectedIds.includes(chat.id) ? 'selected' : ''}`} onClick={() => toggleChatSelection(chat.id)}>
                <div className="chat-name">{chat.title}</div>
                {selectedIds.includes(chat.id) && <CheckCircle size={18} style={{ color: 'var(--accent-color)' }} />}
              </div>
            ))}
          </div>
          <div style={{ position: 'fixed', bottom: '0', left: '0', right: '0', padding: '16px', background: 'var(--tg-theme-bg-color)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
             <button className="btn" style={{ background: 'var(--danger-color)' }} onClick={handleClean} disabled={loading || selectedIds.length === 0}>
                {loading ? <Loader2 className="animate-spin" /> : `Leave ${selectedIds.length} Chats`}
             </button>
          </div>
        </div>
      )}

      {step === 'CLEANING' && (
        <div className="card fade-in" style={{ textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={48} style={{ color: 'var(--accent-color)', margin: '0 auto 16px', display: 'block' }} />
          <h2>Cleaning...</h2>
        </div>
      )}

      {step === 'DONE' && (
        <div className="card fade-in" style={{ textAlign: 'center' }}>
          <CheckCircle size={48} style={{ color: 'var(--success-color)', margin: '0 auto 16px', display: 'block' }} />
          <h2>Done!</h2>
          <button className="btn" onClick={handleLogout}>Finish</button>
        </div>
      )}

      {/* Debug Logs Section */}
      <div className="card" style={{ marginTop: '20px', fontSize: '10px', background: 'rgba(0,0,0,0.4)', borderColor: '#444' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', color: '#888' }}>
          <Bug size={12} /> Debug Logs (Step: {step})
        </div>
        {debugLog.map((log, i) => (
          <div key={i} style={{ fontFamily: 'monospace', color: '#aaa', marginBottom: '2px' }}>{log}</div>
        ))}
      </div>

      {sessionId && step !== 'DONE' && (
        <button onClick={handleLogout} style={{ position: 'fixed', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--tg-theme-hint-color)' }}>
          <LogOut size={20} />
        </button>
      )}
    </div>
  );
}

export default App;
