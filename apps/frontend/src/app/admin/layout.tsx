import AdminNavbar from "@/components/AdminNavbar";
import { SocketProvider } from "@/contexts/SocketProvider";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SocketProvider role={'admin'}>
      <AdminNavbar />
      {children}
    </SocketProvider>
  );
}