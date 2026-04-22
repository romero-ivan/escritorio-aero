function Particles({ enabled }) {
  if (!enabled) return null;
  const bubbles = React.useMemo(() => {
    return Array.from({length: 28}).map((_,i) => {
      const size = 8 + Math.random() * 42;
      return {
        id: i,
        left: Math.random() * 100,
        size,
        delay: Math.random() * -30,
        duration: 14 + Math.random() * 22,
      };
    });
  }, []);
  return (
    <div className="particles">
      {bubbles.map(b => (
        <div key={b.id} className="bubble" style={{
          left: `${b.left}%`,
          bottom: `-${b.size}px`,
          width: b.size, height: b.size,
          animationDelay: `${b.delay}s`,
          animationDuration: `${b.duration}s`
        }} />
      ))}
    </div>
  );
}
window.Particles = Particles;
