import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Square, Activity, KeyRound, Upload, PlusCircle, Trash2 } from 'lucide-react';

// URL do Backend no Railway
const API_URL = "https://telegram-backend-production-1c72.up.railway.app"; 
const WS_URL = "wss://telegram-backend-production-1c72.up.railway.app/ws";

export default function App() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("Ocioso");
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState({
    api_id: "", api_hash: "", bot_token: "", source_channel_id: "",
    post_interval_seconds: 60,
    active_channels: [{ num: 1, id: "", limit: 10 }]
  });
  
  const [showLogin, setShowLogin] = useState(false);
  const [loginStep, setLoginStep] = useState(1);
  const [loginData, setLoginData] = useState({ phone: "", code: "", password: "", hash: "" });

  const logEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "log") {
        setLogs(prev => [...prev, { level: data.level, msg: data.message, time: new Date().toLocaleTimeString() }]);
      } else if (data.type === "status") {
        setStatus(data.status);
      }
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (level, msg) => setLogs(prev => [...prev, { level, msg, time: new Date().toLocaleTimeString() }]);

  const handleStart = async () => {
    try {
      setIsRunning(true);
      // Garante que os IDs são números antes de enviar
      const payload = {
        ...config,
        active_channels: config.active_channels.map(ch => ({
          ...ch,
          id: parseInt(ch.id) || 0,
          limit: parseInt(ch.limit) || 0
        }))
      };

      const res = await fetch(`${API_URL}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Falha ao iniciar");
    } catch (e) {
      addLog("ERROR", "Não foi possível conectar ao backend.");
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${API_URL}/stop`, { method: "POST" });
      setIsRunning(false);
    } catch (e) { addLog("ERROR", "Erro ao parar."); }
  };

  const handleImportHistoryClick = () => fileInputRef.current.click();

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      addLog("INFO", "A enviar ficheiro de histórico...");
      const res = await fetch(`${API_URL}/upload_history`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro no upload");
      addLog("SUCCESS", `Histórico importado! O bot continuará a partir do ID: ${data.last_id}`);
    } catch (e) { addLog("ERROR", `Falha na importação: ${e.message}`); }
    event.target.value = null;
  };

  // --- Gestão de Canais ---
  const updateChannel = (index, field, value) => {
    const newChannels = [...config.active_channels];
    newChannels[index][field] = value;
    setConfig({ ...config, active_channels: newChannels });
  };

  const addChannel = () => {
    if (config.active_channels.length >= 5) return;
    const newNum = config.active_channels.length + 1;
    setConfig({
      ...config,
      active_channels: [...config.active_channels, { num: newNum, id: "", limit: 10 }]
    });
  };

  const removeChannel = (index) => {
    const newChannels = config.active_channels.filter((_, i) => i !== index);
    // Renumera os canais
    newChannels.forEach((ch, i) => ch.num = i + 1);
    setConfig({ ...config, active_channels: newChannels });
  };

  const handleLoginSubmit = async () => {
    try {
      if (loginStep === 1) {
        const res = await fetch(`${API_URL}/auth/request_code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: loginData.phone, api_id: parseInt(config.api_id), api_hash: config.api_hash })
        });
        const data = await res.json();
        if (data.status === "code_sent") {
          setLoginData({ ...loginData, hash: data.hash });
          setLoginStep(2);
        } else if (data.status === "authorized") {
          alert("Já está autenticado!");
          setShowLogin(false);
        }
      } else if (loginStep === 2) {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: loginData.phone, code: loginData.code, phone_code_hash: loginData.hash })
        });
        const data = await res.json();
        if (data.status === "success") { setShowLogin(false); addLog("SUCCESS", "Login efetuado!"); }
        else if (data.status === "2fa_required") setLoginStep(3);
      } else if (loginStep === 3) {
        const res = await fetch(`${API_URL}/auth/2fa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: loginData.password })
        });
        const data = await res.json();
        if (data.status === "success") { setShowLogin(false); addLog("SUCCESS", "Login 2FA Sucesso!"); }
      }
    } catch (e) { alert("Erro no login: " + e.message); }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Painel de Configuração */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
            <Activity size={20} /> Configuração do Bot
          </h2>
          
          <div className="space-y-4">
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

            <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
              <label className="text-sm font-semibold text-yellow-400 mb-3 block">Origem & Destinos</label>
              
              <div className="mb-4">
                <label className="text-[10px] text-gray-400">Canal de Origem (ID)</label>
                <input placeholder="-100..." className="w-full bg-gray-800 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500" 
                  value={config.source_channel_id} onChange={e => setConfig({...config, source_channel_id: parseInt(e.target.value) || ""})} />
              </div>

              <div className="space-y-3">
                {config.active_channels.map((channel, index) => (
                  <div key={index} className="flex gap-2 items-end bg-gray-800/50 p-2 rounded">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400 font-bold block mb-1">Destino {channel.num}</label>
                      <input 
                        placeholder={`ID Canal ${channel.num}`} 
                        className="w-full bg-gray-700 p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                        value={channel.id}
                        type="number"
                        onChange={(e) => updateChannel(index, 'id', e.target.value)}
                      />
                    </div>
                    <div className="w-20">
                      <label className="text-[10px] text-gray-400 block mb-1">Limite</label>
                      <input 
                        type="number"
                        className="w-full bg-gray-700 p-2 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500"
                        value={channel.limit}
                        onChange={(e) => updateChannel(index, 'limit', e.target.value)}
                      />
                    </div>
                    {config.active_channels.length > 1 && (
                      <button 
                        onClick={() => removeChannel(index)} 
                        className="h-[34px] w-[34px] flex items-center justify-center bg-red-500/20 text-red-400 rounded hover:bg-red-500/40 transition"
                        title="Remover canal"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {config.active_channels.length < 5 && (
                <button 
                  onClick={addChannel} 
                  className="mt-3 w-full py-2 border border-dashed border-gray-500 text-gray-400 rounded hover:bg-gray-700 hover:text-white transition text-xs flex justify-center items-center gap-1"
                >
                  <PlusCircle size={14} /> Adicionar Canal de Destino
                </button>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button onClick={() => setShowLogin(true)} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded font-medium transition flex justify-center items-center gap-2 text-sm">
                <KeyRound size={16}/> Autenticar
              </button>
              
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleFileChange} />
              
              <button onClick={handleImportHistoryClick} className="flex-1 bg-purple-600 hover:bg-purple-500 py-2 rounded font-medium transition flex justify-center items-center gap-2 text-sm">
                <Upload size={16}/> Importar Histórico
              </button>
            </div>
          </div>
        </div>

        {/* Painel de Execução e Logs */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col h-[600px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-green-400">
              <Terminal size={20} /> Consola
            </h2>
            <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">Status: {status}</span>
          </div>

          <div className="flex-1 bg-black/80 rounded-lg p-4 font-mono text-xs overflow-y-auto mb-4 border border-gray-600">
            {logs.length === 0 && <span className="text-gray-500">A aguardar início...</span>}
            {logs.map((l, i) => (
              <div key={i} className="mb-1">
                <span className="text-gray-500">[{l.time}]</span>{' '}
                <span className={l.level === "ERROR" ? "text-red-400" : l.level === "SUCCESS" ? "text-green-400" : "text-blue-300"}>
                  {l.level === "INFO" ? "ℹ" : l.level === "SUCCESS" ? "✔" : l.level === "ERROR" ? "✖" : "⚙"}
                </span>{' '}
                {l.msg}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          <div className="flex gap-4">
            <button onClick={handleStart} disabled={isRunning} className={`flex-1 py-3 rounded font-bold flex justify-center items-center gap-2 ${isRunning ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'}`}>
              <Play size={18}/> INICIAR
            </button>
            <button onClick={handleStop} disabled={!isRunning} className={`flex-1 py-3 rounded font-bold flex justify-center items-center gap-2 ${!isRunning ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'}`}>
              <Square size={18}/> PARAR
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Login */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-96 border border-gray-600">
            <h3 className="text-lg font-bold mb-4">Login Telegram</h3>
            {loginStep === 1 && (
              <input type="text" placeholder="+351..." className="w-full bg-gray-700 p-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={loginData.phone} onChange={e => setLoginData({...loginData, phone: e.target.value})} />
            )}
            {loginStep === 2 && (
              <input type="text" placeholder="Código (ex: 12345)" className="w-full bg-gray-700 p-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={loginData.code} onChange={e => setLoginData({...loginData, code: e.target.value})} />
            )}
            {loginStep === 3 && (
              <input type="password" placeholder="Senha 2FA" className="w-full bg-gray-700 p-2 rounded mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowLogin(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
              <button onClick={handleLoginSubmit} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500 transition">
                {loginStep === 1 ? "Enviar Código" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}