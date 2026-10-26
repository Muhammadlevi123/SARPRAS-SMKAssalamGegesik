import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home() {
  // Sudah login → panel admin, belum → halaman login
  redirect((await getSession()) ? "/admin" : "/login");
}