import QuoteViewClient from "../_components/quote-view-client";

export default async function QuoteViewPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  return <QuoteViewClient quoteId={quoteId} />;
}
