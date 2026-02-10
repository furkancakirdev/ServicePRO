import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

interface User {
    id: string;
    ad: string;
    email: string;
    password: string;
    rol: 'admin' | 'yetkili';
    aktif: boolean;
}

function getUsers(): User[] {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            return [];
        }
        const content = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error('Error reading users:', error);
        return [];
    }
}

function saveUsers(users: User[]): void {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// GET all users
export async function GET(request: Request) {
    try {
        const auth = await requireAuth(request, ['ADMIN']);
        if (!auth.ok) return auth.response;

        const users = getUsers();
        // Remove passwords from response
        const sanitizedUsers = users.map(({ id, ad, email, rol, aktif }) => ({ id, ad, email, rol, aktif }));
        return NextResponse.json(sanitizedUsers);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

// POST create new user
export async function POST(request: Request) {
    try {
        const auth = await requireAuth(request, ['ADMIN']);
        if (!auth.ok) return auth.response;

        const body = await request.json();
        const users = getUsers();

        // Check if email already exists
        if (users.some(u => u.email.toLowerCase() === body.email.toLowerCase())) {
            return NextResponse.json({ error: 'Bu e-posta zaten kullanımda' }, { status: 400 });
        }

        const newUser: User = {
            id: `U${Date.now()}`,
            ad: body.ad,
            email: body.email,
            password: body.password || 'servicepro123',
            rol: body.rol || 'yetkili',
            aktif: true,
        };

        users.push(newUser);
        saveUsers(users);

        const userWithoutPassword = {
            id: newUser.id,
            ad: newUser.ad,
            email: newUser.email,
            rol: newUser.rol,
            aktif: newUser.aktif,
        };
        return NextResponse.json(userWithoutPassword, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

