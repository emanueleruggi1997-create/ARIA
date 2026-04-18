import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import confetti from 'canvas-confetti';
import { MessageCircle, Mail, Edit2, Eye } from 'lucide-react';

const C = {
  bg: '#070B14', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
  accent: '#00C6FF', accent2: '#7B2FFF', accent3: '#FF3CAC',
  text: '#E8F4FF', muted: '#5A7A9A', success: '#00E5A0', danger: '#FF3860', warning: '#FF9500',
};

const COLUMNS_IT = [
  { id: 'nuovo', label: 'NEW', color: C.accent },
  { id: 'qualificato', label: 'CONTACTED', color: C.warning },
  { id: 'preventivo_inviato', label: 'INTERESTED', color: C.accent2 },
  { id: 'chiuso_vinto', label: 'WON', color: C.success },
  { id: 'chiuso_perso', label: 'LOST', color: C.danger },
];

const COLUMNS_EN = [
  { id: 'nuovo', label: 'NEW', color: C.accent },
  { id: 'qualificato', label: 'CONTACTED', color: C.warning },
  { id: 'preventivo_inviato', label: 'PROPOSAL SENT', color: C.accent2 },
  { id: 'chiuso_vinto', label: 'WON', color: C.success },
  { id: 'chiuso_perso', label: 'LOST', color: C.danger },
];

function LeadCard({ lead, onEdit, index, lang }) {
  const daysInStage = lead.updated_date ? Math.floor((new Date() - new Date(lead.updated_date)) / (1000 * 60 * 60 * 24)) : 0;
  
  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 12,
            marginBottom: 8,
            cursor: 'grab',
            ...provided.draggableProps.style,
            ...(snapshot.isDragging && { background: `${C.accent2}33`, boxShadow: `0 0 20px ${C.accent2}55` }),
          }}
        >
          {/* Avatar + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {(lead.contact_nome || 'NN')[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lead.contact_nome || 'Sconosciuto'}
              </div>
            </div>
          </div>

          {/* Source badge */}
          {lead.canale && (
            <div style={{
              display: 'inline-block',
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
              background: (lead.canale === 'instagram' ? '#E1306C' : '#25D366') + '22',
              color: lead.canale === 'instagram' ? '#E1306C' : '#25D366',
              border: `1px solid ${(lead.canale === 'instagram' ? '#E1306C' : '#25D366')}44`,
              marginBottom: 8,
            }}>
              {lead.canale === 'instagram' ? '📸 IG' : '💬 WA'}
            </div>
          )}

          {/* Days in stage */}
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>
            {daysInStage} {lang === 'en' ? 'days in stage' : 'giorni in questa fase'}
          </div>

          {/* Last message preview */}
          {lead.note && (
            <div style={{
              fontSize: 11, color: C.muted, background: `${C.border}44`, borderRadius: 8,
              padding: 8, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', maxWidth: '100%',
            }}>
              "{lead.note.slice(0, 40)}..."
            </div>
          )}

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{
              flex: 1, background: `${C.accent}22`, border: `1px solid ${C.accent}44`,
              borderRadius: 6, padding: '6px 8px', color: C.accent, fontSize: 10,
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 3, fontFamily: 'inherit',
            }}>
              <Mail size={10} /> {lang === 'en' ? 'Email' : 'Email'}
            </button>
            <button style={{
              flex: 1, background: `${C.success}22`, border: `1px solid ${C.success}44`,
              borderRadius: 6, padding: '6px 8px', color: C.success, fontSize: 10,
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 3, fontFamily: 'inherit',
            }}>
              <MessageCircle size={10} /> {lang === 'en' ? 'Message' : 'Msg'}
            </button>
            <button onClick={() => onEdit(lead)} style={{
              flex: 1, background: `${C.muted}22`, border: `1px solid ${C.muted}44`,
              borderRadius: 6, padding: '6px 8px', color: C.muted, fontSize: 10,
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 3, fontFamily: 'inherit',
            }}>
              <Edit2 size={10} /> {lang === 'en' ? 'Edit' : 'Modifica'}
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function LeadsKanban({ leads = [], onMove, onEdit, lang = 'en' }) {
  const COLUMNS = lang === 'en' ? COLUMNS_EN : COLUMNS_IT;
  const [collapsedLost, setCollapsedLost] = useState(true);

  const handleDragEnd = (result) => {
    const { draggableId, destination } = result;
    if (!destination) return;

    const newStato = destination.droppableId;
    const lead = leads.find(l => l.id === draggableId);
    
    if (lead && lead.stato !== newStato) {
      // Confetti animation on won
      if (newStato === 'chiuso_vinto') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
      
      onMove(lead, newStato);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {COLUMNS.map(col => {
            // Skip showing LOST column if collapsed
            if (col.id === 'chiuso_perso' && collapsedLost) return null;

            const colLeads = leads.filter(l => l.stato === col.id);

            return (
              <div key={col.id} style={{
                background: `${col.color}08`,
                border: `1px solid ${col.color}33`,
                borderRadius: 14,
                padding: 12,
              }}>
                {/* Column header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: col.color, letterSpacing: 1 }}>
                      {col.label}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {colLeads.length} {lang === 'en' ? 'leads' : 'lead'}
                    </div>
                  </div>
                  {col.id === 'chiuso_perso' && (
                    <button onClick={() => setCollapsedLost(!collapsedLost)} style={{
                      background: 'none', border: 'none', color: C.muted, fontSize: 16,
                      cursor: 'pointer', padding: 0,
                    }}>
                      {collapsedLost ? '▶' : '▼'}
                    </button>
                  )}
                </div>

                {/* Droppable area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        minHeight: 300,
                        background: snapshot.isDraggingOver ? `${col.color}22` : 'transparent',
                        borderRadius: 10,
                        padding: 8,
                        transition: 'background 0.2s',
                      }}
                    >
                      {colLeads.map((lead, i) => (
                        <LeadCard key={lead.id} lead={lead} onEdit={onEdit} index={i} lang={lang} />
                      ))}
                      {colLeads.length === 0 && (
                        <div style={{
                          textAlign: 'center', padding: '40px 16px', color: C.muted,
                          fontSize: 12, fontStyle: 'italic',
                        }}>
                          {lang === 'en' ? 'No leads yet' : 'Nessun lead'}
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}