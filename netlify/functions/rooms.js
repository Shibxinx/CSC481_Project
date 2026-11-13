import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async (req, context) => {
  // 1. หน้าห้องใช้ GET Method ในการดึงข้อมูล
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      headers: { "Content-Type": "application/json" },
      status: 405 
    });
  }

  try {
    // 2. ดึงข้อมูลรายการห้องทั้งหมดจากตาราง 'room' ใน Supabase
    const { data, error } = await supabase
      .from('room')
      .select('*');

    if (error) {
      throw error;
    }

    // 3. ส่งข้อมูลกลับไปให้หน้าเว็บเป็น JSON Array ตรงๆ
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
};