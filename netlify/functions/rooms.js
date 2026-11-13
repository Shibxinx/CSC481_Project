import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async (req, context) => {
  const method = req.method;
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean); 
  // ตัวอย่าง pathSegments จะเป็น ['api', 'rooms', '1'] หรือ ['api', 'rooms']

  // 1. ถ้าเป็น GET: ดึงรายการห้องทั้งหมด
  if (method === 'GET' && (pathSegments.length === 2 || pathSegments[pathSegments.length - 1] === 'rooms')) {
    try {
      const { data, error } = await supabase.from('room').select('*');
      if (error) throw error;

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
          statusName: statusName,
          areaSqm: Number(room.AreaSqm || 0),
          description: room.Description,
          price: Number(room.BaseRent || 0),
          image: room.ImageUrl
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
  }

  // 2. ถ้าเป็น PUT หรือ PATCH: อัปเดตข้อมูลห้องตาม ID (เช่น /api/rooms/1)
  if ((method === 'PUT' || method === 'PATCH') && pathSegments.length >= 3) {
    try {
      const roomId = pathSegments[pathSegments.length - 1]; // ดึงเลข ID ห้องจาก URL ท้ายสุด
      const body = await req.json();

      const updateData = {};
      if (body.floor !== undefined) updateData.Floor = Number(body.floor);
      if (body.baseRent !== undefined) updateData.BaseRent = Number(body.baseRent);
      if (body.areaSqm !== undefined) updateData.AreaSqm = Number(body.areaSqm);
      if (body.roomStatusID !== undefined) updateData.RoomStatusID = Number(body.roomStatusID);
      if (body.description !== undefined) updateData.Description = body.description;

      const { data, error } = await supabase
        .from('room')
        .update(updateData)
        .eq('RoomID', roomId)
        .select();

      if (error) throw error;

      return new Response(JSON.stringify({ message: 'อัปเดตข้อมูลห้องพักสำเร็จ', data }), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        headers: { "Content-Type": "application/json" },
        status: 500
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    headers: { "Content-Type": "application/json" },
    status: 405
  });
};