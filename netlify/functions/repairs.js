import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async (req) => {
  const url = new URL(req.url);
  const method = req.method;
  const pathParts = url.pathname.split('/').filter(Boolean); // ['api', 'repairs', ...]

  try {
    // PUT /api/repairs/:id/status (อัปเดตสถานะการซ่อม)
    if (method === 'PUT' && pathParts.length === 4 && pathParts[3] === 'status') {
      const requestId = pathParts[2];
      const body = await req.json();
      const { repairStatusId } = body;

      if (!repairStatusId) {
        return new Response(JSON.stringify({ error: 'กรุณาระบุสถานะซ่อม' }), { status: 400 });
      }

      const { error } = await supabase
        .from('repairrequest')
        .update({ RepairStatusID: Number(repairStatusId) })
        .eq('RequestID', requestId);

      if (error) throw error;

      return new Response(JSON.stringify({ message: 'อัพเดทสถานะสำเร็จ' }), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    }

    // GET /api/repairs (ดึงรายการแจ้งซ่อม)
    if (method === 'GET') {
      const roomId = url.searchParams.get('roomId');
      const roleId = url.searchParams.get('roleId');

      let query = supabase
        .from('repairrequest')
        .select('*')
        .order('ReportDate', { ascending: false });

      if (roleId !== '1' && roomId) {
        query = query.eq('RoomID', roomId);
      }

      const { data: repairs, error: repairError } = await query;
      if (repairError) throw repairError;

      // ดึงข้อมูลห้องและสถานะมาประกอบแบบปลอดภัย ป้องกัน Error 500 กรณี Foreign Key ไม่สมบูรณ์
      const { data: rooms } = await supabase.from('room').select('RoomID, RoomNumber');
      const { data: statuses } = await supabase.from('repairstatus').select('RepairStatusID, StatusName');

      const roomMap = new Map((rooms || []).map(r => [r.RoomID, r.RoomNumber]));
      const statusMap = new Map((statuses || []).map(s => [s.RepairStatusID, s.StatusName]));

      const formatted = (repairs || []).map(rr => ({
        id: rr.RequestID,
        roomId: rr.RoomID,
        roomNumber: roomMap.get(rr.RoomID) || '-',
        title: rr.Title,
        description: rr.Description,
        reportDate: rr.ReportDate,
        priority: rr.Priority,
        repairStatusID: rr.RepairStatusID,
        statusName: statusMap.get(rr.RepairStatusID) || 'รอดำเนินการ',
        repairCost: rr.RepairCost || 0
      }));

      return new Response(JSON.stringify(formatted), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    }

    // POST /api/repairs (สร้างใบแจ้งซ่อมใหม่)
    if (method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
      }

      const { roomId, tenantId, title, description, priority } = body;
      if (!roomId || !title) {
        return new Response(JSON.stringify({ error: 'กรุณาระบุข้อมูลให้ครบถ้วน' }), { status: 400 });
      }

      const { error } = await supabase.from('repairrequest').insert([{
        RoomID: Number(roomId),
        TenantID: Number(tenantId || 1),
        Title: title,
        Description: description || '',
        ReportDate: new Date().toISOString().split('T')[0],
        Priority: priority || 'Normal',
        RepairStatusID: 1,
        RepairCost: 0.00
      }]);

      if (error) throw error;

      return new Response(JSON.stringify({ message: 'แจ้งซ่อมสำเร็จ' }), {
        headers: { "Content-Type": "application/json" },
        status: 201
      });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
  } catch (err) {
    console.error("API Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
};