/**
 * 🔥 Компонент анимации огня для легендарных карт
 * Используется в профиле, игре, NFT коллекции
 */

interface LegendaryCardFrameProps {
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: string;
  zIndex?: number;
}

export default function LegendaryCardFrame({
  children,
  width = '100%',
  height = '100%',
  borderRadius = '8px',
  zIndex = 1
}: LegendaryCardFrameProps) {
  return (
    <div style={{
      position: 'relative',
      width,
      height,
      borderRadius,
      overflow: 'hidden'
    }}>
      {/* 🔥 АНИМАЦИЯ ОГНЯ ПО КРАЯМ */}
      <>
        {/* Верх */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #ff7f00, #ff0000)',
          backgroundSize: '200% 100%',
          animation: 'fireMove 2s linear infinite',
          filter: 'blur(2px)',
          zIndex: zIndex + 1
        }} />
        
        {/* Низ */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #ff7f00, #ff0000)',
          backgroundSize: '200% 100%',
          animation: 'fireMove 2s linear infinite',
          filter: 'blur(2px)',
          zIndex: zIndex + 1
        }} />
        
        {/* Левый край */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '4px',
          background: 'linear-gradient(180deg, #ff0000, #ff7f00, #ffff00, #ff7f00, #ff0000)',
          backgroundSize: '100% 200%',
          animation: 'fireMove 2s linear infinite',
          filter: 'blur(2px)',
          zIndex: zIndex + 1
        }} />
        
        {/* Правый край */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '4px',
          background: 'linear-gradient(180deg, #ff0000, #ff7f00, #ffff00, #ff7f00, #ff0000)',
          backgroundSize: '100% 200%',
          animation: 'fireMove 2s linear infinite',
          filter: 'blur(2px)',
          zIndex: zIndex + 1
        }} />
      </>

      {/* Контент карты */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        zIndex: zIndex
      }}>
        {children}
      </div>

      {/* CSS анимация */}
      <style jsx>{`
        @keyframes fireMove {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
      `}</style>
    </div>
  );
}

