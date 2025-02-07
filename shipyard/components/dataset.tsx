"use client";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dataset({
  title,
  stats,
  url,
}: {
  title: string;
  stats: string;
  url: string;
}) {
  const { toast } = useToast();
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({
      title: `${title} URL copied to clipboard`,
      description: url,
      duration: 2000,
    });
  }

  return (
    <div
      className="w-[370px] max-w-[50%] p-2 rounded-md border border-dashed border-zinc-400 
          hover:border-zinc-500 transition-all hover:bg-zinc-100 hover:shadow-sm hover:cursor-pointer"
      onClick={() => copyToClipboard(url)}
    >
      <div className="flex flex-row justify-between align-middle items-center w-full">
        <p className="font-semibold w-full">{title}</p>
        <Copy size={12} />
      </div>
      <p className="font-light text-sm">{stats}</p>
      <p className="font-light italic text-sm">{url}</p>
    </div>
  );
}
