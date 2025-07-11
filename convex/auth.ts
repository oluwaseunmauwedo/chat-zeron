import { internal } from "convex/_generated/api";
import type { Doc } from "convex/_generated/dataModel";
import { httpAction, internalQuery, query } from "convex/_generated/server";
import { match } from "ts-pattern";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/tanstack-start/server";
import { polar } from "convex/polar";
import { env } from "@/env.server";

export const clerkWebhook = httpAction(async (ctx, request) => {
  const bodyText = await request.text();
  const svixId = String(request.headers.get("svix-id"));
  const svixTimestamp = String(request.headers.get("svix-timestamp"));
  const svixSignature = String(request.headers.get("svix-signature"));

  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET_KEY!);
  const msg = wh.verify(bodyText, {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  }) as WebhookEvent;

  return await match(msg)
    .with({ type: "user.created" }, async ({ data }) => {
      const user = await ctx.runQuery(internal.users.getByAuthId, {
        authId: data.id,
      });

      if (user) {
        return Response.json({ status: "success" });
      }

      const model = await ctx.runQuery(internal.models.getByModel, {
        model: "google/gemini-2.5-flash-preview-05-20",
      });

      if (!model) {
        throw new Error("Model not found");
      }

      await ctx.runMutation(internal.users.create, {
        authId: data.id,
        model: model._id,
        email: data.email_addresses[0].email_address,
      });

      return Response.json({ status: "success" });
    })
    .with({ type: "user.deleted" }, async ({ data }) => {
      if (!data.id) {
        return Response.json({ status: "success" });
      }

      const user = await ctx.runQuery(internal.users.getByAuthId, {
        authId: data.id,
      });

      if (!user) {
        return Response.json({ status: "success" });
      }

      await ctx.runMutation(internal.users.destroy, {
        id: user._id,
      });

      return Response.json({ status: "success" });
    })
    .with({ type: "user.updated" }, async () => {
      return Response.json({ status: "success" });
    })
    .otherwise(() => Response.json({ status: "success" }));
});

export const authenticate = internalQuery({
  handler: async (
    ctx
  ): Promise<
    (Doc<"users"> & { isFree: boolean; isPremium: boolean }) | null
  > => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const user = await ctx.runQuery(internal.users.getByAuthId, {
      authId: identity.subject,
    });

    if (!user) {
      return null;
    }

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: user._id,
    });

    return {
      ...user,
      isFree: !subscription,
      isPremium: !!subscription,
    };
  },
});

export const current = query({
  handler: async (ctx): Promise<Doc<"users"> | null> => {
    const user = await ctx.runQuery(internal.auth.authenticate);

    if (!user) {
      return null;
    }

    return user;
  },
});
