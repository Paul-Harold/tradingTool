import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const CATEGORIES = [
  "Blocks", "Rares", "Consumables", "Hat", "Hair", 
  "Face", "Shirt", "Pants", "Shoes", "Hand", "Back", "Chest", "Ancestral"
];

const GT_RATES = { 'WL': 1, 'DL': 100, 'BGL': 10000 };

function formatProfit(wlCount) {
  if (!wlCount || wlCount <= 0) return null;
  let bgl = Math.floor(wlCount / 10000);
  let dl = Math.floor((wlCount % 10000) / 100);
  let wl = Math.round(wlCount % 100);

  let parts = [];
  if (bgl > 0) parts.push(`${bgl} BGL`);
  if (dl > 0) parts.push(`${dl} DL`);
  if (wl > 0) parts.push(`${wl} WL`);

  return `+${parts.join(' ')}`;
}

export default function LedgerView({ setActiveItem }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);

  const [newItem, setNewItem] = useState({ 
    name: '', category: 'Blocks', isHot: false,
    buyPrice: '', buyCurr: 'DL', sellPrice: '', sellCurr: 'DL' 
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef();

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ buyPrice: '', buyCurr: 'DL', sellPrice: '', sellCurr: 'DL' });

  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const { data } = await supabase.from('items').select('*');
    if (data) setItems(data);
    setLoading(false);
  }

  const handleFileChange = (e) => e.target.files?.length && setSelectedFile(e.target.files[0]);

  const handlePaste = (e) => {
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;
    for (let i = 0; i < clipboardItems.length; i++) {
      if (clipboardItems[i].type.indexOf('image') !== -1) {
        e.preventDefault(); 
        const file = clipboardItems[i].getAsFile();
        setSelectedFile(new File([file], `pasted-${Date.now()}.png`, { type: file.type }));
        break; 
      }
    }
  };

  async function handleAddItem(e) {
    e.preventDefault();
    if (!selectedFile) return alert("Upload an image asset.");

    const filePath = `item-images/${Date.now()}.${selectedFile.name.split('.').pop()}`;
    setUploadProgress(10);
    const { error: uploadError } = await supabase.storage.from('item-images').upload(filePath, selectedFile);
    if (uploadError) return setUploadProgress(0);

    setUploadProgress(50);
    const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(filePath);
    
    setUploadProgress(80);
    
    const buyInWL = (Number(newItem.buyPrice) || 0) * GT_RATES[newItem.buyCurr];
    const sellInWL = (Number(newItem.sellPrice) || 0) * GT_RATES[newItem.sellCurr];
    const profitMarginWL = sellInWL - buyInWL;

    const { error: dbError } = await supabase.from('items').insert([{ 
      name: newItem.name, category: newItem.category, is_hot: newItem.isHot, 
      buy_price: Number(newItem.buyPrice) || 0, buy_currency: newItem.buyCurr,
      sell_price: Number(newItem.sellPrice) || 0, sell_currency: newItem.sellCurr,
      estimated_profit: profitMarginWL > 0 ? profitMarginWL : 0, 
      image_url: urlData.publicUrl 
    }]);

    if (!dbError) {
      setNewItem({ name: '', category: 'Blocks', isHot: false, buyPrice: '', buyCurr: 'DL', sellPrice: '', sellCurr: 'DL' });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadProgress(100);
      fetchItems();
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }

  async function handleDeleteItem(e, id) {
    e.stopPropagation(); 
    if (window.confirm("Permanently delete this asset?")) {
      await supabase.from('items').delete().eq('id', id);
      fetchItems();
    }
  }

  async function toggleHotStatus(e, id, currentStatus) {
    e.stopPropagation(); 
    await supabase.from('items').update({ is_hot: !currentStatus }).eq('id', id);
    fetchItems();
  }

  async function handleSaveEdit(e, id) {
    e.stopPropagation();
    const buyInWL = (Number(editForm.buyPrice) || 0) * GT_RATES[editForm.buyCurr];
    const sellInWL = (Number(editForm.sellPrice) || 0) * GT_RATES[editForm.sellCurr];
    const profitMarginWL = sellInWL - buyInWL;

    await supabase.from('items').update({ 
      buy_price: editForm.buyPrice, buy_currency: editForm.buyCurr,
      sell_price: editForm.sellPrice, sell_currency: editForm.sellCurr,
      estimated_profit: profitMarginWL > 0 ? profitMarginWL : 0
    }).eq('id', id);
    setEditingId(null);
    fetchItems();
  }

  const processedItems = items
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "All" || item.category === category;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "profit") return (b.estimated_profit || 0) - (a.estimated_profit || 0);
      if (sortBy === "hot") return (a.is_hot === b.is_hot) ? 0 : a.is_hot ? -1 : 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 w-full mb-8">
        <input type="text" placeholder="Search portfolio..." className="w-full sm:w-48 bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500/50" onChange={(e) => setSearch(e.target.value)} />
        <select className="w-full sm:w-40 bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer" onChange={(e) => setCategory(e.target.value)}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select className="w-full sm:w-36 bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer" onChange={(e) => setSortBy(e.target.value)}>
          <option value="newest">Sort: Newest</option>
          <option value="profit">Highest Spread</option>
          <option value="hot">In-Demand</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-8 items-start">
        <section className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800/80 rounded-2xl p-6 shadow-2xl sticky top-8" onPaste={handlePaste}>
          <h2 className="text-lg font-medium text-neutral-100 mb-6 border-b border-neutral-800 pb-4">Record New Asset</h2>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="file-upload" className="relative flex flex-col items-center justify-center w-full h-28 bg-neutral-950 border-2 border-dashed border-neutral-800 rounded-xl cursor-pointer hover:border-amber-500/40 overflow-hidden">
                {previewUrl ? <img src={previewUrl} alt="Preview" className="h-full object-contain p-2" /> : <p className="text-xs text-neutral-500">Click, drag, or <span className="text-amber-500">Ctrl+V</span></p>}
                <input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="sr-only" />
              </label>
            </div>
            
            <input placeholder="Item Name" required className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500/50" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg focus-within:border-red-500/50 transition-colors">
                <input type="number" step="any" placeholder="Buy" required className="w-full bg-transparent p-3 text-sm text-red-400 font-mono focus:outline-none" value={newItem.buyPrice} onChange={e => setNewItem({...newItem, buyPrice: e.target.value})} />
                <div className="w-px bg-neutral-800 my-2"></div>
                <select className="bg-transparent text-neutral-400 font-bold text-xs px-2 focus:outline-none cursor-pointer appearance-none text-center" value={newItem.buyCurr} onChange={e => setNewItem({...newItem, buyCurr: e.target.value})}>
                  <option value="WL">WL</option><option value="DL">DL</option><option value="BGL">BGL</option>
                </select>
              </div>

              <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg focus-within:border-green-500/50 transition-colors">
                <input type="number" step="any" placeholder="Sell" required className="w-full bg-transparent p-3 text-sm text-green-400 font-mono focus:outline-none" value={newItem.sellPrice} onChange={e => setNewItem({...newItem, sellPrice: e.target.value})} />
                <div className="w-px bg-neutral-800 my-2"></div>
                <select className="bg-transparent text-neutral-400 font-bold text-xs px-2 focus:outline-none cursor-pointer appearance-none text-center" value={newItem.sellCurr} onChange={e => setNewItem({...newItem, sellCurr: e.target.value})}>
                  <option value="WL">WL</option><option value="DL">DL</option><option value="BGL">BGL</option>
                </select>
              </div>
            </div>

            <select className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <label className="flex items-center gap-2 cursor-pointer pt-1 pb-2">
              <input type="checkbox" className="w-4 h-4 accent-amber-500 bg-neutral-900 border-neutral-800 rounded" checked={newItem.isHot} onChange={e => setNewItem({...newItem, isHot: e.target.checked})} />
              <span className="text-sm font-medium text-neutral-400">Mark as In-Demand (Hot)</span>
            </label>

            {uploadProgress > 0 && <div className="w-full bg-neutral-950 h-1 rounded overflow-hidden"><div className="bg-amber-500 h-1 transition-all" style={{width: `${uploadProgress}%`}}></div></div>}
            <button type="submit" disabled={uploadProgress > 0} className="w-full bg-amber-500 text-neutral-950 font-medium text-sm py-3 rounded-lg hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10">Add to Ledger</button>
          </form>
        </section>

        <main>
          {loading ? <div className="text-center text-neutral-600 mt-20">Fetching ledger...</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {processedItems.map(item => {
                const formattedSpread = formatProfit(item.estimated_profit);
                
                return (
                <article key={item.id} onClick={() => editingId !== item.id && setActiveItem(item)} className="cursor-pointer bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-5 group relative hover:bg-neutral-900 flex flex-col h-full transition-colors">
                  
                  <button onClick={(e) => toggleHotStatus(e, item.id, item.is_hot)} className={`absolute top-3 left-3 px-2 py-0.5 rounded shadow-lg z-10 text-[10px] font-bold transition-all ${item.is_hot ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500' : 'bg-neutral-800/50 text-neutral-600 hover:text-amber-500 hover:bg-amber-500/10'}`}>🔥 HOT</button>
                  
                  <div className="absolute z-10 top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                     <button onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditForm({buyPrice: item.buy_price || '', buyCurr: item.buy_currency || 'DL', sellPrice: item.sell_price || '', sellCurr: item.sell_currency || 'DL'}); }} className="text-neutral-500 hover:text-white bg-neutral-950 border border-neutral-800 px-2 py-1 rounded text-xs transition-colors">Edit</button>
                     <button onClick={(e) => handleDeleteItem(e, item.id)} className="text-red-500 hover:text-white bg-neutral-950 border border-neutral-800 px-2 py-1 rounded text-xs transition-colors">✕</button>
                  </div>

                  <div className="w-full h-24 mb-4 bg-neutral-950/50 rounded-lg p-2 flex items-center justify-center border border-neutral-800/30 mt-4">
                    <img src={item.image_url} alt={item.name} className="max-w-full max-h-full object-contain" />
                  </div>
                  
                  <h3 className="font-medium text-neutral-100 text-sm mb-1 truncate">{item.name}</h3>
                  <span className="text-[10px] font-semibold tracking-widest text-neutral-500 uppercase mb-3 block">{item.category}</span>
                  
                  <div className="mt-auto border-t border-neutral-800/50 pt-3 space-y-2">
                    {editingId === item.id ? (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                         <div className="flex bg-neutral-950 border border-neutral-800 rounded focus-within:border-red-500/50 transition-colors">
                           <input type="number" step="any" className="flex-1 bg-transparent p-1 text-xs text-red-400 font-mono focus:outline-none" value={editForm.buyPrice} onChange={e => setEditForm({...editForm, buyPrice: e.target.value})} placeholder="Buy" />
                           <div className="w-px bg-neutral-800 my-1"></div>
                           <select className="bg-transparent text-[10px] font-bold text-neutral-400 px-1 focus:outline-none appearance-none" value={editForm.buyCurr} onChange={e => setEditForm({...editForm, buyCurr: e.target.value})}>
                             <option value="WL">WL</option><option value="DL">DL</option><option value="BGL">BGL</option>
                           </select>
                         </div>
                         <div className="flex bg-neutral-950 border border-neutral-800 rounded focus-within:border-green-500/50 transition-colors">
                           <input type="number" step="any" className="flex-1 bg-transparent p-1 text-xs text-green-400 font-mono focus:outline-none" value={editForm.sellPrice} onChange={e => setEditForm({...editForm, sellPrice: e.target.value})} placeholder="Sell" />
                           <div className="w-px bg-neutral-800 my-1"></div>
                           <select className="bg-transparent text-[10px] font-bold text-neutral-400 px-1 focus:outline-none appearance-none" value={editForm.sellCurr} onChange={e => setEditForm({...editForm, sellCurr: e.target.value})}>
                             <option value="WL">WL</option><option value="DL">DL</option><option value="BGL">BGL</option>
                           </select>
                         </div>
                         <div className="flex gap-2 pt-1">
                           <button onClick={(e) => handleSaveEdit(e, item.id)} className="flex-1 bg-amber-500 text-black text-xs font-bold py-1 rounded">Save</button>
                           <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="flex-1 bg-neutral-800 text-white text-xs font-bold py-1 rounded">Cancel</button>
                         </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-neutral-500">Buy Target</span>
                          <span className="font-mono text-xs font-medium text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">{item.buy_price || '0'} <span className="text-[10px] opacity-70">{item.buy_currency || 'WL'}</span></span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-neutral-500">Sell Target</span>
                          <span className="font-mono text-xs font-medium text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">{item.sell_price || '0'} <span className="text-[10px] opacity-70">{item.sell_currency || 'WL'}</span></span>
                        </div>
                        
                        {formattedSpread && (
                          <div className="flex justify-between items-center pt-2 mt-2 border-t border-neutral-800/30">
                            <span className="text-[10px] text-neutral-600">Spread Margin</span>
                            <span className="font-mono text-[10px] font-bold border px-1.5 rounded text-amber-400 bg-amber-400/10 border-amber-400/30">
                              {formattedSpread}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </article>
              )})}
            </div>
          )}
        </main>
      </div>
    </>
  );
}