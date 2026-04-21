import type { MetadataRoute } from "next";

const BASE = "https://mohs.panacea-i.com";
const ROUTES = [
  { path: "/", priority: 1.0 },
  { path: "/predictor", priority: 0.9 },
  { path: "/evidence", priority: 0.8 },
  { path: "/why", priority: 0.8 },
  { path: "/zones", priority: 0.7 },
  { path: "/tools", priority: 0.7 },
  { path: "/chat", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: r.priority,
  }));
}
