import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const rawId = req.query?.id;
  const postId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!postId) {
    return res.status(400).json({ error: 'Missing id' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(500).json({
      error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in Vercel environment variables.',
    });
  }

  const supabase = createClient(url, key);

  const { error: insertError } = await supabase
    .from('post_views')
    .insert([{ post_id: postId }]);

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  const { count, error: countError } = await supabase
    .from('post_views')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (countError) {
    return res.status(500).json({ error: countError.message });
  }

  return res.status(200).json({ views: count });
}
