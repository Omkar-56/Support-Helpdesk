import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Card, CardBody } from '../components/common/Card';
import { StatusBadge, SlaBadge, Badge } from '../components/common/Badge';

export function AgentTicketsPage({ onSelectTicket }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await api.getTickets(statusFilter);
      setTickets(data.tickets || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const filterTabs = [
    { label: 'My Assigned Tickets', value: '' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Assigned Tickets</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tickets assigned directly to you via round-robin routing. Respond within the 4-hour SLA.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2 text-xs text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Assigned Queue</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
          <p>Loading your assigned tickets...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
          {error}
        </div>
      ) : tickets.length === 0 ? (
        <Card className="text-center py-12 px-4">
          <CardBody>
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900">No tickets assigned</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              You currently have no tickets assigned matching this filter.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              onClick={() => onSelectTicket(ticket.id)}
              className={`hover:border-indigo-300 transition-all p-5 ${
                ticket.is_overdue ? 'border-rose-300 bg-rose-50/20' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                    <span className="text-xs font-mono font-medium text-slate-400">
                      #{ticket.id}
                    </span>
                    <h3 className="text-base font-semibold text-slate-900 truncate">
                      {ticket.subject}
                    </h3>
                    {ticket.ai_category && (
                      <Badge variant="ai" size="sm">
                        🤖 {ticket.ai_category}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2">
                    {ticket.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                    <span className="font-medium text-slate-700">
                      Customer: {ticket.customer_name}
                    </span>
                    <span>•</span>
                    <span>
                      Assigned to: You ({ticket.agent_name})
                    </span>
                    <span>•</span>
                    <span>
                      Created: {new Date(ticket.created_at).toLocaleDateString()} at{' '}
                      {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <StatusBadge status={ticket.status} />
                  <SlaBadge ticket={ticket} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
