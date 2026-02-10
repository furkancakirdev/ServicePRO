'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  ad: string;
  email: string;
  rol: 'admin' | 'yetkili';
  aktif: boolean;
}

export default function KullanicilarPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({ ad: '', email: '', password: '', rol: 'yetkili' });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.rol !== 'admin') {
      router.push('/');
      return;
    }
    loadUsers();
  }, [router]);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        setShowForm(false);
        setNewUser({ ad: '', email: '', password: '', rol: 'yetkili' });
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>Yükleniyor...</div>;
  }

  return (
    <div className="animate-fade-in">
      <header className="hero-panel" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <Link href="/ayarlar" className="btn btn-secondary" style={{ padding: 'var(--space-xs) var(--space-sm)' }}>
              ←
            </Link>
            <div>
              <h1 className="hero-title">Kullanıcı Yönetimi</h1>
              <p className="hero-subtitle">{users.length} kullanıcı</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'İptal' : 'Yeni Kullanıcı'}
          </button>
        </div>
      </header>

      {showForm && (
        <div className="surface-panel" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 className="card-title">Yeni Kullanıcı Ekle</h3>
          <form onSubmit={handleAddUser}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-md)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.85rem' }}>Ad Soyad</label>
                <input
                  type="text"
                  className="form-input"
                  value={newUser.ad}
                  onChange={(e) => setNewUser({ ...newUser, ad: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.85rem' }}>E-posta</label>
                <input
                  type="email"
                  className="form-input"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.85rem' }}>Şifre</label>
                <input
                  type="password"
                  className="form-input"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Varsayılan: servicepro123"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.85rem' }}>Rol</label>
                <select
                  className="form-select"
                  value={newUser.rol}
                  onChange={(e) => setNewUser({ ...newUser, rol: e.target.value as 'admin' | 'yetkili' })}
                  style={{ width: '100%' }}
                >
                  <option value="yetkili">Yetkili</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }}>
              Kullanıcı Ekle
            </button>
          </form>
        </div>
      )}

      <div className="surface-panel table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Kullanıcı</th>
              <th>E-posta</th>
              <th>Rol</th>
              <th>Durum</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: user.rol === 'admin' ? 'var(--color-primary)' : 'var(--color-info)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        color: 'white',
                        fontWeight: 700,
                      }}
                    >
                      {user.ad?.slice(0, 1).toUpperCase() || 'K'}
                    </div>
                    <span style={{ fontWeight: 500 }}>{user.ad}</span>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: user.rol === 'admin' ? 'var(--color-primary)' : 'var(--color-info)',
                      color: 'white',
                    }}
                  >
                    {user.rol === 'admin' ? 'Admin' : 'Yetkili'}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: user.aktif ? 'var(--color-success)' : 'var(--color-error)',
                      color: 'white',
                    }}
                  >
                    {user.aktif ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                    Düzenle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

