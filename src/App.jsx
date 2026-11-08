import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Square, Activity, KeyRound, Upload, PlusCircle, Trash2, AlertTriangle, FileJson, CheckSquare, Square as SquareIcon, LogOut, User, Save, RotateCcw, CreditCard, Lock, X, Copy, RefreshCw, Shield, Edit3, ArrowRight, Clock, Hash, Link } from 'lucide-react';

// --- CONFIGURAÇÃO OBRIGATÓRIA ---
// Substitua pelos seus links do Railway
const API_URL = "https://activists-arrested-appreciated-bloggers.trycloudflare.com"; 
const WS_URL = "wss://activists-arrested-appreciated-bloggers.trycloudflare.com/ws";

const APP_NAME = "Painel do Cliente";

const DEFAULT_CONFIG = {
    api_id: "", api_hash: "", bot_token: "", source_channel_id: "",
    post_interval_seconds: 60,
    filter_photos: true, filter_videos: true, filter_gifs: true,
    schedule_enabled: false, schedule_time: "09:00", schedule_daily: true,
    active_channels: [{ num: 1, id: "", limit: 10, caption: "", replacements: [], buttons: [] }]
};

// --- ESCUDO DE ERROS (EVITA A TELA BRANCA) ---
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Erro capturado pelo ErrorBoundary:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-10 text-center font-sans">
                    <AlertTriangle size={64} className="text-red-500 mb-4" />
                    <h1 className="text-3xl font-bold mb-2 text-red-400">Ops! Ocorreu um Erro Crítico.</h1>
                    <p className="text-gray-400 mb-6 text-lg">Em vez de ficar com o ecrã branco, o sistema intercetou a falha de renderização.</p>
                    <div className="bg-black p-4 rounded-lg text-left text-sm text-red-300 max-w-4xl w-full overflow-auto border border-red-900 mb-6 max-h-96">
                        <p className="font-bold mb-2">{this.state.error && this.state.error.toString()}</p>
                        <pre className="whitespace-pre-wrap">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
                    </div>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-lg font-bold transition shadow-lg flex items-center gap-2"
                    >
                        <RefreshCw size={18} /> Recarregar Painel
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

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
                
                <div className="bg-gray-900/50 p-3 rounded mb-4 text-xs text-gray-400 border border-gray-700">
                    <p className="mb-1">Crie botões interativos abaixo das imagens.</p>
                    <p className="text-yellow-400">⚠️ Nota: O Telegram dita as cores dos botões de acordo com o tema da aplicação de quem os vê.</p>
                </div>

                <div className="flex gap-2 mb-4 items-end">
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-400 block mb-1">Texto (Pode usar emojis)</label>
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
                    {(localButtons || []).length === 0 && <p className="text-gray-600 text-center text-sm py-4">Nenhum botão criado.</p>}
                    {(localButtons || []).map((b, i) => (
                        <div key={i} className="flex justify-between items-center bg-gray-700/50 p-2 rounded border border-gray-600">
                            <div className="flex items-center gap-3 text-sm overflow-hidden">
                                <span className="bg-blue-900/30 text-blue-200 px-3 py-1 rounded-full border border-blue-800/50 truncate font-medium">{String(b.text)}</span>
                                <span className="text-gray-500 text-xs truncate max-w-[150px]">{String(b.url)}</span>
                            </div>
                            <button onClick={() => removeButton(i)} className="text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>

                <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded font-bold text-white transition">Salvar Botões</button>
            </div>
        </div>
    );
};

// --- MODAL DE REGRAS DE TEXTO ---
const ReplacementModal = ({ isOpen, onClose, rules, onSave }) => {
    const [localRules, setLocalRules] = useState([]);
    const [newOld, setNewOld] = useState("");
    const [newNew, setNewNew] = useState("");

    useEffect(() => { if(isOpen) setLocalRules(rules || []); }, [isOpen, rules]);

    if (!isOpen) return null;

    const addRule = () => {
        if (!newOld) return;
        setLocalRules([...localRules, { old: newOld, new: newNew }]);
        setNewOld(""); setNewNew("");
    };

    const removeRule = (idx) => {
        setLocalRules(localRules.filter((_, i) => i !== idx));
    };

    const handleSave = () => {
        onSave(localRules);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4 backdrop-blur-sm">
            <div className="bg-gray-800 p-6 rounded-xl w-full max-w-lg border border-gray-600 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Edit3 className="text-blue-400"/> Regras de Substituição</h3>
                
                <div className="bg-gray-900/50 p-3 rounded mb-4 text-xs text-gray-400 border border-gray-700">
                    <p className="mb-1">Substitua textos automaticamente na legenda.</p>
                    <p>Dica: Use <code>{'{original_caption}'}</code> na legenda do canal para importar o texto original.</p>
                </div>

                <div className="flex gap-2 mb-4 items-end">
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-400 block mb-1">Texto a encontrar</label>
                        <input className="w-full bg-gray-700 p-2 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            placeholder="@concorrente" value={newOld} onChange={e => setNewOld(e.target.value)} />
                    </div>
                    <ArrowRight className="text-gray-500 mb-2" size={16} />
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-400 block mb-1">Substituir por</label>
                        <input className="w-full bg-gray-700 p-2 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            placeholder="@meucanal" value={newNew} onChange={e => setNewNew(e.target.value)} />
                    </div>
                    <button onClick={addRule} className="bg-green-600 hover:bg-green-500 p-2 rounded text-white mb-0.5"><PlusCircle size={18}/></button>
                </div>

                <div className="max-h-48 overflow-y-auto mb-6 custom-scrollbar space-y-2">
                    {(localRules || []).length === 0 && <p className="text-gray-600 text-center text-sm py-4">Nenhuma regra definida.</p>}
                    {(localRules || []).map((r, i) => (
                        <div key={i} className="flex justify-between items-center bg-gray-700/50 p-2 rounded border border-gray-600">
                            <div className="flex items-center gap-2 text-sm overflow-hidden">
                                <span className="bg-red-900/30 text-red-200 px-2 rounded truncate max-w-[120px]">{String(r.old)}</span>
                                <ArrowRight size={12} className="text-gray-500"/>
                                <span className="bg-green-900/30 text-green-200 px-2 rounded truncate max-w-[120px]">{String(r.new || "(vazio)")}</span>
                            </div>
                            <button onClick={() => removeRule(i)} className="text-gray-400 hover:text-red-400"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>

                <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded font-bold text-white transition">Salvar Regras</button>
            </div>
        </div>
    );
};

// --- MODAL DE ADMINISTRAÇÃO ---
const AdminPanel = ({ isOpen, onClose, authFetch }) => {
    const [tab, setTab] = useState("users");
    const [users, setUsers] = useState([]);
    const [keys, setKeys] = useState({});
    const [daysToAdd, setDaysToAdd] = useState(30);
    const [genQuantity, setGenQuantity] = useState(1);

    useEffect(() => { if (isOpen) { loadUsers(); loadKeys(); } }, [isOpen]);

    const loadUsers = async () => { try { const res = await authFetch("/admin/users"); setUsers(await res.json()); } catch(e) { console.error(e); } };
    const loadKeys = async () => { try { const res = await authFetch("/admin/keys"); setKeys(await res.json()); } catch(e) {} };

    const handleAddTime = async (username) => {
        try {
            const res = await authFetch("/admin/add_time", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, days: parseInt(daysToAdd) })
            });
            if(res.ok) { alert("Tempo adicionado!"); loadUsers(); }
        } catch(e) { alert(e.message); }
    };

    const handleGenKeys = async () => {
        try {
            const res = await authFetch("/admin/generate_keys", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ days: parseInt(daysToAdd), quantity: parseInt(genQuantity) })
            });
            if(res.ok) { alert("Chaves geradas!"); loadKeys(); }
        } catch(e) { alert(e.message); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/95 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-gray-800 w-full max-w-4xl h-[80vh] rounded-xl border border-gray-600 flex flex-col relative shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                    <h2 className="text-2xl font-bold text-red-400 flex items-center gap-2"><Shield/> Administração</h2>
                    <div className="flex gap-2">
                        <button onClick={()=>setTab("users")} className={`px-4 py-2 rounded transition ${tab==="users"?"bg-red-900 text-white":"bg-gray-700 text-gray-400 hover:bg-gray-600"}`}>Utilizadores</button>
                        <button onClick={()=>setTab("keys")} className={`px-4 py-2 rounded transition ${tab==="keys"?"bg-red-900 text-white":"bg-gray-700 text-gray-400 hover:bg-gray-600"}`}>Chaves</button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white"><X size={24}/></button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto p-6 bg-gray-800">
                    {tab === "users" && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-gray-400 border-b border-gray-700 text-sm uppercase">
                                        <th className="p-3">Utilizador</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3">Dias Restantes</th>
                                        <th className="p-3">Adicionar Dias</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(users || []).map(u => (
                                        <tr key={u.username} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                                            <td className="p-3 font-medium text-white">{u.username}</td>
                                            <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${u.active?"bg-green-900/50 text-green-400":"bg-red-900/50 text-red-400"}`}>{u.active?"ATIVO":"EXPIRADO"}</span></td>
                                            <td className="p-3 text-gray-300">{u.days_left} dias</td>
                                            <td className="p-3 flex gap-2 items-center">
                                                <input type="number" className="w-16 bg-gray-900 border border-gray-600 p-1.5 rounded text-sm text-center text-white" value={daysToAdd} onChange={e=>setDaysToAdd(e.target.value)}/>
                                                <button onClick={()=>handleAddTime(u.username)} className="bg-blue-600 px-3 py-1.5 rounded text-xs hover:bg-blue-500 text-white transition">Add</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    {tab === "keys" && (
                        <div>
                            <div className="flex gap-4 mb-6 bg-gray-900/50 p-4 rounded-lg border border-gray-700 items-end">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Duração (Dias)</label>
                                    <input type="number" className="w-24 bg-gray-800 border border-gray-600 p-2 rounded text-white" value={daysToAdd} onChange={e=>setDaysToAdd(e.target.value)}/>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Quantidade</label>
                                    <input type="number" className="w-24 bg-gray-800 border border-gray-600 p-2 rounded text-white" value={genQuantity} onChange={e=>setGenQuantity(e.target.value)}/>
                                </div>
                                <button onClick={handleGenKeys} className="bg-green-600 px-4 py-2 rounded hover:bg-green-500 text-white font-bold h-10 flex items-center gap-2"><PlusCircle size={16}/> Gerar Chaves</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.entries(keys || {}).map(([k, days]) => (
                                    <div key={k} className="bg-gray-900 p-3 rounded border border-gray-700 flex justify-between items-center hover:border-gray-500 transition group">
                                        <code className="text-sm text-yellow-400 font-mono tracking-wider">{k}</code>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 font-bold">{days}d</span>
                                            <button onClick={() => navigator.clipboard.writeText(k)} className="text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition"><Copy size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MODAL DE RENOVAÇÃO ---
const RenewModal = ({ isOpen, onClose, authFetch, refreshStatus, isLocked }) => {
    const [mode, setMode] = useState("select");
    const [key, setKey] = useState("");
    const [pixData, setPixData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [planId, setPlanId] = useState(null);

    useEffect(() => { if(isOpen) { setMode("select"); setPixData(null); setKey(""); setPlanId(null); } }, [isOpen]);

    useEffect(() => {
        let interval;
        if (isOpen && mode === "pix" && pixData && planId) {
            interval = setInterval(async () => {
                try {
                    const check = await authFetch(`/payment/check/${pixData.id}?plan_id=${planId}`);
                    const status = await check.json();
                    if (status.status === "approved") {
                        alert("✅ Pagamento Aprovado! A sua assinatura foi renovada.");
                        refreshStatus(); onClose();
                    }
                } catch(e) {}
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isOpen, mode, pixData, planId]);

    if (!isOpen) return null;

    const handleCreatePix = async (pid) => {
        setLoading(true); setPlanId(pid);
        try {
            const res = await authFetch("/payment/create_pix", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_id: pid })
            });
            const data = await res.json();
            if (res.ok) { setPixData(data); setMode("pix"); } else alert("Erro: " + data.detail);
        } catch (e) { alert("Erro de conexão"); }
        setLoading(false);
    };

    const handleKeyRedeem = async (e) => {
        e.preventDefault(); setLoading(true);
        try {
            const res = await authFetch("/subscription/redeem", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key })
            });
            const data = await res.json();
            if (res.ok) { alert(data.message); refreshStatus(); onClose(); } else alert(data.detail);
        } catch (e) { alert(e.message); }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md border border-gray-600 shadow-2xl relative">
                {!isLocked && <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>}
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><CreditCard className="text-green-500"/> Renovar Assinatura</h3>
                {mode === "select" && (
                    <div className="space-y-3">
                        <button onClick={() => handleCreatePix("mensal")} className="w-full bg-blue-700 hover:bg-blue-600 p-4 rounded-lg flex justify-between items-center transition shadow-lg"><span className="font-medium text-white">Mensal (30 Dias)</span><span className="font-bold bg-blue-900/50 px-2 py-1 rounded text-white">R$ 29,90</span></button>
                        <button onClick={() => handleCreatePix("trimestral")} className="w-full bg-purple-700 hover:bg-purple-600 p-4 rounded-lg flex justify-between items-center transition shadow-lg"><span className="font-medium text-white">Trimestral (90 Dias)</span><span className="font-bold bg-purple-900/50 px-2 py-1 rounded text-white">R$ 79,90</span></button>
                        <div className="border-t border-gray-600 my-4 pt-4"><button onClick={() => setMode("key")} className="w-full bg-gray-700 p-3 rounded text-sm text-gray-300 flex justify-center gap-2 hover:text-white"><KeyRound size={16}/> Tenho uma Chave</button></div>
                    </div>
                )}
                {mode === "pix" && pixData && (
                    <div className="text-center animate-fade-in">
                        <p className="text-yellow-400 font-bold mb-4">Pagamento Pendente</p>
                        <div className="bg-white p-2 rounded inline-block mb-4"><div className="w-48 h-48 flex items-center justify-center bg-gray-100 text-black text-xs p-2 overflow-hidden break-words">{pixData.qr_code_base64 ? <img src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} className="w-full h-full object-contain" alt="QR Code"/> : "QR Indisponível"}</div></div>
                        <p className="text-white text-lg font-bold mb-4">R$ {pixData.amount.toFixed(2)}</p>
                        <button onClick={() => {navigator.clipboard.writeText(pixData.qr_code); alert("Copiado!");}} className="w-full bg-green-600 hover:bg-green-500 py-2 rounded flex items-center justify-center gap-2 font-bold transition text-white mb-2"><Copy size={16}/> Copiar Código Pix</button>
                        <button onClick={() => setMode("select")} className="text-xs text-gray-400 hover:text-white">Voltar</button>
                        <p className="text-xs text-blue-400 mt-4 animate-pulse flex justify-center gap-1"><RefreshCw size={12} className="animate-spin"/> Aguardando confirmação...</p>
                    </div>
                )}
                {mode === "key" && (
                    <form onSubmit={handleKeyRedeem} className="animate-fade-in">
                        <input className="w-full bg-gray-700 p-3 rounded text-white mb-4 text-center font-mono uppercase border border-gray-600 focus:border-green-500 outline-none tracking-widest" placeholder="XXXX-XXXX-XXXX" value={key} onChange={e => setKey(e.target.value)} required />
                        <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded font-bold text-white transition">{loading ? "Validando..." : "Ativar Chave"}</button>
                        <button type="button" onClick={() => setMode("select")} className="w-full mt-3 text-xs text-gray-400 hover:text-white">Voltar</button>
                    </form>
                )}
            </div>
        </div>
    );
};

const PaymentLockScreen = ({ onLogout, onOpenRenew }) => (
  <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-4 bg-opacity-95 backdrop-blur-sm">
    <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center border border-red-900/50">
      <Lock size={48} className="text-red-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">Acesso Expirado</h2>
      <p className="text-gray-400 mb-8">A sua assinatura terminou. Renove para continuar a usar o sistema.</p>
      <div className="space-y-3">
        <button onClick={onOpenRenew} className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded font-bold flex justify-center gap-2"><CreditCard size={18}/> Renovar Agora</button>
        <button onClick={onLogout} className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 py-3 rounded font-medium">Sair</button>
      </div>
    </div>
  </div>
);

// --- COMPONENTE DE LOGIN NO SISTEMA ---
const SystemLogin = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
  
    const handleSubmit = async (e) => {
      e.preventDefault(); setError("");
      if (API_URL.includes("seu-backend-no-railway")) { setError("Configure API_URL no App.jsx!"); return; }
      const endpoint = isRegister ? "/register" : "/token";
      const body = isRegister ? JSON.stringify({ username, password }) : new URLSearchParams({ username, password });
      const headers = isRegister ? { "Content-Type": "application/json" } : { "Content-Type": "application/x-www-form-urlencoded" };
  
      try {
        const res = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers, body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Erro");
        if (isRegister) { setIsRegister(false); setError("Conta criada com 3 dias grátis! Faça login."); }
        else onLogin(data.access_token, data.username);
      } catch (err) { setError(err.message); }
    };
  
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-gray-100">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Activity className="text-blue-500"/> {APP_NAME}</h2>
            <h3 className="text-xl text-white mb-4">{isRegister ? "Criar Nova Conta" : "Acesso ao Sistema"}</h3>
            {error && <div className={`p-3 rounded mb-4 text-sm ${String(error).includes("criada") ? "bg-green-900/30 text-green-200" : "bg-red-900/30 text-red-200"} border border-gray-700`}>{String(error)}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <input className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-white focus:border-blue-500 outline-none" placeholder="Utilizador" value={username} onChange={e => setUsername(e.target.value)} required />
                <input type="password" className="w-full bg-gray-900 border border-gray-700 p-3 rounded text-white focus:border-blue-500 outline-none" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded font-bold transition shadow-lg">{isRegister ? "Criar Conta Grátis" : "Entrar"}</button>
            </form>
            <div className="mt-6 text-center border-t border-gray-700 pt-4">
                <button onClick={() => {setIsRegister(!isRegister); setError("");}} className="text-sm text-gray-400 hover:text-white transition">{isRegister ? "Já tem conta? Entrar" : "Ainda não tem conta? Criar agora"}</button>
            </div>
        </div>
      </div>
    );
};

// --- LOGICA PRINCIPAL DA APLICAÇÃO ---
function MainApp() {
  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken"));
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("currentUser"));
  const [subscription, setSubscription] = useState({ active: true, days_left: 0 }); // Previne bloqueio visual prematuro
  const [isStatusLoaded, setIsStatusLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [currentChannelIndex, setCurrentChannelIndex] = useState(null);

  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("Ocioso");
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  
  const [showLogin, setShowLogin] = useState(false);
  const [loginStep, setLoginStep] = useState(1);
  const [loginData, setLoginData] = useState({ phone: "", code: "", password: "", hash: "" });

  const logEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const profileInputRef = useRef(null);

  useEffect(() => { document.title = APP_NAME; }, []);

  const authFetch = async (endpoint, options = {}) => {
    const headers = { ...options.headers, "Authorization": `Bearer ${authToken}` };
    try {
        const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        if (res.status === 401) { handleLogout(); throw new Error("Sessão expirada."); }
        return res;
    } catch(e) { throw e; }
  };

  const handleSystemLogin = (token, username) => {
    setAuthToken(token); setCurrentUser(username);
    localStorage.setItem("authToken", token); localStorage.setItem("currentUser", username);
  };

  const handleLogout = () => {
    setAuthToken(null); setCurrentUser(null);
    localStorage.removeItem("authToken"); localStorage.removeItem("currentUser");
    setLogs([]); setConfig(DEFAULT_CONFIG); setIsStatusLoaded(false);
  };

  const fetchUserStatus = async () => {
      if(!authToken) return;
      try {
          const res = await authFetch("/user/status");
          const data = await res.json();
          if (res.ok) {
              setSubscription(data.subscription || { active: false, days_left: 0 });
              setIsAdmin(data.username === "admin");
          }
      } catch (e) {}
      finally { setIsStatusLoaded(true); }
  };

  useEffect(() => {
    if (authToken && !API_URL.includes("seu-backend")) {
        fetchUserStatus();
        authFetch("/profile").then(r=>r.json()).then(d=>{ 
            if(d && (d.api_id || (d.active_channels && d.active_channels.length > 0))) { 
                setConfig(p => ({...p, ...d})); 
            } 
        }).catch(()=>{});
        
        const ws = new WebSocket(`${WS_URL}/${authToken}`);
        ws.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data);
                if (d.type==="log") setLogs(p => [...(p || []), { level: d.level, msg: d.message, time: new Date().toLocaleTimeString() }]);
                else if (d.type==="status") setStatus(d.status || "Ocioso");
            } catch {}
        };
        ws.onclose = (e) => { if(e.code===1008) handleLogout(); };
        return () => ws.close();
    }
  }, [authToken]);

  useEffect(() => {
      try { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); } catch(e){}
  }, [logs]);
  
  const addLog = (level, msg) => setLogs(prev => [...(prev || []), { level, msg, time: new Date().toLocaleTimeString() }]);

  const handleSetStartId = async () => {
      if(isRunning) { alert("Pare o bot primeiro!"); return; }
      const idStr = prompt("Digite o ID da mensagem para começar (Ex: 2730):");
      if (!idStr) return;
      const id = parseInt(idStr);
      if (isNaN(id)) { alert("Número inválido!"); return; }

      try {
          const res = await authFetch("/set_start_id", { 
              method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start_id: id })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail);
          addLog("SUCCESS", data.message);
      } catch (e) { addLog("ERROR", e.message); }
  };

  const handleSaveProfile = async () => { try { await authFetch("/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) }); addLog("SUCCESS", "Perfil salvo!"); } catch(e) { addLog("ERROR", "Erro ao salvar."); } };
  
  const handleStart = async () => {
      if (!subscription?.active || subscription?.days_left <= 0) { alert("Assinatura expirada!"); return; }
      try {
          setIsRunning(true);
          const payload = { 
              ...config, 
              source_channel_id: parseInt(config.source_channel_id) || 0,
              post_interval_seconds: parseInt(config.post_interval_seconds) || 60,
              active_channels: (config.active_channels || []).map(ch => ({ 
                  ...ch, id: parseInt(ch.id)||0, limit: parseInt(ch.limit)||0 
              })) 
          };
          const res = await authFetch(`/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          if (!res.ok) { const err = await res.json(); throw new Error(err.detail); }
      } catch (e) { addLog("ERROR", e.message); setIsRunning(false); }
  };

  const handleStop = async () => { try { await authFetch(`/stop`, { method: "POST" }); setIsRunning(false); } catch (e) { addLog("ERROR", "Erro ao parar."); } };
  const handleResetHistory = async () => { if(isRunning) { alert("Pare o bot!"); return; } if(!confirm("Resetar?")) return; try { await authFetch("/reset_history", { method: "POST" }); addLog("SUCCESS", "Resetado!"); } catch(e) {} };
  
  const handleProfileLoadClick = () => profileInputRef.current.click();
  const handleProfileFileChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            const newChannels = [];
            for (let i = 1; i <= 5; i++) {
                if (data[`enable_channel_${i}`] === true) {
                    newChannels.push({ num: i, id: parseInt(data[`destination_channel_id_${i}`]) || "", limit: parseInt(data[`daily_limit_channel_${i}`]) || 10, caption: data[`custom_caption_${i}`] || "", replacements: [], buttons: [] });
                }
            }
            if (newChannels.length === 0) newChannels.push({ num: 1, id: "", limit: 10, caption: "", replacements: [], buttons: [] });
            setConfig(prev => ({
                ...prev, 
                api_id: parseInt(data.api_id) || prev.api_id, api_hash: data.api_hash || prev.api_hash, bot_token: data.bot_token || prev.bot_token, source_channel_id: parseInt(data.source_channel_id) || prev.source_channel_id, post_interval_seconds: parseInt(data.post_interval_seconds) || 60, 
                filter_photos: data.filter_photos !== false, filter_videos: data.filter_videos !== false, filter_gifs: data.filter_gifs !== false, 
                schedule_enabled: data.schedule_enabled === true, schedule_time: data.schedule_time || "09:00", schedule_daily: data.schedule_daily !== false,
                active_channels: newChannels 
            }));
            addLog("SUCCESS", "Perfil importado!");
        } catch(err) { addLog("ERROR", "Erro no JSON."); }
    };
    reader.readAsText(file); e.target.value = null;
  };
  
  const handleImportHistoryClick = () => fileInputRef.current.click();
  const handleHistoryFileChange = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append("file", file);
    try {
      addLog("INFO", "A enviar histórico...");
      const res = await authFetch(`/upload_history`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      addLog("SUCCESS", `Histórico importado! ID: ${data.last_id}`);
    } catch (e) { addLog("ERROR", e.message); }
    event.target.value = null;
  };

  const handleLoginSubmit = async () => {
    try {
        let res, data;
        if (loginStep === 1) {
            res = await authFetch(`/auth/request_code`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: loginData.phone, api_id: parseInt(config.api_id), api_hash: config.api_hash }) });
            data = await res.json(); if (!res.ok) throw new Error(data.detail);
            if (data.status === "code_sent") { setLoginData({ ...loginData, hash: data.hash }); setLoginStep(2); addLog("INFO", "Código enviado."); }
            else if (data.status === "authorized") { alert("Já autenticado!"); setShowLogin(false); addLog("SUCCESS", "Autenticado."); }
        } else if (loginStep === 2) {
            res = await authFetch(`/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: loginData.phone, code: loginData.code, phone_code_hash: loginData.hash }) });
            data = await res.json(); if (!res.ok) throw new Error(data.detail);
            if (data.status === "success") { setShowLogin(false); addLog("SUCCESS", "Login Sucesso!"); }
            else if (data.status === "2fa_required") setLoginStep(3);
        } else if (loginStep === 3) {
            res = await authFetch(`/auth/2fa`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: loginData.password }) });
            data = await res.json(); if (!res.ok) throw new Error(data.detail);
            if (data.status === "success") { setShowLogin(false); addLog("SUCCESS", "Login 2FA Sucesso!"); }
        }
    } catch (e) { alert(e.message); addLog("ERROR", e.message); }
  };

  // --- ATUALIZAÇÕES DE ESTADO SEGURAS E IMUTÁVEIS ---
  const updateChannel = (i, f, v) => { 
      setConfig(prev => {
          const newChannels = [...(prev.active_channels || [])];
          if (newChannels[i]) {
              newChannels[i] = { ...newChannels[i], [f]: v };
          }
          return { ...prev, active_channels: newChannels };
      });
  };
  
  const addChannel = () => { 
      setConfig(prev => {
          const currentChannels = prev.active_channels || [];
          if (currentChannels.length >= 5) return prev;
          return {
              ...prev,
              active_channels: [
                  ...currentChannels,
                  { num: currentChannels.length + 1, id: "", limit: 10, caption: "", replacements: [], buttons: [] }
              ]
          };
      });
  };
  
  const removeChannel = (idx) => { 
      setConfig(prev => {
          const currentChannels = prev.active_channels || [];
          const newChannels = currentChannels
              .filter((_, i) => i !== idx)
              .map((c, i) => ({ ...c, num: i + 1 }));
          return { ...prev, active_channels: newChannels };
      });
      
      if (currentChannelIndex === idx) setCurrentChannelIndex(null);
      else if (currentChannelIndex !== null && currentChannelIndex > idx) setCurrentChannelIndex(currentChannelIndex - 1);
  };
  
  const openRulesModal = (index) => { setCurrentChannelIndex(index); setShowRulesModal(true); };
  const saveRules = (newRules) => { if (currentChannelIndex !== null) updateChannel(currentChannelIndex, 'replacements', newRules); };

  const openButtonModal = (index) => { setCurrentChannelIndex(index); setShowButtonModal(true); };
  const saveButtons = (newButtons) => { if (currentChannelIndex !== null) updateChannel(currentChannelIndex, 'buttons', newButtons); };

  // --- RENDERIZAÇÃO PRINCIPAL ---
  if (!authToken) return <SystemLogin onLogin={handleSystemLogin} />;
  
  // Ecrã de carregamento enquanto valida subscrição
  if (!isStatusLoaded) return <div className="min-h-screen bg-gray-900 flex items-center justify-center flex-col gap-4"><Activity className="text-blue-500 animate-spin" size={48}/><span className="text-gray-400 animate-pulse">A carregar...</span></div>;
  
  // Ecrã de bloqueio se expirar
  if (!subscription?.active || subscription?.days_left <= 0) return <PaymentLockScreen onLogout={handleLogout} onOpenRenew={() => setShowRenewModal(true)} />;

  // Variável segura para mapear canais sem crash
  const channelsToRender = config?.active_channels || [];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-6">
      <RenewModal isOpen={showRenewModal} onClose={() => setShowRenewModal(false)} authFetch={authFetch} refreshStatus={fetchUserStatus} isLocked={false} />
      <AdminPanel isOpen={showAdminModal} onClose={() => setShowAdminModal(false)} authFetch={authFetch} />
      
      {/* Modais seguros (uso de optional chaining para prevenir crash se a lista for recriada) */}
      <ReplacementModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} rules={channelsToRender[currentChannelIndex]?.replacements || []} onSave={saveRules} />
      <ButtonModal isOpen={showButtonModal} onClose={() => setShowButtonModal(false)} buttons={channelsToRender[currentChannelIndex]?.buttons || []} onSave={saveButtons} />
      
      <div className="max-w-6xl mx-auto mb-6 bg-gray-800 rounded-lg p-3 flex justify-between items-center border border-gray-700 shadow-md">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><Activity className="text-blue-500"/> <span className="font-bold text-lg">{APP_NAME}</span></div>
            <div className="h-6 w-px bg-gray-600 mx-2"></div>
            <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Plano:</span>
                <span className="text-green-400 font-bold bg-green-900/30 px-2 py-0.5 rounded flex items-center gap-1"><CheckSquare size={12}/> Ativo</span>
                <span className="text-gray-500 text-xs">({subscription?.days_left || 0} dias restantes)</span>
            </div>
        </div>
        <div className="flex items-center gap-4">
            {isAdmin && <button onClick={() => setShowAdminModal(true)} className="text-xs bg-red-800 hover:bg-red-700 px-3 py-1 rounded flex gap-2 transition items-center font-medium"><Shield size={14}/> Admin</button>}
            <button onClick={() => setShowRenewModal(true)} className="text-xs bg-green-700 hover:bg-green-600 px-3 py-1 rounded flex gap-2 transition items-center font-medium shadow-md shadow-green-900/20"><CreditCard size={14}/> Renovar</button>
            <div className="h-6 w-px bg-gray-600"></div>
            <span className="text-gray-400 text-sm flex gap-2 items-center bg-gray-700/50 px-3 py-1 rounded"><User size={14}/> {currentUser}</span>
            <button onClick={handleLogout} className="bg-red-900/50 hover:bg-red-900 text-red-200 px-3 py-1 rounded text-sm flex gap-2 transition items-center"><LogOut size={14}/> Sair</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 h-fit">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-blue-400">Configuração do Robô</h2>
                <div className="flex gap-2">
                    <input type="file" ref={profileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleProfileFileChange} />
                    <button onClick={handleProfileLoadClick} className="text-xs bg-gray-700 px-3 py-1.5 rounded flex gap-2 border border-gray-600 hover:bg-gray-600 transition items-center" title="Importar JSON Desktop"><FileJson size={14} /> Importar</button>
                    <button onClick={handleSaveProfile} className="text-xs bg-blue-900/50 hover:bg-blue-800 px-3 py-1.5 rounded flex gap-2 border border-blue-800 transition items-center" title="Salvar na Nuvem"><Save size={14} /> Salvar</button>
                </div>
            </div>
            
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs text-gray-400 block mb-1">API ID</label><input type="number" className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-sm focus:border-blue-500 focus:outline-none" value={config?.api_id || ""} onChange={e=>setConfig(prev=>({...prev, api_id: e.target.value}))}/></div>
                    <div><label className="text-xs text-gray-400 block mb-1">API Hash</label><input type="password" className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-sm focus:border-blue-500 focus:outline-none" value={config?.api_hash || ""} onChange={e=>setConfig(prev=>({...prev, api_hash: e.target.value}))}/></div>
                </div>
                <div><label className="text-xs text-gray-400 block mb-1">Bot Token</label><input className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-sm focus:border-blue-500 focus:outline-none" value={config?.bot_token || ""} onChange={e=>setConfig(prev=>({...prev, bot_token: e.target.value}))}/></div>
                
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-start mb-3">
                        <label className="text-sm font-semibold text-yellow-400">Origem</label>
                        <div className="flex gap-2">
                            {['photos', 'videos', 'gifs'].map(t => (
                                <button key={t} onClick={()=>setConfig(prev=>({...prev, [`filter_${t}`]: !prev[`filter_${t}`]}))} className={`text-[10px] px-2 py-0.5 rounded border ${config?.[`filter_${t}`] ? 'bg-green-900/30 border-green-800 text-green-300':'bg-gray-800 border-gray-700 text-gray-500'}`}>
                                    {t.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <input placeholder="ID Canal Origem (-100...)" className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-sm mb-4 focus:border-yellow-500 focus:outline-none" value={config?.source_channel_id || ""} onChange={e=>setConfig(prev=>({...prev, source_channel_id: parseInt(e.target.value)||""}))}/>
                    
                    <div className="mb-4 bg-gray-800/50 p-3 rounded border border-gray-600/50">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={12}/> Agendamento Automático</label>
                            <button onClick={()=>setConfig(prev=>({...prev, schedule_enabled: !prev.schedule_enabled}))} className={`w-8 h-4 rounded-full transition relative ${config?.schedule_enabled ? "bg-green-600":"bg-gray-600"}`}>
                                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${config?.schedule_enabled ? "right-0.5":"left-0.5"}`}></div>
                            </button>
                        </div>
                        {config?.schedule_enabled && (
                            <div className="flex gap-2 items-center mb-3 animate-fade-in">
                                <input type="time" className="bg-gray-900 border border-gray-600 text-white text-xs rounded p-1" value={config?.schedule_time || "09:00"} onChange={e=>setConfig(prev=>({...prev, schedule_time: e.target.value}))}/>
                                <label className="text-[10px] text-gray-400 flex items-center gap-1 cursor-pointer">
                                    <div onClick={()=>setConfig(prev=>({...prev, schedule_daily: !prev.schedule_daily}))} className={`w-3 h-3 border rounded-sm flex items-center justify-center ${config?.schedule_daily ? "bg-blue-600 border-blue-600":"border-gray-500"}`}>
                                        {config?.schedule_daily && <CheckSquare size={10} className="text-white"/>}
                                    </div>
                                    Repetir Diariamente
                                </label>
                            </div>
                        )}
                        <label className="text-[10px] text-gray-400 block mb-1">Intervalo entre Posts (segundos)</label>
                        <input type="number" className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-sm focus:border-blue-500 focus:outline-none" value={config?.post_interval_seconds ?? 60} onChange={e=>setConfig(prev=>({...prev, post_interval_seconds: parseInt(e.target.value)||60}))}/>
                    </div>

                    <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                        {channelsToRender.map((ch, i) => (
                            <div key={i} className="bg-gray-800 p-3 rounded border border-gray-600 relative group">
                                <div className="flex gap-2 items-end mb-2">
                                    <div className="flex-1"><label className="text-[10px] text-gray-400 font-bold block mb-1">Destino {ch.num}</label><input className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-xs focus:border-green-500 focus:outline-none" placeholder={`ID Canal ${ch.num}`} value={ch.id || ""} onChange={e=>updateChannel(i,'id',e.target.value)}/></div>
                                    <div className="w-16"><label className="text-[10px] text-gray-400 block mb-1">Limite</label><input type="number" className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-xs text-center focus:border-green-500 focus:outline-none" value={ch.limit || 10} onChange={e=>updateChannel(i,'limit',e.target.value)}/></div>
                                    {channelsToRender.length > 1 && <button onClick={()=>removeChannel(i)} className="h-[34px] w-[34px] flex items-center justify-center bg-red-900/20 text-red-500 border border-red-900/30 rounded hover:bg-red-900/50 transition"><Trash2 size={16}/></button>}
                                </div>
                                <textarea className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-xs focus:border-blue-500 focus:outline-none min-h-[60px] mb-2" placeholder={`Legenda personalizada... {filename}`} value={ch.caption || ""} onChange={e=>updateChannel(i,'caption',e.target.value)}/>
                                <div className="flex gap-2">
                                    <button onClick={() => openRulesModal(i)} className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 border border-gray-600 flex justify-center items-center gap-1 transition">
                                        <Edit3 size={12}/> Regras
                                    </button>
                                    <button onClick={() => openButtonModal(i)} className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 border border-gray-600 flex justify-center items-center gap-1 transition">
                                        <Link size={12}/> Botões
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {channelsToRender.length < 5 && <button onClick={addChannel} className="mt-3 w-full py-2 border border-dashed border-gray-500 text-gray-400 rounded hover:bg-gray-800 text-xs flex justify-center items-center gap-1 transition"><PlusCircle size={14}/> Adicionar Canal</button>}
                </div>
                
                <div className="flex gap-2 pt-2">
                    <button onClick={()=>setShowLogin(true)} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded font-medium flex justify-center items-center gap-2 text-sm transition shadow-lg shadow-blue-900/20"><KeyRound size={16}/> Autenticar Telegram</button>
                    <input type="file" ref={fileInputRef} style={{display:'none'}} accept=".json" onChange={handleHistoryFileChange} />
                    <button onClick={handleImportHistoryClick} className="flex-1 bg-purple-600 hover:bg-purple-500 py-2.5 rounded font-medium flex justify-center items-center gap-2 text-sm transition shadow-lg shadow-purple-900/20"><Upload size={16}/> Histórico</button>
                    
                    <div className="flex gap-1">
                        <button onClick={handleResetHistory} className="bg-red-900/30 hover:bg-red-900/50 text-red-300 py-2.5 px-3 rounded font-medium flex justify-center items-center gap-2 text-sm transition border border-red-900/50" title="Resetar Histórico"><RotateCcw size={16}/></button>
                        <button onClick={handleSetStartId} className="bg-gray-700 hover:bg-gray-600 text-gray-300 py-2.5 px-3 rounded font-medium flex justify-center items-center gap-2 text-sm transition border border-gray-600" title="Definir ID Manualmente"><Hash size={16}/></button>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col h-[600px] sticky top-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-green-400"><Terminal size={20} /> Atividades</h2>
            <div className="flex items-center gap-2">
                {API_URL.includes("seu-backend") && <AlertTriangle className="text-yellow-500" size={20}/>}
                <span className={`text-xs px-2 py-1 rounded border ${status === "Ocioso" ? "bg-gray-700 text-gray-400 border-gray-600" : "bg-green-900/30 text-green-400 border-green-800"}`}>Status: {status}</span>
            </div>
          </div>
          <div className="flex-1 bg-gray-950 rounded-lg p-4 font-mono text-xs overflow-y-auto mb-4 border border-gray-700 shadow-inner">
            {(logs || []).length === 0 && <div className="text-gray-600 text-center mt-20">O sistema está pronto.<br/>Configure e clique em INICIAR.</div>}
            {(logs || []).map((l, i) => (
                <div key={i} className="mb-1.5 border-b border-gray-900/50 pb-1 last:border-0">
                    <span className="text-gray-500 select-none">[{String(l?.time || "")}]</span> 
                    <span className={l?.level==="ERROR"?"text-red-400 font-bold":l?.level==="SUCCESS"?"text-green-400 font-bold":l?.level==="WARNING"?"text-yellow-400":"text-blue-300"}>
                        {l?.level==="INFO"?"ℹ":l?.level==="SUCCESS"?"✔":l?.level==="WARNING"?"⚠️":l?.level==="ERROR"?"✖":"⚙"}
                    </span> 
                    <span className="text-gray-300 ml-1">{l?.msg ? String(l.msg) : ""}</span>
                </div>
            ))}
            <div ref={logEndRef} />
          </div>
          <div className="flex gap-4">
            <button onClick={handleStart} disabled={isRunning} className={`flex-1 py-3 rounded-lg font-bold flex justify-center items-center gap-2 shadow-lg transition transform active:scale-95 ${isRunning?'bg-gray-700 text-gray-500 cursor-not-allowed':'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-green-900/20'}`}><Play size={18}/> INICIAR TAREFA</button>
            <button onClick={handleStop} disabled={!isRunning} className={`flex-1 py-3 rounded-lg font-bold flex justify-center items-center gap-2 shadow-lg transition transform active:scale-95 ${!isRunning?'bg-gray-700 text-gray-500 cursor-not-allowed':'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-red-900/20'}`}><Square size={18}/> PARAR</button>
          </div>
        </div>
      </div>
      
      {/* Modal de Login Telegram */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md border border-gray-600 shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-2"><KeyRound className="text-blue-500"/> Autenticação Telegram</h3>
            {loginStep === 1 && <input className="w-full bg-gray-700 p-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="+351..." value={loginData.phone} onChange={e=>setLoginData({...loginData, phone:e.target.value})}/>}
            {loginStep === 2 && <input className="w-full bg-gray-700 p-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Código (ex: 12345)" value={loginData.code} onChange={e=>setLoginData({...loginData, code:e.target.value})}/>}
            {loginStep === 3 && <input type="password" className="w-full bg-gray-700 p-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Senha 2FA (Se houver)" value={loginData.password} onChange={e=>setLoginData({...loginData, password:e.target.value})}/>}
            <div className="flex justify-end gap-3 mt-4">
                <button onClick={()=>setShowLogin(false)} className="px-4 py-2 text-gray-400 hover:text-white transition">Cancelar</button>
                <button onClick={handleLoginSubmit} className="bg-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-500 transition shadow-lg shadow-blue-900/20">{loginStep===1 ? "Enviar Código" : "Confirmar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// O App real é "agarrado" pelo ErrorBoundary
export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
