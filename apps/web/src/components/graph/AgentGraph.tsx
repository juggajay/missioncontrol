import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type DefaultEdgeOptions,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useAgentStore } from '@/stores/agents';
import { computeGraphLayout } from './graph-layout';
import { SessionNode } from './SessionNode';
import { ActionNode } from './ActionNode';
import { ExecNode } from './ExecNode';
import { SpawnEdge } from './SpawnEdge';

const nodeTypes: NodeTypes = {
  session: SessionNode,
  action: ActionNode,
  exec: ExecNode,
};

const edgeTypes: EdgeTypes = {
  spawn: SpawnEdge,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  style: { stroke: '#21262d', strokeWidth: 1.5 },
  type: 'smoothstep',
};

function AgentGraphInner() {
  const sessions = useAgentStore((s) => s.sessions);
  const actions = useAgentStore((s) => s.actions);
  const execs = useAgentStore((s) => s.execs);
  const runSessionMap = useAgentStore((s) => s.runSessionMap);

  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const { fitView } = useReactFlow<Node, Edge>();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialFitDone = useRef(false);

  // Recompute layout when data changes (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const { nodes: newNodes, edges: newEdges } = computeGraphLayout(
        sessions,
        actions,
        execs,
        runSessionMap,
      );

      setNodes(newNodes);
      setEdges(newEdges as Edge[]);

      // Auto-fit on first data arrival
      if (!initialFitDone.current && newNodes.length > 0) {
        initialFitDone.current = true;
        setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 100);
      }
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [sessions, actions, execs, runSessionMap, setNodes, setEdges, fitView]);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      proOptions={proOptions}
      fitView
      minZoom={0.1}
      maxZoom={2}
      className="agent-graph"
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={40}
        size={1}
        color="rgba(0, 240, 255, 0.06)"
      />
      <MiniMap
        nodeStrokeWidth={3}
        nodeColor={(node) => {
          if (node.type === 'session') return '#00f0ff';
          if (node.type === 'exec') return '#00ff88';
          return '#b44dff';
        }}
        maskColor="rgba(10, 10, 15, 0.85)"
        style={{
          backgroundColor: '#0d1117',
          border: '1px solid #21262d',
          borderRadius: 6,
        }}
      />
      <Controls
        showInteractive={false}
        style={{
          backgroundColor: '#0d1117',
          border: '1px solid #21262d',
          borderRadius: 6,
        }}
      />
    </ReactFlow>
  );
}

export function AgentGraph() {
  return (
    <ReactFlowProvider>
      <AgentGraphInner />
    </ReactFlowProvider>
  );
}
