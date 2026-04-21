// src/app/api/send-email/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { to, subject, body } = await request.json();

    // 🌟 1. Validation
    if (!to || to.trim() === "" || to === "-") {
      return NextResponse.json(
        { error: "ไม่พบอีเมลผู้รับ กรุณาระบุอีเมลในข้อมูลพนักงาน" },
        { status: 400 },
      );
    }

    if (!subject || !body) {
      return NextResponse.json(
        { error: "ข้อมูลหัวข้อหรือเนื้อหาอีเมลไม่ครบถ้วน" },
        { status: 400 },
      );
    }

    // 🌟 2. ตั้งค่า SMTP ตรงกับ GoDaddy Webmail ของคุณ
    const transporter = nodemailer.createTransport({
      host: "smtpout.secureserver.net", // Outgoing server จากข้อมูลคุณ
      port: 465, // Port SMTP (SSL)
      secure: true, // ใช้ true เพราะเป็นพอร์ต 465
      auth: {
        user: process.env.SMTP_EMAIL, // fynn@fynnsoft.com
        pass: process.env.SMTP_PASSWORD, // รหัสผ่านล็อกอินอีเมลปกติ
      },
      // ใส่ tls ไว้กันเหนียว เผื่อเจอปัญหาใบรับรอง SSL
      tls: {
        rejectUnauthorized: false,
      },
    });

    // 🌟 3. เตรียมข้อมูลส่ง
    const mailOptions = {
      from: `"Payroll System" <${process.env.SMTP_EMAIL}>`,
      to: to,
      subject: subject,
      // text: body,  <-- ลบหรือคอมเมนต์บรรทัดนี้ทิ้งไปเลยครับ
      html: body.replace(/\n/g, "<br>"), // <-- ใช้บรรทัดนี้แทน
    };

    // 🌟 4. สั่งส่งเมล
    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { message: "ส่งอีเมลสำเร็จแล้ว" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Send Email Error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถส่งอีเมลได้: " + (error.message || "Unknown Error") },
      { status: 500 },
    );
  }
}

//gmail
// export async function POST(request: Request) {
//   try {
//     const { to, subject, body } = await request.json();

//     if (!to || !subject || !body) {
//       return NextResponse.json(
//         { error: "ข้อมูลสำหรับส่งอีเมลไม่ครบถ้วน" },
//         { status: 400 },
//       );
//     }

//     // 🌟 1. ตั้งค่า Server ส่งอีเมลเป็น Gmail (ดึงรหัสผ่านจากไฟล์ .env)
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.SMTP_EMAIL, // 👈 อีเมล Gmail ของคุณ
//         pass: process.env.SMTP_PASSWORD, // 👈 App Password 16 ตัวอักษร
//       },
//     });

//     // 🌟 2. จัดเตรียมเนื้อหาอีเมล
//     const mailOptions = {
//       from: `"Payroll System" <${process.env.SMTP_EMAIL}>`, // ชื่อผู้ส่ง
//       to: to,
//       subject: subject,
//       text: body, // ข้อความแบบธรรมดา (Plain Text)

//       // 💡 โบนัส: ถ้าอยากให้ข้อความมีการขึ้นบรรทัดใหม่สวยๆ เปิดใช้ html ด้านล่างแทน text ได้ครับ
//       // html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${body.replace(/\n/g, '<br>')}</div>`,
//     };

//     // 🌟 3. สั่งส่งอีเมลของจริง!
//     const info = await transporter.sendMail(mailOptions);

//     // ปริ้นท์บอกใน Terminal ว่าส่งผ่านแล้ว
//     console.log("----------------------------------------");
//     console.log("✅ ส่งอีเมลสำเร็จ!");
//     console.log("ผู้รับ:", info.accepted);
//     console.log("Message ID:", info.messageId);
//     console.log("----------------------------------------");

//     return NextResponse.json(
//       { message: "ส่งอีเมลแจ้งเตือนสำเร็จ!" },
//       { status: 200 },
//     );
//   } catch (error: any) {
//     console.error("Send Email Error:", error);
//     return NextResponse.json(
//       { error: "ไม่สามารถส่งอีเมลได้ กรุณาตรวจสอบการตั้งค่า SMTP ในไฟล์ .env" },
//       { status: 500 },
//     );
//   }
// }
