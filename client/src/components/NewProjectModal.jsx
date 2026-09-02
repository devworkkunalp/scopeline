import { useState } from 'react';
import { api } from '../api.js';

export default function NewProjectModal({ onClose, onCreated }) {
  const [name, setName]       = useState('');
  const [client, setClient]   = useState('');
  const [value, setValue]     = useState('');
  const [currency, setCurrency] = useState('USD');
  const [start, setStart]     = useState('');
  const [end, setEnd]         = useState('');
  const [err, setErr]         = useState('');
  const [busy, setBusy]       = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setErr('Project name is required'); return; }
    setErr(''); setBusy(true);
    try {
      const proj = await api.createProject({
        name, clientName: client,
        contractValue: parseFloat(value) || 0,
        currency, startDate: start || null, endDate: end || null
      });
      onCreated(proj);
      onClose();
    } catch (ex) {
      setErr(ex.message || 'Failed to create project');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3>NEW PROJECT</h3>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {err && <div className="error">{err}</div>}
          <form id="np-form" onSubmit={submit}>
            <div className="field">
              <label className="field-label">Project Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Downtown Office Tower — Phase 1" required autoFocus />
            </div>
            <div className="field">
              <label className="field-label">Client / Owner</label>
              <input type="text" value={client} onChange={e => setClient(e.target.value)} placeholder="Client company name" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
              <div className="field">
                <label className="field-label">Contract Value</label>
                <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="0" min="0" step="1000" />
              </div>
              <div className="field">
                <label className="field-label">Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option>USD</option><option>CAD</option><option>GBP</option><option>AUD</option><option>EUR</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label className="field-label">Start Date</label>
                <input type="date" value={start} onChange={e => setStart(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label">End Date</label>
                <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
              </div>
            </div>
          </form>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="np-form" className="btn orange" disabled={busy}>
            {busy ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
