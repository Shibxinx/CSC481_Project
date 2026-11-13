import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { username, password } = await req.json();

    // 1. เช็ค Admin จาก Environment Variables
    const adminUser = process.env.ADMIN_USERNAME || 'Admin';
    const adminPass = process.env.ADMIN_PASSWORD || '24862486';

    if (username === adminUser && password === adminPass) {
      return new Response(JSON.stringify({
        message: 'Login สำเร็จ',
        user: {
          userId: 0,
          username: adminUser,
          roleId: 1,
          roleName: 'Admin',
          name: 'ผู้ดูแลระบบ',
          roomNumber: null,
          roomId: null,
          tenantId: null
        }
      }), { headers: { "Content-Type": "application/json" }, status: 200 });
    }

    // 2. ค้นหา User ใน Supabase
    const { data: users, error } = await supabase
      .from('user')
      .select(`
        UserID, Username, Password, RoleID, OwnerID,
        userrole:RoleID(RoleName)
      `)
      .eq('Username', username);

    if (error || !users.length) {
      return new Response(JSON.stringify({ error: 'ไม่พบชื่อผู้ใช้งานนี้ในระบบ' }), { status: 401 });
    }

    const user = users[0];
    if (user.Password !== password) {
      return new Response(JSON.stringify({ error: 'รหัสผ่านไม่ถูกต้อง' }), { status: 401 });
    }

    let userInfo = {
      userId: user.UserID,
      username: user.Username,
      roleId: user.RoleID,
      roleName: user.userrole?.RoleName || '',
      name: user.Username,
      roomNumber: null,
      roomId: null,
      tenantId: null
    };

    // ถ้าเป็น Owner ให้ดึงข้อมูลชื่อและห้องพักเพิ่ม
    if (user.OwnerID) {
      const { data: ownerData } = await supabase
        .from('owner')
        .select('FirstName, LastName')
        .eq('OwnerID', user.OwnerID)
        .single();

      if (ownerData) {
        userInfo.name = `${ownerData.FirstName} ${ownerData.LastName}`;
      }

      const { data: roomOwnerData } = await supabase
        .from('roomowner')
        .select('room:RoomID(RoomID, RoomNumber)')
        .eq('OwnerID', user.OwnerID);

      if (roomOwnerData && roomOwnerData.length > 0 && roomOwnerData[0].room) {
        userInfo.roomId = roomOwnerData[0].room.RoomID;
        userInfo.roomNumber = roomOwnerData[0].room.RoomNumber;
      }
    }

    return new Response(JSON.stringify({ message: 'Login สำเร็จ', user: userInfo }), {
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
