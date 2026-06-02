import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // nodemailer is a Node-only package (used for Gmail SMTP); keep it out of the
  // bundle so it runs natively in the server runtime.
  serverExternalPackages: ["nodemailer"],
};

export default nextConfig;
