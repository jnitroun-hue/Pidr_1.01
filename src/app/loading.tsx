export default function GlobalLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background:
          'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.25), transparent 40%), radial-gradient(circle at 80% 15%, rgba(59,130,246,0.22), transparent 45%), linear-gradient(145deg, #0b1220 0%, #111827 55%, #0f172a 100%)',
        color: '#e2e8f0'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          borderRadius: '20px',
          padding: '26px 22px',
          border: '1px solid rgba(148,163,184,0.22)',
          background: 'rgba(15, 23, 42, 0.65)',
          boxShadow: '0 20px 55px rgba(2, 6, 23, 0.55)',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: '68px',
            height: '68px',
            margin: '0 auto 14px',
            borderRadius: '18px',
            border: '1px solid rgba(250, 204, 21, 0.45)',
            background:
              'linear-gradient(145deg, rgba(30, 64, 175, 0.26) 0%, rgba(234, 179, 8, 0.14) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px'
          }}
        >
          🎮
        </div>

        <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
          P.I.D.R. Game
        </div>
        <div style={{ fontSize: '15px', color: '#cbd5e1', marginBottom: '16px' }}>Загрузка...</div>

        <div
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '999px',
            background: 'rgba(30, 41, 59, 0.95)',
            overflow: 'hidden',
            border: '1px solid rgba(148,163,184,0.2)'
          }}
        >
          <div className="pidr-loading-bar" />
        </div>
      </div>

      <style jsx>{`
        .pidr-loading-bar {
          height: 100%;
          width: 45%;
          border-radius: 999px;
          background: linear-gradient(90deg, #22d3ee 0%, #facc15 50%, #60a5fa 100%);
          animation: pidr-loading-slide 1.3s ease-in-out infinite;
          box-shadow: 0 0 18px rgba(250, 204, 21, 0.45);
        }

        @keyframes pidr-loading-slide {
          0% {
            transform: translateX(-70%);
          }
          50% {
            transform: translateX(120%);
          }
          100% {
            transform: translateX(-70%);
          }
        }
      `}</style>
    </div>
  );
}
