import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async (req, context) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const roomId = pathParts[pathParts.length - 1];

    // ค้นหาโดยใช้ชื่อคอลัมน์ "RoomID" ตามตารางจริงใน Supabase
    const { data, error } = await supabase
      .from('room')
      .select('*')
      .eq('RoomID', roomId)
      .single();

    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ error: 'ไม่พบข้อมูลห้อง' }), { 
        status: 404, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Mapping ชื่อฟิลด์ให้ตรงกับที่ Frontend รอรับ
    const formattedRoom = {
      id: data.RoomID,           // แปลง RoomID เป็น id สำหรับใช้งานฝั่งหน้าเว็บ
      buildingID: data.BuildingID,
      roomNumber: data.RoomNumber, // ตรงกับคอลัมน์ RoomNumber[cite: 16]
      floor: data.Floor,           // ตรงกับคอลัมน์ Floor[cite: 16]
      roomTypeID: data.RoomTypeID,
      roomStatusID: data.RoomStatusID,
      areaSqm: data.AreaSqm,       // ตรงกับคอลัมน์ AreaSqm[cite: 16]
      description: data.Description, // ตรงกับคอลัมน์ Description[cite: 16]
      price: data.BaseRent,      // ดึง BaseRent มาแสดงเป็นราคาค่าเช่า[cite: 16]
      image: data.ImageUrl         // ดึง ImageUrl มาแสดงรูปภาพ[cite: 16]
    };

    return new Response(JSON.stringify(formattedRoom), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};