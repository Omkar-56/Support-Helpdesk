import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Button } from '../components/common/Button';
import { Card, CardBody } from '../components/common/Card';
import { StatusBadge, SlaBadge } from '../components/common/Badge';

export function CustomerTicketsPage({ onSelectTicket, onNewTicket }) {
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
    { label: 'All', value: '' },
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
          <h1 className="text-2xl font-bold text-slate-900">My Support Tickets</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track status, responses, and raise new requests with guaranteed 4-hour SLA.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button variant="primary" onClick={onNewTicket}>
            + New Ticket
          </Button>
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
                ? 'bg-indigo-50 text-indigo-700'
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
          <p>Loading your tickets...</p>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900">No tickets found</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              {statusFilter
                ? `You don't have any tickets with status "${statusFilter}".`
                : 'You have not raised any support tickets yet. Need help? Create your first ticket now.'}
            </p>
            <div className="mt-6">
              <Button variant="primary" onClick={onNewTicket}>
                Raise a Support Ticket
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              onClick={() => onSelectTicket(ticket.id)}
              className="hover:border-indigo-300 transition-all p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-mono font-medium text-slate-400">
                      #{ticket.id}
                    </span>
                    <h3 className="text-base font-semibold text-slate-900 truncate">
                      {ticket.subject}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {ticket.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                    <span>
                      Created: {new Date(ticket.created_at).toLocaleDateString()} at{' '}
                      {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {ticket.attachment_name && (
                      <span className="inline-flex items-center text-slate-500">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        {ticket.attachment_name}
                      </span>
                    )}
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
