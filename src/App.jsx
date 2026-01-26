import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Square, Activity, KeyRound, Upload, PlusCircle, Trash2, AlertTriangle, FileJson, CheckSquare, Square as SquareIcon, LogOut, User, Save, RotateCcw, CreditCard, Lock, X, Copy, RefreshCw } from 'lucide-react';

// --- CONFIGURAÇÃO OBRIGATÓRIA ---
// ⚠️ ATENÇÃO: SUBSTITUA PELO SEU LINK DO RAILWAY!
const API_URL = "https://telegram-backend-production-1c72.up.railway.app"; 
const WS_URL = "wss://telegram-backend-production-1c72.up.railway.app/ws";

const APP_NAME = "Painel do Cliente"; // Título na aba do navegador

const DEFAULT_CONFIG = {
    api_id: "", api_hash: "", bot_token: "", source_channel_id: "",
    post_interval_seconds: 60,
    filter_photos: true, filter_videos: true, filter_gifs: true,
    active_channels: [{ num: 1, id: "", limit: 10, caption: "" }]
};

// --- MODAL DE RENOVAÇÃO (PIX + CHAVE) ---
const RenewModal = ({ isOpen, onClose, authFetch, refreshStatus, isLocked }) => {
    const [mode, setMode] = useState("select"); // select, pix, key
    const [key, setKey] = useState("");
    const [pixData, setPixData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Limpa estado ao fechar/abrir
    useEffect(() => { if(isOpen) { setMode("select"); setPixData(null); setKey(""); } }, [isOpen]);

    if (!isOpen) return null;

    const handleCreatePix = async (planId) => {
        setLoading(true);
        try {
            const res = await authFetch("/payment/create_pix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan_id: planId })
            });
            const data = await res.json();
            if (res.ok) {
                setPixData(data);
                setMode("pix");
                // Polling para verificar pagamento
                const interval = setInterval(async () => {
                    if (!isOpen) clearInterval(interval);
                    try {
                        const check = await authFetch(`/payment/check/${data.id}?plan_id=${planId}`);
                        const status = await check.json();
                        if (status.status === "approved") {
                            clearInterval(interval);
                            alert("✅ Pagamento Aprovado! Dias adicionados com sucesso.");
                            refreshStatus();
                            onClose();
                        }
                    } catch(e) {}
                }, 5000);
            } else alert("Erro: " + data.detail);
        } catch (e) { alert("Erro de conexão: " + e.message); }
        setLoading(false);
    };

    const handleKeyRedeem = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await authFetch("/subscription/redeem", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key })
            });
            const data = await res.json();
            if (res.ok) { alert(data.message); refreshStatus(); onClose(); }
            else alert(data.detail);
        } catch (e) { alert(e.message); }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md border border-gray-600 shadow-2xl relative">
                {!isLocked && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>
                )}
                
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                    <CreditCard className="text-green-500"/> Renovar Assinatura
                </h3>

                {mode === "select" && (
                    <div className="space-y-3">
                        <button onClick={() => handleCreatePix("mensal")} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 p-4 rounded-lg text-left flex justify-between items-center transition shadow-lg border border-blue-500/30">
                            <span className="font-medium">Mensal (30 Dias)</span>
                            <span className="font-bold bg-blue-900/50 px-2 py-1 rounded">R$ 29,90</span>
                        </button>
                        <button onClick={() => handleCreatePix("trimestral")} className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 p-4 rounded-lg text-left flex justify-between items-center transition shadow-lg border border-purple-500/30">
                            <span className="font-medium">Trimestral (90 Dias)</span>
                            <span className="font-bold bg-purple-900/50 px-2 py-1 rounded">R$ 79,90</span>
                        </button>
                        
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-600"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-800 text-gray-500">ou</span></div>
                        </div>

                        <button onClick={() => setMode("key")} className="w-full bg-gray-700 hover:bg-gray-600 p-3 rounded text-sm text-gray-300 flex justify-center items-center gap-2 transition">
                            <KeyRound size={16}/> Tenho uma Chave de Licença
                        </button>
                    </div>
                )}

                {mode === "pix" && pixData && (
                    <div className="text-center">
                        <p className="text-yellow-400 font-bold mb-4 text-lg">Pagamento Pendente</p>
                        <div className="bg-white p-2 rounded inline-block mb-4 shadow-inner">
                           {/* Aqui seria ideal usar uma lib QR Code React, mas para simplicidade usamos uma div */}
                           <div className="w-48 h-48 flex items-center justify-center bg-gray-100 text-black text-xs p-4 break-words overflow-hidden relative">
                                {pixData.qr_code_base64 ? 
                                    <img src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} alt="QR Code" className="w-full h-full object-contain" /> :
                                    <span className="text-center">QR Code Base64 indisponível.<br/>Use o Copia e Cola abaixo.</span>
                                }
                           </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-2 font-medium">Valor: <span className="text-white">R$ {pixData.amount.toFixed(2)}</span></p>
                        
                        <div className="relative mb-4">
                            <input readOnly value={pixData.qr_code} className="w-full bg-gray-900 p-3 rounded text-xs text-gray-300 font-mono border border-gray-700 pr-10" />
                            <button onClick={() => {navigator.clipboard.writeText(pixData.qr_code); alert("Código Copiado!");}} className="absolute right-2 top-2 text-gray-400 hover:text-white" title="Copiar">
                                <Copy size={16}/>
                            </button>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <button onClick={() => {navigator.clipboard.writeText(pixData.qr_code); alert("Copiado!");}} className="w-full bg-green-600 hover:bg-green-500 py-2 rounded flex items-center justify-center gap-2 font-bold transition">
                                <Copy size={16}/> Copiar Código Pix
                            </button>
                            <button onClick={() => setMode("select")} className="text-xs text-gray-500 hover:text-gray-300 mt-2">Cancelar / Voltar</button>
                        </div>
                        <p className="text-xs text-blue-400 mt-4 animate-pulse flex items-center justify-center gap-1"><RefreshCw size={12} className="animate-spin"/> A aguardar confirmação do banco...</p>
                    </div>
                )}

                {mode === "key" && (
                    <form onSubmit={handleKeyRedeem}>
                        <label className="text-xs text-gray-400 block mb-2 text-left">Chave de 30 ou 90 dias</label>
                        <input className="w-full bg-gray-700 p-3 rounded text-white mb-4 text-center font-mono uppercase tracking-widest border border-gray-600 focus:border-green-500 focus:outline-none" placeholder="XXXX-XXXX-XXXX" value={key} onChange={e => setKey(e.target.value)} required />
                        <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded font-bold transition">{loading ? "A Validar..." : "Ativar Chave"}</button>
                        <button type="button" onClick={() => setMode("select")} className="w-full mt-3 text-xs text-gray-400 hover:text-white">Voltar</button>
                    </form>
                )}
            </div>
        </div>
    );
};

