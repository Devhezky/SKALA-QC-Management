import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Debug endpoint to test Perfex API connection directly
export async function GET(request: NextRequest) {
    try {
        const perfexUrl = process.env.PERFEX_API_URL;
        const perfexKey = process.env.PERFEX_API_KEY;

        if (!perfexUrl || !perfexKey) {
            return NextResponse.json({
                error: 'Missing environment variables',
                PERFEX_API_URL: perfexUrl ? 'SET' : 'NOT SET',
                PERFEX_API_KEY: perfexKey ? 'SET' : 'NOT SET'
            }, { status: 500 });
        }

        // Test projects endpoint
        const projectsResponse = await axios.get(`${perfexUrl}/api/projects`, {
            headers: {
                'authtoken': perfexKey,
                'Authorization': perfexKey
            },
            timeout: 10000
        });

        // Test customers endpoint
        let customersResponse = null;
        try {
            customersResponse = await axios.get(`${perfexUrl}/api/customers`, {
                headers: {
                    'authtoken': perfexKey,
                    'Authorization': perfexKey
                },
                timeout: 10000
            });
        } catch (e) {
            customersResponse = { error: e instanceof Error ? e.message : 'Failed' };
        }

        return NextResponse.json({
            success: true,
            perfexUrl: perfexUrl,
            projects: {
                status: projectsResponse.status,
                dataType: typeof projectsResponse.data,
                isArray: Array.isArray(projectsResponse.data),
                count: Array.isArray(projectsResponse.data) ? projectsResponse.data.length : 'N/A',
                sample: Array.isArray(projectsResponse.data) ? projectsResponse.data.slice(0, 2) : projectsResponse.data
            },
            customers: customersResponse.error ? customersResponse : {
                status: customersResponse.status,
                dataType: typeof customersResponse.data,
                isArray: Array.isArray(customersResponse.data),
                count: Array.isArray(customersResponse.data) ? customersResponse.data.length : 'N/A'
            }
        });
    } catch (error) {
        console.error('Perfex API test error:', error);

        if (axios.isAxiosError(error)) {
            return NextResponse.json({
                error: 'Perfex API request failed',
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data
            }, { status: 500 });
        }

        return NextResponse.json({
            error: 'Unknown error',
            message: error instanceof Error ? error.message : 'Unknown'
        }, { status: 500 });
    }
}
