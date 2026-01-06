import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { sessionId, clientId } = await request.json();

    if (!sessionId || !clientId) {
      return NextResponse.json(
        { error: "Missing sessionId or clientId" },
        { status: 400 }
      );
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*, clipcards(credits_required)")
      .eq("id", sessionId)
      .eq("client_id", clientId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if session is already cancelled
    if (session.status === "cancelled" || session.status === "cancelled_late") {
      return NextResponse.json(
        { error: "Session already cancelled" },
        { status: 400 }
      );
    }

    // Calculate time until session
    const sessionDateTime = new Date(`${session.scheduled_date}T${session.start_time}`);
    const now = new Date();
    const hoursUntilSession = (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let newStatus: string;
    let creditReturned = false;

    if (hoursUntilSession > 8) {
      // More than 8 hours: return credit
      newStatus = "cancelled";
      creditReturned = true;

      // Return credit to client
      const creditsRequired = session.clipcards?.credits_required || 1;
      
      const { error: creditError } = await supabase.rpc("increment_clipcard_credits", {
        p_client_id: clientId,
        p_clipcard_id: session.clipcard_id,
        p_amount: creditsRequired,
      });

      if (creditError) {
        console.error("Error returning credits:", creditError);
        // Continue anyway - we'll mark as cancelled
      }
    } else {
      // 8 hours or less: credit lost
      newStatus = "cancelled_late";
      creditReturned = false;
    }

    // Update session status
    const { error: updateError } = await supabase
      .from("sessions")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to cancel session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      creditReturned,
      message: creditReturned
        ? "Session cancelled. Credit has been returned."
        : "Session cancelled. Credit was not returned due to late cancellation (< 8 hours).",
    });
  } catch (error) {
    console.error("Error cancelling session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

