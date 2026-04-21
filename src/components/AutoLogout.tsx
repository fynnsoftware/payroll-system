// src/components/AutoLogout.tsx
'use client';

import { useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';

interface AutoLogoutProps {
  timeoutSeconds?: number; // กำหนดเวลาเป็นวินาที (ตั้งค่าเริ่มต้นได้)
  redirectUrl: string;     // URL ที่จะให้เด้งไปตอนหมดเวลา
}

export default function AutoLogout({ timeoutSeconds = 600, redirectUrl }: AutoLogoutProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // ฟังก์ชันรีเซ็ตเวลา
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      
      // ตั้งเวลาใหม่
      timerRef.current = setTimeout(() => {
        // 🌟 หมดเวลาปุ๊บ สั่ง Logout ทันที
        signOut({ callbackUrl: redirectUrl });
      }, timeoutSeconds * 1000); // แปลงวินาทีเป็นมิลลิวินาที
    };

    // รายการ Action ที่ถือว่าผู้ใช้ยัง "ตื่น" อยู่
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    // ผูก Event เข้ากับหน้าเว็บ
    activityEvents.forEach(event => window.addEventListener(event, resetTimer));

    // เริ่มจับเวลาครั้งแรกทันทีที่โหลดหน้าเสร็จ
    resetTimer();

    // Cleanup: ถอด Event ออกเมื่อเปลี่ยนหน้า (กัน Memory Leak)
    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeoutSeconds, redirectUrl]);

  // คอมโพเนนต์นี้ทำหน้าที่เบื้องหลัง ไม่ต้องแสดงผล UI อะไรออกมา
  return null; 
}