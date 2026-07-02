import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Square, Activity, KeyRound, Upload, PlusCircle, Trash2, AlertTriangle, FileJson, CheckSquare, Square as SquareIcon, LogOut, User, Save, RotateCcw, CreditCard, Lock, X, Copy, RefreshCw, Shield, Edit3, ArrowRight, Clock, Hash, Link } from 'lucide-react';

// --- CONFIGURAÇÃO OBRIGATÓRIA ---
const API_URL = "https://telegram-backend-production-1c72.up.railway.app"; 
const WS_URL = "wss://telegram-backend-production-1c72.up.railway.app/ws";

const APP_NAME = "Painel do Cliente";

const DEFAULT_CONFIG = {
    api_id: "", api_hash: "", bot_token: "", source_channel_id: "",
    post_interval_seconds: 60,
    filter_photos: true, filter_videos: true, filter_gifs: true,
    schedule_enabled: false, schedule_time: "09:00", schedule_daily: true,
    active_channels: [{ num: 1, id: "", limit: 10, caption: "", replacements: [], buttons: [] }]
};

// --- MODAL DE BOTÕES INLINE ---
const ButtonModal = ({ isOpen, onClose, buttons, onSave }) => {
    const [localButtons, setLocalButtons] = useState([]);
    const [btnText, setBtnText] = useState("");
    const [btnUrl, setBtnUrl] = useState("");

    useEffect(() => { if(isOpen) setLocalButtons(buttons || []); }, [isOpen, buttons]);

    if (!isOpen) return null;

    const addButton = () => {
        if (!btnText || !btnUrl) { alert("Preencha o Texto e o Link!"); return; }
        if (!btnUrl.startsWith("http")) { alert("O link deve começar com http:// ou https://"); return; }
        setLocalButtons([...localButtons, { text: btnText, url: btnUrl }]);
        setBtnText(""); setBtnUrl("");
    };

    const removeButton = (idx) => {
        setLocalButtons(localButtons.filter((_, i) => i !== idx));
    };

    const handleSave = () => {
        onSave(localButtons);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4 backdrop-blur-sm">
            <div className="bg-gray-800 p-6 rounded-xl w-full max-w-lg border border-gray-600 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Link className="text-blue-400"/> Botões Embutidos (Inline)</h3>
                
                <div className="flex gap-2 mb-4 items-end">
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-400 block mb-1">Texto</label>
                        <input className="w-full bg-gray-700 p-2 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            placeholder="🚀 O Meu Link" value={btnText} onChange={e => setBtnText(e.target.value)} />
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-400 block mb-1">Link (URL)</label>
                        <input className="w-full bg-gray-700 p-2 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            placeholder="https://t.me/meucanal" value={btnUrl} onChange={e => setBtnUrl(e.target.value)} />
                    </div>
                    <button onClick={addButton} className="bg-green-600 hover:bg-green-500 p-2 rounded text-white mb-0.5"><PlusCircle size={18}/></button>
                </div>

                <div className="max-h-48 overflow-y-auto mb-6 custom-scrollbar space-y-2">
                    {localButtons.map((b, i) => (
                        <div key={i} className="flex justify-between items-center bg-gray-700/50 p-2 rounded border border-gray-600">
                            <span className="text-blue-200 text-sm">{b.text}</span>
                            <button onClick={() => removeButton(i)} className="text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>

                <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded font-bold text-white transition">Salvar Botões</button>
            </div>
        </div>
    );
};

// --- MODAL DE REGRAS ---
const ReplacementModal = ({ isOpen, onClose, rules, onSave }) => {
    const [localRules, setLocalRules] = useState([]);
    const [newOld, setNewOld] = useState("");
    const [newNew, setNewNew] = useState("");

    useEffect(() => { if(isOpen) setLocalRules(rules || []); }, [isOpen, rules]);

    if (!isOpen) return null;

    const handleSave = () => { onSave(localRules); onClose(); };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4 backdrop-blur-sm">
            <div className="bg-gray-800 p-6 rounded-xl w-full max-w-lg border border-gray-600 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>
                <h3 className="text-xl font-bold mb-4 text-white"><Edit3 className="inline mr-2 text-blue-400"/> Regras de Substituição</h3>
                
                <div className="flex gap-2 mb-4 items-end">
                    <input className="w-1/2 bg-gray-700 p-2 rounded text-sm text-white" placeholder="Antigo" value={newOld} onChange={e => setNewOld(e.target.value)} />
                    <input className="w-1/2 bg-gray-700 p-2 rounded text-sm text-white" placeholder="Novo" value={newNew} onChange={e => setNewNew(e.target.value)} />
                    <button onClick={() => {setLocalRules([...localRules, {old: newOld, new: newNew}]); setNewOld(""); setNewNew("");}} className="bg-green-600 p-2 rounded text-white"><PlusCircle size={18}/></button>
                </div>

                <div className="max-h-48 overflow-y-auto mb-6 space-y-2">
                    {localRules.map((r, i) => (
                        <div key={i} className="flex justify-between items-center bg-gray-700/50 p-2 rounded border border-gray-600">
                            <span className="text-gray-300 text-sm">{r.old} → {r.new}</span>
                            <button onClick={() => setLocalRules(localRules.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>

                <button onClick={handleSave} className="w-full bg-blue-600 py-2 rounded font-bold text-white">Salvar Regras</button>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken"));
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [currentChannelIndex, setCurrentChannelIndex] = useState(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (level, msg) => setLogs(prev => [...prev, { level, msg, time: new Date().toLocaleTimeString() }]);

  const updateChannel = (i, field, value) => {
    const newChannels = [...(config.active_channels || [])];
    if (newChannels[i]) {
        newChannels[i] = { ...newChannels[i], [field]: value };
        setConfig({ ...config, active_channels: newChannels });
    }
  };

  const addChannel = () => {
      const current = config.active_channels || [];
      if (current.length < 5) {
          setConfig({...config, active_channels: [...current, { num: current.length + 1, id: "", limit: 10, caption: "", replacements: [], buttons: [] }]});
      }
  };

  const removeChannel = (idx) => {
      setConfig({...config, active_channels: config.active_channels.filter((_, i) => i !== idx).map((c, i) => ({...c, num: i + 1}))});
  };

  if (!authToken) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-sm text-center">
                <h1 className="text-2xl font-bold text-white mb-6">Login</h1>
                <button onClick={() => {setAuthToken("demo"); localStorage.setItem("authToken", "demo");}} className="w-full bg-blue-600 p-3 rounded font-bold text-white">Entrar (Demo)</button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
        <ReplacementModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} rules={config.active_channels[currentChannelIndex]?.replacements || []} onSave={(r) => updateChannel(currentChannelIndex, 'replacements', r)} />
        <ButtonModal isOpen={showButtonModal} onClose={() => setShowButtonModal(false)} buttons={config.active_channels[currentChannelIndex]?.buttons || []} onSave={(b) => updateChannel(currentChannelIndex, 'buttons', b)} />

        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-blue-400"><Activity/> {APP_NAME}</h1>
            
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h2 className="text-lg font-bold mb-4 text-blue-400">Canais Ativos</h2>
                {config.active_channels.map((ch, i) => (
                    <div key={i} className="bg-gray-900 p-4 rounded border border-gray-700 mb-4">
                        <div className="flex gap-2 items-center mb-2">
                            <input className="flex-1 bg-gray-800 p-2 rounded text-sm border border-gray-600" placeholder="ID Canal" value={ch.id} onChange={e => updateChannel(i, 'id', e.target.value)} />
                            <button onClick={() => {setCurrentChannelIndex(i); setShowRulesModal(true);}} className="bg-gray-700 p-2 rounded"><Edit3 size={16}/></button>
                            <button onClick={() => {setCurrentChannelIndex(i); setShowButtonModal(true);}} className="bg-gray-700 p-2 rounded"><Link size={16}/></button>
                            <button onClick={() => removeChannel(i)} className="bg-red-900/50 p-2 rounded text-red-400"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
                <button onClick={addChannel} className="w-full py-2 border border-dashed border-gray-600 rounded text-gray-400">Adicionar Canal</button>
            </div>

            <div className="flex gap-4">
                <button onClick={() => setIsRunning(!isRunning)} className={`flex-1 py-3 rounded font-bold ${isRunning ? 'bg-red-600' : 'bg-green-600'}`}>{isRunning ? 'PARAR' : 'INICIAR'}</button>
                <button onClick={() => {setAuthToken(null); localStorage.removeItem("authToken");}} className="bg-gray-700 px-6 rounded text-white font-bold">Sair</button>
            </div>
        </div>
    </div>
  );
}
