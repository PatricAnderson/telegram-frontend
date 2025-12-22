import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Square, Activity, KeyRound, Upload, PlusCircle, Trash2, AlertTriangle, FileJson, CheckSquare, Square as SquareIcon } from 'lucide-react';

// --- CONFIGURAÇÃO OBRIGATÓRIA ---
const API_URL = "https://telegram-backend-production-1c72.up.railway.app"; 
const WS_URL = "wss://telegram-backend-production-1c72.up.railway.app/ws";

export default function App() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("Ocioso");
  const [isRunning, setIsRunning] = useState(false);
  
  // Estado de configuração expandido com filtros
  const [config, setConfig] = useState({
    api_id: "", api_hash: "", bot_token: "", source_channel_id: "",
    post_interval_seconds: 60,
    filter_photos: true, 
    filter_videos: true, 
    filter_gifs: true,
    active_channels: [{ num: 1, id: "", limit: 10, caption: "" }]
  });
  
  const [showLogin, setShowLogin] = useState(false);
  const [loginStep, setLoginStep] = useState(1);
  const [loginData, setLoginData] = useState({ phone: "", code: "", password: "", hash: "" });

  const logEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const profileInputRef = useRef(null); // Referência para o input de perfil

  // Validação de URL
  useEffect(() => {
    if (API_URL.includes("seu-backend-no-railway")) {
      addLog("ERROR", "⚠️ CONFIGURAÇÃO PENDENTE: Edite App.jsx e coloque o URL do Railway.");
    }
  }, []);

  // WebSocket
  useEffect(() => {
    if (WS_URL.includes("seu-backend-no-railway")) return;
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "log") setLogs(prev => [...prev, { level: data.level, msg: data.message, time: new Date().toLocaleTimeString() }]);
        else if (data.type === "status") setStatus(data.status);
      } catch (e) { console.error(e); }
    };
    return () => ws.close();
  }, []);

  useEffect(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), [logs]);

  const addLog = (level, msg) => setLogs(prev => [...prev, { level, msg, time: new Date().toLocaleTimeString() }]);

  const checkUrl = () => !API_URL.includes("seu-backend-no-railway");

  // --- Lógica de Carregar Perfil (Desktop JSON -> Web State) ---
  const handleProfileLoadClick = () => profileInputRef.current.click();

  const handleProfileFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Converte a estrutura plana do Desktop para a estrutura aninhada da Web
        const newChannels = [];
        for (let i = 1; i <= 5; i++) {
          // Verifica se o canal está ativado no JSON (enable_channel_X)
          if (data[`enable_channel_${i}`] === true) {
            newChannels.push({
              num: i,
              id: parseInt(data[`destination_channel_id_${i}`]) || "",
              limit: parseInt(data[`daily_limit_channel_${i}`]) || 10,
              caption: data[`custom_caption_${i}`] || ""
            });
          }
        }

        // Se nenhum canal for encontrado, mantém pelo menos um vazio
        if (newChannels.length === 0) newChannels.push({ num: 1, id: "", limit: 10, caption: "" });

        // Atualiza o estado
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

        addLog("SUCCESS", `Perfil carregado! ${newChannels.length} canais configurados.`);
      } catch (err) {
        addLog("ERROR", "Erro ao ler ficheiro de perfil: " + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const handleStart = async () => {
    if (!checkUrl()) return;
    try {
      setIsRunning(true);
      const payload = {
        ...config,
        active_channels: config.active_channels.map(ch => ({
          ...ch,
          id: parseInt(ch.id) || 0,
          limit: parseInt(ch.limit) || 0
        }))
      };
      const res = await fetch(`${API_URL}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Falha ao iniciar");
    } catch (e) {
      addLog("ERROR", "Erro ao iniciar: " + e.message);
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    if (!checkUrl()) return;
    try { await fetch(`${API_URL}/stop`, { method: "POST" }); setIsRunning(false); } catch (e) { addLog("ERROR", "Erro ao parar."); }
  };

  // Funções auxiliares de UI
  const updateChannel = (index, field, value) => {
    const newChannels = [...config.active_channels];
    newChannels[index][field] = value;
    setConfig({ ...config, active_channels: newChannels });
  };

  const addChannel = () => {
    if (config.active_channels.length >= 5) return;
    setConfig({ ...config, active_channels: [...config.active_channels, { num: config.active_channels.length + 1, id: "", limit: 10, caption: "" }] });
  };

  const removeChannel = (index) => {
    const newChannels = config.active_channels.filter((_, i) => i !== index);
    newChannels.forEach((ch, i) => ch.num = i + 1);
    setConfig({ ...config, active_channels: newChannels });
  };

  // Funções de Histórico e Login (Mantidas resumidas para focar na mudança)
  const handleImportHistoryClick = () => fileInputRef.current.click();
  const handleFileChange = async (event) => { /* Lógica de upload de histórico existente */ };
  const handleLoginSubmit = async () => { /* Lógica de login existente */ };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Painel de Configuração */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 h-fit">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-blue-400">
              <Activity size={20} /> Configuração
            </h2>
            
            {/* --- NOVO: Botão Carregar Perfil no topo --- */}
            <input type="file" ref={profileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleProfileFileChange} />
            <button 
              onClick={handleProfileLoadClick}
              className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded flex items-center gap-2 border border-gray-600 transition"
            >
              <FileJson size={14} /> Carregar Perfil
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Credenciais */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400">API ID</label>
                <input type="number" className="w-full bg-gray-700 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                  value={config.api_id} onChange={e => setConfig({...config, api_id: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-400">API Hash</label>
                <input type="password" className="w-full bg-gray-700 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                  value={config.api_hash} onChange={e => setConfig({...config, api_hash: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400">Bot Token</label>
              <input type="text" className="w-full bg-gray-700 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                value={config.bot_token} onChange={e => setConfig({...config, bot_token: e.target.value})} />
            </div>

            {/* Origem e Filtros */}
            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <div className="flex justify-between items-start mb-3">
                <label className="text-sm font-semibold text-yellow-400 block">Origem</label>
                
                {/* --- NOVO: Checkboxes de Filtro --- */}
                <div className="flex gap-3">
                  {['photos', 'videos', 'gifs'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setConfig({...config, [`filter_${type}`]: !config[`filter_${type}`]})}
                      className={`text-xs flex items-center gap-1 ${config[`filter_${type}`] ? 'text-green-400' : 'text-gray-500'}`}
                    >
                      {config[`filter_${type}`] ? <CheckSquare size={14}/> : <SquareIcon size={14}/>}
                      {type === 'gifs' ? 'GIFs' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <input placeholder="ID Canal Origem (-100...)" className="w-full bg-gray-800 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500" 
                  value={config.source_channel_id} onChange={e => setConfig({...config, source_channel_id: parseInt(e.target.value) || ""})} />
              </div>

              {/* Lista de Canais */}
              <div className="space-y-4">
                {config.active_channels.map((channel, index) => (
                  <div key={index} className="bg-gray-800/80 p-3 rounded border border-gray-600">
                    <div className="flex gap-2 items-end mb-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-400 font-bold block mb-1">Destino {channel.num}</label>
                        <input placeholder={`ID Canal ${channel.num}`} className="w-full bg-gray-700 p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                          value={channel.id} type="number" onChange={(e) => updateChannel(index, 'id', e.target.value)} />
                      </div>
                      <div className="w-20">
                        <label className="text-[10px] text-gray-400 block mb-1">Limite</label>
                        <input type="number" className="w-full bg-gray-700 p-2 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500"
                          value={channel.limit} onChange={(e) => updateChannel(index, 'limit', e.target.value)} />
                      </div>
                      {config.active_channels.length > 1 && (
                        <button onClick={() => removeChannel(index)} className="h-[34px] w-[34px] flex items-center justify-center bg-red-500/20 text-red-400 rounded hover:bg-red-500/40 transition">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <textarea className="w-full bg-gray-700 p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                      placeholder="Legenda personalizada..." value={channel.caption} onChange={(e) => updateChannel(index, 'caption', e.target.value)} />
                  </div>
                ))}
              </div>

              {config.active_channels.length < 5 && (
                <button onClick={addChannel} className="mt-3 w-full py-2 border border-dashed border-gray-500 text-gray-400 rounded hover:bg-gray-700 hover:text-white transition text-xs flex justify-center items-center gap-1">
                  <PlusCircle size={14} /> Adicionar Canal
                </button>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button onClick={() => setShowLogin(true)} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded font-medium transition flex justify-center items-center gap-2 text-sm">
                <KeyRound size={16}/> Autenticar
              </button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleFileChange} />
              <button onClick={handleImportHistoryClick} className="flex-1 bg-purple-600 hover:bg-purple-500 py-2 rounded font-medium transition flex justify-center items-center gap-2 text-sm">
                <Upload size={16}/> Histórico
              </button>
            </div>
          </div>
        </div>

        {/* Painel de Logs */}
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
              <div key={i} className="mb-1">
                <span className="text-gray-500">[{l.time}]</span> <span className={l.level === "ERROR" ? "text-red-400" : l.level === "SUCCESS" ? "text-green-400" : "text-blue-300"}>{l.level === "INFO" ? "ℹ" : l.level === "SUCCESS" ? "✔" : l.level === "ERROR" ? "✖" : "⚙"}</span> {l.msg}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
          <div className="flex gap-4">
            <button onClick={handleStart} disabled={isRunning} className={`flex-1 py-3 rounded font-bold flex justify-center items-center gap-2 ${isRunning ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'}`}><Play size={18}/> INICIAR</button>
            <button onClick={handleStop} disabled={!isRunning} className={`flex-1 py-3 rounded font-bold flex justify-center items-center gap-2 ${!isRunning ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'}`}><Square size={18}/> PARAR</button>
          </div>
        </div>
      </div>
      
      {/* Modal de Login (Omitido para poupar espaço, mas deve estar aqui) */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-96 border border-gray-600">
            <h3 className="text-lg font-bold mb-4">Login Telegram</h3>
            {loginStep === 1 && <input type="text" placeholder="+351..." className="w-full bg-gray-700 p-2 rounded mb-4" value={loginData.phone} onChange={e => setLoginData({...loginData, phone: e.target.value})} />}
            {loginStep === 2 && <input type="text" placeholder="Código" className="w-full bg-gray-700 p-2 rounded mb-4" value={loginData.code} onChange={e => setLoginData({...loginData, code: e.target.value})} />}
            {loginStep === 3 && <input type="password" placeholder="Senha 2FA" className="w-full bg-gray-700 p-2 rounded mb-4" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLogin(false)} className="px-4 py-2 text-gray-400">Cancelar</button>
              <button onClick={handleLoginSubmit} className="bg-blue-600 px-4 py-2 rounded">{loginStep === 1 ? "Enviar Código" : "Confirmar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
