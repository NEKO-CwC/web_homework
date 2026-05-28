import { NextResponse } from "next/server";
import { resetDemoState } from "@/lib/demo-state";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  resetDemoState();
  return NextResponse.json({ ok: true });
}