// --- COMPONENTE DE BLOQUEIO DE PAGAMENTO ---
const PaymentLockScreen = ({ onLogout, onOpenRenew }) => (
  <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-4 bg-opacity-95 backdrop-blur-sm">
    <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center border border-red-900/50">
      <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-red-900/10">
        <Lock size={40} className="text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Acesso Expirado</h2>
      <p className="text-gray-400 mb-8 leading-relaxed">
        O seu período de subscrição terminou. Para continuar a automatizar os seus canais, renove o seu plano agora.
      </p>
      <div className="space-y-3">
        <button onClick={onOpenRenew} className="w-full bg-green-600 hover:bg-green-500 text-white py-3.5 rounded-lg font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-green-900/20">
          <CreditCard size={18} /> Renovar Acesso
        </button>
        <button onClick={onLogout} className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 py-3.5 rounded-lg font-medium transition">
          Entrar com outra conta
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-6">Precisa de ajuda? Contacte o suporte no Telegram.</p>
    </div>
  </div>
);

// --- COMPONENTE DE LOGIN ---
const SystemLogin = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (API_URL.includes("seu-backend-no-railway")) {
        setError("ERRO CRÍTICO: API_URL não configurada no App.jsx!");
        return;
    }

    const endpoint = isRegister ? "/register" : "/token";
    const body = isRegister 
      ? JSON.stringify({ username, password })
      : new URLSearchParams({ username, password });
    const headers = isRegister ? { "Content-Type": "application/json" } : { "Content-Type": "application/x-www-form-urlencoded" };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro de conexão");
      if (isRegister) { setIsRegister(false); setError("Conta criada com sucesso! Ganhou 3 dias de teste."); }
      else onLogin(data.access_token, data.username);
    } catch (err) { setError("Falha: " + err.message); }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-gray-100">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        
        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          <Activity className="text-blue-500"/> {APP_NAME}
        </h2>
        <p className="text-gray-500 text-sm mb-6">Automação inteligente para Telegram</p>
        
        {API_URL.includes("seu-backend-no-railway") && (
            <div className="p-3 rounded mb-4 text-xs bg-yellow-900/30 text-yellow-200 border border-yellow-800/50">
                ⚠️ <b>Setup:</b> Configure <code>API_URL</code> no código.
            </div>
        )}

        {error && <div className={`p-3 rounded mb-4 text-sm ${error.includes("sucesso") ? "bg-green-900/30 text-green-300 border border-green-800/50" : "bg-red-900/30 text-red-300 border border-red-800/50"}`}>{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 ml-1">Utilizador</label>
            <input className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white mt-1 focus:outline-none focus:border-blue-500 transition" placeholder="ex: admin" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-gray-400 ml-1">Senha</label>
            <input type="password" className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white mt-1 focus:outline-none focus:border-blue-500 transition" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold transition shadow-lg shadow-blue-900/20">
            {isRegister ? "Criar Conta Grátis" : "Entrar no Painel"}
          </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-gray-700 text-center">
            <button onClick={() => {setIsRegister(!isRegister); setError("");}} className="text-sm text-gray-400 hover:text-white transition">
            {isRegister ? "Já tem uma conta? Entrar" : "Ainda não tem conta? Criar agora"}
            </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL (DASHBOARD) ---
export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken"));
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("currentUser"));
  const [subscription, setSubscription] = useState({ active: true, daysLeft: 0 });
  const [showRenewModal, setShowRenewModal] = useState(false);
  
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("Ocioso");
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  
  // Login Telegram State
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
    setAuthToken(token);
    setCurrentUser(username);
    localStorage.setItem("authToken", token);
    localStorage.setItem("currentUser", username);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    setLogs([]);
    setConfig(DEFAULT_CONFIG);
  };

  const fetchUserStatus = async () => {
      if(!authToken) return;
      try {
          const res = await authFetch("/user/status");
          const data = await res.json();
          if (res.ok) setSubscription(data.subscription);
      } catch (e) { console.error("Erro status:", e); }
  };

  // Carregar dados iniciais e conectar WS
  useEffect(() => {
    if (authToken && !API_URL.includes("seu-backend")) {
        fetchUserStatus();
        authFetch("/profile").then(r=>r.json()).then(d=>{
            if(d.api_id) setConfig(p=>({...p, ...d}))
        }).catch(()=>{});
        
        const ws = new WebSocket(`${WS_URL}/${authToken}`);
        ws.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data);
                if (d.type==="log") setLogs(p=>[...p,{level:d.level,msg:d.message,time:new Date().toLocaleTimeString()}]);
                else if (d.type==="status") setStatus(d.status);
            } catch {}
        };
        ws.onclose = (e) => { if(e.code===1008) handleLogout(); };
        return () => ws.close();
    }
  }, [authToken]);

  useEffect(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), [logs]);
  const addLog = (level, msg) => setLogs(prev => [...prev, { level, msg, time: new Date().toLocaleTimeString() }]);

  // --- Ações do Bot ---
  const handleSaveProfile = async () => {
      try {
          const payload = { ...config, active_channels: config.active_channels.map(ch => ({ ...ch, id: parseInt(ch.id)||0, limit: parseInt(ch.limit)||0 })) };
          await authFetch("/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          addLog("SUCCESS", "Configurações salvas no servidor!");
      } catch(e) { addLog("ERROR", "Erro ao salvar perfil."); }
  };

  const handleStart = async () => {
      if (!subscription.active) { alert("Renove sua assinatura!"); return; }
      try {
          setIsRunning(true);
          const payload = { ...config, active_channels: config.active_channels.map(ch => ({ ...ch, id: parseInt(ch.id)||0, limit: parseInt(ch.limit)||0 })) };
          const res = await authFetch(`/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          if (!res.ok) { const err = await res.json(); throw new Error(err.detail); }
      } catch (e) { addLog("ERROR", e.message); setIsRunning(false); }
  };

  const handleStop = async () => { try { await authFetch(`/stop`, { method: "POST" }); setIsRunning(false); } catch (e) { addLog("ERROR", "Erro ao parar."); } };
  
  const handleResetHistory = async () => { 
      if(isRunning) { alert("Pare o bot!"); return; }
      if(!confirm("Resetar histórico para ZERO?")) return; 
      try { 
          await authFetch("/reset_history", { method: "POST" }); 
          addLog("SUCCESS", "Histórico reiniciado."); 
      } catch(e) { addLog("ERROR", e.message); } 
  };

  // --- Importações de Arquivo ---
  const handleProfileLoadClick = () => profileInputRef.current.click();
  const handleProfileFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            const newChannels = [];
            for (let i = 1; i <= 5; i++) {
                if (data[`enable_channel_${i}`] === true) {
                    newChannels.push({
                        num: i,
                        id: parseInt(data[`destination_channel_id_${i}`]) || "",
                        limit: parseInt(data[`daily_limit_channel_${i}`]) || 10,
                        caption: data[`custom_caption_${i}`] || ""
                    });
                }
            }
            if (newChannels.length === 0) newChannels.push({ num: 1, id: "", limit: 10, caption: "" });
            setConfig(prev => ({
                ...prev,
                api_id: parseInt(data.api_id) || prev.api_id,
                api_hash: data.api_hash || prev.api_hash,
                bot_token: data.bot_token || prev.bot_token,
                source_channel_id: parseInt(data.source_channel_id) || prev.source_channel_id,
                post_interval_seconds: parseInt(data.post_interval_seconds) || 60,
                filter_photos: data.filter_photos !== false,
                filter_videos: data.filter_videos !== false,
                filter_gifs: data.filter_gifs !== false,
                active_channels: newChannels
            }));
            addLog("SUCCESS", "Perfil local importado!");
        } catch(err) { addLog("ERROR", "Erro no JSON."); }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleImportHistoryClick = () => fileInputRef.current.click();
  const handleHistoryFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      addLog("INFO", "A enviar histórico...");
      const res = await authFetch(`/upload_history`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      addLog("SUCCESS", `Histórico importado! ID: ${data.last_id}`);
    } catch (e) { addLog("ERROR", e.message); }
    event.target.value = null;
  };

  // --- Auth Telegram ---
  const handleLoginSubmit = async () => {
    try {
        let res, data;
        if (loginStep === 1) {
            res = await authFetch(`/auth/request_code`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: loginData.phone, api_id: parseInt(config.api_id), api_hash: config.api_hash }) });
            data = await res.json();
            if (!res.ok) throw new Error(data.detail);
            if (data.status === "code_sent") { setLoginData({ ...loginData, hash: data.hash }); setLoginStep(2); addLog("INFO", "Código enviado."); }
            else if (data.status === "authorized") { alert("Já autenticado!"); setShowLogin(false); addLog("SUCCESS", "Autenticado."); }
        } else if (loginStep === 2) {
            res = await authFetch(`/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: loginData.phone, code: loginData.code, phone_code_hash: loginData.hash }) });
            data = await res.json();
            if (!res.ok) throw new Error(data.detail);
            if (data.status === "success") { setShowLogin(false); addLog("SUCCESS", "Login Sucesso!"); }
            else if (data.status === "2fa_required") setLoginStep(3);
        } else if (loginStep === 3) {
            res = await authFetch(`/auth/2fa`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: loginData.password }) });
            data = await res.json();
            if (!res.ok) throw new Error(data.detail);
            if (data.status === "success") { setShowLogin(false); addLog("SUCCESS", "Login 2FA Sucesso!"); }
        }
    } catch (e) { alert(e.message); addLog("ERROR", e.message); }
  };

  const updateChannel = (i, f, v) => { const n = [...config.active_channels]; n[i][f] = v; setConfig({ ...config, active_channels: n }); };
  const addChannel = () => { if (config.active_channels.length < 5) setConfig({ ...config, active_channels: [...config.active_channels, { num: config.active_channels.length + 1, id: "", limit: 10, caption: "" }] }); };
  const removeChannel = (idx) => { const n = config.active_channels.filter((_, i) => i !== idx); n.forEach((c, i) => c.num = i + 1); setConfig({ ...config, active_channels: n }); };

  // --- RENDER ---
  if (!authToken) return <SystemLogin onLogin={handleSystemLogin} />;

  if (!subscription.active) return <PaymentLockScreen onLogout={handleLogout} onOpenRenew={() => setShowRenewModal(true)} />;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-6">
      <RenewModal isOpen={showRenewModal} onClose={() => setShowRenewModal(false)} authFetch={authFetch} refreshStatus={fetchUserStatus} isLocked={false} />
      
      <div className="max-w-6xl mx-auto mb-6 bg-gray-800 rounded-lg p-3 flex justify-between items-center border border-gray-700 shadow-md">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><Activity className="text-blue-500"/> <span className="font-bold text-lg">{APP_NAME}</span></div>
            <div className="h-6 w-px bg-gray-600 mx-2"></div>
            <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Plano:</span>
                <span className="text-green-400 font-bold bg-green-900/30 px-2 py-0.5 rounded flex items-center gap-1"><CheckSquare size={12}/> Ativo</span>
                <span className="text-gray-500 text-xs">({subscription.daysLeft} dias restantes)</span>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <button onClick={() => setShowRenewModal(true)} className="text-xs bg-green-700 hover:bg-green-600 px-3 py-1 rounded flex gap-2 transition items-center font-medium shadow-md shadow-green-900/20"><CreditCard size={14}/> Renovar</button>
            <div className="h-6 w-px bg-gray-600"></div>
            <span className="text-gray-400 text-sm flex gap-2 items-center bg-gray-700/50 px-3 py-1 rounded"><User size={14}/> {currentUser}</span>
            <button onClick={handleLogout} className="bg-red-900/50 hover:bg-red-900 text-red-200 px-3 py-1 rounded text-sm flex gap-2 transition items-center"><LogOut size={14}/> Sair</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Painel Config */}
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
                    <div><label className="text-xs text-gray-400 block mb-1">API ID</label><input type="number" className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-sm focus:border-blue-500 focus:outline-none" value={config.api_id} onChange={e=>setConfig({...config, api_id: e.target.value})}/></div>
                    <div><label className="text-xs text-gray-400 block mb-1">API Hash</label><input type="password" className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-sm focus:border-blue-500 focus:outline-none" value={config.api_hash} onChange={e=>setConfig({...config, api_hash: e.target.value})}/></div>
                </div>
                <div><label className="text-xs text-gray-400 block mb-1">Bot Token</label><input className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-sm focus:border-blue-500 focus:outline-none" value={config.bot_token} onChange={e=>setConfig({...config, bot_token: e.target.value})}/></div>
                
                <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-start mb-3">
                        <label className="text-sm font-semibold text-yellow-400">Origem</label>
                        <div className="flex gap-2">
                            {['photos', 'videos', 'gifs'].map(t => (
                                <button key={t} onClick={()=>setConfig({...config, [`filter_${t}`]: !config[`filter_${t}`]})} className={`text-[10px] px-2 py-0.5 rounded border ${config[`filter_${t}`] ? 'bg-green-900/30 border-green-800 text-green-300':'bg-gray-800 border-gray-700 text-gray-500'}`}>
                                    {t.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    <input placeholder="ID Canal Origem (-100...)" className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-sm mb-4 focus:border-yellow-500 focus:outline-none" value={config.source_channel_id} onChange={e=>setConfig({...config, source_channel_id: parseInt(e.target.value)||""})}/>
                    
                    <div className="mb-4">
                        <label className="text-[10px] text-gray-400 block mb-1">Intervalo entre Posts (segundos)</label>
                        <input type="number" className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-sm focus:border-blue-500 focus:outline-none" value={config.post_interval_seconds} onChange={e=>setConfig({...config, post_interval_seconds: parseInt(e.target.value)||60})}/>
                    </div>

                    <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                        {config.active_channels.map((ch, i) => (
                            <div key={i} className="bg-gray-800 p-3 rounded border border-gray-600 relative group">
                                <div className="flex gap-2 items-end mb-2">
                                    <div className="flex-1"><label className="text-[10px] text-gray-400 font-bold block mb-1">Destino {ch.num}</label><input className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-xs focus:border-green-500 focus:outline-none" placeholder={`ID Canal ${ch.num}`} value={ch.id} onChange={e=>updateChannel(i,'id',e.target.value)}/></div>
                                    <div className="w-16"><label className="text-[10px] text-gray-400 block mb-1">Limite</label><input type="number" className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-xs text-center focus:border-green-500 focus:outline-none" value={ch.limit} onChange={e=>updateChannel(i,'limit',e.target.value)}/></div>
                                    {config.active_channels.length > 1 && <button onClick={()=>removeChannel(i)} className="h-[34px] w-[34px] flex items-center justify-center bg-red-900/20 text-red-500 border border-red-900/30 rounded hover:bg-red-900/50 transition"><Trash2 size={16}/></button>}
                                </div>
                                <textarea className="w-full bg-gray-900 border border-gray-700 p-2 rounded text-xs focus:border-blue-500 focus:outline-none min-h-[60px]" placeholder={`Legenda personalizada... {filename}`} value={ch.caption} onChange={e=>updateChannel(i,'caption',e.target.value)}/>
                            </div>
                        ))}
                    </div>
                    {config.active_channels.length < 5 && <button onClick={addChannel} className="mt-3 w-full py-2 border border-dashed border-gray-500 text-gray-400 rounded hover:bg-gray-800 text-xs flex justify-center items-center gap-1 transition"><PlusCircle size={14}/> Adicionar Canal</button>}
                </div>

                <div className="flex gap-2 pt-2">
                    <button onClick={()=>setShowLogin(true)} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded font-medium flex justify-center items-center gap-2 text-sm transition shadow-lg shadow-blue-900/20"><KeyRound size={16}/> Autenticar Telegram</button>
                    <input type="file" ref={fileInputRef} style={{display:'none'}} accept=".json" onChange={handleHistoryFileChange} />
                    <button onClick={handleImportHistoryClick} className="flex-1 bg-purple-600 hover:bg-purple-500 py-2.5 rounded font-medium flex justify-center items-center gap-2 text-sm transition shadow-lg shadow-purple-900/20"><Upload size={16}/> Histórico</button>
                    <button onClick={handleResetHistory} className="flex-none bg-red-900/30 hover:bg-red-900/50 text-red-300 py-2.5 px-3 rounded font-medium flex justify-center items-center gap-2 text-sm transition border border-red-900/50" title="Reiniciar do ID 0"><RotateCcw size={16}/></button>
                </div>
            </div>
        </div>

        {/* Painel de Logs */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col h-[600px] sticky top-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-green-400"><Terminal size={20} /> Atividades</h2>
            <div className="flex items-center gap-2">
                {API_URL.includes("seu-backend") && <AlertTriangle className="text-yellow-500 animate-pulse" size={20}/>}
                <span className={`text-xs px-2 py-1 rounded border ${status === "Ocioso" ? "bg-gray-700 text-gray-400 border-gray-600" : "bg-green-900/30 text-green-400 border-green-800"}`}>Status: {status}</span>
            </div>
          </div>
          <div className="flex-1 bg-gray-950 rounded-lg p-4 font-mono text-xs overflow-y-auto mb-4 border border-gray-700 shadow-inner">
            {logs.length === 0 && <div className="text-gray-600 text-center mt-20">O sistema está pronto.<br/>Configure e clique em INICIAR.</div>}
            {logs.map((l, i) => (
                <div key={i} className="mb-1.5 border-b border-gray-900/50 pb-1 last:border-0"><span className="text-gray-500 select-none">[{l.time}]</span> <span className={l.level==="ERROR"?"text-red-400 font-bold":l.level==="SUCCESS"?"text-green-400 font-bold":l.level==="WARNING"?"text-yellow-400":"text-blue-300"}>{l.level==="INFO"?"ℹ":l.level==="SUCCESS"?"✔":l.level==="WARNING"?"⚠️":l.level==="ERROR"?"✖":"⚙"}</span> <span className="text-gray-300">{l.msg}</span></div>
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
            
            {loginStep === 1 && (
                <div className="animate-fade-in">
                    <label className="text-xs text-gray-400 mb-1 block">Número de Telemóvel</label>
                    <input className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white mb-4 focus:border-blue-500 focus:outline-none" placeholder="+351..." value={loginData.phone} onChange={e=>setLoginData({...loginData, phone:e.target.value})}/>
                    <p className="text-xs text-gray-500 mb-4">Insira o número com o código do país.</p>
                </div>
            )}
            
            {loginStep === 2 && (
                <div className="animate-fade-in">
                    <label className="text-xs text-gray-400 mb-1 block">Código de Confirmação</label>
                    <input className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white mb-4 focus:border-blue-500 focus:outline-none text-center tracking-widest text-lg" placeholder="1 2 3 4 5" value={loginData.code} onChange={e=>setLoginData({...loginData, code:e.target.value})}/>
                    <p className="text-xs text-gray-500 mb-4">Verifique a mensagem enviada pelo Telegram oficial.</p>
                </div>
            )}
            
            {loginStep === 3 && (
                <div className="animate-fade-in">
                    <label className="text-xs text-gray-400 mb-1 block">Senha de 2 Passos (2FA)</label>
                    <input type="password" className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-white mb-4 focus:border-blue-500 focus:outline-none" placeholder="Sua senha..." value={loginData.password} onChange={e=>setLoginData({...loginData, password:e.target.value})}/>
                </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
                <button onClick={()=>setShowLogin(false)} className="px-4 py-2 text-gray-400 hover:text-white transition">Cancelar</button>
                <button onClick={handleLoginSubmit} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition shadow-lg shadow-blue-900/20">
                    {loginStep===1 ? "Enviar Código" : "Confirmar"}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
