export async function onRequest(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method === 'GET') {
    try {
      const list = await env.REWARDS_KV.list();
      const promises = list.keys.map(key => env.REWARDS_KV.get(key.name, { type: 'json' }));
      let values = await Promise.all(promises);
      values.sort((a, b) => new Date(b.date) - new Date(a.date));
      const responsePayload = { data: values };
      return new Response(JSON.stringify(responsePayload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  if (request.method === 'POST') {
    try {
      const { name, money, secret, time } = await request.json();
      if (secret !== env.FORM_SECRET) {
        return new Response('密码错误', { status: 403, headers: corsHeaders });
      }
      if (!name || !money) {
        return new Response('姓名和金额不能为空', { status: 400, headers: corsHeaders });
      }
      
      // --- 这里是唯一新增的内容 ---
      const parsedMoney = parseFloat(money);
      if (isNaN(parsedMoney) || parsedMoney < 1 || parsedMoney > 10000) {
        return new Response('金额必须在1元至10000元之间', { status: 400, headers: corsHeaders });
      }
      // --- 新增内容结束 ---

      let recordDate = time ? new Date(time + ':00+08:00') : new Date();
      if (isNaN(recordDate.getTime())) {
        return new Response('提供的日期时间格式无效', { status: 400, headers: corsHeaders });
      }
      const id = new Date().getTime().toString();
      const record = {
        name: name,
        money: parsedMoney, // 这里使用了上面转换好的金额
        date: recordDate.toISOString(),
      };
      await env.REWARDS_KV.put(id, JSON.stringify(record));
      return new Response(JSON.stringify({ success: true, record }), { headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}