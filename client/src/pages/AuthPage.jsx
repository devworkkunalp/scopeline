import { useState } from 'react';
import { api, setToken, setUser } from '../api.js';

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      let res;
      if (mode === 'login') {
        res = await api.login(email, password);
      } else {
        res = await api.signup({
          email,
          password,
          companyName: company,
          displayName: name,
        });
      }
      setToken(res.token);
      setUser({
        email: res.email,
        displayName: res.displayName,
        workspaceName: res.workspaceName,
        workspaceId: res.workspaceId,
        role: res.role,
        onboarded: res.onboarded,
        onboardingStep: res.onboardingStep,
      });
      onAuthSuccess(res);
    } catch (ex) {
      setErr(ex.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      {/* Left Pitch Pane */}
      <div className="auth-side">
        <div className="inner">
          <div className="mark">
            <div className="swatch"></div>
            <h1>SCOPELINE</h1>
          </div>
          <div className="pitch">
            Stop losing revenue to <b>scope that was never billed</b>.
          </div>
          <div className="sub">
            Scopeline compares what your team actually delivered against the signed SOW, flags unbilled work with evidence, and turns it into a change request in one click.
          </div>
          <div className="stat-row">
            <div className="stat">
              <div className="v">$47K</div>
              <div className="l">Avg. recovered / quarter</div>
            </div>
            <div className="stat">
              <div className="v">6.2%</div>
              <div className="l">Typical unbilled scope</div>
            </div>
            <div className="stat">
              <div className="v">9 min</div>
              <div className="l">To first flagged item</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Pane */}
      <div className="auth-form-wrap">
        <div className="auth-card">
          <div className="auth-toggle">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => { setMode('login'); setErr(''); }}
            >
              Log In
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => { setMode('signup'); setErr(''); }}
            >
              Create Account
            </button>
          </div>

          <h2>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h2>
          <div className="sub">
            {mode === 'login'
              ? 'Log in to your workspace to view scope recovery status.'
              : 'Set up Scopeline for your team in under a minute.'}
          </div>

          {err && <div className="error">{err}</div>}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <div className="field">
                  <label className="field-label">Your Name</label>
                  <input
                    type="text"
                    placeholder="Jamie Rivera"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label">Company / Agency Name</label>
                  <input
                    type="text"
                    placeholder="Nimbus Digital"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="field">
              <label className="field-label">Work Email</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="field">
              <label className="field-label">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn orange wide" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>

          <div className="auth-foot">
            {mode === 'login' ? (
              <>
                New to Scopeline?{' '}
                <button type="button" onClick={() => setMode('signup')}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('login')}>
                  Log in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
