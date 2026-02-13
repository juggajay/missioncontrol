import { memo } from 'react';
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react';

function SpawnEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  return (
    <>
      {/* Glow layer */}
      <path
        d={edgePath}
        fill="none"
        stroke="rgba(0, 240, 255, 0.15)"
        strokeWidth={6}
        filter="blur(4px)"
      />
      {/* Main edge */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="#00f0ff"
        strokeWidth={2}
        strokeDasharray="8 4"
        style={{
          ...style,
          animation: 'dash-flow 1s linear infinite',
        }}
      />
    </>
  );
}

export const SpawnEdge = memo(SpawnEdgeComponent);
