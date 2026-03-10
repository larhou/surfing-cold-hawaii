// api/comments.js — Vercel Serverless Function
// GET  /api/comments?parent_id=  → list comments (optionally replies to a parent)
// POST /api/comments              → create a new comment or reply

import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const sql = neon(process.env.DATABASE_URL);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      // Fetch all top-level comments with their reply counts
      const comments = await sql`
        SELECT
          c.id, c.name, c.body, c.created_at,
          COUNT(r.id)::int AS reply_count
        FROM comments c
        LEFT JOIN comments r ON r.parent_id = c.id
        WHERE c.parent_id IS NULL
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;

      // Fetch all replies
      const replies = await sql`
        SELECT id, parent_id, name, body, created_at
        FROM comments
        WHERE parent_id IS NOT NULL
        ORDER BY created_at ASC
      `;

      return res.status(200).json({ comments, replies });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, body, parent_id } = req.body;

    if (!name || !body) {
      return res.status(400).json({ error: 'Name and comment are required' });
    }
    if (name.length > 80 || body.length > 2000) {
      return res.status(400).json({ error: 'Input too long' });
    }

    try {
      const [comment] = await sql`
        INSERT INTO comments (name, body, parent_id)
        VALUES (${name.trim()}, ${body.trim()}, ${parent_id || null})
        RETURNING id, name, body, parent_id, created_at
      `;

      // ── Email notification ──────────────────────────────────────────────
      if (process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL) {
        const isReply = !!parent_id;
        await resend.emails.send({
          from: 'Cold Hawaii <onboarding@resend.dev>',
          to: process.env.NOTIFY_EMAIL,
          subject: isReply
            ? `🏄 New reply on Cold Hawaii from ${name}`
            : `🌊 New comment on Cold Hawaii from ${name}`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
              <h2 style="color:#2B8FAD;">🌊 Cold Hawaii — New ${isReply ? 'Reply' : 'Comment'}</h2>
              <p><strong>From:</strong> ${name}</p>
              <p><strong>Message:</strong></p>
              <blockquote style="border-left:3px solid #FA6436;padding:8px 16px;color:#333;">
                ${body.replace(/\n/g, '<br>')}
              </blockquote>
              <p style="margin-top:24px;">
                <a href="${process.env.SITE_URL || 'https://coldhawaiirockandroller.com'}/#comments"
                   style="background:#FA6436;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">
                  View on site
                </a>
                &nbsp;
                <a href="${process.env.SITE_URL || 'https://coldhawaiirockandroller.com'}/admin"
                   style="background:#2B8FAD;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">
                  Manage in admin
                </a>
              </p>
              <p style="color:#999;font-size:12px;margin-top:24px;">Cold Hawaii Rock and Roller</p>
            </div>
          `,
        }).catch(e => console.error('Email error:', e));
      }

      return res.status(201).json(comment);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to save comment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
