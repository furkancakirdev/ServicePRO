import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  // Some browsers still request /favicon.ico even if an SVG icon is configured.
  return NextResponse.redirect(new URL('/favicon.svg', request.url), 308);
}

