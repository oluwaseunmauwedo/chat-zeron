import { defineSchema, defineTable } from "convex/server";
import { vStatus } from "convex/validators/chat";
import { v } from "convex/values";
import { StreamIdValidator } from "@convex-dev/persistent-text-streaming";
import { vCapabilities, vModel, vProvider } from "convex/ai/provider";
import { vTool } from "convex/ai/schema";

export default defineSchema({
  users: defineTable({
    authId: v.string(),
    model: v.optional(v.id("models")),
    email: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        nickname: v.optional(v.string()),
        biography: v.optional(v.string()),
        instructions: v.optional(v.string()),
      })
    ),
    appearance: v.optional(
      v.object({
        mode: v.optional(v.union(v.literal("light"), v.literal("dark"))),
        theme: v.optional(v.string()),
      })
    ),
    creditsUsed: v.optional(v.number()),
  }).index("by_auth_id", ["authId"]),
  files: defineTable({
    key: v.string(),
    userId: v.id("users"),
    messageId: v.optional(v.id("messages")),
    role: v.optional(v.union(v.literal("agent"), v.literal("user"))),
  })
    .index("by_user", ["userId"])
    .index("by_key", ["key"])
    .index("by_message", ["messageId"])
    .index("by_user_role", ["userId", "role"]),
  chats: defineTable({
    title: v.string(),
    clientId: v.string(),
    userId: v.id("users"),
    isPublic: v.boolean(),
    status: vStatus,
    lastMessageTimestamp: v.number(),
    branchId: v.optional(v.id("chats")),
  })
    .index("by_user", ["userId"])
    .index("by_client_id", ["clientId"])
    .index("by_user_lastMessageTimestamp", ["userId", "lastMessageTimestamp"]),
  messages: defineTable({
    prompt: v.string(),
    clientId: v.string(),
    userId: v.id("users"),
    chatId: v.id("chats"),
    modelId: v.id("models"),
    uiMessages: v.optional(v.string()),
    responseStreamId: StreamIdValidator,
    tool: v.optional(vTool),
    error: v.optional(v.union(v.boolean(), v.string())),
    content: v.optional(v.string()),
    searchContent: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    creditsSpent: v.optional(v.number()),
  })
    .index("by_chat", ["chatId"])
    .index("by_stream", ["responseStreamId"])
    .index("by_search", ["searchContent"])
    .index("by_client_id", ["clientId"])
    .searchIndex("searchableMessage", {
      searchField: "searchContent",
      filterFields: ["userId"],
    }),
  models: defineTable({
    name: v.string(),
    model: vModel,
    provider: vProvider,
    searchField: v.string(),
    icon: v.string(),
    capabilities: v.optional(v.array(vCapabilities)),
    description: v.optional(v.string()),
    isPremium: v.optional(v.boolean()),
    isDisabled: v.optional(v.boolean()),
    cost: v.optional(v.number()),
  })
    .index("by_name", ["name"])
    .index("by_model", ["model"]),
});
