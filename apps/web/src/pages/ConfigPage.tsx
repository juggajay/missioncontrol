import { useState, useEffect, useCallback } from 'react';
import { FileEditor } from '@/components/editor/FileEditor';
import { AgentFilesPanel } from '@/components/editor/AgentFilesPanel';
import { Settings, Save, RefreshCw, ChevronRight, AlertTriangle, FileCode, Bot } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigState {
  config: Record<string, unknown>;
  hash: string;
}

type Tab = 'gateway' | 'agent-files';

export function ConfigPage() {
  const [activeTab, setActiveTab] = useState<Tab>('gateway');
  const [configState, setConfigState] = useState<ConfigState | null>(null);
  const [editedJson, setEditedJson] = useState('');
  const [selectedSection, setSelectedSection] = useState('__full');
  const [sections, setSections] = useState<{ key: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setConfigState(data);
      const jsonStr = JSON.stringify(data.config, null, 2);
      setEditedJson(jsonStr);
      setDirty(false);
      setJsonError(null);

      const keys = Object.keys(data.config || {});
      setSections([
        { key: '__full', label: 'Full Config' },
        ...keys.map((key) => ({ key, label: key })),
      ]);
    } catch (err) {
      toast.error(`Failed to load config: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (!configState) return;
    if (selectedSection === '__full') {
      setEditedJson(JSON.stringify(configState.config, null, 2));
    } else {
      const sectionData = (configState.config as Record<string, unknown>)[selectedSection];
      setEditedJson(JSON.stringify(sectionData ?? {}, null, 2));
    }
    setDirty(false);
    setJsonError(null);
  }, [selectedSection, configState]);

  function handleEditorChange(val: string) {
    setEditedJson(val);
    setDirty(true);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  }

  async function handleSave() {
    if (jsonError) {
      toast.error('Fix JSON syntax errors before saving');
      return;
    }
    if (!configState) return;

    setSaving(true);
    try {
      const parsed = JSON.parse(editedJson);
      const patch = selectedSection === '__full' ? parsed : { [selectedSection]: parsed };

      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch, baseHash: configState.hash }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
        if (errBody.error?.includes('hash') || errBody.error?.includes('conflict')) {
          toast.error('Config was modified externally. Refreshing...');
          await fetchConfig();
          return;
        }
        throw new Error(errBody.error || 'Save failed');
      }

      toast.success('Config saved');
      await fetchConfig();
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'gateway', label: 'Gateway Config', icon: FileCode },
    { id: 'agent-files', label: 'Agent Files', icon: Bot },
  ];

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl tracking-wide text-cyber-cyan text-glow-cyan">
            CONFIGURATION
          </h2>
          <p className="text-cyber-text-muted text-sm mt-1">Gateway config &amp; agent workspace files</p>
        </div>
        {activeTab === 'gateway' && (
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="text-cyber-yellow text-xs font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-yellow" />
                Unsaved changes
              </span>
            )}
            <button
              onClick={fetchConfig}
              disabled={loading}
              className="p-2 rounded text-cyber-text-muted hover:text-cyber-cyan hover:bg-cyber-bg-surface transition-all"
              title="Reload config"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !dirty || !!jsonError}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/20 hover:shadow-glow-cyan transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save size={12} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-cyber-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold transition-all border-b-2 -mb-px
                ${active
                  ? 'text-cyber-cyan border-cyber-cyan bg-cyber-cyan/5'
                  : 'text-cyber-text-muted border-transparent hover:text-cyber-text hover:border-cyber-border'
                }
              `}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="h-[calc(100%-7rem)]">
        {activeTab === 'gateway' ? (
          <div className="flex gap-4 h-full">
            {/* Left: Section tree */}
            <div className="w-56 shrink-0 bg-cyber-bg-secondary border border-cyber-border rounded-lg overflow-y-auto">
              <div className="p-3 border-b border-cyber-border">
                <span className="font-display text-[10px] uppercase tracking-wider text-cyber-text-muted">
                  Sections
                </span>
              </div>
              <div className="p-1">
                {sections.map((section) => {
                  const active = selectedSection === section.key;
                  const Icon = section.key === '__full' ? Settings : ChevronRight;
                  return (
                    <button
                      key={section.key}
                      onClick={() => setSelectedSection(section.key)}
                      className={`
                        w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-mono text-left transition-all
                        ${active
                          ? 'bg-cyber-cyan/10 text-cyber-cyan border-l-2 border-cyber-cyan'
                          : 'text-cyber-text-muted hover:text-cyber-text hover:bg-cyber-bg-surface border-l-2 border-transparent'
                        }
                      `}
                    >
                      <Icon size={12} />
                      <span className="truncate">{section.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Editor */}
            <div className="flex-1 flex flex-col bg-cyber-bg-secondary border border-cyber-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-cyber-border">
                <span className="font-mono text-xs text-cyber-text-muted">
                  {selectedSection === '__full' ? 'config.json' : `config.${selectedSection}.json`}
                </span>
                <div className="flex items-center gap-3">
                  {jsonError && (
                    <span className="text-cyber-red text-[10px] font-mono flex items-center gap-1">
                      <AlertTriangle size={10} />
                      Syntax error
                    </span>
                  )}
                  {configState && (
                    <span className="text-cyber-text-disabled text-[10px] font-mono">
                      hash: {configState.hash.substring(0, 8)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-0">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-cyber-cyan/50 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                ) : (
                  <FileEditor
                    value={editedJson}
                    onChange={handleEditorChange}
                    language="json"
                    onSave={handleSave}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full bg-cyber-bg-secondary border border-cyber-border rounded-lg overflow-hidden">
            <AgentFilesPanel />
          </div>
        )}
      </div>
    </div>
  );
}
