import { Request, Response } from "express";
import { githubWebhook } from "../webhook";
import * as githubAuth from "../../../../githubAuth";
import * as PRUtils from "../PRUtils";
import * as promptHandler from "../../../../utils/promptHandler/promptHandler";

// Mock dependencies
jest.mock("../../../../githubAuth");
jest.mock("../PRUtils");
jest.mock("../../../../utils/promptHandler/promptHandler");

describe("githubWebhook", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockSendStatus: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSendStatus = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ send: mockSendStatus });

    mockResponse = {
      sendStatus: mockSendStatus,
      status: mockStatus,
    };

    // Setup default mocks
    (githubAuth.getInstallationToken as jest.Mock) = jest
      .fn()
      .mockResolvedValue("mock-token");
    (PRUtils.fetchPullRequestFiles as jest.Mock) = jest
      .fn()
      .mockResolvedValue([
        {
          filename: "test.ts",
          patch: "@@ -1,3 +1,5 @@\n line1\n+new line\n line2",
        },
      ]);
    (PRUtils.parsePatch as jest.Mock) = jest.fn().mockReturnValue({
      startLine: 1,
      addedLines: ["new line"],
    });
    (promptHandler.default as jest.Mock) = jest
      .fn()
      .mockResolvedValue({ review: "Good code!" });
  });

  it("should return 200 for non-pull_request events", async () => {
    mockRequest = {
      headers: {
        "x-github-event": "push",
      },
      body: {},
    };

    await githubWebhook(
      mockRequest as Request,
      mockResponse as Response
    );

    expect(mockSendStatus).toHaveBeenCalledWith(200);
    expect(PRUtils.fetchPullRequestFiles).not.toHaveBeenCalled();
  });

  it("should return 200 for pull_request events with unsupported actions", async () => {
    mockRequest = {
      headers: {
        "x-github-event": "pull_request",
      },
      body: {
        action: "closed",
        repository: {
          full_name: "owner/repo",
          owner: { login: "owner" },
          name: "repo",
        },
        number: 123,
        pull_request: {
          title: "Test PR",
          html_url: "https://github.com/owner/repo/pull/123",
        },
        installation: {
          id: 456,
        },
      },
    };

    await githubWebhook(
      mockRequest as Request,
      mockResponse as Response
    );

    expect(mockSendStatus).toHaveBeenCalledWith(200);
    expect(PRUtils.fetchPullRequestFiles).not.toHaveBeenCalled();
  });

  it("should process pull_request opened event", async () => {
    mockRequest = {
      headers: {
        "x-github-event": "pull_request",
      },
      body: {
        action: "opened",
        repository: {
          full_name: "owner/repo",
          owner: { login: "owner" },
          name: "repo",
        },
        number: 123,
        pull_request: {
          title: "Test PR",
          html_url: "https://github.com/owner/repo/pull/123",
        },
        installation: {
          id: 456,
        },
      },
    };

    await githubWebhook(
      mockRequest as Request,
      mockResponse as Response
    );

    expect(githubAuth.getInstallationToken).toHaveBeenCalledWith(456);
    expect(PRUtils.fetchPullRequestFiles).toHaveBeenCalledWith(
      "mock-token",
      "owner",
      "repo",
      123
    );
    expect(mockSendStatus).toHaveBeenCalledWith(200);
  });

  it("should process pull_request synchronize event", async () => {
    mockRequest = {
      headers: {
        "x-github-event": "pull_request",
      },
      body: {
        action: "synchronize",
        repository: {
          full_name: "owner/repo",
          owner: { login: "owner" },
          name: "repo",
        },
        number: 123,
        pull_request: {
          title: "Test PR",
          html_url: "https://github.com/owner/repo/pull/123",
        },
        installation: {
          id: 456,
        },
      },
    };

    await githubWebhook(
      mockRequest as Request,
      mockResponse as Response
    );

    expect(githubAuth.getInstallationToken).toHaveBeenCalledWith(456);
    expect(PRUtils.fetchPullRequestFiles).toHaveBeenCalled();
    expect(mockSendStatus).toHaveBeenCalledWith(200);
  });

  it("should skip files without patch", async () => {
    (PRUtils.fetchPullRequestFiles as jest.Mock) = jest.fn().mockResolvedValue([
      {
        filename: "test.ts",
        patch: null,
      },
      {
        filename: "test2.ts",
        patch: "@@ -1,3 +1,5 @@\n line1\n+new line\n line2",
      },
    ]);

    mockRequest = {
      headers: {
        "x-github-event": "pull_request",
      },
      body: {
        action: "opened",
        repository: {
          full_name: "owner/repo",
          owner: { login: "owner" },
          name: "repo",
        },
        number: 123,
        pull_request: {
          title: "Test PR",
          html_url: "https://github.com/owner/repo/pull/123",
        },
        installation: {
          id: 456,
        },
      },
    };

    await githubWebhook(
      mockRequest as Request,
      mockResponse as Response
    );

    expect(PRUtils.parsePatch).toHaveBeenCalledTimes(1);
    expect(PRUtils.parsePatch).toHaveBeenCalledWith(
      "@@ -1,3 +1,5 @@\n line1\n+new line\n line2"
    );
  });

  it("should call getCodeReview", async () => {
    mockRequest = {
      headers: {
        "x-github-event": "pull_request",
      },
      body: {
        action: "opened",
        repository: {
          full_name: "owner/repo",
          owner: { login: "owner" },
          name: "repo",
        },
        number: 123,
        pull_request: {
          title: "Test PR",
          html_url: "https://github.com/owner/repo/pull/123",
        },
        installation: {
          id: 456,
        },
      },
    };

    await githubWebhook(
      mockRequest as Request,
      mockResponse as Response
    );

    expect(promptHandler.default).toHaveBeenCalled();
  });
});

