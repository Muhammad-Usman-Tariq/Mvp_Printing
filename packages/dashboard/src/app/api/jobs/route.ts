import { NextResponse } from 'next/server';

export async function GET() {
  // Option (b): Placeholder/empty data source ready for Turso or shared DB connection later
  return NextResponse.json({
    status: 'unconnected',
    message: 'No data source connected yet. Ready for Turso / shared database integration.',
    jobs: [],
    lastSyncTime: null
  });
}
