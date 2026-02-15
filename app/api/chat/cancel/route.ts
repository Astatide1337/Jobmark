import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  cancelChatStream,
  cleanupStaleChatStreams,
} from "@/lib/chat/stream-registry";

type CancelBody = {
  requestId?: string;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CancelBody;
  try {
    body = (await request.json()) as CancelBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const requestId = body.requestId?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }

  cleanupStaleChatStreams();
  const cancelled = cancelChatStream(requestId, session.user.id);

  return NextResponse.json({ cancelled });
}
