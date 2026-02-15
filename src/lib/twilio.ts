import Twilio from "twilio";

export const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);

export async function sendWhatsAppTemplate(params: {
  to: string;
  from: string;
  templateSid: string;
  variables: Record<string, string>;
  statusCallback: string;
}) {
  return twilioClient.messages.create({
    to: `whatsapp:${params.to}`,
    from: params.from,
    contentSid: params.templateSid,
    contentVariables: JSON.stringify(params.variables),
    statusCallback: params.statusCallback,
  });
}
