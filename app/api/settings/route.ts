import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');
type SettingsData = Record<string, unknown>;

function getSettings() {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) {
            return {};
        }
        const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        return JSON.parse(content) as SettingsData;
    } catch (error) {
        console.error('Error reading settings:', error);
        return {};
    }
}

function saveSettings(settings: SettingsData): void {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// GET settings
export async function GET(request: Request) {
    try {
        const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
        if (!auth.ok) return auth.response;

        const settings = getSettings();
        return NextResponse.json(settings);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

// PUT update settings
export async function PUT(request: Request) {
    try {
        const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
        if (!auth.ok) return auth.response;

        const body = (await request.json()) as SettingsData;
        const currentSettings = getSettings();
        const updatedSettings = { ...currentSettings, ...body };
        saveSettings(updatedSettings);
        return NextResponse.json(updatedSettings);
    } catch {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
