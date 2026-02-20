'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface User {
  id: string;
  ad: string;
  email: string;
  rol: 'admin' | 'yetkili';
  aktif: boolean;
}

export default function KullanicilarPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({ ad: '', email: '', password: '', rol: 'yetkili' as 'admin' | 'yetkili' });

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    void loadUsers();
  }, [isLoading, user, router]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (!res.ok) throw new Error('Kullanıcı listesi alınamadı');
      const data = (await res.json()) as User[];
      setUsers(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newUser),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof body?.error === 'string' ? body.error : 'Kullanıcı oluşturulamadı');

      setShowForm(false);
      setNewUser({ ad: '', email: '', password: '', rol: 'yetkili' });
      toast.success('Kullanıcı oluşturuldu');
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kullanıcı oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  if (loading || isLoading) {
    return <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-6 text-sm text-slate-300">Kullanıcılar yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      <header className="hero-panel flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ayarlar">
            <Button variant="secondary" size="icon" aria-label="Ayarlar sayfasına dön">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="page-title">Kullanıcı Yönetimi</h1>
            <p className="page-subtitle">Toplam {users.length} kullanıcı</p>
          </div>
        </div>
        <Button onClick={() => setShowForm((prev) => !prev)} className="gap-2">
          <Plus className="h-4 w-4" />
          {showForm ? 'Formu Kapat' : 'Yeni Kullanıcı'}
        </Button>
      </header>

      {showForm ? (
        <Card className="surface-panel border-slate-800/80 bg-slate-950/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <UserPlus className="h-4 w-4 text-sky-300" />
              Yeni Kullanıcı Ekle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddUser} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input value={newUser.ad} onChange={(e) => setNewUser((prev) => ({ ...prev, ad: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input type="email" value={newUser.email} onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Şifre</Label>
                <Input type="password" placeholder="Boş bırakılırsa varsayılan atanır" value={newUser.password} onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={newUser.rol} onValueChange={(value) => setNewUser((prev) => ({ ...prev, rol: value as 'admin' | 'yetkili' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yetkili">Yetkili</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kullanıcıyı Kaydet'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="surface-panel border-slate-800/80 bg-slate-950/50">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400">Kullanıcı kaydı bulunamadı</TableCell>
                </TableRow>
              ) : (
                users.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-slate-100">{item.ad}</TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.rol === 'admin' ? 'bg-sky-500/20 text-sky-200' : 'bg-violet-500/20 text-violet-200'}`}>
                        {item.rol === 'admin' ? 'Admin' : 'Yetkili'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.aktif ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
                        {item.aktif ? 'Aktif' : 'Pasif'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
