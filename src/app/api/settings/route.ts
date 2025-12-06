import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// API Settings keys
const API_SETTINGS_KEYS = [
    'PERFEX_API_URL',
    'PERFEX_API_KEY',
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
];

// Get all settings
export async function GET() {
    try {
        const settings = await db.systemSetting.findMany({
            where: {
                key: {
                    in: API_SETTINGS_KEYS
                }
            }
        });

        // Convert to object format
        const settingsObj: Record<string, string | null> = {};
        for (const key of API_SETTINGS_KEYS) {
            const setting = settings.find(s => s.key === key);
            // For encrypted values (API keys), mask the value
            if (setting?.encrypted && setting.value) {
                settingsObj[key] = '••••••••' + setting.value.slice(-4);
            } else {
                settingsObj[key] = setting?.value || null;
            }
        }

        // Also include ENV values as fallback (masked)
        if (!settingsObj.PERFEX_API_URL && process.env.PERFEX_API_URL) {
            settingsObj.PERFEX_API_URL = process.env.PERFEX_API_URL;
        }

        return NextResponse.json({
            success: true,
            settings: settingsObj
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

// Update settings
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { settings } = body;

        if (!settings || typeof settings !== 'object') {
            return NextResponse.json(
                { error: 'Invalid settings data' },
                { status: 400 }
            );
        }

        const results = [];

        for (const [key, value] of Object.entries(settings)) {
            if (!API_SETTINGS_KEYS.includes(key)) continue;

            // Skip if value is masked (meaning user didn't change it)
            if (typeof value === 'string' && value.startsWith('••••••••')) continue;

            const isEncrypted = key.includes('API_KEY');

            await db.systemSetting.upsert({
                where: { key },
                create: {
                    key,
                    value: value as string || null,
                    encrypted: isEncrypted
                },
                update: {
                    value: value as string || null,
                    encrypted: isEncrypted
                }
            });

            results.push({ key, updated: true });
        }

        return NextResponse.json({
            success: true,
            message: 'Settings updated successfully',
            results
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        );
    }
}
