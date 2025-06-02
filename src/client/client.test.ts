// This script performs integration tests against the running backend API.

import { ApiClient, ApiError } from "./client";
import {
  Conversation,
  ConversationCreateRequest,
  // Message,
  MessageCreateRequest,
  // PaginatedConversationsResponse,
  // PaginatedMessagesResponse,
  SenderTypeEnum,
  // HealthCheckResponse,
  ConversationUpdateRequest,
} from "./types";
import { UUID, randomUUID } from "crypto";

// --- Configuration ---

// Ensure this points to your running backend
const API_BASE_URL = "http://3.15.240.252:8000";
// WARNING: This token might be expired. Tests might fail with 401.
// For robust testing, obtain a fresh token before running.
const AUTH_TOKEN =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkZHMGZ1TE5pclhuU1FKMzBtTl9aSmhMQV9qZHB2RnJ6dC1CT3RmMnRJdlkifQ.eyJzaWQiOiJjbTlxcjVzNjEwMWNmangwbXc5ODJuamg5IiwiaXNzIjoicHJpdnkuaW8iLCJpYXQiOjE3NDUyMjM4OTUsImF1ZCI6ImNtOWk2cGV6eTA0MWlpZjBucG44NmN0anQiLCJzdWIiOiJkaWQ6cHJpdnk6Y205b2VvYXc1MDE4OGljMGxwdTdzeG9qcSIsImV4cCI6MTc0NTIyNzQ5NX0.Qw-T0gpGgzPrzHPhVq-ugQDRJadvIaF_DFGy9C5FLgPY4UCHWQinuOlG3gMYVcVYYAYPFO1GbWVXU2nUshuO_A";

// Use real getAuthToken function (or a mock that returns a valid token)
const getAuthToken = async (): Promise<string | null> => {
  console.log("[Test] Using configured AUTH_TOKEN");
  return AUTH_TOKEN;
};

// --- Test Runner ---

