import jwt from "jsonwebtoken";
import fs from "fs";
import axios from "axios";

const APP_ID = process.env.GITHUB_APP_ID!;
const PRIVATE_KEY = fs.readFileSync(
  process.env.GITHUB_PRIVATE_KEY_PATH!,
  "utf8"
);

export function generateAppJWT() {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iat: now - 60, 
    exp: now + 9 * 60, // 9 mins (max allowed)
    iss: APP_ID, 
  };

  return jwt.sign(payload, PRIVATE_KEY, {
    algorithm: "RS256",
  });
}

export async function getInstallationToken(installationId: number) {
  const jwtToken = generateAppJWT();

  const response = await axios.post(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {},
    {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  return response.data.token;
}
