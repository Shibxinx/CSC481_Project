const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { roomId, billingMonth, waterUnits, electricUnits } = JSON.parse(event.body);

    // 1. ดึงข้อมูลห้อง (BaseRent และ AreaSqm)
    const { data: room, error: roomErr } = await supabase
      .from('room')
      .select('RoomID, RoomNumber, BaseRent, AreaSqm')
      .eq('RoomID', roomId)
      .single();

    if (roomErr || !room) throw new Error('ไม่พบข้อมูลห้องพักที่เลือก');

    // 2. คำนวณค่าใช้จ่าย
    const rentAmount = Number(room.BaseRent || 0);
    const areaSqm = Number(room.AreaSqm || 0);
    const commonFee = areaSqm * 30;
    
    const wUnits = Number(waterUnits || 0);
    const waterAmount = wUnits * 10; // ค่าน้ำหน่วยละ 10 บาท

    const eUnits = Number(electricUnits || 0);
    const electricAmount = eUnits * 7; // ค่าไฟหน่วยละ 7 บาท

    const totalAmount = rentAmount + commonFee + waterAmount + electricAmount;

    // 3. กำหนดวันที่
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
        InvoiceStatus: 'Pending'
      }])
      .select()
      .single();

    if (invErr) throw invErr;

    // 5. บันทึกรายการย่อยลงตาราง 'invoiceitem' (อิงตาม ChargeTypeID จริง)
    const itemsToInsert = [
      { InvoiceID: invoice.InvoiceID, ChargeTypeID: 1, Description: `ค่าเช่าห้องพัก (${room.RoomNumber}) ประจำเดือน ${billingMonth}`, Quantity: 1, UnitPrice: rentAmount, Amount: rentAmount },
      { InvoiceID: invoice.InvoiceID, ChargeTypeID: 4, Description: `ค่าส่วนกลาง (${areaSqm} ตร.ม. × 30 บาท)`, Quantity: Math.round(areaSqm) || 1, UnitPrice: 30, Amount: commonFee },
      { InvoiceID: invoice.InvoiceID, ChargeTypeID: 2, Description: `ค่าน้ำประปา (${wUnits} หน่วย)`, Quantity: wUnits, UnitPrice: 10, Amount: waterAmount },
      { InvoiceID: invoice.InvoiceID, ChargeTypeID: 3, Description: `ค่าไฟฟ้า (${eUnits} หน่วย)`, Quantity: eUnits, UnitPrice: 7, Amount: electricAmount }
    ];

    const { error: itemsErr } = await supabase
      .from('invoiceitem')
      .insert(itemsToInsert);

    if (itemsErr) throw itemsErr;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: 'บันทึกใบแจ้งหนี้สำเร็จ', invoiceId: invoice.InvoiceID, totalAmount })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message })
    };
  }
};