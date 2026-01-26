import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Square, Activity, KeyRound, Upload, PlusCircle, Trash2, AlertTriangle, FileJson, CheckSquare, Square as SquareIcon, LogOut, User, Save } from 'lucide-react';

// --- CONFIGURAÇÃO OBRIGATÓRIA ---
const API_URL = "https://telegram-backend-production-1c72.up.railway.app"; 
const WS_URL = "wss://telegram-backend-production-1c72.up.railway.app";

// Configuração padrão para resetar o formulário
const DEFAULT_CONFIG = {
    api_id: "", api_hash: "", bot_token: "", source_channel_id: "",
    post_interval_seconds: 60,
    filter_photos: true, filter_videos: true, filter_gifs: true,
    active_channels: [{ num: 1, id: "", limit: 10, caption: "" }]
};

// --- COMPONENTE DE LOGIN ---
const SystemLogin = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const endpoint = isRegister ? "/register" : "/token";
    const body = isRegister 
      ? JSON.stringify({ username, password })
      : new URLSearchParams({ username, password });
    const headers = isRegister ? { "Content-Type": "application/json" } : { "Content-Type": "application/x-www-form-urlencoded" };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers, body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro");
      if (isRegister) { setIsRegister(false); setError("Conta criada! Faça login."); }
      else onLogin(data.access_token, data.username);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans text-gray-100">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <h2 className="text-2xl font-bold text-blue-400 mb-6 flex items-center gap-2"><Activity /> Publicador Web</h2>
        <h3 className="text-xl text-white mb-4">{isRegister ? "Criar Conta" : "Entrar no Sistema"}</h3>
        {error && <div className="p-3 rounded mb-4 text-sm bg-red-900/50 text-red-300">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="w-full bg-gray-700 p-3 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Utilizador" value={username} onChange={e => setUsername(e.target.value)} required />
          <input type="password" className="w-full bg-gray-700 p-3 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded font-bold transition">{isRegister ? "Registar" : "Entrar"}</button>
        </form>
        <button onClick={() => {setIsRegister(!isRegister); setError("");}} className="w-full mt-4 text-sm text-gray-400 hover:text-white">{isRegister ? "Já tem conta? Login" : "Criar conta"}</button>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken"));
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("currentUser"));
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("Ocioso");
  const [isRunning, setIsRunning] = useState(false);
  
  // Inicializa com configuração vazia
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  
  const [showLogin, setShowLogin] = useState(false);
  const [loginStep, setLoginStep] = useState(1);
  const [loginData, setLoginData] = useState({ phone: "", code: "", password: "", hash: "" });

  const logEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const profileInputRef = useRef(null);

  const authFetch = async (endpoint, options = {}) => {
    const headers = { ...options.headers, "Authorization": `Bearer ${authToken}` };
    try {
        const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        if (res.status === 401) {
            handleLogout();
            throw new Error("Sessão expirada. Faça login novamente.");
        }
        return res;
    } catch(e) { throw e; }
  };

  const handleSystemLogin = (token, username) => {
    setAuthToken(token);
    setCurrentUser(username);
    localStorage.setItem("authToken", token);
    localStorage.setItem("currentUser", username);
    // IMPORTANTE: Ao logar, reseta o config visualmente antes de tentar carregar o novo
    setConfig(DEFAULT_CONFIG);
    setLogs([]);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    // IMPORTANTE: Limpa todos os dados sensíveis da tela ao sair
    setLogs([]);
    setStatus("Ocioso");
    setConfig(DEFAULT_CONFIG); 
    setLoginData({ phone: "", code: "", password: "", hash: "" });
  };

  // Carregar Perfil do Servidor ao Iniciar
  useEffect(() => {
    if (authToken && !API_URL.includes("seu-backend")) {
        authFetch("/profile")
            .then(res => res.json())
            .then(data => {
                // Se o backend retornar dados válidos, carrega.
                // Se retornar vazio (novo user), garante que o form fica limpo.
                if (data.api_id || (data.active_channels && data.active_channels.length > 0)) {
                    setConfig(prev => ({...prev, ...data}));
                    addLog("SUCCESS", "Perfil carregado do servidor.");
                } else {
                    setConfig(DEFAULT_CONFIG);
                    addLog("INFO", "Novo perfil iniciado.");
                }
            })
            .catch(err => console.log("Erro ao carregar perfil.", err));
    }
  }, [authToken]);

  useEffect(() => {
    if (!authToken || API_URL.includes("seu-backend")) return;
    const ws = new WebSocket(`${WS_URL}/${authToken}`);
    ws.onopen = () => addLog("INFO", "Conectado ao servidor de logs.");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "log") setLogs(prev => [...prev, { level: data.level, msg: data.message, time: new Date().toLocaleTimeString() }]);
        else if (data.type === "status") setStatus(data.status);
      } catch (e) {}
    };
    ws.onclose = (e) => { if (e.code === 1008) handleLogout(); }
    return () => ws.close();
  }, [authToken]);

  useEffect(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), [logs]);

  const addLog = (level, msg) => setLogs(prev => [...prev, { level, msg, time: new Date().toLocaleTimeString() }]);

  const handleSaveProfile = async () => {
      try {
          const payload = { ...config, active_channels: config.active_channels.map(ch => ({ ...ch, id: parseInt(ch.id)||0, limit: parseInt(ch.limit)||0 })) };
          await authFetch("/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          addLog("SUCCESS", "Configurações salvas no servidor!");
      } catch(e) { addLog("ERROR", "Erro ao salvar perfil."); }
  };

  const handleStart = async () => {
    try {
      setIsRunning(true);
      const payload = {
        ...config,
        post_interval_seconds: parseInt(config.post_interval_seconds) || 60,
        source_channel_id: parseInt(config.source_channel_id) || 0,
        active_channels: config.active_channels.map(ch => ({
          ...ch, id: parseInt(ch.id) || 0, limit: parseInt(ch.limit) || 0, caption: ch.caption || ""
        }))
      };
      const res = await authFetch(`/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Falha ao iniciar");
      }
    } catch (e) { addLog("ERROR", e.message); setIsRunning(false); }
  };

  const handleStop = async () => {
    try { await authFetch(`/stop`, { method: "POST" }); setIsRunning(false); } catch (e) { addLog("ERROR", "Erro ao parar."); }
  };

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
            addLog("SUCCESS", "Perfil local importado com sucesso!");
        } catch(err) { addLog("ERROR", "Erro ao ler ficheiro de perfil: " + err.message); }
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
      if (!res.ok) throw new Error(data.detail || "Erro no upload");
      addLog("SUCCESS", `Histórico importado! Continuará do ID: ${data.last_id}`);
    } catch (e) { addLog("ERROR", `Falha: ${e.message}`); }
    event.target.value = null;
  };

  const handleLoginSubmit = async () => {
    try {
        let res, data;
        if (loginStep === 1) {
            res = await authFetch(`/auth/request_code`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: loginData.phone, api_id: parseInt(config.api_id), api_hash: config.api_hash })
            });
            data = await res.json();
            if (!res.ok) throw new Error(data.detail);
            if (data.status === "code_sent") { setLoginData({ ...loginData, hash: data.hash }); setLoginStep(2); addLog("INFO", "Código enviado."); }
            else if (data.status === "authorized") { alert("Já autenticado!"); setShowLogin(false); addLog("SUCCESS", "Autenticado."); }
        } else if (loginStep === 2) {
            res = await authFetch(`/auth/login`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: loginData.phone, code: loginData.code, phone_code_hash: loginData.hash })
            });
            data = await res.json();
            if (!res.ok) throw new Error(data.detail);
            if (data.status === "success") { setShowLogin(false); addLog("SUCCESS", "Login Telegram Sucesso!"); }
            else if (data.status === "2fa_required") setLoginStep(3);
        } else if (loginStep === 3) {
            res = await authFetch(`/auth/2fa`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: loginData.password })
            });
            data = await res.json();
            if (!res.ok) throw new Error(data.detail);
            if (data.status === "success") { setShowLogin(false); addLog("SUCCESS", "Login 2FA Sucesso!"); }
        }
    } catch (e) { alert(e.message); addLog("ERROR", e.message); }
  };

  const updateChannel = (i, f, v) => { const n = [...config.active_channels]; n[i][f] = v; setConfig({ ...config, active_channels: n }); };
  const addChannel = () => { if (config.active_channels.length < 5) setConfig({ ...config, active_channels: [...config.active_channels, { num: config.active_channels.length + 1, id: "", limit: 10, caption: "" }] }); };
  const removeChannel = (idx) => { const n = config.active_channels.filter((_, i) => i !== idx); n.forEach((c, i) => c.num = i + 1); setConfig({ ...config, active_channels: n }); };

  if (!authToken) return <SystemLogin onLogin={handleSystemLogin} />;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-6">
      <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="text-blue-500"/> Publicador Web</h1>
        <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm flex gap-2"><User size={16}/> {currentUser}</span>
            <button onClick={handleLogout} className="bg-red-900/50 hover:bg-red-900 text-red-200 px-3 py-1 rounded text-sm flex gap-2 transition"><LogOut size={14}/> Sair</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 h-fit">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-blue-400">Configuração</h2>
                <div className="flex gap-2">
                    <input type="file" ref={profileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleProfileFileChange} />
                    <button onClick={handleProfileLoadClick} className="text-xs bg-gray-700 px-3 py-1.5 rounded flex gap-2 border border-gray-600 hover:bg-gray-600 transition" title="Importar JSON do Desktop"><FileJson size={14} /> Importar</button>
                    <button onClick={handleSaveProfile} className="text-xs bg-blue-900/50 hover:bg-blue-800 px-3 py-1.5 rounded flex gap-2 border border-blue-800 transition" title="Salvar configuração na nuvem"><Save size={14} /> Salvar</button>
                </div>
            </div>
            
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs text-gray-400">API ID</label><input type="number" className="w-full bg-gray-700 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={config.api_id} onChange={e=>setConfig({...config, api_id: e.target.value})}/></div>
                    <div><label className="text-xs text-gray-400">API Hash</label><input type="password" className="w-full bg-gray-700 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={config.api_hash} onChange={e=>setConfig({...config, api_hash: e.target.value})}/></div>
                </div>
                <div><label className="text-xs text-gray-400">Bot Token</label><input className="w-full bg-gray-700 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={config.bot_token} onChange={e=>setConfig({...config, bot_token: e.target.value})}/></div>
                
                <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-start mb-3">
                        <label className="text-sm font-semibold text-yellow-400">Origem</label>
                        <div className="flex gap-3">
                            {['photos', 'videos', 'gifs'].map(t => (
                                <button key={t} onClick={()=>setConfig({...config, [`filter_${t}`]: !config[`filter_${t}`]})} className={`text-xs flex gap-1 items-center ${config[`filter_${t}`] ? 'text-green-400':'text-gray-500'}`}>
                                    {config[`filter_${t}`] ? <CheckSquare size={14}/> : <SquareIcon size={14}/>} {t === 'gifs' ? 'GIFs' : t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <input placeholder="ID Canal Origem (-100...)" className="w-full bg-gray-800 p-2 rounded text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-yellow-500" value={config.source_channel_id} onChange={e=>setConfig({...config, source_channel_id: parseInt(e.target.value)||""})}/>
                    
                    <div className="mb-4">
                        <label className="text-[10px] text-gray-400">Intervalo entre Posts (segundos)</label>
                        <input type="number" className="w-full bg-gray-800 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={config.post_interval_seconds} onChange={e=>setConfig({...config, post_interval_seconds: parseInt(e.target.value)||60})}/>
                    </div>

                    <div className="space-y-4">
                        {config.active_channels.map((ch, i) => (
                            <div key={i} className="bg-gray-800/80 p-3 rounded border border-gray-600">
                                <div className="flex gap-2 items-end mb-2">
                                    <div className="flex-1"><label className="text-[10px] text-gray-400 font-bold">Destino {ch.num}</label><input className="w-full bg-gray-700 p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500" placeholder={`ID Canal ${ch.num}`} value={ch.id} onChange={e=>updateChannel(i,'id',e.target.value)}/></div>
                                    <div className="w-20"><label className="text-[10px] text-gray-400">Limite</label><input type="number" className="w-full bg-gray-700 p-2 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500" value={ch.limit} onChange={e=>updateChannel(i,'limit',e.target.value)}/></div>
                                    {config.active_channels.length > 1 && <button onClick={()=>removeChannel(i)} className="h-[34px] w-[34px] flex items-center justify-center bg-red-500/20 text-red-400 rounded hover:bg-red-500/40 transition"><Trash2 size={16}/></button>}
                                </div>
                                <textarea className="w-full bg-gray-700 p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px]" placeholder={`Legenda Canal ${ch.num}...`} value={ch.caption} onChange={e=>updateChannel(i,'caption',e.target.value)}/>
                            </div>
                        ))}
                    </div>
                    {config.active_channels.length < 5 && <button onClick={addChannel} className="mt-3 w-full py-2 border border-dashed border-gray-500 text-gray-400 rounded hover:bg-gray-700 text-xs flex justify-center items-center gap-1 transition"><PlusCircle size={14}/> Adicionar Canal</button>}
                </div>

                <div className="flex gap-2 pt-4">
                    <button onClick={()=>setShowLogin(true)} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded font-medium flex justify-center items-center gap-2 text-sm transition"><KeyRound size={16}/> Autenticar</button>
                    <input type="file" ref={fileInputRef} style={{display:'none'}} accept=".json" onChange={handleHistoryFileChange} />
                    <button onClick={handleImportHistoryClick} className="flex-1 bg-purple-600 hover:bg-purple-500 py-2 rounded font-medium flex justify-center items-center gap-2 text-sm transition"><Upload size={16}/> Histórico</button>
                </div>
            </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col h-[600px] sticky top-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-green-400"><Terminal size={20} /> Consola</h2>
            <div className="flex items-center gap-2">
                {API_URL.includes("seu-backend") && <AlertTriangle className="text-yellow-500" size={20}/>}
                <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">Status: {status}</span>
            </div>
          </div>
          <div className="flex-1 bg-black/80 rounded-lg p-4 font-mono text-xs overflow-y-auto mb-4 border border-gray-600">
            {logs.length === 0 && <span className="text-gray-500">A aguardar início...</span>}
            {logs.map((l, i) => (
                <div key={i} className="mb-1"><span className="text-gray-500">[{l.time}]</span> <span className={l.level==="ERROR"?"text-red-400":l.level==="SUCCESS"?"text-green-400":"text-blue-300"}>{l.level==="INFO"?"ℹ":l.level==="SUCCESS"?"✔":l.level==="ERROR"?"✖":"⚙"}</span> {l.msg}</div>
            ))}
            <div ref={logEndRef} />
          </div>
          <div className="flex gap-4">
            <button onClick={handleStart} disabled={isRunning} className={`flex-1 py-3 rounded font-bold flex justify-center items-center gap-2 ${isRunning?'bg-gray-600 cursor-not-allowed':'bg-green-600 hover:bg-green-500'}`}><Play size={18}/> INICIAR</button>
            <button onClick={handleStop} disabled={!isRunning} className={`flex-1 py-3 rounded font-bold flex justify-center items-center gap-2 ${!isRunning?'bg-gray-600 cursor-not-allowed':'bg-red-600 hover:bg-red-500'}`}><Square size={18}/> PARAR</button>
          </div>
        </div>
      </div>
      
      {showLogin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-96 border border-gray-600">
            <h3 className="text-lg font-bold mb-4">Login Telegram</h3>
            {loginStep === 1 && <input className="w-full bg-gray-700 p-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="+351..." value={loginData.phone} onChange={e=>setLoginData({...loginData, phone:e.target.value})}/>}
            {loginStep === 2 && <input className="w-full bg-gray-700 p-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Código" value={loginData.code} onChange={e=>setLoginData({...loginData, code:e.target.value})}/>}
            {loginStep === 3 && <input type="password" className="w-full bg-gray-700 p-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Senha 2FA" value={loginData.password} onChange={e=>setLoginData({...loginData, password:e.target.value})}/>}
            <div className="flex justify-end gap-2">
                <button onClick={()=>setShowLogin(false)} className="px-4 py-2 text-gray-400">Cancelar</button>
                <button onClick={handleLoginSubmit} className="bg-blue-600 px-4 py-2 rounded">{loginStep===1?"Enviar":"Confirmar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
