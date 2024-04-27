"use client";
import * as z from "zod"
import axios, { AxiosProgressEvent, CancelTokenSource } from "axios";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { useDropzone } from "react-dropzone";
import { Input } from "@/src/components/ui/input";
import {
    AudioWaveform,
    File,
    FileImage,
    FolderArchive,
    Loader2,
    UploadCloud,
    Video,
    X,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import ProgressBar from "@/src/components/ui/progress";
import { db } from "@/src/lib/db";
import ImageUpload from "../_components/imageUpload";
import { Button } from "@/src/components/ui/button";
import {
    Form, FormItem, FormLabel, FormControl, FormMessage, FormField,
    FormDescription
} from '@/src/components/ui/form'
import { KurtiSchema, categoryAddSchema, partyAddSchema } from "@/src/schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { DialogDemo } from "@/src/components/dialog-demo";
import { partyAddition } from "@/src/actions/party";
import { toast } from "sonner";
import { categoryAddition } from "@/src/actions/category";
import { kurtiAddition } from "@/src/actions/kurti";

interface party {
    id: string;
    name: string
    normalizedLowerCase: string;
}

interface category {
    id: string;
    name: string
    normalizedLowerCase: string;
}

interface Size {
    size: string;
    quantity: number;
}

const AddSizeForm: React.FC<{ idx: number; sizes: Size[]; onAddSize: (sizes: Size[]) => void }> =
    ({ idx, sizes, onAddSize }) => {
        let selectSizes: string[] = ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
        const [size, setSize] = useState<string>('S');
        const [quantity, setQuantity] = useState<number>(0);
        const [confirm, setConfirm] = useState(false);

        const handleAddSize = (event: any) => {
            event.preventDefault();
            if (size.trim() !== '' && quantity > 0) {
                let x = size;
                let obj = { size: x, quantity };
                let temp = sizes;
                for(let i = 0; i < temp.length;i++){
                    if(temp[i].size === x) {
                        toast.error('The size is already selected!!!');
                        return;
                    }
                }
                if (idx < temp.length) {
                    temp[idx] = obj;
                }
                else {
                    temp.push(obj);
                }
                console.log('edit', temp);
                onAddSize(temp);
                setConfirm(true);
            } else {
                toast.error('Please enter a valid size and quantity.');
            }
        };

        return (
            <div>
                <h3>Add New Size</h3>
                <div className="flex flex-row w-[50%]">
                    <Select
                        onValueChange={(e) => setSize(e)}
                        defaultValue={'S'}
                    >
                        <SelectTrigger className="w-[20%]">
                            <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                            {selectSizes.map((org) => (
                                <SelectItem key={org} value={org}>
                                    {org}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        className="ml-2 w-[20%]"
                        type="number"
                        placeholder="Quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                    />
                    <Button
                        type="button"
                        onClick={handleAddSize}
                        className="ml-2"
                    >
                        {confirm ? "✅ " : ""}Confirm
                    </Button>
                </div>
            </div>
        );
    };


const UploadPage = () => {
    const [isPending, startTransition] = useTransition()

    const [party, setParty] = useState<any[]>([]);
    const [partyLoader, setPartyLoader] = useState(true);
    const [categoryLoader, setCategoryLoader] = useState(true);
    const [generatedCode, setGeneratedCode] = useState("");
    const [category, setCategory] = useState<category[]>([]);
    const [images, setImages] = useState<any[]>([]);
    const [generatorLoader, setGeneratorLoader] = useState(false);
    const [components, setComponents] = useState<any[]>([]);
    const [sizes, setSizes] = useState<Size[]>([]);

    const handleAddSize = (sizes: Size[]) => {
        setSizes(sizes);
    };

    const addComponent = () => {
        setComponents([...components,
        <AddSizeForm
            key={components.length}
            idx={components.length}
            sizes={sizes}
            onAddSize={handleAddSize}
        />
        ]);
    };

    const handleImageChange = (data: any) => {
        setImages(data)
        console.log(data);
    }

    const handleSubmitParty = (values: z.infer<typeof partyAddSchema>) => {
        startTransition(() => {
            partyAddition(values)
                .then((data) => {
                    if (data.error) {
                        formParty.reset();
                        toast.error(data.error);
                    }

                    if (data.success) {
                        formParty.reset();
                        toast.success(data.success);
                        let result = party;
                        result.push(data.data);
                        const sortedParty = (result || []).sort((a: party, b: party) => a.name.localeCompare(b.name));
                        setParty(sortedParty);
                    }
                })
                .catch(() => toast.error("Something went wrong!"));
        });
    }

    const handleSubmitCategory = (values: z.infer<typeof categoryAddSchema>) => {
        startTransition(() => {
            categoryAddition(values)
                .then((data) => {
                    if (data.error) {
                        formCategory.reset();
                        toast.error(data.error);
                    }
                    if (data.success) {
                        formCategory.reset();
                        toast.success(data.success);
                        let result: any = category;
                        result.push(data.data);
                        const sortedCategory = (result || []).sort((a: category, b: category) => a.name.localeCompare(b.name));
                        setCategory(sortedCategory);
                    }
                })
                .catch(() => toast.error("Something went wrong!"));
        });
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/party'); // Adjust the API endpoint based on your actual setup
                const result = await response.json();
                const sortedParties = (result.data || []).sort((a: party, b: party) => a.name.localeCompare(b.name));
                setParty(sortedParties); // Use an empty array as a default value if result.data is undefined or null
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setPartyLoader(false);
            }
            try {
                const response = await fetch('/api/category'); // Adjust the API endpoint based on your actual setup
                const result = await response.json();
                const sortedCategory = (result.data || []).sort((a: party, b: party) => a.name.localeCompare(b.name));
                setCategory(sortedCategory); // Use an empty array as a default value if result.data is undefined or null
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setCategoryLoader(false);
            }
        };
        fetchData();
    }, []);

    const form = useForm<z.infer<typeof KurtiSchema>>({
        resolver: zodResolver(KurtiSchema),
        defaultValues: {
            images: images,
            sizes: [],
            party: "",
            sellingPrice: "0",
            actualPrice: "0",
            category: "",
            code: "",
        }
    });

    const handleFormSubmit = async () => {
        await CodeGenerator();
        form.setValue('images', images);
        form.setValue('code', generatedCode);
        form.setValue('sizes', sizes);
        if (images.length === 0) {
            toast.error("Upload Images");
        }
        else {
            console.log(sizes);
            const values = form.getValues();
            startTransition(() => {
                kurtiAddition(values)
                    .then((data) => {
                        if (data.success) {
                            form.reset();
                            toast.success(data.success);
                        }
                    })
                    .catch(() => toast.error("Something went wrong!"));
            });
        }
    }

    const CodeGenerator = async () => {
        try {
            setGeneratorLoader(true);
            const response = await fetch('/api/kurti/count'); // Adjust the API endpoint based on your actual setup
            const result = await response.json();
            const count = result.data + 1;
            const categorySelected = form.getValues().category;
            if (categorySelected === "") {
                toast.error('Please select the cateory first');
            }
            else {
                let code = categorySelected.substring(0, 3).toLowerCase();
                let str = String(count).padStart(4, '0');
                code = code.concat(str);
                setGeneratedCode(code);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setGeneratorLoader(false);
        }
    }

    const formParty = useForm({
        defaultValues: {
            name: "",
        }
    });

    const formCategory = useForm({
        defaultValues: {
            name: "",
        }
    });

    return (
        <Card className="w-[90%]">

            <CardHeader>
                <p className="text-2xl font-semibold text-center">
                    ⬆️ UPLOAD
                </p>
            </CardHeader>
            <CardContent className="text-center">
                <ImageUpload onImageChange={handleImageChange} images={images} />
                <div className="text-left w-[100%]">
                    <Form {...form}>
                        {/* Add Category Component */}
                        <form className="space-y-6 w-auto" onSubmit={handleFormSubmit}>
                            <div className="flex flex-row justify-normal">
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem className="w-[30%]">
                                            <FormLabel>Category</FormLabel>
                                            <Select
                                                disabled={isPending}
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Category" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {category.map((org) => (
                                                        <SelectItem key={org.id} value={org.name}>
                                                            {org.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} 
                                />
                                <div className="ml-3 mt-7">
                                    <Button
                                        asChild
                                    >
                                        <DialogDemo
                                            dialogTrigger="Add Category"
                                            dialogTitle="New Category Addition"
                                            dialogDescription="give Category name and click add Category"
                                            bgColor="destructive"
                                        >

                                            <Form {...formCategory}>
                                                <form
                                                    className="space-y-6"
                                                >

                                                    <FormField
                                                        control={formCategory.control}
                                                        name="name"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Category</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        {...field}
                                                                        disabled={isPending}
                                                                        placeholder="enter category name"

                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />


                                                    <Button
                                                        type="button"
                                                        disabled={isPending}
                                                        onClick={formCategory.handleSubmit(handleSubmitCategory)}
                                                    >
                                                        Add Category
                                                    </Button>
                                                </form>
                                            </Form>

                                        </DialogDemo>

                                    </Button>
                                </div>
                            </div>

                            <FormField
                                control={form.control}
                                name="actualPrice"
                                render={({ field }) => (
                                    <FormItem className="w-[30%]">
                                        <FormLabel>Actual Price</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                disabled={isPending}
                                                type="number"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Enter Actual Price of the Piece.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="sellingPrice"
                                render={({ field }) => (
                                    <FormItem className="w-[30%]">
                                        <FormLabel>Sell Price</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                disabled={isPending}
                                                type="number"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Enter Selling Price of the Piece.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div>
                                <h2>Sizes</h2>
                                {components.map((component, index) => (
                                    <div key={index}>
                                        {component}
                                    </div>
                                ))}
                                <Button type="button" onClick={addComponent}>+ Add</Button>
                            </div>

                            <div className="flex flex-row justify-normal">

                                <div>
                                    <FormField
                                        control={form.control}
                                        name="code"
                                        render={({ field }) => (
                                            <FormItem className="w-[90%]">
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        disabled
                                                        placeholder={generatedCode}
                                                        value={generatedCode.toUpperCase()}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Generate the code.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <Button onClick={CodeGenerator} disabled={generatorLoader} type="button">
                                    {generatorLoader ?
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        :
                                        ""
                                    }
                                    Generate Code
                                </Button>
                            </div>

                            {/* Add Party Component */}
                            <div className="flex flex-row justify-normal">
                                <FormField
                                    control={form.control}
                                    name="party"
                                    render={({ field }) => (
                                        <FormItem className="w-[30%]">
                                            <FormLabel>Party</FormLabel>
                                            <Select
                                                disabled={isPending}
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Party" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {party.map((org) => (
                                                        <SelectItem key={org.id} value={org.name}>
                                                            {org.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="ml-3 mt-7">
                                    <Button
                                        asChild
                                    >
                                        <DialogDemo
                                            dialogTrigger="Add Party"
                                            dialogTitle="New Party Addition"
                                            dialogDescription="give party name and click add party"
                                            bgColor="destructive"
                                        >

                                            <Form {...formParty}>
                                                <form
                                                    className="space-y-6"
                                                >

                                                    <FormField
                                                        control={formParty.control}
                                                        name="name"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Party</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        {...field}
                                                                        disabled={isPending}
                                                                        placeholder="enter party name"

                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />


                                                    <Button
                                                        type="button"
                                                        disabled={isPending}
                                                        onClick={formParty.handleSubmit(handleSubmitParty)}
                                                    >
                                                        Add Party
                                                    </Button>
                                                </form>
                                            </Form>

                                        </DialogDemo>

                                    </Button>
                                </div>
                            </div>
                            <Button
                                type="button"
                                disabled={isPending}
                                onClick={form.handleSubmit(handleFormSubmit)}
                            >
                                Submit
                            </Button>
                        </form>
                    </Form>
                </div>
                {/* <Button className="mt-2" onClick={handleSubmit}>Submit</Button> */}
            </CardContent>
        </Card >
    );
}

export default UploadPage;