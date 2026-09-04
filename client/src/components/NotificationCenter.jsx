import { useState, useRef, useEffect } from 'react';

export default function NotificationCenter({ notifications = [], onClear, onSelect, activeProject }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="notif-center-wrapper" ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`notif-bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="View Inbound Activity and Notifications"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          color: '#DCE2EE',
          borderRadius: '4px',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ fontSize: '14px' }}>🔔</span>
        <span>Activity Alerts</span>
        {unreadCount > 0 && (
          <span
            style={{
              background: '#E85D2E',
              color: '#fff',
              fontSize: '10px',
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '10px',
              lineHeight: 1.2,
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notif-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            background: '#14213D',
            color: '#DCE2EE',
            borderRadius: '6px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.12)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Activity Stream
              </span>
              <span
                style={{
                  fontSize: '10px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#6EE7B7',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                LIVE
              </span>
            </div>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8C9AB5',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Clear all
              </button>
            )}
          </div>

          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#8C9AB5', fontSize: '12px' }}>
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>📬</div>
                No new activity alerts.
                <div style={{ fontSize: '11px', marginTop: '4px', color: '#66759A' }}>
                  Forward emails to <b>4d5fcfd49f452cf19bbf@cloudmailin.net</b> to see live notifications here.
                </div>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect?.(item);
                    setOpen(false);
                  }}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    background: item.read ? 'transparent' : 'rgba(232, 93, 46, 0.08)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = item.read ? 'transparent' : 'rgba(232, 93, 46, 0.08)')
                  }
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px' }}>{item.type === 'inbound_email' ? '📧' : '⚡'}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontWeight: 700,
                          color: item.type === 'inbound_email' ? '#A7F3D0' : '#F3D9CC',
                        }}
                      >
                        {item.badge || (item.type === 'inbound_email' ? 'EMAIL RECEIVED' : 'OPPORTUNITY')}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#8C9AB5' }}>{item.timeAgo || 'Just now'}</span>
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      marginTop: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.title}
                  </div>

                  {item.message && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#8C9AB5',
                        marginTop: '2px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.message}
                    </div>
                  )}

                  {item.billableValue ? (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#E85D2E', fontWeight: 600 }}>
                      +${Number(item.billableValue).toLocaleString()} Billable Value
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div
            style={{
              padding: '8px 14px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '11px',
              color: '#8C9AB5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Inbox: 4d5fcfd49f452cf19bbf@...</span>
            <span style={{ color: '#10B981', fontWeight: 600 }}>● Active</span>
          </div>
        </div>
      )}
    </div>
  );
}
