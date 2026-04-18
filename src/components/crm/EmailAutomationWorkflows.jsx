import React, { useState } from 'react';
import { Plus, Trash2, Power, Edit, Check } from 'lucide-react';

const C = {
  card: '#111C30', border: '#1A2E4A', text: '#E8F4FF', muted: '#5A7A9A',
  success: '#00E5A0', accent: '#00C6FF', accent2: '#7B2FFF', danger: '#FF3860',
};

const TRIGGERS = [
  { id: 'new_lead', label: 'New lead created', icon: '🆕' },
  { id: 'lead_qualified', label: 'Lead qualified', icon: '✅' },
  { id: 'proposal_sent', label: 'Proposal sent', icon: '📄' },
  { id: 'no_activity', label: 'No activity (7 days)', icon: '⏰' },
  { id: 'deal_won', label: 'Deal won', icon: '🎉' },
];

const ACTIONS = [
  { id: 'send_email', label: 'Send email', icon: '📧' },
  { id: 'send_sms', label: 'Send SMS', icon: '💬' },
  { id: 'create_task', label: 'Create task', icon: '✓' },
  { id: 'update_status', label: 'Update status', icon: '🔄' },
  { id: 'notify_owner', label: 'Notify owner', icon: '🔔' },
];

export default function EmailAutomationWorkflows({ automations = [], lang = 'en', onAdd, onDelete, onToggle }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: '', trigger: '', action: '', active: true });
  const [editId, setEditId] = useState(null);

  const handleSave = () => {
    if (!newWorkflow.name || !newWorkflow.trigger || !newWorkflow.action) return;
    if (onAdd) onAdd(newWorkflow);
    setNewWorkflow({ name: '', trigger: '', action: '', active: true });
    setShowCreate(false);
    setEditId(null);
  };

  const triggerLabel = (id) => TRIGGERS.find(t => t.id === id)?.label || id;
  const actionLabel = (id) => ACTIONS.find(a => a.id === id)?.label || id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>
          {lang === 'en' ? 'Email Automations' : 'Automazioni Email'}
        </h3>
        <button onClick={() => setShowCreate(!showCreate)} style={{
          background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
          border: 'none', borderRadius: 8, padding: '8px 14px',
          color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Plus size={14} /> {lang === 'en' ? 'Add' : 'Aggiungi'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 16,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              placeholder={lang === 'en' ? 'Workflow name' : 'Nome workflow'}
              value={newWorkflow.name}
              onChange={e => setNewWorkflow(p => ({ ...p, name: e.target.value }))}
              style={{
                background: `${C.border}44`, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: 10, color: C.text, fontFamily: 'inherit',
                fontSize: 12, outline: 'none',
              }}
            />

            <div>
              <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                {lang === 'en' ? 'Trigger' : 'Innesco'}
              </label>
              <select
                value={newWorkflow.trigger}
                onChange={e => setNewWorkflow(p => ({ ...p, trigger: e.target.value }))}
                style={{
                  width: '100%', background: `${C.border}44`, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: 10, color: C.text, fontFamily: 'inherit',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                <option value="">{lang === 'en' ? 'Select trigger' : 'Seleziona innesco'}</option>
                {TRIGGERS.map(t => (
                  <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                {lang === 'en' ? 'Action' : 'Azione'}
              </label>
              <select
                value={newWorkflow.action}
                onChange={e => setNewWorkflow(p => ({ ...p, action: e.target.value }))}
                style={{
                  width: '100%', background: `${C.border}44`, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: 10, color: C.text, fontFamily: 'inherit',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                <option value="">{lang === 'en' ? 'Select action' : 'Seleziona azione'}</option>
                {ACTIONS.map(a => (
                  <option key={a.id} value={a.id}>{a.icon} {a.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCreate(false)} style={{
                flex: 1, background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: 10, color: C.muted, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
              }}>
                {lang === 'en' ? 'Cancel' : 'Annulla'}
              </button>
              <button onClick={handleSave} disabled={!newWorkflow.name || !newWorkflow.trigger || !newWorkflow.action} style={{
                flex: 1, background: `linear-gradient(135deg, ${C.success}, #00a87a)`,
                border: 'none', borderRadius: 8, padding: 10, color: '#fff',
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
                opacity: newWorkflow.name && newWorkflow.trigger && newWorkflow.action ? 1 : 0.5,
              }}>
                <Check size={14} style={{ display: 'inline', marginRight: 4 }} />
                {lang === 'en' ? 'Create' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {automations.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '32px 16px', color: C.muted, fontSize: 12,
            background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
          }}>
            {lang === 'en' ? 'No automations yet — create one to get started' : 'Nessuna automazione — creane una per iniziare'}
          </div>
        ) : (
          automations.map(auto => (
            <div key={auto.id} style={{
              background: auto.active ? C.card : `${C.border}33`,
              border: `1px solid ${auto.active ? C.border : C.border}`,
              borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 12,
              opacity: auto.active ? 1 : 0.6,
            }}>
              <button onClick={() => onToggle(auto.id)} style={{
                background: auto.active ? C.success : C.muted,
                border: 'none', borderRadius: '50%', width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', fontSize: 14,
              }}>
                {auto.active ? '✓' : '○'}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 12, marginBottom: 4 }}>
                  {auto.name}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  {TRIGGERS.find(t => t.id === auto.trigger)?.icon} {triggerLabel(auto.trigger)} →{' '}
                  {ACTIONS.find(a => a.id === auto.action)?.icon} {actionLabel(auto.action)}
                </div>
              </div>

              <button onClick={() => setEditId(auto.id)} style={{
                background: 'none', border: 'none', color: C.muted,
                cursor: 'pointer', padding: 4, fontSize: 14,
              }}>
                <Edit size={14} />
              </button>
              <button onClick={() => onDelete(auto.id)} style={{
                background: 'none', border: 'none', color: C.danger,
                cursor: 'pointer', padding: 4, fontSize: 14,
              }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}