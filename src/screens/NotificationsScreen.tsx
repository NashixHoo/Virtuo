import React from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationsScreenProps {
  notifications: Notification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  notifications,
  onMarkAllAsRead,
  onClearAll
}) => {
  return (
    <div className="notifications-screen-container">
      <section className="glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="pill">NOTIFICAÇÕES & ALERTAS</span>
            <h2 style={{ margin: '6px 0 0', fontSize: '24px' }}>Central de Avisos</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="button secondary" onClick={onMarkAllAsRead} style={{ padding: '6px 12px', fontSize: '11px' }}>
              Marcar lidas
            </button>
            <button className="button secondary" onClick={onClearAll} style={{ padding: '6px 12px', fontSize: '11px' }}>
              Limpar todas
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 14px', color: '#94a3b8' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
            <p>Nenhuma notificação no momento.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notifications.map((n) => (
              <div 
                key={n.id}
                style={{
                  padding: '14px',
                  background: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(126,231,255,0.08)',
                  borderRadius: '14px',
                  border: `1px solid ${n.read ? 'rgba(255,255,255,0.06)' : 'rgba(126,231,255,0.3)'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '14px', color: n.read ? '#cbd5e1' : '#F8FAFC' }}>
                    {n.title}
                  </strong>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.time}</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                  {n.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
