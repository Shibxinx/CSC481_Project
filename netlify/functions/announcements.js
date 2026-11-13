import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async (req) => {
  const method = req.method;

  try {
    // GET /api/announcements (ดึงรายการประกาศทั้งหมด)
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('announcement')
        .select('AnnouncementID, Title, Content, AnnouncementType, PublishDate')
        .eq('IsActive', true)
        .order('PublishDate', { ascending: false });

      if (error) throw error;

      const formatted = data.map(a => ({
        id: a.AnnouncementID,
        title: a.Title,
        content: a.Content,
        priority: a.AnnouncementType,
        date: a.PublishDate
      }));

      return new Response(JSON.stringify(formatted), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    }

    // POST /api/announcements (สร้างประกาศใหม่)
    if (method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
      }

      const { userId, title, content, announcementType, publishDate } = body;

      if (!title || !content) {
        return new Response(JSON.stringify({ error: 'กรุณาระบุหัวข้อและเนื้อหาประกาศให้ครบถ้วน' }), { status: 400 });
      }

      const { error } = await supabase.from('announcement').insert([{
        CreatedByUserID: Number(userId || 1), // ตรวจสอบให้แน่ใจว่าเป็น ID ที่มีอยู่จริงในตารางผู้ใช้
        Title: title,
        Content: content,
        AnnouncementType: announcementType || 'General',
        PublishDate: publishDate || new Date().toISOString().split('T')[0],
        IsActive: true
      }]);

      if (error) {
        console.error("Announcement Insert Error:", error);
        throw error;
      }

      return new Response(JSON.stringify({ message: 'สร้างประกาศสำเร็จ' }), {
        headers: { "Content-Type": "application/json" },
        status: 201
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
};
