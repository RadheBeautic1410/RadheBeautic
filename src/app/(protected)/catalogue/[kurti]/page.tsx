"use client"

import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import KurtiPicCard from "../../_components/kurti/kurtiPicCard";
import PageLoader from "@/src/components/loader";
import SearchBar from '@mkyy/mui-search-bar'
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import NotAllowedPage from "../../_components/errorPages/NotAllowedPage";
import { UserRole } from "@prisma/client";

interface category {
    id: string;
    name: string;
    normalizedLowerCase: string;
}

interface kurti {
    id: string;
    category: string;
    code: string;
    images: any[],
    sizes: any[],
    party: string,
    sellingPrice: string,
    actualPrice: string,
}

const ListPage = () => {
    const [categoryLoader, setCategoryLoader] = useState(true);
    const [category, setCategory] = useState<category[]>([]);
    const [valid, setValid] = useState(true);
    const [kurtiData, setKurtiData] = useState<kurti[]>([]);
    const [displayData, setDisplayData] = useState<kurti[]>([]);
    const pathname = usePathname();
    const [textFieldValue, setTextFieldValue] = useState('');
    const handleSearch = (newVal: string) => {
        const filteredRows = kurtiData.filter((row) => {
            return row.code.toUpperCase().includes(newVal.toUpperCase());
        });
        setDisplayData(filteredRows);
    }
    const cancelSearch = () => {
        setTextFieldValue("");
        handleSearch(textFieldValue);
        setDisplayData(kurtiData);
    };
    let paths = pathname.split('/');

    const handleKurtiDelete = async (data: kurti[])=>{
        console.log('data', [...data]);
        await setKurtiData([...data]);
        setCategoryLoader(true);
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`/api/category/isexist?category=${paths[2].toLowerCase()}`);
                const result = await response.json();
                if (result.data) {
                    setValid(result.data);
                    const response2 = await fetch(`/api/kurti/getByCategory?category=${paths[2]}`);
                    const result2 = await response2.json();
                    setDisplayData(result2.data);
                    setKurtiData(result2.data);
                    // console.log(result2.data);
                }
                else {
                    setValid(false);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setCategoryLoader(false);
            }
        };
        if(categoryLoader){
            fetchData();
        }
    }, [paths, categoryLoader, setKurtiData]);

    return (
        <>
            <PageLoader loading={categoryLoader} />
            <Card className="w-[90%]">
                <CardHeader>
                    <p className="text-2xl font-semibold text-center">
                        {`👜 Catalogue - ${paths[2]}`}
                    </p>
                </CardHeader>
                <CardContent>
                    <div>
                        <SearchBar
                            value={textFieldValue}
                            onChange={newValue => handleSearch(newValue)}
                            onCancelResearch={() => cancelSearch()}
                            width={'100%'}
                            style={{
                                backgroundColor: '#fff',
                                border: '1px solid #ccc',
                            }}
                        />
                    </div>
                </CardContent>
                {displayData ?
                    <CardContent className="w-full flex flex-row space-evenely justify-center flex-wrap gap-3">
                        {displayData.map((data, i) => (
                            <KurtiPicCard data={data} key={i} onKurtiDelete={handleKurtiDelete}/>
                        ))}
                    </CardContent>
                    : ""}
            </Card>
        </>
    )
}

const CatalogueHelper = () => {
    return (
        <>
            <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}>
                <ListPage/>
            </RoleGateForComponent>
            <RoleGateForComponent allowedRole={[UserRole.SELLER]}>
                <NotAllowedPage/>
            </RoleGateForComponent>
        </>
    );
}

export default CatalogueHelper;