"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useRouter } from "next/navigation";

type FormValues = {
  username: string;
  password: string;
};

export default function Login() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data);

    router.push("/dashboard");
    // Handle form submission
  };

  return (
    <main className="bg-[linear-gradient(to_top,rgba(0,0,0,0.5),rgba(0,0,0,0.1)),url(/background.jpg)] bg-cover h-screen w-screen flex flex-col align-middle justify-center items-center gap-10">
      <Image src={"/logo.png"} alt="logo" width={220} height={220} />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-[#FFFFFF] w-[270px] min-h-10 rounded-md shadow-sm p-[15px] flex flex-col gap-[12px] justify-center">
          <p>
            Log in with your client name and password to get access to your
            Geoserver datasets
          </p>
          <label htmlFor="username" className="text-sm font-semibold">
            Client name
          </label>
          <Input
            type="text"
            id="username"
            className="bg-[#FFFFFF] w-full rounded-md p-2 text-sm"
            {...register("username", { required: "Client name is required" })}
          />
          {errors.username && (
            <span className="text-red-500 text-sm">
              {errors.username.message}
            </span>
          )}
          <label htmlFor="password" className="text-sm  font-semibold">
            Password
          </label>
          <Input
            type="password"
            id="password"
            className="bg-[#FFFFFF] w-full rounded-md p-2 text-sm"
            {...register("password", { required: "Password is required" })}
          />
          {errors.password && (
            <span className="text-red-500 text-sm">
              {errors.password.message}
            </span>
          )}
          <Button type="submit">Login</Button>
        </div>
      </form>
    </main>
  );
}
