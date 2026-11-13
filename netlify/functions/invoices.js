import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405, headers: { "Content-Type": "application/json" } 
    });
  }

  try {
    const { roomId, billingMonth, waterUnits, electricUnits } = await req.json();

    // 1. ดึงข้อมูลห้อง (BaseRent และ AreaSqm) จากตาราง room
    const { data: room, error: roomErr } = await supabase
      .from('room')
      .select('RoomID, RoomNumber, BaseRent, AreaSqm')
      .eq('RoomID', roomId)
      .single();

    if (roomErr || !room) throw new Error('ไม่พบข้อมูลห้องพักที่เลือก');

    // 2. คำนวณยอดค่าใช้จ่ายแต่ละรายการ
    const rentAmount = Number(room.BaseRent || 0);
    const areaSqm = Number(room.AreaSqm || 0);
    const commonFee = areaSqm * 30;
    
    const wUnits = Number(waterUnits || 0);
    const waterRate = 10; // เรทค่าน้ำ 10 บ./หน่วย
    const waterAmount = wUnits * waterRate;

    const eUnits = Number(electricUnits || 0);
    const electricRate = 7; // เรทค่าไฟ 7 บ./หน่วย
    const electricAmount = eUnits * electricRate;

    const totalAmount = rentAmount + commonFee + waterAmount + electricAmount;

    // 3. กำหนดวันที่ออกบิล (IssueDate) และวันครบกำหนดชำระ (+7 วัน)
    const today = new Date();
    const issueDate = today.toISOString().split('T')[0];
    const due = new Date(today);
    due.setDate(due.getDate() + 7);
    const dueDate = due.toISOString().split('T')[0];

    // 4. บันทึกหัวบิลลงตาราง 'invoice'
    const { data: invoice, error: invErr } = await supabase
      .from('invoice')
      .insert([{
        RoomID: room.RoomID,
        BillingMonth: billingMonth,
        IssueDate: issueDate,
        DueDate: dueDate,
        TotalAmount: totalAmount,
        InvoiceStatus: 'Pending' // หรือ 'ค้างชำระ' ตามที่ระบบใช้
      }])
      .select()
      .single();

    if (invErr) throw invErr;

    const itemsToInsert = [
      {
        InvoiceID: invoice.InvoiceID,
        ChargeTypeID: 1, // ค่าเช่าห้องพัก (Room Rent)
        Description: `ค่าเช่าห้องพัก (${room.RoomNumber}) ประจำเดือน ${billingMonth}`,
        Quantity: 1,
        UnitPrice: rentAmount,
        Amount: rentAmount
      },
      {
        InvoiceID: invoice.InvoiceID,
        ChargeTypeID: 2, // ค่าน้ำประปา (Water Supply)
        Description: `ค่าน้ำประปา (${wUnits} หน่วย)`,
        Quantity: wUnits,
        UnitPrice: waterRate,
        Amount: waterAmount
      },
      {
        InvoiceID: invoice.InvoiceID,
        ChargeTypeID: 3, // ค่าไฟฟ้า (Electricity)
        Description: `ค่าไฟฟ้า (${eUnits} หน่วย)`,
        Quantity: eUnits,
        UnitPrice: electricRate,
        Amount: electricAmount
      },
      {
        InvoiceID: invoice.InvoiceID,
        ChargeTypeID: 4, // ค่าส่วนกลาง (Common Fee)
        Description: `ค่าส่วนกลาง (${areaSqm} ตร.ม. × 30 บาท)`,
        Quantity: Math.round(areaSqm) || 1,
        UnitPrice: 30,
        Amount: commonFee
      }
    ];

    const { error: itemsErr } = await supabase
      .from('invoiceitem')
      .insert(itemsToInsert);

    if (itemsErr) throw itemsErr;

    return new Response(JSON.stringify({ 
      message: 'บันทึกใบแจ้งหนี้สำเร็จ', 
      invoiceId: invoice.InvoiceID,
      totalAmount 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};