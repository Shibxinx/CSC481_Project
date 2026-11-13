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
      const { repairStatusId } = await req.json();

      if (!repairStatusId) {
        return new Response(JSON.stringify({ error: 'กรุณาระบุสถานะซ่อม' }), { status: 400 });
      }

      const { error } = await supabase
        .from('repairrequest')
        .update({ RepairStatusID: repairStatusId })
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
        .select(`
          RequestID, RoomID, Title, Description, ReportDate, Priority, RepairCost,
          room:RoomID(RoomNumber),
          repairstatus:RepairStatusID(StatusName)
        `)
        .order('ReportDate', { ascending: false });

      if (roleId !== '1' && roomId) {
        query = query.eq('RoomID', roomId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formatted = data.map(rr => ({
        id: rr.RequestID,
        roomId: rr.RoomID,
        roomNumber: rr.room?.RoomNumber || '',
        title: rr.Title,
        description: rr.Description,
        reportDate: rr.ReportDate,
        priority: rr.Priority,
        repairStatusID: rr.RepairStatusID,
        statusName: rr.repairstatus?.StatusName || 'รอการดำเนินการ',
        repairCost: rr.RepairCost
      }));

      return new Response(JSON.stringify(formatted), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    }

    // POST /api/repairs (สร้างใบแจ้งซ่อมใหม่)
    if (method === 'POST') {
      const { roomId, tenantId, title, description, priority } = await req.json();
      if (!roomId || !title) {
        return new Response(JSON.stringify({ error: 'กรุณาระบุข้อมูลให้ครบถ้วน' }), { status: 400 });
      }

      const { error } = await supabase.from('repairrequest').insert([{
        RoomID: roomId,
        TenantID: tenantId || 1,
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
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
};

