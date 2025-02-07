import { Copy } from "lucide-react";

export default function Dataset({
  title,
  stats,
  url,
}: {
  title: string;
  stats: string;
  url: string;
}) {
  return (
    <div
      className="w-[370px] max-w-[50%] p-2 rounded-md border border-dashed border-zinc-400 
          hover:border-zinc-500 transition-all hover:bg-zinc-100 hover:shadow-sm hover:cursor-pointer"
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
