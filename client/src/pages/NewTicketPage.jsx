import React, { useState } from 'react';
import { api } from '../api';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card, CardHeader, CardBody } from '../components/common/Card';

export function NewTicketPage({ onSuccess, onCancel }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setAttachment(null);
      return;
    }

    // Client-side quick check
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Selected file exceeds the 5 MB limit');
      setAttachment(null);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Invalid file type. Only JPEG, PNG, WEBP, GIF, and PDF files are allowed.');
      setAttachment(null);
      return;
    }

    setErrorMessage('');
    setAttachment(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setFieldErrors({});

    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('description', description);
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const res = await api.createTicket(formData);
      onSuccess(res.ticket);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create ticket');
      if (err.details && Array.isArray(err.details)) {
        const errors = {};
        err.details.forEach((d) => {
          errors[d.field] = d.message;
        });
        setFieldErrors(errors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Support Ticket</h1>
          <p className="text-sm text-slate-500">
            Tell us about your issue. Our team guarantees a first response within 4 hours.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardBody className="p-6">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Subject"
              name="subject"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Cannot access invoice download page"
              error={fieldErrors.subject}
              helperText="Brief summary of the issue (min 3 chars)"
            />

            <Input
              label="Description"
              name="description"
              as="textarea"
              rows={5}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide full details of what happened, error messages, and steps to reproduce..."
              error={fieldErrors.description}
              helperText="Provide as much context as possible (min 10 chars)"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Optional Attachment
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-slate-400 transition-colors bg-slate-50">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-10 w-10 text-slate-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-slate-600 justify-center">
                    <label
                      htmlFor="attachment-upload"
                      className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                    >
                      <span>Upload a file</span>
                      <input
                        id="attachment-upload"
                        name="attachment"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    PNG, JPG, WEBP, GIF, PDF up to 5 MB
                  </p>
                  {attachment && (
                    <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-medium">
                      Selected: {attachment.name} ({(attachment.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={loading} size="lg">
                Submit Ticket
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
