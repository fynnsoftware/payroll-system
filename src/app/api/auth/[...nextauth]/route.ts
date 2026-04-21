// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username/Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน");
        }

        // ค้นหา User และดึงข้อมูล Employee ที่เชื่อมโยงกันมาด้วย
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: credentials.username },
              { username: credentials.username },
            ],
          },
          include: {
            employee: true,
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error("ไม่พบผู้ใช้งานนี้ในระบบ หรือรหัสผ่านไม่ถูกต้อง");
        }

        // ดักจับกรณีพนักงานถูกระงับการใช้งาน
        if (user.employee && user.employee.isActive === false) {
          throw new Error(
            "บัญชีนี้ถูกระงับการใช้งาน (Terminated) กรุณาติดต่อ HR",
          );
        }

        // ตรวจสอบรหัสผ่าน
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );

        if (!isPasswordValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

        // 🌟 คืนค่าข้อมูลที่จำเป็นออกไปฝังในระบบ (รวมถึง employeeId และ companyId)
        return {
          id: user.id,
          name: user.username,
          email: user.email,
          role: user.role ? user.role.toUpperCase() : "USER",
          employeeId: user.employee?.id || null,
          companyId: user.employee?.currentCompanyId || null, // 🎁 เพิ่ม companyId มาให้ด้วยครับ
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // 🌟 1. นำข้อมูลจาก authorize() มาฝังลงใน Token (ทำเฉพาะตอน Login ผ่านครั้งแรก)
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.employeeId = (user as any).employeeId;
        token.companyId = (user as any).companyId; // 👈 เก็บลง Token
      }
      return token;
    },
    // 🌟 2. ส่งต่อข้อมูลจาก Token ไปให้หน้าเว็บ (Client) ใช้งานผ่าน useSession()
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          employeeId: token.employeeId as string | null,
          companyId: token.companyId as number | null, // 👈 ส่งไปหน้าบ้าน
        },
      };
    },
  },
  // 🚩 หมายเหตุ: ปรับ path ตรงนี้ให้ตรงกับหน้า login ของคุณ
  // (เช่น ถ้าแอดมินเข้าผ่าน /admin/login ก็อาจจะต้องแก้ตรงนี้ หรือปล่อยไว้ถ้าใช้หน้าเดียวกันครับ)
  pages: { signIn: "/login" },
});

export { handler as GET, handler as POST };
