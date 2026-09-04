import { useState } from 'react';
import { api, setToken, setUser } from '../api.js';

export default function LoginPage({ onAuth }) {
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [company, setCompany] = useState('');
  const [name, setName]       = useState('');
  const [err, setErr]         = useState('');
  const [busy, setBusy]       = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      let res;
      if (mode === 'login') {
        res = await api.login(email, password);
      } else {
        res = await api.register({ email, password, companyName: company, displayName: name });
      }
      setToken(res.token);
      setUser({ email: res.email, displayName: res.displayName, companyName: res.companyName, companyId: res.companyId });
      onAuth();
    } catch (ex) {
      setErr(ex.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {/* Brand */}
        <div style={{ marginBottom: 28 }}>
          <div className="brand" style={{ padding: 0, border: 'none', marginBottom: 6 }}>
            <div className="mark">
              <div className="swatch" />
              <h1 style={{ fontSize: 18 }}>SCOPELINE</h1>
            </div>
            <div className="tag" style={{ marginTop: 4 }}>SCOPE &amp; REVENUE DEFENSE</div>
          </div>
        </div>

        <h2 style={{ fontSize: 16, marginBottom: 20, color: 'var(--navy)' }}>
          {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
        </h2>

        {err && <div className="error">{err}</div>}

        <form onSubmit={submit}>
          {mode === 'register' && (
            <>
              <div className="field">
                <label className="field-label">Company Name</label>
                <input type="text" value={company} onChange={e => setCompany(e.target.value)} required />
              </div>
              <div className="field">
                <label className="field-label">Your Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} />
              </div>
            </>
          )}
          <div className="field">
            <label className="field-label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <input type="password" value={password} onChange={e => setPass(e.target.value)} required />
          </div>
          <button type="submit" className="btn orange w-100" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: 18, fontSize: 12.5, color: 'var(--steel)', textAlign: 'center' }}>
          {mode === 'login'
            ? <><span>Don&apos;t have an account? </span><button onClick={() => setMode('register')} style={{ background: 'none', border: 'none', color: 'var(--orange)', cursor: 'pointer', fontWeight: 600 }}>Register</button></>
            : <><span>Already have an account? </span><button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--orange)', cursor: 'pointer', fontWeight: 600 }}>Sign in</button></>
          }
        </p>
      </div>
    </div>
  );
}
