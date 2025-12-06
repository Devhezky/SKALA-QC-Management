import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json(
                { success: false, error: 'URL is required' },
                { status: 400 }
            );
        }

        // Build the full API URL
        const baseURL = url.replace('/index.php', '');
        const testUrl = `${baseURL}/index.php/qc_integration/qc_api/get_projects`;

        console.log('Testing connection to:', testUrl);

        const response = await axios.get(testUrl, { timeout: 10000 });

        if (response.data && response.data.status) {
            return NextResponse.json({
                success: true,
                projectCount: response.data.data?.length || 0,
                message: `Berhasil terhubung! Ditemukan ${response.data.data?.length || 0} proyek.`
            });
        } else {
            return NextResponse.json({
                success: false,
                error: response.data?.message || 'API returned invalid response'
            });
        }
    } catch (error: any) {
        console.error('Connection test failed:', error.message);
        return NextResponse.json({
            success: false,
            error: error.code === 'ECONNREFUSED'
                ? 'Server tidak dapat dihubungi. Pastikan Skala berjalan.'
                : (error.message || 'Connection failed')
        }, { status: 500 });
    }
}
