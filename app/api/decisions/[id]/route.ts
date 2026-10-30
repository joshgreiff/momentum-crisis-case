import {NextRequest,NextResponse} from 'next/server';import {db} from '../../../../lib/db';
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){return NextResponse.json({error:'Decision mutation disabled until team authentication is configured. Review decisions in dashboard.'},{status:403})}
