import { useState, useEffect } from 'react';

export default function NotificationToast({ notifications, onDismiss, onAction }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="scopeline-toast-container" style={{
      position: 'fixed',
      top: '20px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '420px',
      width: 'calc(100vw - 48px)',
      pointerEvents: 'none',
    }}>
      {notifications.map((notif) => (
        <ToastItem
          key={notif.id}
          notif={notif}
          onDismiss={() => onDismiss(notif.id)}
          onAction={() => onAction(notif)}
        />
      ))}
    </div>
  );
}

function ToastItem({ notif, onDismiss, onAction }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = notif.duration || 8000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [notif, onDismiss]);

  const isEmail = notif.type === 'inbound_email';
  const isOpportunity = notif.type === 'opportunity';

  return (
    <div
      className="scopeline-toast-card"
      style={{
        pointerEvents: 'auto',
        background: '#14213D',
        color: '#FFFFFF',
        borderRadius: '6px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.12)',
        borderLeft: isOpportunity ? '4px solid #E85D2E' : '4px solid #10B981',
        overflow: 'hidden',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>
              {isEmail ? '📧' : '⚡'}
            </span>
            <span style={{
              fontSize: '11px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: isOpportunity ? '#F3D9CC' : '#A7F3D0',
              textTransform: 'uppercase'
            }}>
              {notif.badge || (isEmail ? 'Inbound Email Ingested' : 'New Scope Opportunity')}
            </span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: '#8C9AB5',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
              padding: '0 2px',
            }}
            title="Dismiss"
          >
            &times;
          </button>
        </div>

        <div style={{
          marginTop: '6px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#FFFFFF',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {notif.title}
        </div>

        {notif.message && (
          <div style={{
            marginTop: '4px',
            fontSize: '12px',
            color: '#B9C3D9',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {notif.message}
          </div>
        )}

        <div style={{
          marginTop: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          {notif.billableValue ? (
            <span style={{
              fontSize: '12px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 700,
              color: '#E85D2E',
            }}>
              +${Number(notif.billableValue).toLocaleString()} Billable
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: '#8C9AB5' }}>Just now</span>
          )}

          <div style={{ display: 'flex', gap: '6px' }}>
            {notif.actionLabel && (
              <button
                type="button"
                onClick={onAction}
                style={{
                  background: '#E85D2E',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {notif.actionLabel} &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '2px',
        background: 'rgba(255, 255, 255, 0.1)',
        width: '100%',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: isOpportunity ? '#E85D2E' : '#10B981',
          transition: 'width 0.05s linear',
        }} />
      </div>
    </div>
  );
}
