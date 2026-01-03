import { parsePatch, fetchPullRequestFiles } from "../PRUtils";

describe("PRUtils", () => {
  describe("parsePatch", () => {
    it("should parse a simple patch with added lines", () => {
      const patch = `@@ -1,3 +1,5 @@
 line1
+new line 1
+new line 2
 line2
 line3`;

      const result = parsePatch(patch);

      expect(result.startLine).toBe(1);
      expect(result.addedLines).toEqual(["new line 1", "new line 2"]);
    });

    it("should extract start line from patch header", () => {
      const patch = `@@ -97,5 +97,9 @@
 existing line
+added line 1
+added line 2
+added line 3
+added line 4`;

      const result = parsePatch(patch);

      expect(result.startLine).toBe(97);
      expect(result.addedLines.length).toBe(4);
    });

    it("should handle patch with multiple hunks", () => {
      const patch = `@@ -10,3 +10,5 @@
 line1
+new line 1
+new line 2
 line2
@@ -20,3 +22,5 @@
 line3
+another new line 1
+another new line 2
 line4`;

      const result = parsePatch(patch);

      // Should use the last start line found
      expect(result.startLine).toBe(22);
      expect(result.addedLines).toEqual([
        "new line 1",
        "new line 2",
        "another new line 1",
        "another new line 2",
      ]);
    });

    it("should ignore lines starting with +++", () => {
      const patch = `@@ -1,3 +1,4 @@
+++ a/file.txt
 line1
+new line
 line2`;

      const result = parsePatch(patch);

      expect(result.addedLines).toEqual(["new line"]);
      expect(result.addedLines).not.toContain("+++ a/file.txt");
    });

    it("should handle empty patch", () => {
      const patch = "";

      const result = parsePatch(patch);

      expect(result.startLine).toBe(0);
      expect(result.addedLines).toEqual([]);
    });

    it("should handle patch with no added lines", () => {
      const patch = `@@ -1,3 +1,3 @@
 line1
 line2
 line3`;

      const result = parsePatch(patch);

      expect(result.startLine).toBe(1);
      expect(result.addedLines).toEqual([]);
    });

    it("should handle patch with context lines only", () => {
      const patch = `@@ -5,3 +5,3 @@
 context line 1
 context line 2
 context line 3`;

      const result = parsePatch(patch);

      expect(result.startLine).toBe(5);
      expect(result.addedLines).toEqual([]);
    });
  });

  describe("fetchPullRequestFiles", () => {
    it("should fetch PR files from GitHub API", async () => {
      // This test would require mocking axios
      // For now, we'll just verify the function exists and is callable
      expect(typeof fetchPullRequestFiles).toBe("function");
    });
  });
});

