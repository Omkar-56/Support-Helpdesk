import { query } from '../db/index.js';

export class AiService {
  /**
   * Calls Gemini API in the background with an 8-second timeout to categorize and draft a reply.
   * Updates ticket row with ai_category, ai_draft_reply, and ai_status ('completed' or 'failed').
   */
  static processTicketInBackground(ticketId, subject, description) {
    // Non-blocking invocation; errors are caught and logged inside
    this.generateDraftAndCategory(ticketId, subject, description).catch((err) => {
      console.error(`[AI Service] Unexpected background processing error for ticket #${ticketId}:`, err.message);
    });
  }

  static async generateDraftAndCategory(ticketId, subject, description) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn(`[AI Service] GEMINI_API_KEY is not set. Marking ticket #${ticketId} as failed.`);
      await query("UPDATE tickets SET ai_status = 'failed', updated_at = NOW() WHERE id = $1", [ticketId]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    try {
      const prompt = `You are a helpful customer support AI assistant. 
Analyze the following support ticket and return ONLY a valid JSON object with exactly two keys:
1. "category": a short 1-3 word category (e.g., "Billing", "Technical Issue", "Account Access", "Feature Request", "General Inquiry").
2. "draft_reply": a polite, professional, and empathetic first-response draft that a human support agent can review and send to the customer.

Ticket Subject: ${subject}
Ticket Description: ${description}

Respond strictly with valid JSON without any markdown or code blocks.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('No content returned in Gemini API response');
      }

      // Parse JSON from text
      let parsed;
      try {
        parsed = JSON.parse(rawText.trim());
      } catch (parseErr) {
        // Fallback: extract JSON substring if any markdown wrapper was added
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse JSON response from Gemini');
        }
      }

      const category = parsed.category || 'General Inquiry';
      const draftReply = parsed.draft_reply || '';

      await query(
        `UPDATE tickets
         SET ai_category = $1, ai_draft_reply = $2, ai_status = 'completed', updated_at = NOW()
         WHERE id = $3`,
        [category, draftReply, ticketId]
      );

      console.log(`[AI Service] Successfully generated AI draft for ticket #${ticketId}`);
    } catch (err) {
      clearTimeout(timeout);
      console.warn(`[AI Service] Failed or timed out for ticket #${ticketId}:`, err.message);

      // If failed or aborted, set ai_status = 'failed'
      await query(
        `UPDATE tickets
         SET ai_status = 'failed', updated_at = NOW()
         WHERE id = $1`,
        [ticketId]
      ).catch((dbErr) => {
        console.error(`[AI Service] Could not update failed status for ticket #${ticketId}:`, dbErr.message);
      });
    }
  }
}
