// api/admin.js — Vercel Serverless Function
// GET    /api/admin?password=xxx          → fetch all comments for moderation
// DELETE /api/admin?password=xxx&id=123   → delete a comment and its replies

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

function checkAuth(req, res) {
  const password = req.query.password || req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req, res)) return;

  // ── GET all comments ─────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const comments = await sql`
        SELECT id, parent_id, name, body, created_at
        FROM comments
        ORDER BY created_at DESC
      `;
      return res.status(200).json({ comments });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
  }

  // ── DELETE a comment and all its replies ─────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id is required' });

    try {
      // Delete replies first, then the comment itself
      await sql`DELETE FROM comments WHERE parent_id = ${id}`;
      await sql`DELETE FROM comments WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to delete comment' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
