import Navbar from "@/components/Navbar";
import { SocketProvider } from "@/contexts/SocketProvider";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SocketProvider role={'candidate'}>
      <Navbar />
      {children}
    </SocketProvider>
  );
}