import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Badge } from './common/Badge';
import { Button } from './common/Button';

export function Navbar({ currentView, setCurrentView, selectedTicketId, setSelectedTicketId }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isAgent = user.role === 'agent';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => {
          setSelectedTicketId(null);
          setCurrentView(isAgent ? 'agent_tickets' : 'customer_tickets');
        }}>
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            H
          </div>
          <span className="font-semibold text-slate-900 text-lg hidden sm:inline">Helpdesk</span>
        </div>

        {/* Navigation actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {!isAgent && currentView !== 'new_ticket' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setSelectedTicketId(null);
                setCurrentView('new_ticket');
              }}
            >
              + Raise Ticket
            </Button>
          )}

          {!isAgent && currentView === 'new_ticket' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSelectedTicketId(null);
                setCurrentView('customer_tickets');
              }}
            >
              Back to Tickets
            </Button>
          )}

          {selectedTicketId && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSelectedTicketId(null);
                setCurrentView(isAgent ? 'agent_tickets' : 'customer_tickets');
              }}
            >
              My Tickets
            </Button>
          )}

          {/* User pill */}
          <div className="flex items-center space-x-2 pl-2 sm:pl-4 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-slate-800 leading-tight">{user.name}</div>
              <div className="text-xs text-slate-400 leading-tight">{user.email}</div>
            </div>
            <Badge variant={isAgent ? 'internal' : 'default'} size="sm">
              {isAgent ? 'Agent' : 'Customer'}
            </Badge>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
            >
              <svg className="w-5 h-5 fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
