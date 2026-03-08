import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { KpiCard, Table, Badge, Button } from '../../shared/components';
import type { Column, BadgeVariant } from '../../shared/components';
import { loadFromStorage } from '../../core/storage';
import { formatCzDate } from '../../shared/utils/format';
import MessageDetailModal from './MessageDetailModal';
import AnnouncementDetailModal from './AnnouncementDetailModal';

type R = Record<string, unknown>;

const TABS = [
  { key: 'messages', label: 'Zpravy' },
  { key: 'announcements', label: 'Oznameni' },
  { key: 'meetings', label: 'Shromazdeni' },
  { key: 'mail', label: 'Posta' },
] as const;

function activeOnly(arr: R[]): R[] {
  return arr.filter(r => !r.deleted_at);
}

export default function CommunicationPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'messages';

  const [msgs, setMsgs] = useState(() => activeOnly(loadFromStorage<R[]>('estateos_messages', [])));
  const [anns, setAnns] = useState(() => activeOnly(loadFromStorage<R[]>('estateos_announcements', [])));
  const meetings = loadFromStorage<R[]>('estateos_meetings', []);
  const mail = loadFromStorage<R[]>('estateos_mail', []);

  const [selectedMsg, setSelectedMsg] = useState<R | null>(null);
  const [selectedAnn, setSelectedAnn] = useState<R | null>(null);

  const reloadMsgs = useCallback(() => setMsgs(activeOnly(loadFromStorage<R[]>('estateos_messages', []))), []);
  const reloadAnns = useCallback(() => setAnns(activeOnly(loadFromStorage<R[]>('estateos_announcements', []))), []);

  const unread = msgs.filter(m => !m.precteno).length;

  const msgColumns: Column<R>[] = [
    { key: 'od', label: 'Od', render: m => <span style={{ fontWeight: 600 }}>{String(m.od || '')}</span> },
    { key: 'predmet', label: 'Predmet', render: m => <span style={{ fontWeight: m.precteno ? 400 : 600 }}>{String(m.predmet || '')}</span> },
    { key: 'datum', label: 'Datum', render: m => <span className="text-muted text-sm">{formatCzDate(String(m.datum || '').slice(0, 10))}</span> },
    { key: 'precteno', label: 'Stav', render: m => <Badge variant={m.precteno ? 'muted' : 'blue'}>{m.precteno ? 'Precteno' : 'Nove'}</Badge> },
  ];

  const annColumns: Column<R>[] = [
    { key: 'nazev', label: 'Nazev', render: a => <span style={{ fontWeight: 600 }}>{String(a.nazev || '')}</span> },
    { key: 'datum', label: 'Datum', render: a => formatCzDate(String(a.datum || '')) },
    { key: 'autor', label: 'Autor', render: a => <span className="text-muted">{String(a.autor || '')}</span> },
    { key: 'dulezite', label: 'Dulezite', render: a => a.dulezite ? <Badge variant="red">Dulezite</Badge> : <Badge variant="muted">Bezne</Badge> },
  ];

  const MEET_COLOR: Record<string, BadgeVariant> = { planovana: 'blue', uskutecnena: 'green', zrusena: 'red' };
  const MEET_LABEL: Record<string, string> = { planovana: 'Planovana', uskutecnena: 'Uskutecnena', zrusena: 'Zrusena' };

  const meetColumns: Column<R>[] = [
    { key: 'nazev', label: 'Nazev', render: m => <span style={{ fontWeight: 600 }}>{String(m.nazev || '')}</span> },
    { key: 'datum', label: 'Datum', render: m => formatCzDate(String(m.datum || '')) },
    { key: 'cas', label: 'Cas', render: m => String(m.cas || '') },
    { key: 'misto', label: 'Misto', render: m => <span className="text-muted text-sm">{String(m.misto || '')}</span> },
    { key: 'ucastnici', label: 'Ucastniku', align: 'right', render: m => String(m.ucastnici || 0) },
    { key: 'stav', label: 'Stav', render: m => <Badge variant={MEET_COLOR[String(m.stav)] || 'muted'}>{MEET_LABEL[String(m.stav)] || String(m.stav || '')}</Badge> },
  ];

  const MAIL_COLOR: Record<string, BadgeVariant> = { doruceno: 'green', odeslano: 'blue' };
  const mailColumns: Column<R>[] = [
    { key: 'adresat', label: 'Adresat / Odesilatel', render: m => <span style={{ fontWeight: 600 }}>{String(m.adresat || '')}</span> },
    { key: 'predmet', label: 'Predmet', render: m => String(m.predmet || '') },
    { key: 'typ', label: 'Smer', render: m => <Badge variant={m.typ === 'prichozi' ? 'blue' : 'muted'}>{m.typ === 'prichozi' ? 'Prichozi' : 'Odchozi'}</Badge> },
    { key: 'datum', label: 'Datum', render: m => formatCzDate(String(m.datum || '')) },
    { key: 'stav', label: 'Stav', render: m => <Badge variant={MAIL_COLOR[String(m.stav)] || 'muted'}>{String(m.stav || '')}</Badge> },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Komunikace</h1>
          <p className="page-subtitle">{unread} neprectenych zprav</p>
        </div>
        <Button variant="primary" icon={<Plus size={15} />}>Nova zprava</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Zpravy" value={String(msgs.length)} color="var(--accent-blue)" />
        <KpiCard label="Oznameni" value={String(anns.length)} color="var(--accent-green)" />
        <KpiCard label="Shromazdeni" value={String(meetings.length)} color="var(--accent-orange)" />
        <KpiCard label="Posta" value={String(mail.length)} color="var(--accent-purple)" />
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setParams({ tab: t.key })}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'messages' && <Table data={msgs} columns={msgColumns} rowKey={m => String(m.id)} onRowClick={m => setSelectedMsg(m)} emptyText="Zadne zpravy" />}
      {tab === 'announcements' && <Table data={anns} columns={annColumns} rowKey={a => String(a.id)} onRowClick={a => setSelectedAnn(a)} emptyText="Zadna oznameni" />}
      {tab === 'meetings' && <Table data={meetings} columns={meetColumns} rowKey={m => String(m.id)} emptyText="Zadna shromazdeni" />}
      {tab === 'mail' && <Table data={mail} columns={mailColumns} rowKey={m => String(m.id)} emptyText="Zadna posta" />}

      {selectedMsg && (
        <MessageDetailModal
          message={selectedMsg as any}
          onClose={() => setSelectedMsg(null)}
          onUpdated={() => { reloadMsgs(); setSelectedMsg(null); }}
        />
      )}

      {selectedAnn && (
        <AnnouncementDetailModal
          announcement={selectedAnn as any}
          onClose={() => setSelectedAnn(null)}
          onUpdated={() => { reloadAnns(); setSelectedAnn(null); }}
        />
      )}
    </div>
  );
}
