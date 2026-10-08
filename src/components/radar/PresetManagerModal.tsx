import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Save,
  Trash2,
  Check,
  Bookmark,
  Layers,
  ArrowRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { RadarPreset, ConditionGroup, RankingWeights } from '../../types.ts';
import { apiClient } from '../../services/apiClient.ts';

interface PresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRules: ConditionGroup;
  currentWeights?: RankingWeights;
  onSelectPreset: (preset: RadarPreset) => void;
}

export const PresetManagerModal: React.FC<PresetManagerModalProps> = ({
  isOpen,
  onClose,
  currentRules,
  currentWeights,
  onSelectPreset
}) => {
  const [presets, setPresets] = useState<RadarPreset[]>([]);
  const [activeTab, setActiveTab] = useState<'BROWSE' | 'SAVE'>('BROWSE');
  const [name, setName] = useState('');
  const [nameZh, setNameZh] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchPresets = () => {
    apiClient.getRadarPresets().then((res) => {
      if (res.success) {
        setPresets(res.presets);
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      fetchPresets();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await apiClient.saveRadarPreset({
        name,
        nameZh: nameZh || name,
        description: description || '自定义量化筛选器模板',
        mode: 'PRO',
        profileType: 'CUSTOM',
        rules: currentRules,
        rankingWeights: currentWeights
      });
      fetchPresets();
      setActiveTab('BROWSE');
      setName('');
      setNameZh('');
      setDescription('');
    } catch (err) {
      console.error('Failed to save custom preset:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该自定义预设吗？')) return;
    try {
      await apiClient.deleteRadarPreset(id);
      fetchPresets();
    } catch (err) {
      console.error('Failed to delete preset:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">策略模板中心 (Strategy Presets)</h2>
              <p className="text-xs text-slate-400">15套商业机构级实盘预设 · 覆盖短线波段、极度超跌、放量突破与机构动能</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('BROWSE')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeTab === 'BROWSE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                浏览预设 ({presets.length})
              </button>
              <button
                onClick={() => setActiveTab('SAVE')}
                className={`px-3 py-1 rounded-md transition-all ${
                  activeTab === 'SAVE' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                保存当前规则
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {activeTab === 'BROWSE' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {presets.map((preset) => {
                const conditionCount = preset.rules?.children?.length || 0;
                return (
                  <div
                    key={preset.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-850/60 hover:border-indigo-500/50 hover:bg-slate-800/40 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors">
                          {preset.nameZh || preset.name}
                        </span>
                        {preset.isSystem ? (
                          <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] rounded-full font-bold">
                            系统内置
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] rounded-full font-bold">
                            自定义
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">{preset.name}</div>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {conditionCount} 条过滤规则
                      </span>

                      <div className="flex items-center gap-2">
                        {!preset.isSystem && (
                          <button
                            onClick={() => handleDelete(preset.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
                            title="删除自定义预设"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onSelectPreset(preset);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                        >
                          <span>载入此模板</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleSave} className="max-w-lg mx-auto space-y-4 py-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">模板英文标识 (Key Name)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Breakout Alpha V1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">中文显示名称 (Display Name)</label>
                <input
                  type="text"
                  placeholder="e.g. 我的自用放量回踩组合"
                  value={nameZh}
                  onChange={(e) => setNameZh(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">描述说明 (Description)</label>
                <textarea
                  rows={3}
                  placeholder="说明该预设的适用市场环境、核心理念与持仓周期..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400">
                当前包含: <strong className="text-indigo-300">{currentRules?.children?.length || 0}</strong> 条已激活过滤规则，将完整固化到数据库中。
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? '正在保存...' : '确认保存到预设库'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
