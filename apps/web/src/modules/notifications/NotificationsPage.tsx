import { useState, createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Check, CheckCheck, RefreshCw } from 'lucide-react';
import { KpiCard, LoadingState, ErrorState, EmptyState, Badge, Button } from '../../shared/components';
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  useDeleteNotification,
  useGenerateNotifications,
} from './api/notifications.queries';
import type { Notification } from './api/notifications.api';
import {
  TYPE_LABEL, TYPE_COLOR, TYPE_ICON_COMPONENT,
  timeAgo, FILTER_TYPES,
} from './notification-utils';

export default function NotificationsPage() {
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const unreadOnly = filter === 'unread';
  const typeFilter = !unreadOnly && filter !== 'all' ? filter : undefined;

  const { data: notifications = [], isLoading, error } = useNotifications(unreadOnly, typeFilter);
  const { data: unreadCount = 0 } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteNotif = useDeleteNotification();
  const generate = useGenerateNotifications();

  if (isLoading) return <LoadingState text="Nacitam notifikace..." />;
  if (error) return <ErrorState message="Nepodarilo se nacist notifikace." />;

  const total = notifications.length;
  const typeBreakdown = notifications.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {});

  const handleClick = (n: Notification) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.url) navigate(n.url);
  };

  return (
    <div>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Celkem" value={String(total)} color="var(--accent-blue)" />
        <KpiCard label="Neprectene" value={String(unreadCount)} color="var(--accent-red)" />
        <KpiCard label="Smlouvy" value={String(typeBreakdown.contract_expiring || 0)} color="var(--accent-orange)" />
        <KpiCard label="HelpDesk" value={String(typeBreakdown.ticket_new || 0)} color="var(--accent-purple, #8b5cf6)" />
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 16, flexWrap: 'wrap',
      }}>
        <Button onClick={() => markAllRead.mutate()} disabled={unreadCount === 0 || markAllRead.isPending}>
          <CheckCheck size={15} />
          Oznacit vse prectene
        </Button>
        <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
          <RefreshCw size={15} className={generate.isPending ? 'spin' : ''} />
          {generate.isPending ? 'Generuji...' : 'Generovat notifikace'}
        </Button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
          Celkem {total} notifikaci
        </span>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTER_TYPES.map((f) => (
          <button
            key={f.key}
            className={`notif-filter-chip${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === 'unread' && unreadCount > 0 && (
              <span className="notif-filter-chip__count">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <EmptyState title="Zadne notifikace" description="Vsechny notifikace byly precteny nebo filtrovany." />
      ) : (
        <div className="notif-list">
          {notifications.map((n) => (
            <NotifRow
              key={n.id}
              notif={n}
              onClick={() => handleClick(n)}
              onMarkRead={() => markRead.mutate(n.id)}
              onDelete={() => deleteNotif.mutate(n.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotifRow({ notif: n, onClick, onMarkRead, onDelete }: {
  notif: Notification;
  onClick: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const IconComp = TYPE_ICON_COMPONENT[n.type] ?? TYPE_ICON_COMPONENT.info;
  const color = TYPE_COLOR[n.type] ?? '#6366f1';

  return (
    <div
      className={`notif-row${n.isRead ? '' : ' notif-row--unread'}`}
      onClick={onClick}
      style={{ cursor: n.url ? 'pointer' : 'default' }}
    >
      <div className="notif-row__icon" style={{ background: `${color}12`, color }}>
        {createElement(IconComp, { size: 16 })}
      </div>

      <div className="notif-row__content">
        <div className="notif-row__title">
          {n.title}
        </div>
        <div className="notif-row__body">{n.body}</div>
        <div className="notif-row__meta">
          <Badge variant={n.isRead ? 'muted' : 'blue'}>
            {TYPE_LABEL[n.type] ?? n.type}
          </Badge>
          <span>{timeAgo(n.createdAt)}</span>
        </div>
      </div>

      <div className="notif-row__actions" onClick={(e) => e.stopPropagation()}>
        {!n.isRead && (
          <button className="btn btn--sm btn--ghost" onClick={onMarkRead} title="Oznacit prectene">
            <Check size={14} />
          </button>
        )}
        <button className="btn btn--sm btn--ghost" onClick={onDelete} title="Smazat">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
