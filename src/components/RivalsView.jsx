import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function RivalsView() {
  const [rivals, setRivals] = useState([]);
  const [newRival, setNewRival] = useState({ name: '', world: '', notes: '', threat_level: 'Medium' });

  useEffect(() => { fetchRivals(); }, []);

  async function fetchRivals() {
    const { data } = await supabase.from('competitors').select('*').order('created_at', { ascending: false });
    if (data) setRivals(data);
  }

  async function handleAddRival(e) {
    e.preventDefault();
    const { error } = await supabase.from('competitors').insert([newRival]);
    if (!error) {
      setNewRival({ name: '', world: '', notes: '', threat_level: 'Medium' });
      fetchRivals();
    }
  }

  async function handleDeleteRival(id) {
    if (window.confirm("Remove this competitor from the watchlist?")) {
      await supabase.from('competitors').delete().eq('id', id);
      fetchRivals();
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-8 items-start">
      <section className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800/80 rounded-2xl p-6 shadow-2xl sticky top-8">
        <h2 className="text-lg font-medium text-neutral-100 mb-6 border-b border-neutral-800 pb-4">Log Competitor</h2>
        <form onSubmit={handleAddRival} className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">IGN / Username</label>
            <input placeholder="Enemy Name" required className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm focus:outline-none focus:border-red-500/50" value={newRival.name} onChange={e => setNewRival({...newRival, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Main World</label>
              <input placeholder="e.g. BUYGEMS" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm focus:outline-none focus:border-red-500/50" value={newRival.world} onChange={e => setNewRival({...newRival, world: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Threat Level</label>
              <select className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm text-neutral-200 focus:outline-none focus:border-red-500/50 appearance-none" value={newRival.threat_level} onChange={e => setNewRival({...newRival, threat_level: e.target.value})}>
                <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Tactics / Notes</label>
            <textarea placeholder="Constantly undercuts prices..." rows="3" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm focus:outline-none focus:border-red-500/50 resize-none" value={newRival.notes} onChange={e => setNewRival({...newRival, notes: e.target.value})} />
          </div>
          <button type="submit" className="w-full bg-red-500/10 border border-red-500/30 text-red-500 font-medium text-sm py-3 rounded-lg hover:bg-red-500/20 transition-colors">Add to Watchlist</button>
        </form>
      </section>

      <main>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rivals.length === 0 ? <div className="text-neutral-600 p-10 border border-dashed border-neutral-800 rounded-xl col-span-2 text-center">No rivals tracked.</div> : 
           rivals.map(rival => (
            <div key={rival.id} className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-5 relative group">
              <button onClick={() => handleDeleteRival(rival.id)} className="absolute top-3 right-3 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">✕</button>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-medium text-white">{rival.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${rival.threat_level === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : rival.threat_level === 'Medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-neutral-800 text-neutral-400'}`}>
                  {rival.threat_level} Threat
                </span>
              </div>
              {rival.world && (
                <div className="mb-3">
                  <span className="text-[10px] text-neutral-500 uppercase block mb-0.5">Known Location</span>
                  <span className="text-sm font-mono text-amber-400 bg-neutral-950 px-2 py-1 rounded border border-neutral-800">{rival.world}</span>
                </div>
              )}
              <div className="border-t border-neutral-800/50 pt-3 mt-3">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">Intelligence</span>
                <p className="text-xs text-neutral-300 leading-relaxed">{rival.notes || "No notes provided."}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}