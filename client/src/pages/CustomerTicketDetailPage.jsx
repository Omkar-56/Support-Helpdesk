import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card, CardHeader, CardBody } from '../components/common/Card';
import { StatusBadge, SlaBadge } from '../components/common/Badge';

export function CustomerTicketDetailPage({ ticketId, onBack }) {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSending(true);
    try {
      await api.sendMessage(ticketId, {
        message: replyText.trim(),
        is_internal: false,
      });
      setReplyText('');
      // Refresh messages
      const messageData = await api.getMessages(ticketId);
      setMessages(messageData.messages || []);
    } catch (err) {
      alert(err.message || 'Failed to send reply');
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
          ← Back to Tickets
        </Button>
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
          {error || 'Ticket not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Top back navigation & badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <Button variant="secondary" size="sm" onClick={onBack}>
          ← Back to Tickets
        </Button>
        <div className="flex items-center space-x-2">
          <StatusBadge status={ticket.status} />
          <SlaBadge ticket={ticket} />
        </div>
      </div>

      {/* Ticket Header & Initial Description */}
      <Card className="mb-6">
        <CardHeader className="bg-slate-50">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                Ticket #{ticket.id}
              </span>
              <span className="text-xs text-slate-400">
                Created on {new Date(ticket.created_at).toLocaleString()}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">{ticket.subject}</h1>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Issue Description
            </h3>
            <div className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-100">
              {ticket.description}
            </div>
          </div>

          {ticket.attachment_url && (
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Attachment
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
                {ticket.attachment_name || 'View Attachment'}
                <span className="ml-2 text-slate-400">↗</span>
              </a>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Conversation Thread */}
      <div className="mb-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Conversation</h2>

        {messages.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-sm">
            <p>No replies yet. An agent has been assigned and will reply shortly.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAgentReply = msg.sender_role === 'agent';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isAgentReply ? 'items-start' : 'items-end'
                }`}
              >
                <div
                  className={`max-w-2xl rounded-2xl p-4 shadow-sm border ${
                    isAgentReply
                      ? 'bg-white border-slate-200 text-slate-800'
                      : 'bg-indigo-600 border-indigo-600 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5 opacity-80 gap-4">
                    <span className="font-semibold">
                      {isAgentReply ? `Support Agent (${msg.sender_name})` : 'You'}
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

      {/* Customer Reply Input */}
      {ticket.status !== 'closed' ? (
        <Card>
          <CardBody className="p-4">
            <form onSubmit={handleSendReply} className="space-y-3">
              <Input
                label="Add a reply"
                name="reply"
                as="textarea"
                rows={3}
                required
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
              />
              <div className="flex justify-end">
                <Button type="submit" variant="primary" loading={sending} disabled={!replyText.trim()}>
                  Send Reply
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : (
        <div className="p-4 text-center bg-slate-100 rounded-xl text-slate-500 text-sm">
          This ticket is closed and is no longer accepting replies.
        </div>
      )}
    </div>
  );
}
