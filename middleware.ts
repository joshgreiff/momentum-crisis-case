import {NextResponse,type NextRequest} from 'next/server';
import {SESSION_COOKIE,isAuthorized} from './lib/auth';

export async function middleware(req:NextRequest){
 const ok=await isAuthorized({token:req.cookies.get(SESSION_COOKIE)?.value,host:req.headers.get('host'),forwardedHost:req.headers.get('x-forwarded-host')});
 if(ok)return NextResponse.next();
 if(req.nextUrl.pathname.startsWith('/api/'))return NextResponse.json({error:'Team passcode required'},{status:401});
 const url=req.nextUrl.clone();
 url.pathname='/login';
 url.search=`?next=${encodeURIComponent(req.nextUrl.pathname+req.nextUrl.search)}`;
 return NextResponse.redirect(url);
}

// Everything requires team access except the sign-in page, the signed Resend webhook, and static assets.
export const config={matcher:['/((?!login|api/inbound|_next/static|_next/image|icon.svg|favicon.ico|robots.txt).*)']};
