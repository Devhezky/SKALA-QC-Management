import { db } from '@/lib/db';

export interface ApiSettings {
    PERFEX_API_URL: string | null;
    PERFEX_API_KEY: string | null;
    GEMINI_API_KEY: string | null;
    OPENAI_API_KEY: string | null;
}

/**
 * Get API settings from database, with fallback to environment variables
 */
export async function getApiSettings(): Promise<ApiSettings> {
    const settings: ApiSettings = {
        PERFEX_API_URL: null,
        PERFEX_API_KEY: null,
        GEMINI_API_KEY: null,
        OPENAI_API_KEY: null
    };

    try {
        const dbSettings = await db.systemSetting.findMany({
            where: {
                key: {
                    in: ['PERFEX_API_URL', 'PERFEX_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY']
                }
            }
        });

        for (const setting of dbSettings) {
            if (setting.value) {
                settings[setting.key as keyof ApiSettings] = setting.value;
            }
        }
    } catch (error) {
        console.warn('[getApiSettings] Failed to fetch from database, using env vars only:', error);
    }

    // Fallback to environment variables if not set in database
    if (!settings.PERFEX_API_URL) {
        settings.PERFEX_API_URL = process.env.PERFEX_API_URL || null;
    }
    if (!settings.PERFEX_API_KEY) {
        settings.PERFEX_API_KEY = process.env.PERFEX_API_KEY || null;
    }
    if (!settings.GEMINI_API_KEY) {
        settings.GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
    }
    if (!settings.OPENAI_API_KEY) {
        settings.OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
    }

    return settings;
}

/**
 * Get Perfex API credentials specifically
 */
export async function getPerfexCredentials(): Promise<{ url: string | null; key: string | null }> {
    const settings = await getApiSettings();
    return {
        url: settings.PERFEX_API_URL,
        key: settings.PERFEX_API_KEY
    };
}
