"use client";

import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import PageLoader from "@/src/components/loader";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Button } from "@/src/components/ui/button";
import { DialogDemo } from "@/src/components/dialog-demo";
import { deleteCategory } from "@/src/actions/kurti";
import { toast } from "sonner";
import KurtiPicCard from "../_components/kurti/kurtiPicCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/src/components/ui/pagination";
import TypeEdit from "../_components/kurti/typeEdit";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { categoryAddSchema } from "@/src/schemas";
import { categoryAddition, generateCategoryPDF } from "@/src/actions/category";
import { z } from "zod";
import ImageUpload2 from "../_components/upload/imageUpload2";
import EditCategoryModal from "../_components/category/EditCategoryModel";
import { SearchBar } from "@/src/components/Searchbar";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  FileDownIcon,
  Package,
  Pencil,
  ShoppingBag,
  Trash2,
  TrendingUp,
} from "lucide-react";
import JSZip from "jszip";
import axios from "axios";

interface Category {
  id: string;
  name: string;
  count: number;
  type: string;
  countOfPiece: number;
  sellingPrice: number;
  actualPrice: number;
  image?: string;
  bigPrice?: number;
  walletDiscount?: number;
  code?: string;
}

interface Kurti {
  id: string;
  category: string;
  code: string;
  images: any[];
  videos?: any[];
  sizes: any[];
  party: string;
  sellingPrice: string;
  actualPrice: string;
  isDeleted: boolean;
}

// Constants
const SEARCH_TYPES = {
  DESIGN: "0",
  CATEGORY: "1",
  PRICE: "2",
  TYPE: "3",
} as const;

const SORT_TYPES = {
  PRICE_HIGH_TO_LOW: "0",
  NAME: "1",
  PIECE_COUNT: "2",
  PRICE_LOW_TO_HIGH: "3",
} as const;

// Pagination constants
const ITEMS_PER_PAGE = 20;
const KURTI_ITEMS_PER_PAGE = 12;

type SearchTypeValue = (typeof SEARCH_TYPES)[keyof typeof SEARCH_TYPES];

// Utility functions
const getCurrTime = () => {
  const currentTime = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  return new Date(currentTime.getTime() + ISTOffset);
};

const calculateCategoryStats = (kurtiData: Kurti[], categories: Category[]) => {
  const categoryMap = new Map(
    categories.map((cat) => [
      cat.name.toLowerCase(),
      {
        ...cat,
        count: 0,
        countOfPiece: 0,
        sellingPrice: 0,
        actualPrice: 0,
      },
    ])
  );

  let totalItems = 0;
  let totalPieces = 0;
  let totalStockPrice = 0;

  kurtiData.forEach((kurti) => {
    if (kurti.isDeleted) return;

    const category = categoryMap.get(kurti.category.toLowerCase());
    if (!category) return;

    category.count += 1;
    totalItems += 1;

    const pieceCount = kurti.sizes.reduce(
      (sum, size) => sum + (size.quantity > 0 ? size.quantity : 0 || 0),
      0
    );
    category.countOfPiece += pieceCount;
    totalPieces += pieceCount;

    if (category.sellingPrice === 0) {
      category.sellingPrice = parseInt(kurti.sellingPrice || "0");
    }

    const itemStockValue = pieceCount * parseInt(kurti.actualPrice || "0");
    category.actualPrice += itemStockValue;
    totalStockPrice += itemStockValue;
  });

  return {
    categories: Array.from(categoryMap.values()),
    totals: { totalItems, totalPieces, totalStockPrice },
  };
};

const sortCategories = (
  categories: Category[],
  sortType: string
): Category[] => {
  switch (sortType) {
    case SORT_TYPES.PRICE_HIGH_TO_LOW:
      return [...categories].sort((a, b) => b.sellingPrice - a.sellingPrice);
    case SORT_TYPES.PRICE_LOW_TO_HIGH:
      return [...categories].sort((a, b) => a.sellingPrice - b.sellingPrice);
    case SORT_TYPES.PIECE_COUNT:
      return [...categories].sort((a, b) => b.countOfPiece - a.countOfPiece);
    case SORT_TYPES.NAME:
      return [...categories].sort((a, b) => a.name.localeCompare(b.name));
    default:
      return categories;
  }
};

// Pagination utility functions
const paginate = <T,>(
  array: T[],
  pageNumber: number,
  pageSize: number
): T[] => {
  const startIndex = (pageNumber - 1) * pageSize;
  return array.slice(startIndex, startIndex + pageSize);
};

const getTotalPages = (totalItems: number, itemsPerPage: number): number => {
  return Math.ceil(totalItems / itemsPerPage);
};