async function runIntegrationTests() {
  console.log(
    `--- Starting ApiClient Integration Tests against ${API_BASE_URL} ---`,
  );

  const apiClient = new ApiClient(API_BASE_URL, getAuthToken);
  let createdConversationId: UUID | null = null;

  try {
    // Test 1: Health Check
    console.log("\n[Test 1] Health Check");
    const health = await apiClient.healthCheck();
    console.log("Health Check Result:", health);
    expect(health.success).toBe(true);
    console.log("   [PASS] Health check successful.");

    // Test 2: Get Initial Conversations (verify structure)
    console.log("\n[Test 2] Get Conversations");
    const initialConversations = await apiClient.getConversations({ limit: 5 });
    console.log(
      `Get Conversations Result (limit 5): Found ${initialConversations.data.length} conversations.`,
    );
    expect(Array.isArray(initialConversations.data)).toBe(true);
    expect(initialConversations.pagination).toBeDefined();
    console.log("   [PASS] Get Conversations structure is valid.");

    // Test 3: Create Conversation
    console.log("\n[Test 3] Create Conversation");
    const timestamp = Date.now();
    const createData: ConversationCreateRequest = {
      title: `Integration Test Convo ${timestamp}`,
    };
    const newConversation = await apiClient.createConversation(createData);
    console.log("Create Conversation Result:", newConversation);
    expect(newConversation.title).toBe(createData.title);
    expect(newConversation.conversation_id).toBeDefined();
    createdConversationId = newConversation.conversation_id; // Store for later use
    console.log(
      `   [PASS] Conversation created with ID: ${createdConversationId}`,
    );

    // Test 4: Get Conversation Messages (initially empty or contains initial)
    console.log("\n[Test 4] Get Conversation Messages (Initial)");
    if (!createdConversationId)
      throw new Error("Cannot run Test 4 without createdConversationId");
    const initialMessages = await apiClient.getConversationMessages(
      createdConversationId,
      { limit: 10 },
    );
    console.log(
      `Get Messages Result: Found ${initialMessages.data.length} messages.`,
    );
    expect(Array.isArray(initialMessages.data)).toBe(true);
    expect(initialMessages.pagination).toBeDefined();
    console.log("   [PASS] Get Messages structure is valid.");

    // Test 5: Create Message
    console.log("\n[Test 5] Create Message");
    if (!createdConversationId)
      throw new Error("Cannot run Test 5 without createdConversationId");
    const messageData: MessageCreateRequest = {
      sender_type: SenderTypeEnum.USER,
      message_id: randomUUID(), // Generate random UUID for message
      content: `Hello from integration test! ${timestamp}`,
    };
    const newMessage = await apiClient.createMessage(
      createdConversationId,
      messageData,
    );
    console.log("Create Message Result:", newMessage);
    expect(newMessage.content).toBe(messageData.content);
    expect(newMessage.conversation_id).toBe(createdConversationId);
    expect(newMessage.message_id).toBe(messageData.message_id);
    expect(newMessage.sender_type).toBe(SenderTypeEnum.USER);
    console.log(`   [PASS] Message created with ID: ${newMessage.message_id}`);

    // Test 6: Update Conversation
    console.log("\n[Test 6] Update Conversation");
    if (!createdConversationId)
      throw new Error("Cannot run Test 6 without createdConversationId");
    const updatedTitle = `Updated Test Convo ${timestamp}`;
    const updateData: ConversationUpdateRequest = { title: updatedTitle };
    const updatedConversation = await apiClient.updateConversation(
      createdConversationId,
      updateData,
    );
    console.log("Update Conversation Result:", updatedConversation);
    expect(updatedConversation.title).toBe(updatedTitle);
    expect(updatedConversation.conversation_id).toBe(createdConversationId);
    console.log("   [PASS] Conversation title updated.");

    // Test 7: Get Conversation Messages (After Adding)
    console.log("\n[Test 7] Get Conversation Messages (After Adding)");
    if (!createdConversationId)
      throw new Error("Cannot run Test 7 without createdConversationId");
    const messagesAfterAdd = await apiClient.getConversationMessages(
      createdConversationId,
      { limit: 10 },
    );
    console.log(
      `Get Messages Result: Found ${messagesAfterAdd.data.length} messages.`,
    );
    expect(messagesAfterAdd.data.length).toBeGreaterThanOrEqual(1); // Should have at least the message we added
    const addedMsg = messagesAfterAdd.data.find(
      (m) => m.message_id === messageData.message_id,
    );
    expect(addedMsg).toBeDefined();
    expect(addedMsg?.content).toBe(messageData.content);
    console.log("   [PASS] Found added message in conversation.");

    // Test 8: Delete Specific Conversation (Cleanup)
    console.log("\n[Test 8] Delete Specific Conversation (Cleanup)");
    if (!createdConversationId)
      throw new Error("Cannot run Test 8 without createdConversationId");
    await apiClient.deleteConversation(createdConversationId);
    console.log(
      `   [PASS] Attempted deletion of conversation ID: ${createdConversationId}`,
    );
    // Verification (Optional): Try fetching the deleted conversation, expect 404
    try {
      await apiClient.getConversationMessages(createdConversationId);
      console.error(
        "   [FAIL] Fetching deleted conversation should have failed, but did not.",
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        console.log(
          "   [PASS] Verified conversation deletion (received 404 as expected).",
        );
      } else {
        console.warn(
          "   [WARN] Verification of deletion failed with unexpected error:",
          error,
        );
      }
    }
    createdConversationId = null; // Mark as deleted
  } catch (error) {
    console.error("\n--- Test Suite Failed ---");
    if (error instanceof ApiError) {
      console.error(`API Error Status: ${error.status}`);
      console.error(`API Error Message: ${error.message}`);
      console.error("API Error Body:", error.body);
      if (error.status === 401) {
        console.warn("Hint: The AUTH_TOKEN might be expired or invalid.");
      }
    } else {
      console.error("Unexpected Error:", error);
    }
    process.exitCode = 1;
  } finally {
    // Final cleanup attempt if a conversation was created but not deleted due to an earlier error
    if (createdConversationId) {
      console.warn(
        `\n[WARN] Attempting final cleanup for conversation ID: ${createdConversationId}`,
      );
      try {
        await apiClient.deleteConversation(createdConversationId);
        console.log("   [INFO] Final cleanup successful.");
      } catch (cleanupError) {
        console.error("   [ERROR] Final cleanup failed:", cleanupError);
      }
    }
    console.log("\n--- ApiClient Integration Tests Finished ---");
  }
}

// Simple assertion helper
const expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(
        `Assertion Failed: Expected ${JSON.stringify(expected)}, but received ${JSON.stringify(actual)}`,
      );
    }
  },
  toBeDefined: () => {
    if (actual === undefined || actual === null) {
      throw new Error(
        `Assertion Failed: Expected value to be defined, but received ${actual}`,
      );
    }
  },
  toBeGreaterThanOrEqual: (expected: number) => {
    if (typeof actual !== "number" || actual < expected) {
      throw new Error(
        `Assertion Failed: Expected ${actual} to be >= ${expected}`,
      );
    }
  },
});

runIntegrationTests();
