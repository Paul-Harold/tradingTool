import { useState } from 'react';
import LedgerView from './components/LedgerView';
import DetailView from './components/DetailView';
import RivalsView from './components/RivalsView';

export default function App() {
  const [activeTab, setActiveTab] = useState('ledger'); 
  const [activeItem, setActiveItem] = useState(null);

  if (activeItem) {
    return <DetailView activeItem={activeItem} setActiveItem={setActiveItem} />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 md:py-12">
        <header className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 border-b border-neutral-800/80 pb-6">
          <div>
            <h1 className="text-3xl tracking-tight font-light text-neutral-100">
              GT <span className={activeTab === 'ledger' ? 'font-semibold text-amber-500' : 'font-semibold text-red-500'}>Pro</span>
            </h1>
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => setActiveTab('ledger')} 
                className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'ledger' ? 'border-amber-500 text-amber-500' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
              >
                Asset Ledger
              </button>
              <button 
                onClick={() => setActiveTab('rivals')} 
                className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'rivals' ? 'border-red-500 text-red-500' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
              >
                Rival Watchlist
              </button>
            </div>
          </div>
        </header>

        {activeTab === 'ledger' && <LedgerView setActiveItem={setActiveItem} />}
        {activeTab === 'rivals' && <RivalsView />}
      </div>
    </div>
  );
}