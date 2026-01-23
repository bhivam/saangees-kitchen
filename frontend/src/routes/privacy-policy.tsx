import { createFileRoute } from "@tanstack/react-router";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const privacyPolicy = `# PRIVACY POLICY

Effective Date: January 23, 2026

We value your privacy and make every effort to respect your wishes and personal information. Please read this policy carefully to understand how we collect, use, and manage your phone numbers.

## COLLECTION OF PHONE NUMBERS

We collect your phone numbers only when you voluntarily provide them to us, for example, during transactions, inquiries, or when you sign up to receive notification messages. You can opt in to receive these SMS messages by providing your phone number.

## USE OF PHONE NUMBERS FOR SMS

SMS messaging charges may be applied by your carrier. We will only share your phone number with our SMS provider, subject to their privacy policy.

## OPTING OUT OF MESSAGES

If at any time you wish to stop receiving messages from us, you can opt out by texting STOP.

## PRIVACY OF PHONE NUMBERS

Once you have opted out, we will not send you any more SMS messages, nor will we sell or transfer your phone number to another party.

## CHANGES TO THIS POLICY

We may periodically update this policy. We will notify you about significant changes in the way we treat your information by placing a prominent notice on our site.

We thank you for your understanding and cooperation. If you have any questions or concerns about this policy, please feel free to contact us via the form on our site.`;

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
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
              <p className="mb-4 leading-7 text-muted-foreground">
                {children}
              </p>
            ),
          }}
        >
          {privacyPolicy}
        </Markdown>
      </article>
    </div>
  );
}

