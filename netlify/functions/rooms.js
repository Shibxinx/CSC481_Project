import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async (req, context) => {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { "Content-Type": "application/json" },
      status: 405
    });
  }

  try {
    const { data, error } = await supabase
      .from('room')
      .select('*');

    if (error) {
      throw error;
    }

    // แปลงชื่อฟิลด์และกำหนดชื่อสถานะตาม RoomStatusID
    const formattedRooms = (data || []).map(room => {
      let statusName = 'ว่าง';
      if (room.RoomStatusID === 2) statusName = 'จองแล้ว';
      if (room.RoomStatusID === 3) statusName = 'เช่าอยู่';

      return {
        id: room.RoomID,
        buildingID: room.BuildingID,
        roomNumber: room.RoomNumber,
        floor: room.Floor,
        roomTypeID: room.RoomTypeID,
        roomStatusID: room.RoomStatusID,
        statusName: statusName, // ส่งชื่อสถานะไปให้หน้าเว็บ
        areaSqm: Number(room.AreaSqm || 0),      // ขนาดพื้นที่สำหรับคำนวณค่าส่วนกลาง
        description: room.Description,
        price: Number(room.BaseRent || 0),       // ค่าเช่าห้อง
        image: room.ImageUrl                     // รูปภาพ
      };
    });

    return new Response(JSON.stringify(formattedRooms), {
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