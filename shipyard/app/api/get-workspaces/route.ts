import { bearerToken, geoserverUrl } from "@/environments";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(`${geoserverUrl}/rest/workspaces`, {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: bearerToken,
      },
    });

    if (!response.ok) {
      throw await response.text();
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("get-workspaces >", error);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
