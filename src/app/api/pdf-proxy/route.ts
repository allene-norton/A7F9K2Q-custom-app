import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pdfUrl = searchParams.get('url');
  
  if (!pdfUrl) {
    return NextResponse.json({ error: 'PDF URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(pdfUrl);
    const pdfBuffer = await response.arrayBuffer();
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline', // Force inline display
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error fetching PDF:', error);
    return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 500 });
  }
}