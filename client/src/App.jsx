import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
import { CustomerTicketsPage } from './pages/CustomerTicketsPage';
import { NewTicketPage } from './pages/NewTicketPage';
import { CustomerTicketDetailPage } from './pages/CustomerTicketDetailPage';
import { AgentTicketsPage } from './pages/AgentTicketsPage';
import { AgentTicketDetailPage } from './pages/AgentTicketDetailPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('tickets');
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mb-3" />
          <p className="text-sm font-medium text-slate-600">Initializing Support Desk...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const isAgent = user.role === 'agent';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        selectedTicketId={selectedTicketId}
        setSelectedTicketId={setSelectedTicketId}
      />

      <main className="flex-1">
        {isAgent ? (
          /* Agent Experience */
          selectedTicketId ? (
            <AgentTicketDetailPage
              ticketId={selectedTicketId}
              onBack={() => setSelectedTicketId(null)}
            />
          ) : (
            <AgentTicketsPage
              onSelectTicket={(id) => setSelectedTicketId(id)}
            />
          )
        ) : (
          /* Customer Experience */
          selectedTicketId ? (
            <CustomerTicketDetailPage
              ticketId={selectedTicketId}
              onBack={() => setSelectedTicketId(null)}
            />
          ) : currentView === 'new_ticket' ? (
            <NewTicketPage
              onSuccess={(createdTicket) => {
                setSelectedTicketId(createdTicket.id);
                setCurrentView('tickets');
              }}
              onCancel={() => setCurrentView('tickets')}
            />
          ) : (
            <CustomerTicketsPage
              onSelectTicket={(id) => setSelectedTicketId(id)}
              onNewTicket={() => {
                setSelectedTicketId(null);
                setCurrentView('new_ticket');
              }}
            />
          )
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
