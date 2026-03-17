import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const GT_RATES = { 'WL': 1, 'DL': 100, 'BGL': 10000 };

function formatPrice(wlCount) {
  if (!wlCount || wlCount === 0) return '0 WL';
  
  let bgl = Math.floor(wlCount / 10000);
  let dl = Math.floor((wlCount % 10000) / 100);
  let wl = Math.round(wlCount % 100);

  let parts = [];
  if (bgl > 0) parts.push(`${bgl} BGL`);
  if (dl > 0) parts.push(`${dl} DL`);
  if (wl > 0) parts.push(`${wl} WL`);

  return parts.join(' ');
}

function formatYAxis(wlCount) {
  if (wlCount >= 10000) return `${(wlCount / 10000).toFixed(1).replace('.0', '')} BGL`;
  if (wlCount >= 100) return `${(wlCount / 100).toFixed(1).replace('.0', '')} DL`;
  return `${wlCount} WL`;
}

export default function DetailView({ activeItem, setActiveItem }) {
  const [trades, setTrades] = useState([]);
  const [tradeForm, setTradeForm] = useState({ type: 'BUY', price: '', currency: 'DL' });

  useEffect(() => { fetchTrades(); }, [activeItem]);

  async function fetchTrades() {
    const { data } = await supabase.from('trades').select('*').eq('item_id', activeItem.id).order('created_at', { ascending: true });
    if (data) {
      setTrades(data.map(t => ({
        ...t, 
        date: new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), 
        numericPrice: Number(t.price) 
      })));
    }
  }

  async function handleRecordTrade(e) {
    e.preventDefault();
    if (!tradeForm.price || isNaN(tradeForm.price)) return alert("Price must be numeric.");
    
    const priceInWL = (Number(tradeForm.price) || 0) * GT_RATES[tradeForm.currency];

    const { error } = await supabase.from('trades').insert([{ 
      item_id: activeItem.id, 
      trade_type: tradeForm.type, 
      price: priceInWL 
    }]);

    if (!error) {
      setTradeForm({ type: 'BUY', price: '', currency: 'DL' });
      fetchTrades();
    }
  }

  // --- NEW: Delete Trade Log Function ---
  async function handleDeleteTrade(tradeId) {
    if (window.confirm("Delete this trade log? This will update the chart.")) {
      await supabase.from('trades').delete().eq('id', tradeId);
      fetchTrades(); // Refresh chart and list instantly
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => setActiveItem(null)} className="flex items-center gap-2 text-neutral-400 hover:text-amber-500 mb-8 transition-colors">
          <span>← Back to Ledger</span>
        </button>
        
        <header className="flex items-center gap-6 mb-10 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
          <div className="w-24 h-24 bg-neutral-950 rounded-xl p-2 flex items-center justify-center border border-neutral-800/50">
            <img src={activeItem.image_url} className="max-w-full max-h-full object-contain drop-shadow-lg" alt="" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-widest text-amber-500 uppercase">{activeItem.category}</span>
            <h1 className="text-3xl font-medium text-white mb-3">{activeItem.name} {activeItem.is_hot && '🔥'}</h1>
            <div className="flex gap-4">
              <div className="bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-lg">
                <span className="text-[10px] text-neutral-500 block">Buy Target</span>
                <span className="text-red-400 font-mono text-sm">{activeItem.buy_price || '0'} <span className="text-[10px] opacity-70">{activeItem.buy_currency || 'WL'}</span></span>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-lg">
                <span className="text-[10px] text-neutral-500 block">Sell Target</span>
                <span className="text-green-400 font-mono text-sm">{activeItem.sell_price || '0'} <span className="text-[10px] opacity-70">{activeItem.sell_currency || 'WL'}</span></span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[1fr,320px] gap-8">
          <section className="bg-neutral-900/40 p-6 rounded-2xl border border-neutral-800/60 flex flex-col h-[400px]">
            <h2 className="text-lg font-medium text-neutral-100 mb-4">Price Action History</h2>
            {trades.length < 2 ? (
              <div className="flex-1 flex items-center justify-center text-neutral-600 border border-dashed border-neutral-800 rounded-xl">Log at least 2 trades to generate chart.</div>
            ) : (
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trades} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="date" stroke="#525252" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis 
                      stroke="#525252" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(value) => formatYAxis(value)} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '8px' }} 
                      formatter={(value) => [formatPrice(value), "Traded At"]}
                      labelStyle={{ color: '#a3a3a3', marginBottom: '4px' }}
                    />
                    <Line type="monotone" dataKey="numericPrice" stroke="#fbbf24" strokeWidth={3} dot={{ r: 4, fill: '#fbbf24', stroke: '#0a0a0a', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <div className="bg-neutral-900/50 p-5 rounded-2xl border border-neutral-800">
              <h3 className="text-sm font-medium text-neutral-300 mb-4">Record Market Activity</h3>
              <form onSubmit={handleRecordTrade} className="space-y-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setTradeForm({...tradeForm, type: 'BUY'})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${tradeForm.type === 'BUY' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-neutral-950 text-neutral-500 border border-neutral-800'}`}>BUY</button>
                  <button type="button" onClick={() => setTradeForm({...tradeForm, type: 'SELL'})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${tradeForm.type === 'SELL' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-neutral-950 text-neutral-500 border border-neutral-800'}`}>SELL</button>
                </div>
                
                <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg focus-within:border-amber-500/50 transition-colors">
                  <input 
                    type="number" step="any" placeholder="Amount" required 
                    value={tradeForm.price} 
                    onChange={e => setTradeForm({...tradeForm, price: e.target.value})} 
                    className="w-full bg-transparent p-2.5 text-sm text-neutral-100 font-mono focus:outline-none" 
                  />
                  <div className="w-px bg-neutral-800 my-2"></div>
                  <select 
                    className="bg-transparent text-neutral-400 font-bold text-xs px-2 focus:outline-none cursor-pointer appearance-none text-center" 
                    value={tradeForm.currency} 
                    onChange={e => setTradeForm({...tradeForm, currency: e.target.value})}
                  >
                    <option value="WL">WL</option>
                    <option value="DL">DL</option>
                    <option value="BGL">BGL</option>
                  </select>
                </div>

                <button type="submit" className="w-full bg-amber-500 text-neutral-950 font-medium text-sm py-2.5 rounded-lg hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10">Log Transaction</button>
              </form>
            </div>

            <div className="bg-neutral-900/30 p-5 rounded-2xl border border-neutral-800/50 h-[210px] overflow-y-auto custom-scrollbar">
              <h3 className="text-sm font-medium text-neutral-300 mb-3 sticky top-0 bg-neutral-900/90 py-1">Recent Logs</h3>
              <div className="space-y-2">
                {trades.length === 0 && <p className="text-xs text-neutral-600">No trades logged.</p>}
                
                {/* --- NEW: Delete button logic inside map --- */}
                {trades.slice().reverse().map(trade => (
                  <div key={trade.id} className="flex justify-between items-center bg-neutral-950/50 p-2.5 rounded border border-neutral-800/50 group">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${trade.trade_type === 'BUY' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                        {trade.trade_type}
                      </span>
                      <span className="font-mono text-xs text-white">{formatPrice(trade.price)}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-neutral-500">{trade.date}</span>
                      <button 
                        onClick={() => handleDeleteTrade(trade.id)} 
                        className="text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete log"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}