export function PlaceholderPage({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl tracking-wide text-cyber-cyan text-glow-cyan">
          {title}
        </h2>
        <p className="text-cyber-text-muted text-sm mt-1">Coming in {phase}</p>
      </div>
      <div className="bg-cyber-bg-secondary border border-cyber-border rounded-lg p-16 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-cyber-cyan/30 flex items-center justify-center mb-4">
          <div className="w-6 h-6 rounded-full border-2 border-dashed border-cyber-cyan/50 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <p className="font-display text-sm text-cyber-text-muted tracking-wider">
          AWAITING IMPLEMENTATION
        </p>
      </div>
    </div>
  );
}
