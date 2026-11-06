'use client'
import Link from 'next/link';
import { Home, Users, UserSquare, CalendarCheck, GraduationCap, Settings } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Students', href: '/students', icon: Users },
    { name: 'Staff', href: '/staff', icon: UserSquare },
    { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
    { name: 'Results', href: '/results', icon: GraduationCap },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-600">School Manager</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.name} href={item.href} className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-blue-50">
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button onClick={handleLogout} className="w-full py-2 text-red-600 font-semibold border border-red-200 rounded-lg hover:bg-red-50">
            Log Out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-white p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Overview</h2>
          <span className="text-sm font-bold text-blue-600">Role: Owner</span>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}