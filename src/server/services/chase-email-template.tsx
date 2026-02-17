import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Button,
  Hr,
  Preview,
} from "@react-email/components";
import { render } from "@react-email/components";

interface ChaseEmailProps {
  clientFirstName: string;
  practiceName: string;
  portalUrl: string;
  bodyText: string;
  primaryColor?: string;
}

function ChaseEmail({
  clientFirstName,
  practiceName,
  portalUrl,
  bodyText,
  primaryColor = "#1a1a2e",
}: ChaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Documents needed — {practiceName}</Preview>
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "20px 0" }}>
          <Section style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "40px 32px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            {/* Practice name header */}
            <Text style={{ fontSize: "14px", color: "#666", marginBottom: "24px" }}>
              {practiceName}
            </Text>

            {/* Body text — preserve line breaks */}
            {bodyText.split("\n").map((line, i) => (
              <Text key={i} style={{ fontSize: "15px", lineHeight: "1.6", color: "#333", margin: line.trim() ? "0 0 4px 0" : "0 0 16px 0" }}>
                {line.includes(portalUrl) ? (
                  <Link href={portalUrl} style={{ color: primaryColor }}>{portalUrl}</Link>
                ) : (
                  line || "\u00A0"
                )}
              </Text>
            ))}

            {/* CTA Button */}
            <Section style={{ textAlign: "center" as const, margin: "32px 0" }}>
              <Button
                href={portalUrl}
                style={{
                  backgroundColor: primaryColor,
                  color: "#ffffff",
                  padding: "14px 32px",
                  borderRadius: "8px",
                  fontSize: "15px",
                  fontWeight: "600",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Upload Documents
              </Button>
            </Section>

            <Hr style={{ borderColor: "#eee", margin: "24px 0" }} />

            <Text style={{ fontSize: "12px", color: "#999", lineHeight: "1.5" }}>
              This email was sent by {practiceName} via chase.md.
              If you believe this was sent in error, please contact your accountant directly.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderChaseEmail(props: ChaseEmailProps): Promise<string> {
  return render(<ChaseEmail {...props} />);
}
