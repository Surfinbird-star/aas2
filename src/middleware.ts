import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware is used to add CORS headers to all responses
export function middleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next();

  // Add the CORS headers to the response
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Return the response
  return response;
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
