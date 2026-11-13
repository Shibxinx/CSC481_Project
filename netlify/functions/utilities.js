import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);


export default async (req) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean); // ['api', 'utilities', 'A101']
  const roomNumber = pathParts[2];

  if (req.method !== 'GET' || !roomNumber) {
    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
  }

  try {
    // 1. ค้นหา RoomID จาก RoomNumber ก่อน
    const { data: roomData, error: roomErr } = await supabase
      .from('room')
      .select('RoomID, RoomNumber')
      .eq('RoomNumber', roomNumber)
      .single();

    if (roomErr || !roomData) {
      return new Response(JSON.stringify({ error: 'ไม่พบข้อมูลห้องนี้' }), { status: 404 });
    }

    // 2. ดึงข้อมูลมิเตอร์ล่าสุดของห้องนั้น
    const { data: meterData, error: meterErr } = await supabase
      .from('meterreading')
      .select('*')
      .eq('RoomID', roomData.RoomID)
      .order('BillingMonth', { ascending: false })
      .limit(1)
      .single();

    if (meterErr || !meterData) {
      return new Response(JSON.stringify({ error: 'ไม่พบข้อมูลค่าน้ำค่าไฟของห้องนี้' }), { status: 404 });
    }

    return new Response(JSON.stringify({ ...meterData, RoomNumber: roomData.RoomNumber }), {
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
