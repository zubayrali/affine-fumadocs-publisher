import { NextResponse } from 'next/server';
import fixture from '@/public/affine-studio/fixture-snapshot.json';

/**
 * Dev-only publisher status endpoint. Returns the studio fixture snapshot so
 * Publishing Studio can exercise a live fetch without a running publisher.
 */
export function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  return NextResponse.json(fixture, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
