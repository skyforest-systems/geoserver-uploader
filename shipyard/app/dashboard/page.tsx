import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import Dataset from "@/components/dataset";
import { ExternalLink } from "lucide-react";

export default function Dashboard() {
  return (
    <main className="bg-[url(/background.jpg)] bg-cover h-screen w-screen flex flex-col gap-10">
      <div className="w-[80%] h-screen bg-white rounded-md shadow-md flex flex-col gap-4 p-[15px] ">
        <div className="flex flex-row items-center gap-4">
          <Image src={"/logo.png"} alt="logo" width={220} height={220} />
          <Separator orientation="vertical" />
          <p className="text-lg">
            Welcome, <b>John Doe</b>
          </p>
        </div>

        <Separator orientation="horizontal" />
        <div className="max-w-[400px] flex flex-col gap-2">
          <label htmlFor="filter">Filter datasets by anything:</label>
          <Input
            type="filter"
            id="filter"
            className="bg-[#FFFFFF] w-full rounded-md p-2 text-sm"
          />
        </div>
        <div>
          <p className="mb-2">Click on a dataset to copy the URL</p>
          <div className="flex flex-row gap-4 w-full flex-wrap">
            {/* TODO: Replace with dynamic data */}
            <Dataset title="Dataset 1" stats="10 files" url="https://..." />
            <Dataset title="Dataset 2" stats="10 files" url="https://..." />
            <Dataset title="Dataset 3" stats="10 files" url="https://..." />
            <Dataset title="Dataset 4" stats="10 files" url="https://..." />
            <Dataset title="Dataset 5" stats="10 files" url="https://..." />
            <Dataset title="Dataset 6" stats="10 files" url="https://..." />
            <Dataset title="Dataset 7" stats="10 files" url="https://..." />
          </div>
        </div>
        <div className="">
          <Separator orientation="horizontal" />
          <p className="text-lg font-bold mb-4 mt-4">Need help?</p>
          <div className="flex flex-row gap-1 items-center">
            <a href="https://..." className="text-red-500 underline font-bold">
              How to add the datasets to Arcmap?
            </a>
            <ExternalLink size={12} className="text-red-500" />
          </div>
          <div className="flex flex-row gap-1 items-center">
            <a href="https://..." className="text-red-500 underline font-bold">
              How to add the datasets to ArcGIS Pro?
            </a>
            <ExternalLink size={12} className="text-red-500" />
          </div>
          <div className="flex flex-row gap-1 items-center">
            <a href="https://..." className="text-red-500 underline font-bold">
              How to add the datasets to ArcGIS Online?
            </a>
            <ExternalLink size={12} className="text-red-500" />
          </div>
          <div className="flex flex-row gap-1 items-center">
            <a href="https://..." className="text-red-500 underline font-bold">
              How to add the datasets to QGIS?
            </a>
            <ExternalLink size={12} className="text-red-500" />
          </div>
        </div>
      </div>
    </main>
  );
}
