"use client";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dataset({
  title,
  stats,
  geoserverUrl,
  colossusUrl,
}: {
  title: string;
  stats: string;
  geoserverUrl: string;
  colossusUrl: string;
}) {
  const { toast } = useToast();
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    if (text.includes("colossus")) {
      toast({
        title: `${title} URL copied to clipboard`,
        description: `Make sure to add your username and password as custom parameters on ArcGIS Online`,
        duration: 5000,
      });
    } else {
      toast({
        title: `URL copied to clipboard`,
        description: `Make sure to add your username and password on ArcGIS or QGIS`,
        duration: 5000,
      });
    }
  }

  return (
    <div className="w-[370px] max-w-[50%] p-2 rounded-md border border-dashed border-zinc-400 ">
      <p className="font-semibold w-full">{title}</p>
      <p className="font-light text-sm">{stats}</p>
      <div
        className="flex flex-row justify-between align-middle items-center w-full
          hover:border-zinc-500 transition-all hover:bg-zinc-100 hover:shadow-sm hover:cursor-pointer"
        onClick={() => copyToClipboard(geoserverUrl)}
      >
        <div className="flex flex-row text-ellipsis truncate">
          <p className="font-semibold text-sm ">ArcGIS or QGIS desktop:</p>
          &nbsp;
          <p className="font-light italic text-sm text-ellipsis truncate">
            {geoserverUrl}
          </p>
        </div>
        <Copy size={12} />
      </div>
      <div
        className="flex flex-row justify-between align-middle items-center w-full
          hover:border-zinc-500 transition-all hover:bg-zinc-100 hover:shadow-sm hover:cursor-pointer"
        onClick={() => copyToClipboard(colossusUrl)}
      >
        <div className="flex flex-row text-ellipsis truncate">
          <p className="font-semibold text-sm ">ArcGIS Online:</p>
          &nbsp;
          <p className="font-light italic text-sm text-ellipsis truncate">
            {colossusUrl}
          </p>
        </div>
        <Copy size={12} />
      </div>
    </div>
  );
}
