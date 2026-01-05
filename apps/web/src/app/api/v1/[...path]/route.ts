import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_HOST = process.env.API_HOST || 'http://localhost:3001';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const path = params.path.join('/');
        const searchParams = request.nextUrl.searchParams.toString();
        const targetUrl = `${API_HOST}/api/v1/${path}${searchParams ? `?${searchParams}` : ''}`;

        logger.debug({ msg: 'Proxy GET request', path, targetUrl });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
            const data = await response.json();
            return NextResponse.json(data, {
                status: response.status,
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        }

        const text = await response.text();
        return new NextResponse(text, {
            status: response.status,
            headers: {
                'Content-Type': contentType || 'text/plain',
            },
        });
    } catch (error) {
        logger.error({ msg: 'Proxy GET error', error: error instanceof Error ? error.message : 'Unknown', path: params.path.join('/') });
        return NextResponse.json(
            {
                error: 'Failed to fetch from API',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 502 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const path = params.path.join('/');
        const targetUrl = `${API_HOST}/api/v1/${path}`;
        const body = await request.text();

        logger.debug({ msg: 'Proxy POST request', path, targetUrl });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
            const data = await response.json();
            return NextResponse.json(data, {
                status: response.status,
                headers: {
                    'Content-Type': 'application/json',
                }
            });
        }

        const text = await response.text();
        return new NextResponse(text, {
            status: response.status,
            headers: {
                'Content-Type': contentType || 'text/plain',
            },
        });
    } catch (error) {
        logger.error({ msg: 'Proxy POST error', error: error instanceof Error ? error.message : 'Unknown', path: params.path.join('/') });
        return NextResponse.json(
            {
                error: 'Failed to post to API',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 502 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const path = params.path.join('/');
        const targetUrl = `${API_HOST}/api/v1/${path}`;
        const body = await request.text();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(targetUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
            const data = await response.json();
            return NextResponse.json(data, { status: response.status });
        }

        const text = await response.text();
        return new NextResponse(text, {
            status: response.status,
            headers: {
                'Content-Type': contentType || 'text/plain',
            },
        });
    } catch (error) {
        logger.error({ msg: 'Proxy PUT error', error: error instanceof Error ? error.message : 'Unknown', path: params.path.join('/') });
        return NextResponse.json(
            {
                error: 'Failed to update API',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 502 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    try {
        const path = params.path.join('/');
        const targetUrl = `${API_HOST}/api/v1/${path}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(targetUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
            const data = await response.json();
            return NextResponse.json(data, { status: response.status });
        }

        const text = await response.text();
        return new NextResponse(text, {
            status: response.status,
            headers: {
                'Content-Type': contentType || 'text/plain',
            },
        });
    } catch (error) {
        logger.error({ msg: 'Proxy DELETE error', error: error instanceof Error ? error.message : 'Unknown', path: params.path.join('/') });
        return NextResponse.json(
            {
                error: 'Failed to delete from API',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 502 }
        );
    }
}
