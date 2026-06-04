import PaymentSuccessClient from './PaymentSuccessClient';

export const dynamic = 'force-dynamic';

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; payment_id?: string }>;
}) {
  const params = await searchParams;
  return (
    <PaymentSuccessClient
      orderId={params.order_id}
      paymentId={params.payment_id}
    />
  );
}
