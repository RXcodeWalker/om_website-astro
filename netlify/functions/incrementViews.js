const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const postId = event.queryStringParameters.id;

  if (!postId) {
    return {
      statusCode: 400,
      body: 'Missing post id',
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Insert new view
  await supabase
    .from('post_views')
    .insert([{ post_id: postId }]);

  // Count total views
  const { count } = await supabase
    .from('post_views')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  return {
    statusCode: 200,
    body: JSON.stringify({ views: count }),
  };
};

