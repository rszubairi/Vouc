import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) return new Response("Missing signature", { status: 400 });

    // Raw body is required for Stripe signature verification — must be
    // read before any JSON parsing.
    const rawBody = await request.text();

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    const { alreadyProcessed } = await ctx.runMutation(internal.payments.markEventProcessed, {
      stripeEventId: event.id,
      type: event.type,
    });
    if (alreadyProcessed) return new Response(null, { status: 200 });

    async function resolveProfileId(customerId, metadataProfileId) {
      if (metadataProfileId) return metadataProfileId;
      return await ctx.runQuery(internal.payments.findProfileIdByCustomerId, {
        stripeCustomerId: customerId,
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const profileId = session.client_reference_id ?? session.metadata?.profileId;
        if (profileId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          const item = subscription.items.data[0];
          await ctx.runMutation(internal.payments.upsertSubscriptionFromStripe, {
            profileId,
            stripeCustomerId: subscription.customer,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            priceId: item.price.id,
            currentPeriodEnd: item.current_period_end * 1000,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const profileId = await resolveProfileId(
          subscription.customer,
          subscription.metadata?.profileId
        );
        if (profileId) {
          const item = subscription.items.data[0];
          await ctx.runMutation(internal.payments.upsertSubscriptionFromStripe, {
            profileId,
            stripeCustomerId: subscription.customer,
            stripeSubscriptionId: subscription.id,
            status: event.type === "customer.subscription.deleted" ? "canceled" : subscription.status,
            priceId: item.price.id,
            currentPeriodEnd: item.current_period_end * 1000,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          });
        }
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId =
          typeof invoice.parent?.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : invoice.subscription;
        const profileId = await resolveProfileId(invoice.customer, invoice.metadata?.profileId);
        if (profileId) {
          await ctx.runMutation(internal.payments.recordPayment, {
            profileId,
            stripeCustomerId: invoice.customer,
            stripeInvoiceId: invoice.id,
            stripeSubscriptionId: subscriptionId ?? undefined,
            amount: invoice.amount_paid || invoice.amount_due,
            currency: invoice.currency,
            status: event.type === "invoice.paid" ? "paid" : "failed",
            paidAt: (invoice.status_transitions?.paid_at ?? invoice.created) * 1000,
            description: invoice.description ?? undefined,
          });
        }
        break;
      }

      default:
        break;
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
