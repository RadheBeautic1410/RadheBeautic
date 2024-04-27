"use client"
import * as z from "zod";

import { UserButton } from '@/src/components/ui/user-button'
import { Button } from '@/src/components/ui/button'
import { useCurrentRole } from '@/src/hooks/use-currrent-role'
import { UserRole } from '@prisma/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { useTransition } from "react";
import Image from "next/image";
import { RoleGateForComponent } from '@/src/components/auth/role-gate-component'
import { DialogDemo } from "@/src/components/dialog-demo";
import { Form, FormField, FormControl, FormItem, FormLabel, FormDescription, FormMessage, } from "@/src/components/ui/form";
import { useForm } from "react-hook-form";
import { Input } from "@/src/components/ui/input";
import { toast } from "sonner";

import { organizationAddSchema } from "@/src/schemas";
import { organizationAddition } from "@/src/actions/organization";


const Navbar = () => {
    const [navbar, setNavbar] = useState(false);
    const form = useForm({
        defaultValues: {
            name: "",
        }
    });

    const [isPending, startTransition] = useTransition()

    const onSubmit = (values: z.infer<typeof organizationAddSchema>) => {
        startTransition(() => {
            organizationAddition(values)
                .then((data) => {
                    if (data.error) {
                        form.reset();
                        toast.error(data.error);
                    }

                    if (data.success) {
                        form.reset();
                        toast.success(data.success);

                    }
                })
                .catch(() => toast.error("Something went wrong!"));
        });
    }



    const pathname = usePathname();
    return (
        <>
            <nav className='bg-secondary p-4 rounded-xl w-[90%] shadow-sm'>
                <div className="flex justify-between items-center ">
                    <div className='flex gap-x-2 max-md:hidden'>

                        <div className='mt-[-1px]'>
                            <a href="/">
                                <Image
                                    src="/images/TextLogo.png"
                                    height="80"
                                    width="80"
                                    alt="Logo"
                                />
                            </a>
                        </div>
                        <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.MOD]}>
                            <Button
                                asChild
                                variant={pathname === "/upload" ? "default" : "outline"}
                            >
                                <Link href="/upload">Upload</Link>
                            </Button>
                        </RoleGateForComponent>

                        <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.MOD]}>
                            <Button
                                asChild
                                variant={pathname.includes('/catalogue') ? "default" : "outline"}
                            >
                                <Link href="/catalogue">Catalogue</Link>
                            </Button>
                        </RoleGateForComponent>
                        
                        <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.MOD]}>
                            <Button
                                asChild
                                variant={pathname === "/request" ? "default" : "outline"}
                            >
                                <Link href="/request">Requests</Link>
                            </Button>
                        </RoleGateForComponent>

                        <Button
                            asChild
                            variant={pathname === "/settings" ? "default" : "outline"}
                        >
                            <Link href="/settings">Settings</Link>
                        </Button>


                    </div>
                    <div className="flex gap-x-2 md:hidden">
                        <button
                            className="p-2 text-gray-700 rounded-md outline-none focus:border-gray-400 focus:border"
                            onClick={() => setNavbar(!navbar)}
                        >
                            {navbar ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-6 h-6 text-balck"
                                    viewBox="0 0 20 20"
                                    fill="black"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-6 h-6 text-balck"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="black"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                </svg>
                            )}
                        </button>
                    </div>
                    <div className='flex gap-x-2 md:hidden'>
                        <div className='mt-[-1px]'>
                            <a href="/">
                                <Image
                                    src="/images/TextLogo.png"
                                    height="80"
                                    width="80"
                                    alt="Logo"
                                />
                            </a>
                        </div>
                    </div>

                    <div className="flex justify-between gap-x-2">
                        <UserButton />
                    </div>
                </div>
                <div className="md:hidden">
                    <div
                        className={`flex-1 justify-self-center pb-3 mt-8 md:block md:pb-0 md:mt-0 ${navbar ? 'block' : 'hidden'
                            }`}
                    >
                        <ul className="items-center justify-center space-y-8 md:flex md:space-x-6 md:space-y-0">
                            <li className="text-balck">
                                <Link href="/" onClick={() => setNavbar(false)}>
                                    Home
                                </Link>
                            </li>

                            
                            <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.MOD]}>
                                <li className="text-balck">
                                    <Link href="/request" onClick={() => setNavbar(false)}>
                                        Requests
                                    </Link>
                                </li>
                            </RoleGateForComponent>

                            <li className="text-balck">
                                <Link href="/settings" onClick={() => setNavbar(false)}>
                                    Settings
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav >


        </>
    )
}

export default Navbar

