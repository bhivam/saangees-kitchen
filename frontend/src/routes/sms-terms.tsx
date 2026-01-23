import { createFileRoute } from "@tanstack/react-router";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const smsTerms = `# Saangee's Kitchen LLC SMS Terms and Conditions

Effective Date: January 23, 2026

1. You will receive SMS messages for OTPs, order confirmations, and notifications about order preparation status.
2. You can cancel the SMS service at any time. Just text "STOP". After you send the SMS message "STOP" to us, we will send you an SMS message to confirm that you have been unsubscribed. After this, you will no longer receive SMS messages from us. If you want to join again, send the SMS message "START" and we will start sending SMS messages to you again.
3. If you are experiencing issues with the messaging program you can reply with the keyword HELP for more assistance, or you can get help directly at shivamkajaria@gmail.com.
4. Carriers are not liable for delayed or undelivered messages.
5. As always, message and data rates may apply for any messages sent to you from us and to us from you. Message frequency varies. If you have any questions about your text plan or data plan, it is best to contact your wireless provider.
6. If you have any questions regarding privacy, please read our privacy policy: https://saangeeskitchen.com/privacy-policy`;

export const Route = createFileRoute("/sms-terms")({
  component: SmsTerms,
});

function SmsTerms() {
  return (
    <div className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-2xl">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mb-4 mt-10 text-xl font-semibold text-foreground">
                {children}
              </h2>
            ),
            p: ({ children }) => (
              <p className="mb-4 leading-7 text-muted-foreground">{children}</p>
            ),
            ol: ({ children }) => (
              <ol className="mb-4 list-decimal space-y-3 pl-6 text-muted-foreground">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="leading-7">{children}</li>,
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-primary underline hover:text-primary/80"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
          }}
        >
          {smsTerms}
        </Markdown>
      </article>
    </div>
  );
}

