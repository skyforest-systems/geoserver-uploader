import { geoserverUrl } from "@/environments";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const token = `Basic ${Buffer.from(`${username}:${password}`).toString(
      "base64",
    )}`;

    const response = await fetch(`${geoserverUrl}/rest/workspaces`, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: token,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: await response.text() },
        { status: response.status },
      );
    } else {
      return NextResponse.json({ status: 204 });
    }
  } catch (error) {
    console.error("get-workspaces >", error);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
