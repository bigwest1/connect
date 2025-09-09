import { NextResponse } from 'next/server';

// Mock discovery data; in a real setup, this could query a LAN discovery service.
export async function GET() {
  const devices = [
    { id: 'disc-porch', name: 'Porch Light', type: 'light' },
    { id: 'disc-garage', name: 'Garage Light', type: 'light' },
    { id: 'disc-lock', name: 'Front Door Lock', type: 'lock' },
    { id: 'disc-cam', name: 'Front Camera', type: 'camera' },
    { id: 'disc-gdoor', name: 'Garage Door', type: 'garageDoor' },
    { id: 'disc-outlet', name: 'Back Outlet', type: 'outlet' }
  ];
  return NextResponse.json({ devices });
}

