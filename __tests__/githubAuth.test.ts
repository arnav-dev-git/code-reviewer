import jwt from "jsonwebtoken";
import axios from "axios";
import { generateAppJWT, getInstallationToken } from "../githubAuth";

const GITHUB_APP_ID = Number(process.env.GITHUB_APP_ID) || 0;
const GITHUB_PRIVATE_KEY_PATH = process.env.GITHUB_PRIVATE_KEY_PATH || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock("axios");
jest.mock("fs", () => ({
  readFileSync: jest.fn(() => "-----BEGIN PRIVATE KEY-----\nmock-key\n-----END PRIVATE KEY-----"),
}));

describe("githubAuth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GITHUB_APP_ID: GITHUB_APP_ID.toString(),
      GITHUB_PRIVATE_KEY_PATH: GITHUB_PRIVATE_KEY_PATH,
      OPENAI_API_KEY: OPENAI_API_KEY,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("generateAppJWT", () => {
    it("should generate a JWT with correct payload", () => {
      const mockSign = jest.fn().mockReturnValue("mock-jwt-token");
      (jwt.sign as jest.Mock) = mockSign;

      const token = generateAppJWT();

      expect(mockSign).toHaveBeenCalled();
      const callArgs = mockSign.mock.calls[0];
      const payload = callArgs[0];
      const privateKey = callArgs[1];
      const options = callArgs[2];

      expect(payload.iss.toString()).toBe(GITHUB_APP_ID.toString());
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(typeof payload.iat).toBe("number");
      expect(typeof payload.exp).toBe("number");
      expect(payload.exp - payload.iat).toBeLessThanOrEqual(10 * 60); // 10 minutes max
      expect(options.algorithm).toBe("RS256");
      expect(token).toBe("mock-jwt-token");
    });

    it("should set iat to 60 seconds in the past", () => {
      const mockSign = jest.fn().mockReturnValue("mock-jwt-token");
      (jwt.sign as jest.Mock) = mockSign;

      generateAppJWT();

      const payload = mockSign.mock.calls[0][0];
      const now = Math.floor(Date.now() / 1000);
      const expectedIat = now - 60;

      expect(Math.abs(payload.iat - expectedIat)).toBeLessThan(2); // Allow 2 second tolerance
    });

    it("should set exp to 9 minutes from now", () => {
      const mockSign = jest.fn().mockReturnValue("mock-jwt-token");
      (jwt.sign as jest.Mock) = mockSign;

      generateAppJWT();

      const payload = mockSign.mock.calls[0][0];
      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + 9 * 60;

      expect(Math.abs(payload.exp - expectedExp)).toBeLessThan(2); // Allow 2 second tolerance
    });
  });

  describe("getInstallationToken", () => {
    it("should fetch installation token from GitHub API", async () => {
      const mockJWT = "mock-jwt-token";
      const mockToken = "installation-token-123";
      const mockAxiosPost = jest.fn().mockResolvedValue({
        data: { token: mockToken },
      });
      (axios.post as jest.Mock) = mockAxiosPost;
      (jwt.sign as jest.Mock) = jest.fn().mockReturnValue(mockJWT);

      const token = await getInstallationToken(GITHUB_APP_ID);

      expect(mockAxiosPost).toHaveBeenCalledWith(
        `https://api.github.com/app/installations/${GITHUB_APP_ID}/access_tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${mockJWT}`,
            Accept: "application/vnd.github+json",
          },
        }
      );
      expect(token).toBe(mockToken);
    });

    it("should use generated JWT for authentication", async () => {
      const mockJWT = "generated-jwt-token";
      (jwt.sign as jest.Mock) = jest.fn().mockReturnValue(mockJWT);
      (axios.post as jest.Mock) = jest.fn().mockResolvedValue({
        data: { token: "installation-token" },
      });

      await getInstallationToken(GITHUB_APP_ID);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockJWT}`,
          }),
        })
      );
    });

    it("should handle API errors", async () => {
      const error = new Error("API Error");
      (jwt.sign as jest.Mock) = jest.fn().mockReturnValue("mock-jwt");
      (axios.post as jest.Mock) = jest.fn().mockRejectedValue(error);

      await expect(getInstallationToken(GITHUB_APP_ID)).rejects.toThrow("API Error");
    });
  });
});

