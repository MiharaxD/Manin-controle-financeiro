import { notFound } from "next/navigation";
import { FinanceApp } from "@/components/app";
import { createDemo, generateDemoDue } from "@/lib/demo";
import { demoSnapshot, monthOf, todaySP } from "@/lib/finance";
export const dynamic = "force-dynamic";
export default function DemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const today = todaySP(),
    data = generateDemoDue(createDemo(today), today);
  return (
    <FinanceApp
      initial={demoSnapshot(data, monthOf(today), today)}
      demoData={data}
    />
  );
}
