import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

const Dashboard = () => {
    const [data, setData] = useState([]);
    const [latestPred, setLatestPred] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Connect to SSE Endpoint using environment variable
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
        const eventSource = new EventSource(`${apiUrl}/api/stream`);

        eventSource.onopen = () => setIsConnected(true);
        eventSource.onerror = () => setIsConnected(false);

        eventSource.addEventListener('metric', (event) => {
            const metric = JSON.parse(event.data);
            const time = new Date(metric.timestamp).toLocaleTimeString();
            
            setData(prev => {
                const newData = [...prev, {
                    time,
                    cpu: metric.cpu_usage_percent,
                    ram: metric.ram_usage.percent,
                    diskRead: metric.disk_io.read_bytes_sec,
                    diskWrite: metric.disk_io.write_bytes_sec
                }];
                // Keep last 30 points on screen to look like a rolling window
                if (newData.length > 30) newData.shift();
                return newData;
            });
        });

        eventSource.addEventListener('prediction', (event) => {
            const pred = JSON.parse(event.data);
            setLatestPred(pred);
        });

        return () => {
            eventSource.close();
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans transition-colors duration-500 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px]"></div>
                <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[120px]"></div>
            </div>

            <header className="relative z-10 mb-10 flex justify-between items-center border-b border-slate-800/50 pb-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent">Nexus Telemetry</h1>
                    <p className="text-slate-400 mt-2 text-sm uppercase tracking-widest font-semibold flex items-center gap-2">
                        Real-Time ML Monitoring 
                        <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full border border-slate-700">LSTM Pipeline</span>
                    </p>
                </div>
                <div className="flex items-center space-x-3 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800 backdrop-blur-sm shadow-inner">
                    <span className="relative flex h-3 w-3">
                      {isConnected ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </>
                      ) : (
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      )}
                    </span>
                    <span className="text-xs font-bold tracking-wider text-slate-300">{isConnected ? 'LIVE SYNC' : 'DISCONNECTED'}</span>
                </div>
            </header>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Main CPU Chart */}
                <div className="col-span-1 lg:col-span-2 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-7 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 transition-opacity duration-700 group-hover:opacity-20"></div>
                    <h2 className="text-xl font-bold mb-6 flex items-center text-slate-200">
                        <svg className="w-5 h-5 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Resource Utilization
                    </h2>
                    <div className="h-96 w-full">
                        <ResponsiveContainer>
                            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                                <XAxis dataKey="time" stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 12}} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" tick={{fill: '#94a3b8', fontSize: 12}} domain={[0, 100]} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                                    itemStyle={{ color: '#f8fafc', fontWeight: '500' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 8, strokeWidth: 0 }} name="Current CPU (%)" />
                                <Line type="monotone" dataKey="ram" stroke="#8b5cf6" strokeWidth={2} dot={false} name="RAM (%)" opacity={0.5} />
                                {latestPred?.anomaly_detected && <ReferenceLine y={90} label={{ position: 'insideTopLeft', value: 'Critical Load', fill: '#ef4444', fontSize: 12, fontWeight: 'bold' }} stroke="#ef4444" strokeDasharray="3 3" />}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Prediction Panel */}
                <div className="col-span-1 flex flex-col gap-8">
                    {/* Model Status Card */}
                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-7 shadow-2xl relative overflow-hidden group">
                        <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 transition-opacity duration-700 group-hover:opacity-20"></div>
                        <h2 className="text-xl font-bold mb-6 flex items-center text-slate-200">
                            <svg className="w-5 h-5 mr-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            AI Inference Health
                        </h2>
                        
                        <div className="h-full">
                            {!latestPred ? (
                                <div className="flex items-center justify-center h-32 text-slate-500 animate-pulse font-medium">Awaiting LSTM output...</div>
                            ) : (
                                <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center transition-colors duration-500 ${latestPred.anomaly_detected ? 'bg-red-950/40 border-red-500/50 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.1)]'}`}>
                                    <h3 className="font-bold text-lg mb-2 opacity-80 uppercase tracking-widest text-xs">System Outlook</h3>
                                    <div className="text-2xl font-black">{latestPred.anomaly_detected ? '🔥 CRITICAL SPIKE' : '✅ STABLE'}</div>
                                    <p className="text-xs mt-3 opacity-60">Model generated at {new Date(latestPred.timestamp).toLocaleTimeString()}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Forecast Card */}
                    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-7 shadow-2xl relative overflow-hidden flex-grow group">
                        <h2 className="text-xl font-bold mb-6 text-slate-200">Trajectory Forecast</h2>
                        {!latestPred ? (
                            <div className="flex items-center justify-center h-32 text-slate-500">No predictions yet.</div>
                        ) : (
                            <div>
                                <h3 className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-4">Predicted CPU (Next 5 Ticks)</h3>
                                <div className="grid grid-cols-5 gap-3">
                                    {latestPred.predicted_cpu_next_5_ticks?.map((val, idx) => {
                                        const isHigh = val > 90;
                                        const isMed = val > 75 && !isHigh;
                                        return (
                                            <div key={idx} className={`rounded-xl p-3 flex flex-col items-center border transition-all hover:scale-105 duration-200 ${isHigh ? 'bg-red-900/20 border-red-500/30' : isMed ? 'bg-amber-900/20 border-amber-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                                                <div className="text-[10px] text-slate-500 mb-2 font-bold tracking-wider">T+{idx+1}</div>
                                                <div className={`text-sm font-black ${isHigh ? 'text-red-400' : isMed ? 'text-amber-400' : 'text-blue-400'}`}>{Math.round(val)}</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