const ListPage = () => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [kurtiData, setKurtiData] = useState<Kurti[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [searchType, setSearchType] = useState<SearchTypeValue>(
    SEARCH_TYPES.DESIGN
  );
  const [sortType, setSortType] = useState<string>(
    SORT_TYPES.PRICE_HIGH_TO_LOW
  );
  const [totals, setTotals] = useState({
    totalItems: 0,
    totalPieces: 0,
    totalStockPrice: 0,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [kurtiCurrentPage, setKurtiCurrentPage] = useState(1);

  const [isPending, startTransition] = useTransition();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Image Modal Component
  const ImageModal = ({
    src,
    alt,
    onClose,
  }: {
    src: string;
    alt: string;
    onClose: () => void;
  }) => (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="max-w-4xl max-h-[90vh] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-screen-sm max-h-[85%] object-contain rounded-lg"
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
        >
          ✕
        </button>
      </div>
    </div>
  );

  const form = useForm({
    defaultValues: {
      name: "",
      type: "",
      image: "",
      bigPrice: 0,
    },
  });

  const fetchKurtiData = useCallback(async (): Promise<Kurti[]> => {
    try {
      const response = await fetch("/api/kurti/getall");
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error("Error fetching kurti data:", error);
      return [];
    }
  }, []);

  const fetchCategories = useCallback(async (): Promise<Category[]> => {
    try {
      const response = await fetch("/api/category");
      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }, []);

  const processedCategories = useMemo(() => {
    if (!categories.length || !kurtiData.length) return categories;

    const { categories: updatedCategories } = calculateCategoryStats(
      kurtiData,
      categories
    );
    return sortCategories(updatedCategories, sortType);
  }, [categories, kurtiData, sortType]);

  const { filteredKurti, filteredCategories } = useMemo(() => {
    if (!searchValue.trim()) {
      return {
        filteredKurti: searchType === SEARCH_TYPES.DESIGN ? kurtiData : [],
        filteredCategories:
          searchType !== SEARCH_TYPES.DESIGN ? processedCategories : [],
      };
    }

    const searchTerm = searchValue.toLowerCase();

    switch (searchType) {
      case SEARCH_TYPES.DESIGN:
        return {
          filteredKurti: kurtiData.filter((kurti) =>
            kurti.code.toLowerCase().includes(searchTerm)
          ),
          filteredCategories: [],
        };

      case SEARCH_TYPES.CATEGORY:
        return {
          filteredKurti: [],
          filteredCategories: processedCategories.filter((cat) =>
            cat.name.toLowerCase().includes(searchTerm)
          ),
        };

      case SEARCH_TYPES.PRICE:
        const priceSearch = parseInt(searchValue) || 0;
        return {
          filteredKurti: [],
          filteredCategories: processedCategories.filter(
            (cat) => cat.sellingPrice === priceSearch
          ),
        };

      case SEARCH_TYPES.TYPE:
        return {
          filteredKurti: [],
          filteredCategories: processedCategories.filter((cat) =>
            cat.type?.toLowerCase().includes(searchTerm)
          ),
        };

      default:
        return { filteredKurti: [], filteredCategories: processedCategories };
    }
  }, [searchValue, searchType, kurtiData, processedCategories]);

  const displayCategories = useMemo(() => {
    const categories =
      searchValue.trim().length > 0 ? filteredCategories : processedCategories;
    return paginate(categories, currentPage, ITEMS_PER_PAGE);
  }, [filteredCategories, processedCategories, currentPage, searchValue]);

  const displayKurti = useMemo(() => {
    return paginate(filteredKurti, kurtiCurrentPage, KURTI_ITEMS_PER_PAGE);
  }, [filteredKurti, kurtiCurrentPage]);

  const totalCategoryPages = useMemo(() => {
    const categories =
      searchValue.trim().length > 0 ? filteredCategories : processedCategories;
    return getTotalPages(categories.length, ITEMS_PER_PAGE);
  }, [filteredCategories, processedCategories, searchValue]);

  const totalKurtiPages = useMemo(() => {
    return getTotalPages(filteredKurti.length, KURTI_ITEMS_PER_PAGE);
  }, [filteredKurti]);

  const handleSearch = useCallback((newValue: string) => {
    setSearchValue(newValue);
    setCurrentPage(1);
    setKurtiCurrentPage(1);
  }, []);

  const handleSearchCancel = useCallback(() => {
    setSearchValue("");
    setCurrentPage(1);
    setKurtiCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((newSortType: string) => {
    setSortType(newSortType);
    setCurrentPage(1);
  }, []);

  const handleDeleteCategory = useCallback(async (categoryName: string) => {
    startTransition(() => {
      deleteCategory({ category: categoryName })
        .then((data: any) => {
          if (data.error) {
            toast.error(data.error);
            return;
          }
          if (data.success) {
            toast.success(data.success);
            setIsLoading(true);
          }
        })
        .catch(() => {
          toast.error("Something went wrong!");
        });
    });
  }, []);

  const handleKurtiDelete = useCallback(async (updatedData: Kurti[]) => {
    setKurtiData(updatedData);
    setIsLoading(true);
  }, []);

  const handleTypeUpdate = useCallback(
    async (categoryName: string, newType: string) => {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.name.toLowerCase() === categoryName.toLowerCase()
            ? { ...cat, type: newType }
            : cat
        )
      );
    },
    []
  );

  const handleSubmitCategory = useCallback(
    (values: z.infer<typeof categoryAddSchema>) => {
      startTransition(() => {
        categoryAddition({
          name: values.name,
          type: values.type,
          image: values.image,
          bigPrice: values.bigPrice
            ? parseFloat(values.bigPrice?.toString())
            : null,
        })
          .then((data) => {
            if (data.error) {
              form.reset();
              toast.error(data.error);
              return;
            }
            if (data.success) {
              form.reset();
              toast.success(data.success);
              if (data.data) {
                const newCategory: Category = {
                  id: data.data.id,
                  name: data.data.name,
                  count: 0,
                  type: data.data.type || "",
                  countOfPiece: 0,
                  sellingPrice: 0,
                  actualPrice: 0,
                  image: data.data.image || undefined,
                };
                setCategories((prev) => [...prev, newCategory]);
              }
            }
          })
          .catch(() => toast.error("Something went wrong!"));
      });
    },
    [form]
  );

  const handleSearchTypeChange = useCallback((value: string) => {
    if (Object.values(SEARCH_TYPES).includes(value as SearchTypeValue)) {
      setSearchType(value as SearchTypeValue);
      setCurrentPage(1);
      setKurtiCurrentPage(1);
    }
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleKurtiPageChange = useCallback((page: number) => {
    setKurtiCurrentPage(page);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [kurtiResponse, categoriesResponse] = await Promise.all([
          fetchKurtiData(),
          fetchCategories(),
        ]);

        const { categories: processedCats, totals: calculatedTotals } =
          calculateCategoryStats(kurtiResponse, categoriesResponse);

        setKurtiData(kurtiResponse);
        setCategories(processedCats);
        setTotals(calculatedTotals);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoading) {
      loadData();
    }
  }, [isLoading, fetchKurtiData, fetchCategories]);

  const isSearching = searchValue.trim().length > 0;
  const showKurtiResults = searchType === SEARCH_TYPES.DESIGN && isSearching;

  if (isLoading) {
    return <PageLoader loading={true} />;
  }

  const handleCategoryUpdate = (
    updatedCategory: Category,
    originalName: string
  ) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.name.toLowerCase() === originalName.toLowerCase()
          ? updatedCategory
          : cat
      )
    );
  };

  const PaginationComponent = ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => {
    const [goToPage, setGoToPage] = useState("");

    if (totalPages <= 1) return null;

    const getVisiblePages = (isMobile: boolean = false) => {
      // Reduce delta for mobile screens
      const delta = isMobile ? 1 : 2;
      const range = [];
      const rangeWithDots = [];

      for (
        let i = Math.max(2, currentPage - delta);
        i <= Math.min(totalPages - 1, currentPage + delta);
        i++
      ) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, "...");
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push("...", totalPages);
      } else {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    const handleGoToPage = () => {
      const pageNumber = parseInt(goToPage);
      if (pageNumber >= 1 && pageNumber <= totalPages) {
        onPageChange(pageNumber);
        setGoToPage("");
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleGoToPage();
      }
    };

    return (
      <div className="flex flex-col items-center gap-3 sm:gap-4 w-full px-2">
        {/* Main Pagination - Desktop */}
        <div className="hidden sm:block">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {getVisiblePages(false).map((page, index) => (
                <PaginationItem key={index}>
                  {page === "..." ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => onPageChange(page as number)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    onPageChange(Math.min(totalPages, currentPage + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>

        {/* Mobile Pagination - Simplified */}
        <div className="sm:hidden flex items-center justify-between w-full max-w-xs">
          <Button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden xs:inline">Prev</span>
          </Button>

          <div className="flex items-center gap-1">
            {getVisiblePages(true).map((page, index) => (
              <div key={index}>
                {page === "..." ? (
                  <span className="px-1 text-gray-400">...</span>
                ) : (
                  <Button
                    onClick={() => onPageChange(page as number)}
                    size="sm"
                    variant={currentPage === page ? "default" : "ghost"}
                    className="w-8 h-8 p-0 text-sm"
                  >
                    {page}
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
          >
            <span className="hidden xs:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Page Info - Always visible but responsive */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-sm w-full max-w-md">
          {/* Current page indicator - Mobile only */}
          <div className="sm:hidden text-center text-gray-600 text-xs">
            Page {currentPage} of {totalPages}
          </div>

          {/* Go to page input */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-gray-600 text-xs sm:text-sm whitespace-nowrap">
              Go to:
            </span>
            <Input
              type="number"
              min="1"
              max={totalPages}
              value={goToPage}
              onChange={(e) => setGoToPage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Page"
              className="w-16 sm:w-20 h-7 sm:h-8 text-center text-xs sm:text-sm"
            />
            <Button
              onClick={handleGoToPage}
              disabled={
                !goToPage ||
                parseInt(goToPage) < 1 ||
                parseInt(goToPage) > totalPages
              }
              size="sm"
              variant="outline"
              className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
            >
              Go
            </Button>
            <span className="text-gray-500 text-xs sm:text-sm whitespace-nowrap hidden sm:inline">
              of {totalPages}
            </span>
          </div>
        </div>
      </div>
    );
  };

  function downloadCSV(data: Category[]) {
    if (!data.length) return;

    const headers: (keyof Category)[] = [
      "name",
      "count",
      "type",
      "countOfPiece",
      "sellingPrice",
      "actualPrice",
      "image",
    ];

    const csv = [
      headers.join(","), // header row
      ...data.map((row) =>
        headers
          .map((field) =>
            row[field] === null || row[field] === undefined
              ? ""
              : `"${String(row[field]).replace(/"/g, '""')}"`
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "items.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const CategoryCard = ({
    cat,
    index,
    currentPage,
    handleDeleteCategory,
    handleTypeUpdate,
    handleCategoryUpdate,
    isPending,
    setSelectedImage,
  }: {
    cat: Category;
    index: number;
    currentPage: number;
    handleDeleteCategory: (name: string) => void;
    handleTypeUpdate: (name: string, type: string) => void;
    handleCategoryUpdate: (category: Category, originalName: string) => void;
    isPending: boolean;
    setSelectedImage: (image: string) => void;
  }) => (
    <Card className="w-full shadow-sm border hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex flex-col">
        <div className="flex-shrink-0 flex gap-3 justify-between">
          <TableCell className="text-center">
            <img
              src={cat.image || "/images/no-image.png"}
              alt={cat.name}
              className="w-16 h-16 shrink-0 object-cover mx-auto cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                if (cat.image && cat.image !== "") {
                  setSelectedImage(cat.image || "/images/no-image.png");
                }
              }}
            />
          </TableCell>
          <RoleGateForComponent allowedRole={[UserRole.ADMIN]}>
            <div className="flex gap-1 ml-2">
              <Download
                role="button"
                size={16}
                className={`text-green-600 cursor-pointer hover:text-green-800 ${
                  downloadLoading && "pointer-events-none"
                }`}
                onClick={() => downloadCategoryImagesAndVideos(cat.name)}
                // title="Download all images from this category"
              />
              <FileDownIcon
                role="button"
                size={20}
                className={`text-blue-600 cursor-pointer hover:text-blue-800 ${
                  isGenerating && "pointer-events-none"
                }`}
                onClick={async () => {
                  if (cat.code) {
                    handleGeneratePDF(cat.code);
                  }
                }}
              />
              <EditCategoryModal
                category={cat}
                onCategoryUpdate={(updatedCat) => {
                  handleCategoryUpdate(updatedCat, cat.name);
                }}
                trigger={
                  <Edit
                    role="button"
                    size={16}
                    className="text-blue-600 cursor-pointer"
                  />
                }
              />
              <DialogDemo
                isTriggerElement
                dialogTrigger={
                  <Trash2 size={16} className="text-red-600 cursor-pointer" />
                }
                dialogTitle="Delete Category"
                dialogDescription="Delete the category"
              >
                <div>
                  <h1>Delete Category</h1>
                  <h3>
                    Are you sure you want to delete category "{cat.name}"?
                  </h3>
                </div>
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDeleteCategory(cat.name)}
                >
                  Delete
                </Button>
              </DialogDemo>
            </div>
          </RoleGateForComponent>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-base text-blue-800 truncate">
                  <Link href={`/catalogue/${cat.name.toLowerCase()}`}>
                    {cat.name}
                  </Link>
                </h3>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <span className="font-medium">Type:</span> {cat.type}
                  <TypeEdit
                    categoryName={cat.name}
                    onUpdateType={handleTypeUpdate}
                    initialType={cat.type}
                  />
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <RoleGateForComponent
                allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}
              >
                <div className="flex items-center gap-1">
                  <ShoppingBag size={14} className="text-blue-500" />
                  <span className="text-gray-600">Items:</span>
                  <span className="font-medium">{cat.count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package size={14} className="text-green-500" />
                  <span className="text-gray-600">Pieces:</span>
                  <span className="font-medium">{cat.countOfPiece}</span>
                </div>
              </RoleGateForComponent>
              <div className="flex items-center gap-1 col-span-2">
                <TrendingUp size={14} className="text-purple-500" />
                <span className="text-gray-600">Price:</span>
                <span className="font-medium">₹{cat.sellingPrice}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const downloadCategoryImagesAndVideos = async (categoryName: string) => {
    setDownloadLoading(true);
    try {
      const categoryKurtis = kurtiData.filter((kurti) => {
        // Basic filters
        const matchesCategory =
          kurti.category.toLowerCase() === categoryName.toLowerCase();
        const notDeleted = !kurti.isDeleted;

        // Check if kurti has available sizes (not reserved)
        const hasAvailableSizes =
          kurti.sizes &&
          kurti.sizes.length > 0 &&
          kurti.sizes.some((size) => {
            // Calculate available quantity (total - reserved)
            // const reservedQuantity = kurti.reservedSizes
            //   ?.find(reserved => reserved.size === size.size)?.quantity || 0;
            // const availableQuantity = size.quantity - reservedQuantity;
            return size.quantity > 0;
          });

        return matchesCategory && notDeleted && hasAvailableSizes;
      });

      console.log(
        "🚀 ~ downloadCategoryImagesAndVideos ~ categoryKurtis:",
        categoryKurtis
      );

      if (categoryKurtis.length === 0) {
        toast.error("No items found in this category with available sizes");
        return;
      }

      const mediaUrls: any = [];

      // Helper function to find blocks and generate watermark texts for each kurti
      const findBlocks = async (kurti: Kurti) => {
        let selectSizes: string[] = [
          "XS",
          "S",
          "M",
          "L",
          "XL",
          "XXL",
          "3XL",
          "4XL",
          "5XL",
          "6XL",
          "7XL",
          "8XL",
          "9XL",
          "10XL",
        ];

        let sizesArray: any[] = kurti.sizes.filter((size) => {
          // Only include sizes that have available quantity (after reservations)
          // const reservedQuantity = kurti.reservedSizes
          //   ?.find(reserved => reserved.size === size.size)?.quantity || 0;
          // const availableQuantity = size.quantity - reservedQuantity;
          return size.quantity > 0;
        });

        sizesArray.sort(
          (a, b) => selectSizes.indexOf(a.size) - selectSizes.indexOf(b.size)
        );

        let ele = [];
        let blocks: string = ``;

        for (let i = 0; i < sizesArray.length; i++) {
          ele.push(selectSizes.indexOf(sizesArray[i].size.toUpperCase()));
          if (selectSizes.indexOf(sizesArray[i].size.toUpperCase()) > 0) {
            ele.push(selectSizes.indexOf(sizesArray[i].size.toUpperCase()) - 1);
          }
        }

        ele.sort((a, b) => a - b);

        for (let i = 0; i < ele.length; i++) {
          if (i === 0 || ele[i] !== ele[i - 1]) {
            blocks += `\u2063  ${selectSizes[ele[i]]}`;
          }
        }

        let url = process.env.NEXT_PUBLIC_SERVER_URL + `/genImg?text=${blocks}`;
        const res = await axios.get(url);

        let url2 =
          process.env.NEXT_PUBLIC_SERVER_URL +
          `/genImg2?text=${kurti.code.toUpperCase()}`;
        const res2 = await axios.get(url2);

        return { leftText: res.data, rightText: res2.data };
      };

      // Helper function to apply watermark to image and return blob
      const applyWatermarkToImage = async (
        imageSrc: string,
        rightText: string,
        leftText: string
      ): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";

          img.onload = async () => {
            try {
              // Store original dimensions
              const originalWidth = img.naturalWidth;
              const originalHeight = img.naturalHeight;

              // Create canvas with exact original dimensions
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              canvas.width = originalWidth;
              canvas.height = originalHeight;

              // Draw original image first
              ctx?.drawImage(img, 0, 0, originalWidth, originalHeight);

              // Create watermark images
              const rightWatermarkImg = new Image();
              const leftWatermarkImg = new Image();

              let watermarksLoaded = 0;
              const checkWatermarksLoaded = () => {
                watermarksLoaded++;
                if (watermarksLoaded === 2) {
                  // Draw watermarks on canvas
                  if (ctx) {
                    // Right watermark (top-right)
                    const rightWatermarkWidth = originalWidth / 10;
                    const rightWatermarkHeight = originalHeight / 27;
                    ctx.drawImage(
                      rightWatermarkImg,
                      originalWidth - rightWatermarkWidth - 10, // 10px padding from right
                      10, // 10px padding from top
                      rightWatermarkWidth,
                      rightWatermarkHeight
                    );

                    // Left watermark (top-left)
                    const leftWatermarkWidth = originalWidth / 6;
                    const leftWatermarkHeight = originalHeight / 16;
                    ctx.drawImage(
                      leftWatermarkImg,
                      10, // 10px padding from left
                      10, // 10px padding from top
                      leftWatermarkWidth,
                      leftWatermarkHeight
                    );
                  }

                  // Convert to blob with high quality
                  canvas.toBlob(
                    (blob) => {
                      if (blob) {
                        resolve(blob);
                      } else {
                        reject(
                          new Error(
                            "Failed to convert watermarked image to blob"
                          )
                        );
                      }
                    },
                    "image/jpeg",
                    0.95 // Higher quality
                  );
                }
              };

              rightWatermarkImg.onload = checkWatermarksLoaded;
              leftWatermarkImg.onload = checkWatermarksLoaded;

              rightWatermarkImg.onerror = () =>
                reject(new Error("Failed to load right watermark"));
              leftWatermarkImg.onerror = () =>
                reject(new Error("Failed to load left watermark"));

              rightWatermarkImg.src = rightText;
              leftWatermarkImg.src = leftText;
            } catch (error) {
              reject(error);
            }
          };

          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = imageSrc;
        });
      };

      // Collect all media URLs with watermark data for images
      for (const kurti of categoryKurtis) {
        // Get watermark texts for this kurti
        const watermarkTexts = await findBlocks(kurti);

        // Add images with watermark info
        if (kurti.images && Array.isArray(kurti.images)) {
          kurti.images.forEach((imageObj) => {
            if (imageObj.url && !imageObj.is_hidden) {
              mediaUrls.push({
                url: imageObj.url,
                filename: `${kurti.code}_image_${imageObj.id}.jpg`,
                kurtiCode: kurti.code,
                type: "image",
                watermarkTexts: watermarkTexts, // Add watermark texts
              });
            }
          });
        }

        // Add videos (no watermark needed)
        if (kurti.videos && Array.isArray(kurti.videos)) {
          kurti.videos.forEach((videoObj) => {
            if (videoObj.url && !videoObj.is_hidden) {
              // Better extension extraction
              const getVideoExtension = (url: string): string => {
                try {
                  // Remove query parameters
                  const urlWithoutParams = url.split("?")[0];
                  const parts = urlWithoutParams.split(".");

                  if (parts.length > 1) {
                    const ext = parts.pop()?.toLowerCase();
                    // Validate common video extensions
                    const validExtensions = [
                      "mp4",
                      "avi",
                      "mov",
                      "mkv",
                      "wmv",
                      "flv",
                      "webm",
                      "m4v",
                    ];
                    if (ext && validExtensions.includes(ext)) {
                      return ext;
                    }
                  }

                  // Default to mp4 if no valid extension found
                  return "mp4";
                } catch (error) {
                  return "mp4";
                }
              };

              const extension = getVideoExtension(videoObj.url);

              mediaUrls.push({
                url: videoObj.url,
                filename: `${kurti.code}_video_${videoObj.id}.${extension}`,
                kurtiCode: kurti.code,
                type: "video",
              });
            }
          });
        }
      }

      if (mediaUrls.length === 0) {
        toast.error("No media files found in this category");
        return;
      }

      const loadingToast = toast.loading(
        `Processing ${mediaUrls.length} files...`
      );

      const zip = new JSZip();

      const downloadPromises = mediaUrls.map(
        async (mediaInfo: any, index: number) => {
          try {
            toast.loading(
              `Processing ${mediaInfo.type} ${index + 1}/${
                mediaUrls.length
              }...`,
              {
                id: loadingToast,
              }
            );

            if (mediaInfo.type === "image") {
              // Apply watermark to images
              const watermarkedBlob = await applyWatermarkToImage(
                mediaInfo.url,
                mediaInfo.watermarkTexts.rightText,
                mediaInfo.watermarkTexts.leftText
              );

              zip.file(mediaInfo.filename, watermarkedBlob);
              return true;
            } else if (mediaInfo.type === "video") {
              // Download videos directly (no watermark)
              const response = await fetch(mediaInfo.url);
              if (!response.ok) {
                console.warn(`Failed to download file: ${mediaInfo.url}`);
                return null;
              }

              const blob = await response.blob();
              zip.file(mediaInfo.filename, blob);
              return true;
            }

            return null;
          } catch (error) {
            console.error(
              `Error processing ${mediaInfo.type} ${mediaInfo.url}:`,
              error
            );
            return null;
          }
        }
      );

      const results = await Promise.all(downloadPromises);
      const successCount = results.filter((result) => result !== null).length;

      if (successCount === 0) {
        toast.dismiss(loadingToast);
        toast.error("Failed to process any files");
        return;
      }

      toast.loading("Generating zip file...", {
        id: loadingToast,
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });

      toast.loading("Starting download...", {
        id: loadingToast,
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${categoryName}_media_${
        new Date().toISOString().split("T")[0]
      }.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success(
        `Downloaded ${successCount} files successfully with watermarks!`
      );
    } catch (error) {
      console.error("Error creating zip file:", error);
      toast.error("Failed to create zip file");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleGeneratePDF = async (categoryCode: string) => {
    if (!categoryCode.trim()) {
      alert("Please enter a category code");
      return;
    }

    setIsGenerating(true);

    let pdfGenerateTost = toast.loading("Generating PDF...");

    try {
      const result = await generateCategoryPDF(categoryCode);

      if (result.success && result.pdfData) {
        // Create blob from base64 data
        const binaryString = atob(result.pdfData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        URL.revokeObjectURL(url);
      } else {
        alert(result.error || "Failed to generate PDF");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while generating the PDF");
    } finally {
      setIsGenerating(false);
      toast.dismiss(pdfGenerateTost);
    }
  };

  return (
    <Card className="sm:w-[90%]">
      <CardHeader className="flex items-center">
        <p className="text-2xl font-semibold text-center">👜 Catalogue</p>
        <div className="sm:ml-auto mt-7 flex flex-col sm:flex-row justify-center items-center gap-2">
          <Button asChild>
            <DialogDemo
              dialogTrigger="+ Add Category"
              dialogTitle="New Category Addition"
              dialogDescription="Give category name and click add category"
            >
              <Form {...form}>
                <form className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isPending}
                            placeholder="Enter category name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isPending}
                            placeholder="Enter category type"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bigPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Big price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            disabled={isPending}
                            placeholder="Enter price of big size"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image</FormLabel>
                        <FormControl>
                          <ImageUpload2
                            images={[field.value]}
                            singleFile
                            onImageChange={(data) => {
                              field.onChange(data[0]?.url || "");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={form.handleSubmit(handleSubmitCategory)}
                  >
                    Add Category
                  </Button>
                </form>
              </Form>
            </DialogDemo>
          </Button>
          <Button
            type="button"
            className="sm:ml-2"
            disabled={isPending}
            onClick={() => downloadCSV(categories)}
          >
            Download CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="pb-2">
          <div className="flex flex-col sm:flex-row justify-center mb-2 gap-4">
            <div className="sm:w-[30%]">
              <h2 className="scroll-m-20 text-sm font-semibold tracking-tight first:mt-0">
                Select search type
              </h2>
              <Select onValueChange={handleSearchTypeChange} value={searchType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Search Field Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEARCH_TYPES.DESIGN}>
                    Search Design
                  </SelectItem>
                  <SelectItem value={SEARCH_TYPES.CATEGORY}>
                    Search Category
                  </SelectItem>
                  <SelectItem value={SEARCH_TYPES.PRICE}>
                    Search Price
                  </SelectItem>
                  <SelectItem value={SEARCH_TYPES.TYPE}>Search Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:w-[30%]">
              <h2 className="scroll-m-20 text-sm font-semibold tracking-tight first:mt-0">
                Select sort type
              </h2>
              <Select onValueChange={handleSortChange} value={sortType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Sort Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SORT_TYPES.PRICE_HIGH_TO_LOW}>
                    Sort By Price High to Low
                  </SelectItem>
                  <SelectItem value={SORT_TYPES.PRICE_LOW_TO_HIGH}>
                    Sort By Price Low to High
                  </SelectItem>
                  <SelectItem value={SORT_TYPES.PIECE_COUNT}>
                    Sort By Piece Count
                  </SelectItem>
                  <SelectItem value={SORT_TYPES.NAME}>Sort By Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:w-[30%] mt-auto">
              <SearchBar
                value={searchValue}
                onChange={handleSearch}
                onCancelResearch={handleSearchCancel}
                width="100%"
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                  maxWidth: "400px",
                  marginTopL: "auto",
                }}
              />
            </div>
          </div>
        </div>

        {!isSearching && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-xl font-bold text-blue-600">
                  {totals.totalItems}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Pieces</p>
                <p className="text-xl font-bold text-green-600">
                  {totals.totalPieces}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Stock Value</p>
                <p className="text-xl font-bold text-purple-600">
                  ₹{totals.totalStockPrice.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {showKurtiResults ? (
          <>
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-600">
                Showing {displayKurti.length} of {filteredKurti.length} designs
                {searchValue && ` for "${searchValue}"`}
              </p>
            </div>
            <CardContent className="w-full flex flex-row justify-center flex-wrap gap-3">
              {displayKurti.map((data, i) => (
                <KurtiPicCard
                  data={data}
                  key={`${data.id}-${i}`}
                  onKurtiDelete={handleKurtiDelete}
                />
              ))}
            </CardContent>
            {totalKurtiPages > 1 && (
              <div className="flex justify-center mt-4">
                <PaginationComponent
                  currentPage={kurtiCurrentPage}
                  totalPages={totalKurtiPages}
                  onPageChange={handleKurtiPageChange}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-600">
                Showing {displayCategories.length} of{" "}
                {searchValue.trim().length > 0
                  ? filteredCategories.length
                  : processedCategories.length}{" "}
                categories
                {searchValue && ` for "${searchValue}"`}
              </p>
            </div>
            <div className="flex-col gap-2 hidden sm:flex">
              <Table>
                <TableCaption>List of all categories</TableCaption>
                <TableHeader>
                  <TableRow className="text-black">
                    <TableHead className="text-center font-bold text-base">
                      Sr.
                    </TableHead>
                    <TableHead className="text-center font-bold text-base">
                      Category
                    </TableHead>
                    <TableHead className="text-center font-bold text-base">
                      Image
                    </TableHead>
                    <TableHead className="text-center font-bold text-base">
                      Type
                    </TableHead>
                    <RoleGateForComponent
                      allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}
                    >
                      <TableHead className="text-center font-bold text-base">
                        Total Items
                      </TableHead>
                      <TableHead className="text-center font-bold text-base">
                        Total Pieces
                      </TableHead>
                    </RoleGateForComponent>
                    <TableHead className="text-center font-bold text-base">
                      Price
                    </TableHead>
                    <TableHead className="text-center font-bold text-base">
                      Wallet Discount
                    </TableHead>
                    <RoleGateForComponent allowedRole={[UserRole.ADMIN]}>
                      <TableHead className="text-center font-bold text-base">
                        Actions
                      </TableHead>
                    </RoleGateForComponent>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayCategories.map((cat, idx) => (
                    <TableRow key={`category-${cat.name}-${idx}`}>
                      <TableCell className="text-center">
                        {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                      </TableCell>
                      <TableCell className="text-center text-blue-800 font-bold cursor-pointer">
                        <Link href={`/catalogue/${cat.name.toLowerCase()}`}>
                          {cat.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        <TableCell className="text-center flex">
                          <img
                            src={cat.image || "/images/no-image.png"}
                            alt={cat.name}
                            className="w-16 h-16 shrink-0 object-cover mx-auto cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              if (cat.image && cat.image !== "") {
                                setSelectedImage(
                                  cat.image || "/images/no-image.png"
                                );
                              }
                            }}
                          />
                        </TableCell>
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {cat.type}
                        {/* <TypeEdit
                          categoryName={cat.name}
                          onUpdateType={handleTypeUpdate}
                          initialType={cat.type}
                        /> */}
                      </TableCell>
                      <RoleGateForComponent
                        allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}
                      >
                        <TableCell className="text-center">
                          {cat.count}
                        </TableCell>
                        <TableCell className="text-center">
                          {cat.countOfPiece}
                        </TableCell>
                      </RoleGateForComponent>
                      <TableCell className="text-center">
                        {cat.sellingPrice}
                      </TableCell>
                      <TableCell className="text-center">
                        {cat.walletDiscount || 0}
                      </TableCell>
                      <RoleGateForComponent allowedRole={[UserRole.ADMIN]}>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Download
                              role="button"
                              size={20}
                              className={`text-green-600 cursor-pointer hover:text-green-800 ${
                                downloadLoading && "pointer-events-none"
                              }`}
                              onClick={() =>
                                downloadCategoryImagesAndVideos(cat.name)
                              }
                            />
                            <FileDownIcon
                              role="button"
                              size={20}
                              className={`text-blue-600 cursor-pointer hover:text-blue-800 ${
                                isGenerating && "pointer-events-none"
                              }`}
                              onClick={async () => {
                                if (cat.code) {
                                  handleGeneratePDF(cat.code);
                                }
                              }}
                            />
                            <EditCategoryModal
                              category={cat}
                              onCategoryUpdate={(updatedCat) => {
                                handleCategoryUpdate(updatedCat, cat.name);
                              }}
                              trigger={<Edit role="button" size={20} />}
                            />

                            <DialogDemo
                              isTriggerElement
                              dialogTrigger={
                                <span className="flex items-center gap-2 text-red-600">
                                  <Trash2
                                    size={20}
                                    className="cursor-pointer"
                                  />
                                </span>
                              }
                              dialogTitle="Delete Category"
                              dialogDescription="Delete the category"
                            >
                              <div>
                                <h1>Delete Category</h1>
                                <h3>
                                  Are you sure you want to delete category "
                                  {cat.name}"?
                                </h3>
                              </div>
                              <Button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleDeleteCategory(cat.name)}
                              >
                                Delete
                              </Button>
                            </DialogDemo>
                          </div>
                        </TableCell>
                      </RoleGateForComponent>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="sm:hidden flex flex-col gap-3">
              {displayCategories.map((cat, idx) => (
                <CategoryCard
                  key={`category-${cat.name}-${idx}`}
                  cat={cat}
                  index={idx}
                  currentPage={currentPage}
                  handleDeleteCategory={handleDeleteCategory}
                  handleTypeUpdate={handleTypeUpdate}
                  handleCategoryUpdate={handleCategoryUpdate}
                  isPending={isPending}
                  setSelectedImage={setSelectedImage}
                />
              ))}
            </div>
            {totalCategoryPages > 1 && (
              <div className="flex justify-center mt-4">
                <PaginationComponent
                  currentPage={currentPage}
                  totalPages={totalCategoryPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
        {selectedImage && (
          <ImageModal
            src={selectedImage}
            alt="Category Image"
            onClose={() => setSelectedImage(null)}
          />
        )}
      </CardContent>
    </Card>
  );
};

const CatalogueListHelper = () => {
  return (
    <RoleGateForComponent
      allowedRole={[
        UserRole.ADMIN,
        UserRole.UPLOADER,
        UserRole.SELLER,
        UserRole.RESELLER,
      ]}
    >
      <ListPage />
    </RoleGateForComponent>
  );
};

export default CatalogueListHelper;
