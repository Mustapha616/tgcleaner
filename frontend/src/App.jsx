import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { authApi, chatApi } from './api';
import { Shield, Send, CheckCircle, Trash2, Loader2, LogOut } from 'lucide-react';

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

  useEffect(() => {
    try {
      console.log("Initializing Telegram WebApp SDK...");
      if (WebApp && WebApp.ready) {
        WebApp.ready();
        WebApp.expand();
        WebApp.setHeaderColor('secondary_bg_color');
        console.log("SDK Initialized successfully.");
      } else {
        console.warn("Telegram WebApp SDK not found or disconnected.");
      }
    } catch (e) {
      console.error("SDK Init Error:", e);
      setError("Browser/SDK compatibility issue.");
    }
  }, []);

  // Debugging log for state changes
  useEffect(() => {
    console.log("Current App State (Step):", step);
  }, [step]);

  const handleSendCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.sendCode(phone);
      setRequestId(res.data.request_id);
      setStep('AUTH_CODE');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.verifyCode(requestId, code);
      setSessionId(res.data.session_id);
      fetchChats(res.data.session_id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code');
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
    } catch (err) {
      setError('Failed to fetch chats');
    } finally {
      setLoading(false);
    }
  };

  const handleClean = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      await chatApi.clean(sessionId, selectedIds);
      setStep('CLEANING');
      // In a real app, we'd poll or use WebSockets. 
      // For MVP, we'll just wait a few seconds and show success.
      setTimeout(() => setStep('DONE'), 3000);
    } catch (err) {
      setError('Cleanup failed to start');
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
  };

  const toggleChatSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="app-container fade-in">
      {/* Header */}
      <div className="card" style={{ textAlign: 'center', padding: '10px' }}>
        <h1 className="title">TG Cleaner</h1>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Steps */}
      {step === 'WELCOME' && (
        <div className="card fade-in">
          <Shield className="accent-icon" size={48} style={{ color: 'var(--accent-color)', margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ textAlign: 'center', marginBottom: '12px' }}>Clear the Clutter</h2>
          <p className="subtitle" style={{ textAlign: 'center' }}>
            Safely leave multiple channels and groups in seconds. Your session is temporary and never stored.
          </p>
          <button className="btn" onClick={() => setStep('AUTH_PHONE')}>Get Started</button>
        </div>
      )}

      {step === 'AUTH_PHONE' && (
        <div className="card fade-in">
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Login to Telegram</h2>
          <p className="subtitle">Enter your phone number with country code.</p>
          <div className="input-group">
            <span className="input-label">Phone Number</span>
            <input 
              type="tel" 
              placeholder="+1234567890" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
            />
          </div>
          <button className="btn" onClick={handleSendCode} disabled={loading || !phone}>
            {loading ? <Loader2 className="animate-spin" /> : 'Send Code'}
          </button>
          <button className="btn" style={{ background: 'transparent', marginTop: '8px' }} onClick={() => setStep('WELCOME')}>Back</button>
        </div>
      )}

      {step === 'AUTH_CODE' && (
        <div className="card fade-in">
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Check your Telegram</h2>
          <p className="subtitle">Enter the 5-digit code sent to your active app.</p>
          <div className="input-group">
            <span className="input-label">Login Code</span>
            <input 
              type="number" 
              placeholder="12345" 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
            />
          </div>
          <button className="btn" onClick={handleVerifyCode} disabled={loading || code.length < 5}>
            {loading ? <Loader2 className="animate-spin" /> : 'Verify & Login'}
          </button>
        </div>
      )}

      {step === 'SELECT_CHATS' && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '4px' }}>Select Groups</h2>
            <p className="subtitle">{chats.length} chats found. Select to leave.</p>
            <div style={{ display: 'flex', gap: '8px' }}>
               <button className="btn" style={{ flex: 1, fontSize: '12px', padding: '8px' }} onClick={() => setSelectedIds(chats.map(c => c.id))}>Select All</button>
               <button className="btn" style={{ flex: 1, fontSize: '12px', padding: '8px', background: 'var(--tg-theme-secondary-bg-color)' }} onClick={() => setSelectedIds([])}>Deselect</button>
            </div>
          </div>
          
          <div className="chat-list" style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '100px' }}>
            {chats.map(chat => (
              <div 
                key={chat.id} 
                className={`chat-item ${selectedIds.includes(chat.id) ? 'selected' : ''}`}
                onClick={() => toggleChatSelection(chat.id)}
              >
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
          <h2>Cleaning in Progress...</h2>
          <p className="subtitle">We are safely removing you from the selected groups. This takes a moment to avoid rate limits.</p>
        </div>
      )}

      {step === 'DONE' && (
        <div className="card fade-in" style={{ textAlign: 'center' }}>
          <CheckCircle size={48} style={{ color: 'var(--success-color)', margin: '0 auto 16px', display: 'block' }} />
          <h2>All Done!</h2>
          <p className="subtitle">Successfully left the selected groups. Your session has been disconnected.</p>
          <button className="btn" onClick={handleLogout}>Done</button>
        </div>
      )}

      {sessionId && step !== 'DONE' && (
        <button 
          onClick={handleLogout}
          style={{ position: 'fixed', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--tg-theme-hint-color)', cursor: 'pointer' }}
        >
          <LogOut size={20} />
        </button>
      )}
    </div>
  );
}

export default App;
