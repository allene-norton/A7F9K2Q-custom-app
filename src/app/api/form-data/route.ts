// app/api/form-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { FormDataSchema } from '@/types';
import {
  saveFormData,
  getFormData,
  deleteFormData,
} from '@/lib/upstash-storage';

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    // console.log('Attempting to fetch data for clientId:', clientId);
    // console.log('Upstash URL configured:', !!process.env.UPSTASH_REDIS_REST_URL);
    // console.log('Upstash URL:', process.env.UPSTASH_REDIS_REST_URL);

    const data = await getFormData(clientId);
    return NextResponse.json(data || null);
  } catch (error) {
    console.error('Error fetching form data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, data } = body;
    console.log(`Data for client:`,clientId)

    if (!clientId) {
      console.error('POST Error: Missing clientId in request body');
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    // Validate data
    const validated = FormDataSchema.safeParse(data);
    if (!validated.success) {
      console.error('Validation Error:', JSON.stringify(validated.error.issues, null, 2));
      return NextResponse.json(
        { error: 'Invalid data', details: validated.error },
        { status: 400 }
      );
    }

    await saveFormData(clientId, validated.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving form data:', error);
    return NextResponse.json(
      { error: 'Failed to save form data' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    }

    await deleteFormData(clientId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting form data:', error);
    return NextResponse.json(
      { error: 'Failed to delete form data' },
      { status: 500 }
    );
  }
}