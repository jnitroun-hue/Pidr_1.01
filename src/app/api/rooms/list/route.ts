import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  try {
    // Пробуем получить комнаты с реального сервера
    try {
      const response = await fetch(`${BACKEND_URL}/api/rooms`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json(result);
      }
    } catch (serverError) {
      console.warn('Backend server not available for rooms list');
    }

    // Fallback - возвращаем пустой список
    return NextResponse.json({
      success: true,
      rooms: [],
      message: 'Server not available, showing empty room list'
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения списка комнат'
    }, { status: 500 });
  }
}
