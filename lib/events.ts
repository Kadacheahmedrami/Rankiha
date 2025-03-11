export type EventStatus = "active" | "upcoming" | "completed";

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  // Status can be computed dynamically based on dates
  // but we'll keep it in the type for compatibility
  status?: EventStatus;
}

// Helper function to calculate status based on dates
export function getEventStatus(
  startDate: string,
  endDate: string
): EventStatus {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) {
    return "upcoming";
  } else if (now > end) {
    return "completed";
  } else {
    return "active";
  }
}
