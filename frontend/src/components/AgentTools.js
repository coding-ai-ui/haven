import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

// Optional browser integration. Ordinary browsers do not need this API.
export default function AgentTools() {
  const navigate = useNavigate();
  useEffect(() => {
    const registry = document.modelContext;
    if (!registry?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(registry.registerTool({
        name: 'search_haven_properties',
        title: 'Search Haven properties',
        description: 'Search available Haven listings and show the results page. Does not save, book, or contact anyone.',
        inputSchema: {type: 'object', properties: {query: {type: 'string'}, transaction: {type: 'string', enum: ['sale', 'rent', 'short_term', 'hotel']}}, additionalProperties: false},
        annotations: {readOnlyHint: true, untrustedContentHint: true},
        async execute(input) {
          if (!input || typeof input !== 'object' || (input.query !== undefined && typeof input.query !== 'string') || (input.transaction !== undefined && !['sale','rent','short_term','hotel'].includes(input.transaction))) throw new Error('Use a text query and a supported transaction type.');
          const params = new URLSearchParams();
          if (input.query) params.set('q', input.query.slice(0,150));
          if (input.transaction) params.set('transaction_type', input.transaction);
          const result = await api(`properties/?${params}`);
          navigate(`/search?${params}`);
          return {count: result.count, results: result.results.map(p => ({id:p.id,title:p.title,location:p.location,price:p.price,transaction:p.transaction_type}))};
        }
      }, {signal: lifecycle.signal})).catch(() => {});
    } catch { /* A browser may expose an experimental registry without enabling it. */ }
    return () => lifecycle.abort();
  }, [navigate]);
  return null;
}
