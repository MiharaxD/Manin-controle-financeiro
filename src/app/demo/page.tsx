import { LocalApp } from "@/components/local-app";
import { notFound } from "next/navigation";
export default function DemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <LocalApp mode="demo" />;
}
