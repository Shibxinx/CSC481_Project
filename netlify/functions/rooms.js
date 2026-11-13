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

    // แปลงชื่อฟิลด์จาก Database ให้ตรงกับที่ Frontend คาดหวัง
    const formattedRooms = data.map(room => ({
      roomID: room.RoomID,
      buildingID: room.BuildingID,
      roomNumber: room.RoomNumber,
      floor: room.Floor,
      roomTypeID: room.RoomTypeID,
      roomStatusID: room.RoomStatusID,
      areaSqm: room.AreaSqm,
      description: room.Description,
      price: room.BaseRent,
      imageUrl: room.ImageUrl
    }));

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