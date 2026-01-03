import fs from "fs";
import OpenAI from "openai";
import { getCodeReviewFromChatGPT } from "../chatGPT";

// Mock dependencies
jest.mock("fs");
jest.mock("openai");

describe("getCodeReviewFromChatGPT", () => {
  const mockReadFileSync = fs.readFileSync as jest.Mock;
  const mockOpenAIClient = {
    responses: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock file reads
    mockReadFileSync.mockImplementation((path: string) => {
      if (path.includes("systemPrompt.txt")) {
        return "You are a code reviewer.";
      }
      if (path.includes("defaultPrompt.txt")) {
        return "Review this code: {user_evaluation_prompt}";
      }
      if (path.includes("promptBody.txt")) {
        return "function test() { return true; }";
      }
      return "";
    });

    (OpenAI as unknown as jest.Mock) = jest.fn().mockImplementation(() => mockOpenAIClient);
  });

  it("should call OpenAI API with correct parameters", async () => {
    const mockResponse = {
      output_text: JSON.stringify({ review: "Good code!" }),
    };
    mockOpenAIClient.responses.create.mockResolvedValue(mockResponse);

    const result = await getCodeReviewFromChatGPT();

    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: process.env.OPENAI_API_KEY,
    });
    expect(mockOpenAIClient.responses.create).toHaveBeenCalledWith({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content: "You are a code reviewer.",
        },
        {
          role: "user",
          content: "Review this code: function test() { return true; }",
        },
      ],
    });
    expect(result).toEqual({ review: "Good code!" });
  });

  it("should use custom promptBody when provided", async () => {
    const mockResponse = {
      output_text: JSON.stringify({ review: "Custom review" }),
    };
    mockOpenAIClient.responses.create.mockResolvedValue(mockResponse);

    const customPrompt = "const x = 42;";
    await getCodeReviewFromChatGPT(customPrompt);

    expect(mockOpenAIClient.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining(customPrompt),
          }),
        ]),
      })
    );
  });

  it("should parse JSON response", async () => {
    const mockResponse = {
      output_text: JSON.stringify({
        score: 8,
        comments: ["Nice work!", "Consider refactoring"],
      }),
    };
    mockOpenAIClient.responses.create.mockResolvedValue(mockResponse);

    const result = await getCodeReviewFromChatGPT();

    expect(result).toEqual({
      score: 8,
      comments: ["Nice work!", "Consider refactoring"],
    });
  });

  it("should retry on error up to 3 times", async () => {
    const error = new Error("API Error");
    mockOpenAIClient.responses.create
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue({
        output_text: JSON.stringify({ review: "Success after retry" }),
      });

    const result = await getCodeReviewFromChatGPT();

    expect(mockOpenAIClient.responses.create).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ review: "Success after retry" });
  });

  it("should throw error after 3 retries", async () => {
    const error = new Error("API Error");
    mockOpenAIClient.responses.create.mockRejectedValue(error);

    await expect(getCodeReviewFromChatGPT()).rejects.toThrow("API Error");
    expect(mockOpenAIClient.responses.create).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });

  it("should handle invalid JSON response", async () => {
    const mockResponse = {
      output_text: "invalid json",
    };
    mockOpenAIClient.responses.create.mockResolvedValue(mockResponse);

    await expect(getCodeReviewFromChatGPT()).rejects.toThrow();
  });

  it("should read prompt files correctly", async () => {
    const mockResponse = {
      output_text: JSON.stringify({ review: "Test" }),
    };
    mockOpenAIClient.responses.create.mockResolvedValue(mockResponse);

    await getCodeReviewFromChatGPT();

    expect(mockReadFileSync).toHaveBeenCalledWith(
      expect.stringContaining("systemPrompt.txt"),
      "utf8"
    );
    expect(mockReadFileSync).toHaveBeenCalledWith(
      expect.stringContaining("defaultPrompt.txt"),
      "utf8"
    );
  });
});

