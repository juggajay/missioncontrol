import { useState, useEffect, useCallback } from 'react';
import { FileEditor } from './FileEditor';
import { Bot, FileText, FolderOpen, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Agent {
  agentId: string;
  displayName: string;
}

const COMMON_FILES = [
  { path: 'IDENTITY.md', label: 'IDENTITY.md', lang: 'markdown' as const },
  { path: 'SOUL.md', label: 'SOUL.md', lang: 'markdown' as const },
  { path: 'USER.md', label: 'USER.md', lang: 'markdown' as const },
  { path: 'TOOLS.md', label: 'TOOLS.md', lang: 'markdown' as const },
  { path: 'MEMORY.md', label: 'MEMORY.md', lang: 'markdown' as const },
  { path: 'HEARTBEAT.md', label: 'HEARTBEAT.md', lang: 'markdown' as const },
  { path: 'AGENTS.md', label: 'AGENTS.md', lang: 'markdown' as const },
];

function detectLanguage(path: string): 'json' | 'markdown' | 'yaml' | 'text' {
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'yaml';
  return 'text';
}

/** Try to extract agent name from IDENTITY.md content */
function extractAgentName(content: string): string | null {
  // Look for "**Name:** Seb" or "Name: Seb" patterns
  const match = content.match(/\*?\*?Name:?\*?\*?\s*(.+)/i);
  if (match) return match[1].trim();
  // Fallback: first heading
  const heading = content.match(/^#\s+(.+)/m);
  if (heading) return heading[1].trim();
  return null;
}

export function AgentFilesPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [filePath, setFilePath] = useState('CLAUDE.md');
  const [fileContent, setFileContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [fileLoaded, setFileLoaded] = useState(false);

  // Fetch agents list, then resolve display names from IDENTITY.md
  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then(async (data) => {
        const raw = Array.isArray(data) ? data : data.agents || [];
        const list: Agent[] = raw.map((a: Record<string, unknown>) => ({
          agentId: String(a.agentId || a.id || a.name || 'unknown'),
          displayName: String(a.displayName || a.name || a.agentId || a.id || ''),
        }));
        setAgents(list);
        if (list.length > 0 && !selectedAgent) {
          setSelectedAgent(list[0].agentId);
        }

        // Resolve display names from IDENTITY.md
        const resolved = await Promise.all(
          list.map(async (agent) => {
            try {
              const res = await fetch('/api/agents/files/get', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId: agent.agentId, name: 'IDENTITY.md' }),
              });
              if (!res.ok) return agent;
              const fileData = await res.json();
              const content = typeof fileData === 'string'
                ? fileData
                : (fileData.file?.content ?? fileData.content ?? '');
              const name = extractAgentName(content);
              if (name) return { ...agent, displayName: `${name} (${agent.agentId})` };
            } catch {
              // ignore — keep original
            }
            return agent;
          }),
        );
        setAgents(resolved);
      })
      .catch((err) => toast.error(`Failed to load agents: ${err.message}`));
  }, []);

  const loadFile = useCallback(async () => {
    if (!selectedAgent || !filePath) return;
    setLoading(true);
    setFileLoaded(false);
    try {
      const res = await fetch('/api/agents/files/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgent, name: filePath }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      const data = await res.json();
      // Gateway returns { file: { content: "..." } } or { content: "..." } or plain string
      const content = typeof data === 'string'
        ? data
        : (data.file?.content ?? data.content ?? JSON.stringify(data, null, 2));
      setFileContent(content);
      setEditedContent(content);
      setDirty(false);
      setFileLoaded(true);
    } catch (err) {
      toast.error(`Failed to load file: ${(err as Error).message}`);
      setFileContent('');
      setEditedContent('');
    } finally {
      setLoading(false);
    }
  }, [selectedAgent, filePath]);

  useEffect(() => {
    if (selectedAgent && filePath) {
      loadFile();
    }
  }, [selectedAgent, filePath, loadFile]);

  function handleEditorChange(val: string) {
    setEditedContent(val);
    setDirty(val !== fileContent);
  }

  async function handleSave() {
    if (!selectedAgent || !filePath) return;
    setSaving(true);
    try {
      const res = await fetch('/api/agents/files/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgent, name: filePath, content: editedContent }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFileContent(editedContent);
      setDirty(false);
      toast.success('File saved');
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  const language = detectLanguage(filePath);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-cyber-border bg-cyber-bg-secondary">
        {/* Agent selector */}
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-cyber-purple" />
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-cyber-bg-surface border border-cyber-border rounded px-2 py-1 text-xs font-mono text-cyber-text focus:border-cyber-cyan/50 focus:outline-none"
          >
            <option value="">Select agent...</option>
            {agents.map((a) => (
              <option key={a.agentId} value={a.agentId}>
                {a.displayName || a.agentId}
              </option>
            ))}
          </select>
        </div>

        {/* File path input */}
        <div className="flex items-center gap-2 flex-1">
          <FolderOpen size={14} className="text-cyber-cyan shrink-0" />
          <input
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') loadFile();
            }}
            placeholder="File path..."
            className="flex-1 bg-cyber-bg-surface border border-cyber-border rounded px-2 py-1 text-xs font-mono text-cyber-text focus:border-cyber-cyan/50 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-cyber-yellow text-[10px] font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-yellow" />
              Modified
            </span>
          )}
          <button
            onClick={loadFile}
            disabled={loading}
            className="p-1.5 rounded text-cyber-text-muted hover:text-cyber-cyan hover:bg-cyber-bg-surface transition-all"
            title="Reload file"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/20 transition-all disabled:opacity-40"
          >
            <Save size={11} />
            Save
          </button>
        </div>
      </div>

      {/* Quick file access */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-cyber-border bg-cyber-bg/50">
        <span className="text-[10px] uppercase tracking-wider text-cyber-text-disabled mr-2">Quick:</span>
        {COMMON_FILES.map((f) => (
          <button
            key={f.path}
            onClick={() => setFilePath(f.path)}
            className={`
              px-2 py-0.5 rounded text-[10px] font-mono transition-all
              ${filePath === f.path
                ? 'bg-cyber-cyan/15 text-cyber-cyan'
                : 'text-cyber-text-muted hover:text-cyber-text hover:bg-cyber-bg-surface'
              }
            `}
          >
            <FileText size={9} className="inline mr-1" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full bg-cyber-bg">
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-cyber-cyan/50 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        ) : fileLoaded ? (
          <FileEditor
            value={editedContent}
            onChange={handleEditorChange}
            language={language}
            onSave={handleSave}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-cyber-bg text-cyber-text-muted">
            <FileText size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-mono">Select an agent and file to begin editing</p>
          </div>
        )}
      </div>
    </div>
  );
}
