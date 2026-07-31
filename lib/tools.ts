export const AI_TOOLS = [
  {
    type: "function" as const,
    name: "search_knowledge",
    description: "Search verified hospital knowledge base before answering general questions",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query for hospital info" },
      },
      required: ["query"],
    },
  },
  {
    type: "function" as const,
    name: "save_lead",
    description: "Save lead with conversation summary at end of interaction",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        category: {
          type: "string",
          enum: ["Emergency", "Non-Emergency", "General Inquiry", "Appointment", "Escalation"],
        },
        inquiryType: { type: "string" },
        department: { type: "string" },
        requestedService: { type: "string" },
        conversationSummary: { type: "string" },
        language: { type: "string", enum: ["en", "ta"] },
      },
      required: ["name", "phone", "category", "conversationSummary"],
    },
  },
  {
    type: "function" as const,
    name: "save_emergency",
    description: "Save emergency and trigger full emergency workflow",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        emergencyType: {
          type: "string",
          enum: ["Accident", "Trauma", "Unconscious Patient", "Critical Illness", "Emergency Admission", "Chest Pain", "Stroke", "Severe Bleeding", "Difficulty Breathing"],
        },
        isTravelling: { type: "boolean" },
        eta: { type: "string" },
        patientName: { type: "string" },
        hospitalUnit: { type: "string" },
        transportType: { type: "string" },
        attenderName: { type: "string" },
        conversationSummary: { type: "string" },
        language: { type: "string", enum: ["en", "ta"] },
      },
      required: ["name", "phone", "location", "emergencyType", "isTravelling"],
    },
  },
  {
    type: "function" as const,
    name: "save_appointment",
    description: "Save appointment, scan, lab, or consultation request",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        doctor: { type: "string" },
        department: { type: "string" },
        preferredDate: { type: "string" },
        preferredTime: { type: "string" },
        inquiryType: {
          type: "string",
          enum: ["Doctor Appointment", "Specialist Consultation", "Department Consultation", "Scan Booking", "MRI", "CT", "X-Ray", "Lab Investigation", "Admission Enquiry"],
        },
        serviceType: { type: "string" },
        reason: { type: "string" },
        requestedService: { type: "string" },
        callbackRequested: { type: "boolean" },
        conversationSummary: { type: "string" },
        language: { type: "string", enum: ["en", "ta"] },
      },
      required: ["name", "phone", "department", "preferredDate", "preferredTime"],
    },
  },
  {
    type: "function" as const,
    name: "coordinate_arrival",
    description: "Coordinate hospital arrival when patient is already travelling",
    parameters: {
      type: "object",
      properties: {
        patientName: { type: "string" },
        hospitalUnit: { type: "string" },
        estimatedArrival: { type: "string" },
        transportType: { type: "string" },
        attenderName: { type: "string" },
        phone: { type: "string" },
      },
      required: ["patientName", "hospitalUnit", "estimatedArrival", "transportType", "attenderName"],
    },
  },
  {
    type: "function" as const,
    name: "escalate_to_human",
    description: "Escalate to GRE human executive",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        reason: { type: "string" },
        escalationReason: {
          type: "string",
          enum: ["emergency_detected", "caller_requested", "low_confidence", "repeated_misunderstanding", "unknown_question", "three_failed_attempts", "user_frustrated"],
        },
        conversationSummary: { type: "string" },
        language: { type: "string", enum: ["en", "ta"] },
      },
      required: ["reason", "escalationReason"],
    },
  },
];

export const OPENAI_CHAT_TOOLS = AI_TOOLS.map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  },
}));
