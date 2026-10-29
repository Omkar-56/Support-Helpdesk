import React from 'react';

export function Badge({ children, variant = 'default', size = 'md', className = '' }) {
  const base = 'inline-flex items-center font-medium rounded-full';

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  const variants = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    open: 'bg-blue-50 text-blue-700 border border-blue-200',
    in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',
    resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    closed: 'bg-slate-200 text-slate-800 border border-slate-300',
    overdue: 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold animate-pulse',
    sla_ok: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    sla_done: 'bg-slate-100 text-slate-600 border border-slate-200',
    ai: 'bg-purple-50 text-purple-700 border border-purple-200',
    internal: 'bg-amber-100 text-amber-900 border border-amber-300',
  };

  return (
    <span className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const labelMap = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
  };

  return <Badge variant={status}>{labelMap[status] || status}</Badge>;
}

export function SlaBadge({ ticket }) {
  // If ticket is already resolved or closed
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    return <Badge variant="sla_done" size="sm">SLA Closed</Badge>;
  }

  // If a public agent reply exists, SLA is fulfilled!
  if (ticket.has_public_agent_reply) {
    return (
      <Badge variant="sla_ok" size="sm">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
        SLA Met (Replied)
      </Badge>
    );
  }

  // If overdue:
  const isOverdue = ticket.is_overdue || (new Date(ticket.first_response_due_at) < new Date());
  if (isOverdue) {
    return (
      <Badge variant="overdue" size="sm">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-600"></span>
        SLA Overdue
      </Badge>
    );
  }

  // Calculate remaining time
  const msLeft = new Date(ticket.first_response_due_at) - new Date();
  const hoursLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60)));

  return (
    <Badge variant="sla_ok" size="sm">
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500"></span>
      SLA Due: {hoursLeft}h {minutesLeft}m
    </Badge>
  );
}
