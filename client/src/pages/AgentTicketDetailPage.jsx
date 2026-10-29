import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { StatusBadge, SlaBadge, Badge } from '../components/common/Badge';

export function AgentTicketDetailPage({ ticketId, onBack }) {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketData, messageData] = await Promise.all([
        api.getTicket(ticketId),
        api.getMessages(ticketId),
      ]);
      setTicket(ticketData.ticket);
      setMessages(messageData.messages || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [ticketId]);

  const handleStatusChange = async (newStatus) => {
    if (!ticket || newStatus === ticket.status) return;
    setUpdatingStatus(true);
    try {
      await api.updateStatus(ticketId, newStatus);
      setTicket((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUseAiDraft = () => {
    if (ticket?.ai_draft_reply) {
      setReplyText(ticket.ai_draft_reply);
      setIsInternal(false); // drafts are intended for customer reply
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSending(true);
    try {
      await api.sendMessage(ticketId, {
        message: replyText.trim(),
        is_internal: isInternal,
      });
      setReplyText('');
      // Reload ticket & messages (status may have changed to in_progress)
      const [ticketData, messageData] = await Promise.all([
        api.getTicket(ticketId),
        api.getMessages(ticketId),
      ]);
      setTicket(ticketData.ticket);
      setMessages(messageData.messages || []);
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
        <p>Loading ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="secondary" size="sm" onClick={onBack} className="mb-4">
          ← Back to My Tickets
        </Button>
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
          {error || 'Ticket not found or not assigned to you'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <Button variant="secondary" size="sm" onClick={onBack}>
          ← Back to My Tickets
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          <SlaBadge ticket={ticket} />

          {/* Status changer dropdown */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-500">Status:</label>
            <select
              value={ticket.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ticket Header & Description */}
      <Card className="mb-6">
        <CardHeader className="bg-slate-50">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                Ticket #{ticket.id}
              </span>
              <StatusBadge status={ticket.status} />
              {ticket.ai_category && (
                <Badge variant="ai" size="sm">
                  🤖 {ticket.ai_category}
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{ticket.subject}</h1>
          </div>
          <div className="text-xs text-slate-500 sm:text-right">
            <div>Customer: <strong className="text-slate-800">{ticket.customer_name}</strong></div>
            <div>Assigned: <strong className="text-slate-800">{ticket.agent_name || 'None'}</strong></div>
            <div>Created: {new Date(ticket.created_at).toLocaleString()}</div>
          </div>
        </CardHeader>

        <CardBody className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Customer Description
            </h3>
            <div className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-100">
              {ticket.description}
            </div>
          </div>

          {ticket.attachment_url && (
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Attached File
              </h3>
              <a
                href={ticket.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-indigo-600 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                {ticket.attachment_name || 'Download Attachment'}
                <span className="ml-2 text-slate-400">↗</span>
              </a>
            </div>
          )}
        </CardBody>
      </Card>

      {/* AI Assistance Box (Agent Only) */}
      <Card className="mb-6 border-purple-200 bg-purple-50/30">
        <CardHeader className="bg-purple-100/50 border-purple-200">
          <div className="flex items-center space-x-2">
            <span className="text-lg">✨</span>
            <h2 className="text-sm font-bold text-purple-950">
              AI Copilot Draft & Categorisation
            </h2>
          </div>
          {ticket.ai_category && (
            <span className="text-xs font-medium text-purple-800 bg-purple-200/70 px-2 py-0.5 rounded-full">
              Category: {ticket.ai_category}
            </span>
          )}
        </CardHeader>
        <CardBody className="p-4 space-y-3">
          {ticket.ai_status === 'pending' && (
            <div className="flex items-center space-x-3 text-sm text-purple-700 py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent" />
              <span>Analyzing ticket and generating draft response with Gemini...</span>
            </div>
          )}

          {ticket.ai_status === 'failed' && (
            <div className="flex items-center space-x-2 text-sm text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <svg className="w-5 h-5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>AI unavailable, write manually</span>
            </div>
          )}

          {ticket.ai_status === 'completed' && (
            <div>
              <p className="text-xs text-slate-500 mb-2">
                Gemini suggested reply draft based on customer description. You can edit before sending:
              </p>
              <div className="p-3 bg-white rounded-lg border border-purple-200 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                {ticket.ai_draft_reply}
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUseAiDraft}
                  className="bg-white hover:bg-purple-50 text-purple-700 border-purple-300"
                >
                  📝 Insert Draft into Reply Box
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Message & Note Thread */}
      <div className="mb-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Ticket Activity</h2>

        {messages.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
            <p>No messages or internal notes yet.</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.is_internal) {
              return (
                <div
                  key={msg.id}
                  className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs text-amber-900 mb-2 pb-1 border-b border-amber-200">
                    <span className="font-bold flex items-center">
                      <span className="mr-1.5">🔒</span> INTERNAL NOTE (Staff Only - Customer cannot see)
                    </span>
                    <span className="text-amber-700">
                      by {msg.sender_name} at {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm text-amber-950 whitespace-pre-wrap font-sans">
                    {msg.message}
                  </div>
                </div>
              );
            }

            const isAgent = msg.sender_role === 'agent';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl p-4 shadow-sm border ${
                    isAgent
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5 opacity-80 gap-4">
                    <span className="font-semibold">
                      {isAgent ? `Support Agent (${msg.sender_name})` : `Customer (${msg.sender_name})`}
                    </span>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer (Public Reply or Internal Note) */}
      <Card>
        <CardBody className="p-4 space-y-3">
          {/* Toggle Reply vs Internal Note */}
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setIsInternal(false)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                !isInternal
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ✉️ Public Reply (Sent to Customer)
            </button>
            <button
              type="button"
              onClick={() => setIsInternal(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                isInternal
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🔒 Internal Note (Private)
            </button>
          </div>

          {isInternal && (
            <div className="p-2.5 rounded bg-amber-50 text-amber-800 text-xs border border-amber-200 flex items-center">
              <span className="mr-1.5 font-bold">⚠️ Note:</span> This message is internal only and will NEVER be visible to the customer.
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-3">
            <Input
              name="replyText"
              as="textarea"
              rows={4}
              required
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={
                isInternal
                  ? 'Type private note for teammates (reproduction steps, debugging hints)...'
                  : 'Type your message to the customer (you can also use the AI draft above)...'
              }
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                {isInternal ? 'Internal notes do not satisfy the SLA deadline' : 'Sending a public reply satisfies the SLA deadline'}
              </span>
              <Button
                type="submit"
                variant={isInternal ? 'secondary' : 'primary'}
                loading={sending}
                disabled={!replyText.trim()}
                className={isInternal ? 'border-amber-400 text-amber-900 bg-amber-50 hover:bg-amber-100' : ''}
              >
                {isInternal ? 'Save Internal Note' : 'Send Public Reply'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
