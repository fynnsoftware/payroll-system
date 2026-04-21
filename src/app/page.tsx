// src/app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // สั่งให้ใครก็ตามที่เข้ามาที่หน้า / (หน้าแรก) โดนเด้งไปหน้า /login ทันที
  redirect('/employee/login');
}