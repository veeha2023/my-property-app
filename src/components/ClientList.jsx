import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Menu, Edit, ExternalLink, Copy, Trash2, Building } from 'lucide-react';

export const STATUS = {
  draft: { label: 'Draft', dot: 'bg-gray-400', text: 'text-gray-300', pill: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Sent', dot: 'bg-brand', text: 'text-brand', pill: 'bg-brand-100 text-brand-800' },
  finalized: { label: 'Finalised', dot: 'bg-emerald-400', text: 'text-emerald-300', pill: 'bg-emerald-50 text-emerald-700' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unfinalized', label: 'Unfinalised' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'finalized', label: 'Finalised' },
];

const parseProps = (raw) => {
  if (!raw) return {};
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
};

// Status is mutually exclusive: finalised > sent (share link generated) > draft.
export const toRow = (client) => {
  const props = parseProps(client.client_properties);
  const b2b = props.b2b || {};
  const status = props.finalized ? 'finalized' : client.share_token ? 'sent' : 'draft';
  return { client, status, agent: b2b.enabled ? (b2b.businessName || '').trim() : '' };
};

// Collapsed-rail badge: leading quote number ("200 OA x 12…" → 200), else initials
export const badgeFor = (name = '') => {
  const num = name.trim().match(/^\d{1,4}/);
  if (num) return num[0];
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
};

const matchesFilter = (status, filter) =>
  filter === 'all' || status === filter || (filter === 'unfinalized' && status !== 'finalized');

const ClientList = ({ clients, selectedClientId, minimized, onSelect, onEdit, onOpen, onDuplicate, onDelete }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [menu, setMenu] = useState(null); // { id, up }

  const rows = useMemo(() => clients.map(toRow), [clients]);

  const counts = useMemo(() => {
    const c = {};
    FILTERS.forEach(f => { c[f.key] = rows.filter(r => matchesFilter(r.status, f.key)).length; });
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r =>
      matchesFilter(r.status, filter) &&
      (!q || (r.client.client_name || '').toLowerCase().includes(q) || r.agent.toLowerCase().includes(q))
    );
  }, [rows, query, filter]);

  // Close the row menu on outside click / Escape
  useEffect(() => {
    if (!menu) return;
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !e.target.closest('[data-client-menu]')) setMenu(null); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [menu]);

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    if (menu?.id === id) { setMenu(null); return; }
    // Open upward when the row sits near the bottom of the scrolling sidebar so the menu isn't clipped
    const btn = e.currentTarget.getBoundingClientRect();
    const box = (e.currentTarget.closest('nav') || document.body).getBoundingClientRect();
    setMenu({ id, up: btn.bottom + 200 > box.bottom });
  };

  const act = (e, fn) => { e.stopPropagation(); setMenu(null); fn(); };

  if (minimized) {
    return (
      <ul className="py-2 space-y-2">
        {clients.map(client => (
          <li key={client.id}>
            <button onClick={() => onSelect(client)} title={client.client_name} aria-label={client.client_name} className={`w-10 h-10 mx-auto flex items-center justify-center rounded-full text-xs font-bold cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand ${selectedClientId === client.id ? 'bg-brand text-ink' : 'bg-ink-700 text-gray-200 hover:bg-ink-800 hover:text-white'}`}>
              {badgeFor(client.client_name)}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search client or agent"
          aria-label="Search by client or B2B agent name"
          className="w-full min-h-[44px] pl-9 pr-10 rounded-lg bg-ink-800 border border-ink-700 text-base text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand" aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Filter by quote status">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`min-h-[32px] px-2.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand ${filter === f.key ? 'bg-brand text-ink border-brand' : 'bg-ink-800 text-gray-300 border-ink-700 hover:bg-ink-700'}`}
          >
            {f.label} <span className={filter === f.key ? 'text-ink/60' : 'text-gray-500'}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <ul className="space-y-1.5">
        {clients.length === 0 && <li className="text-gray-400 text-center py-4 text-sm">No clients yet.</li>}
        {clients.length > 0 && visible.length === 0 && (
          <li className="text-gray-400 text-center py-6 text-sm">
            No quotes match.
            <button onClick={() => { setQuery(''); setFilter('all'); }} className="block mx-auto mt-2 text-brand hover:underline cursor-pointer">Clear filters</button>
          </li>
        )}
        {visible.map(({ client, status, agent }) => {
          const s = STATUS[status];
          const selected = selectedClientId === client.id;
          const open = menu?.id === client.id;
          return (
            <li key={client.id} className="relative" data-client-menu={open || undefined}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(client)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(client); } }}
                className={`flex items-start gap-2 pl-3 pr-1 py-2.5 rounded-lg border-l-4 cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand ${selected ? 'bg-ink-700 border-brand' : 'bg-ink-800 border-transparent hover:bg-ink-700'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-100 text-sm leading-snug break-words line-clamp-2" title={client.client_name}>{client.client_name}</p>
                  <div className="mt-1 flex items-center gap-x-2 text-xs min-w-0">
                    <span className={`inline-flex items-center gap-1 flex-shrink-0 ${s.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />{s.label}
                    </span>
                    {agent && (
                      <span className="inline-flex items-center gap-1 text-gray-400 min-w-0" title={`B2B: ${agent}`}>
                        <Building size={12} className="flex-shrink-0" aria-hidden="true" /><span className="truncate">{agent}</span>
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => toggleMenu(e, client.id)}
                  className={`flex-shrink-0 w-10 h-10 -my-1 flex items-center justify-center rounded-lg cursor-pointer transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand ${open ? 'bg-ink-700 text-white' : 'text-gray-400 hover:text-white hover:bg-ink-700'}`}
                  aria-label={`Actions for ${client.client_name}`}
                  aria-haspopup="menu"
                  aria-expanded={open}
                >
                  <Menu size={18} />
                </button>
              </div>

              {open && (
                <div role="menu" className={`absolute right-1 z-20 w-48 py-1 rounded-lg bg-ink-800 border border-ink-700 shadow-xl ${menu.up ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                  <MenuItem icon={Edit} label="Edit details" onClick={(e) => act(e, () => onEdit(client))} />
                  <MenuItem icon={ExternalLink} label="Open client page" onClick={(e) => { setMenu(null); onOpen(e, client); }} />
                  <MenuItem icon={Copy} label="Duplicate" onClick={(e) => act(e, () => onDuplicate(client))} />
                  <div className="my-1 border-t border-ink-700" />
                  <MenuItem icon={Trash2} label="Delete" danger onClick={(e) => act(e, () => onDelete(client.id))} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const MenuItem = ({ icon: Icon, label, danger, onClick }) => (
  <button role="menuitem" onClick={onClick} className={`w-full min-h-[44px] flex items-center gap-3 px-3 text-sm text-left cursor-pointer transition-colors duration-200 focus:outline-none focus:bg-ink-700 ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-200 hover:bg-ink-700'}`}>
    <Icon size={16} aria-hidden="true" />{label}
  </button>
);

export default ClientList;
