/**
 * POST /api/marketplace/buy-crypto
 * @deprecated Prefer POST /api/marketplace/confirm-crypto after reserving via /api/marketplace/buy
 * Kept for backward compatibility — forwards to confirm-crypto logic.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const listing_id = body.listingId ?? body.listing_id;
  const paymentId = body.paymentId ?? body.transactionHash;
  const transactionHash = body.transactionHash;
  const sinceUnix = body.sinceUnix;

  const origin = request.nextUrl.origin;
  const forward = await fetch(`${origin}/api/marketplace/confirm-crypto`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: request.headers.get('cookie') || '',
      authorization: request.headers.get('authorization') || '',
      'x-telegram-id': request.headers.get('x-telegram-id') || '',
      'x-vk-id': request.headers.get('x-vk-id') || '',
      'x-auth-source': request.headers.get('x-auth-source') || '',
    },
    body: JSON.stringify({
      listing_id,
      paymentId,
      transactionHash,
      sinceUnix,
    }),
  });

  const data = await forward.json();
  return NextResponse.json(data, { status: forward.status });
}
