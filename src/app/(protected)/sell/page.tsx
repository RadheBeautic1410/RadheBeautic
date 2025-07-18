"use client";

import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { UserRole } from "@prisma/client";
import axios from "axios";
import { Loader2, Search, ShoppingCart, FileText, Trash2, Plus } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import NotAllowedPage from "../_components/errorPages/NotAllowedPage";
import { useCurrentUser } from "@/src/hooks/use-current-user";

const getCurrTime = () => {
  const currentTime = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  const ISTTime = new Date(currentTime.getTime() + ISTOffset);
  return ISTTime;
};

interface CartItem {
  id: string;
  kurti: any;
  selectedSize: string;
  quantity: number;
  sellingPrice: number;
  availableStock: number;
}

function SellPage() {
  const [code, setCode] = useState("");
  const [kurti, setKurti] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selling, setSelling] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Sale details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [billCreatedBy, setBillCreatedBy] = useState("");
  // const [shopName, setShopName] = useState("");

  // Current product selection
  const [selectedSize, setSelectedSize] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [quantity, setQuantity] = useState(1);

  const currentUser = useCurrentUser();

  const handleFind = async () => {
    try {
      setLoading(true);
      if (code.length < 6) {
        toast.error("Please enter correct code!!!");
        return;
      }

      const res = await axios.post(`/api/kurti/find-kurti`, { code });
      const data = res.data.data;

      if (data.error) {
        toast.error(data.error);
        setKurti(null);
      } else {
        setKurti(data.kurti);
        setSellingPrice(data.kurti.sellingPrice);
        setSelectedSize("");
        setQuantity(1);
        toast.success("Product found!");
      }
    } catch (error) {
      console.error("Error finding product:", error);
      toast.error("Error finding product");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    if (!kurti) {
      toast.error("Please find a product first");
      return;
    }

    if (!selectedSize) {
      toast.error("Please select size");
      return;
    }

    if (!sellingPrice || parseInt(sellingPrice) <= 0) {
      toast.error("Please enter valid selling price");
      return;
    }

    if (quantity <= 0) {
      toast.error("Please enter valid quantity");
      return;
    }

    const sizeInfo = kurti.sizes.find((sz: any) => sz.size === selectedSize);
    if (!sizeInfo || sizeInfo.quantity < quantity) {
      toast.error("Insufficient stock for selected quantity");
      return;
    }

    // Check if same product+size already exists in cart
    const existingItemIndex = cart.findIndex(
      item => item.kurti.code === kurti.code && item.selectedSize === selectedSize
    );

    const newItem: CartItem = {
      id: `${kurti.code}-${selectedSize}-${Date.now()}`,
      kurti,
      selectedSize,
      quantity,
      sellingPrice: parseInt(sellingPrice),
      availableStock: sizeInfo.quantity
    };

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedCart = [...cart];
      const existingItem = updatedCart[existingItemIndex];
      const totalQuantity = existingItem.quantity + quantity;
      
      if (totalQuantity > sizeInfo.quantity) {
        toast.error("Total quantity exceeds available stock");
        return;
      }
      
      updatedCart[existingItemIndex] = {
        ...existingItem,
        quantity: totalQuantity,
        sellingPrice: parseInt(sellingPrice) // Update price if changed
      };
      setCart(updatedCart);
    } else {
      // Add new item
      setCart([...cart, newItem]);
    }

    // Reset current product selection
    setCode("");
    setKurti(null);
    setSelectedSize("");
    setSellingPrice("");
    setQuantity(1);
    
    toast.success("Product added to cart!");
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
    toast.success("Item removed from cart");
  };

  const updateCartItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const updatedCart = cart.map(item => {
      if (item.id === itemId) {
        if (newQuantity > item.availableStock) {
          toast.error("Quantity exceeds available stock");
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setCart(updatedCart);
  };

  const updateCartItemPrice = (itemId: string, newPrice: number) => {
    if (newPrice <= 0) {
      toast.error("Please enter valid price");
      return;
    }

    const updatedCart = cart.map(item => {
      if (item.id === itemId) {
        return { ...item, sellingPrice: newPrice };
      }
      return item;
    });
    setCart(updatedCart);
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.sellingPrice * item.quantity), 0);
  };

  const handleSell = async () => {
    try {
      setSelling(true);

      if (cart.length === 0) {
        toast.error("Please add products to cart");
        return;
      }

      if (!customerName.trim()) {
        toast.error("Please enter customer name");
        return;
      }

      if (!selectedLocation.trim()) {
        toast.error("Please select location");
        return;
      }

      if (!billCreatedBy.trim()) {
        toast.error("Please enter bill created by");
        return;
      }

      // if (!shopName.trim()) {
      //   toast.error("Please enter shop name");
      //   return;
      // }

      const currentTime = getCurrTime();

      // Prepare products data for API
      const products = cart.map(item => ({
        code: item.kurti.code.toUpperCase() + item.selectedSize.toUpperCase(),
        kurti: item.kurti,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice
      }));

      const res = await axios.post(`/api/sell`, {
        products,
        currentUser,
        currentTime: currentTime,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        selectedLocation: selectedLocation.trim(),
        billCreatedBy: billCreatedBy.trim(),
        // shopName: shopName.trim(),
      });

      const data = res.data.data;

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Sale completed successfully!");
        // Generate invoice
        generateInvoice(data);
        resetForm();
      }
    } catch (error) {
      console.error("Error selling products:", error);
      toast.error("Error processing sale");
    } finally {
      setSelling(false);
    }
  };

  const generateInvoice = (saleData: any) => {
    const invoiceWindow = window.open("", "_blank");
    if (!invoiceWindow) return;

    const invoiceHTML = generateInvoiceHTML(saleData);
    invoiceWindow.document.write(invoiceHTML);
    invoiceWindow.document.close();

    // Auto print
    setTimeout(() => {
      invoiceWindow.print();
    }, 500);
  };

  const generateInvoiceHTML = (saleData: any) => {
    const currentDate = new Date().toLocaleDateString("en-IN");
    const currentTime = new Date().toLocaleTimeString("en-IN");
    const invoiceNumber = `INV-${Date.now()}`;
    const totalAmount = getTotalAmount();

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice - ${invoiceNumber}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: #f5f5f5;
                }
                .invoice-container { 
                    max-width: 800px; 
                    margin: 0 auto; 
                    background: white; 
                    padding: 30px; 
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .header { 
                    text-align: center; 
                    border-bottom: 3px solid #e74c3c; 
                    padding-bottom: 20px; 
                    margin-bottom: 30px;
                }
                .shop-name { 
                    font-size: 32px; 
                    font-weight: bold; 
                    color: #e74c3c; 
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                .shop-tagline { 
                    font-size: 16px; 
                    color: #666; 
                    margin: 5px 0 0 0;
                    font-style: italic;
                }
                .invoice-details { 
                    display: flex; 
                    justify-content: space-between; 
                    margin-bottom: 30px;
                    flex-wrap: wrap;
                }
                .invoice-info, .customer-info { 
                    flex: 1; 
                    min-width: 250px;
                    margin: 10px;
                }
                .invoice-info h3, .customer-info h3 { 
                    color: #2c3e50; 
                    border-bottom: 2px solid #ecf0f1; 
                    padding-bottom: 8px;
                    margin-bottom: 15px;
                }
                .info-row { 
                    margin-bottom: 8px; 
                    display: flex;
                }
                .info-label { 
                    font-weight: bold; 
                    min-width: 100px;
                    color: #555;
                }
                .product-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 30px 0;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .product-table th { 
                    background: #34495e; 
                    color: white; 
                    padding: 15px; 
                    text-align: left;
                    font-weight: bold;
                }
                .product-table td { 
                    padding: 15px; 
                    border-bottom: 1px solid #ecf0f1;
                }
                .product-table tr:nth-child(even) { 
                    background-color: #f8f9fa;
                }
                .total-section { 
                    text-align: right; 
                    margin-top: 30px;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                .total-amount { 
                    font-size: 24px; 
                    font-weight: bold; 
                    color: #e74c3c;
                    margin-top: 10px;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 40px; 
                    padding-top: 20px; 
                    border-top: 2px solid #ecf0f1;
                    color: #666;
                }
                .thank-you { 
                    font-size: 18px; 
                    color: #27ae60; 
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                @media print {
                    body { background: white; }
                    .invoice-container { box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="header">
                    <h1 class="shop-name">${'Radhe Beautic'}</h1>
                    <p class="shop-tagline">Premium Fashion Collection</p>
                </div>
                
                <div class="invoice-details">
                    <div class="invoice-info">
                        <h3>Invoice Details</h3>
                        <div class="info-row">
                            <span class="info-label">Invoice #:</span>
                            <span>${invoiceNumber}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Date:</span>
                            <span>${currentDate}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Time:</span>
                            <span>${currentTime}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Seller:</span>
                            <span>${currentUser?.name || "N/A"}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Location:</span>
                            <span>${selectedLocation}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Bill By:</span>
                            <span>${billCreatedBy}</span>
                        </div>
                    </div>
                    
                    <div class="customer-info">
                        <h3>Customer Details</h3>
                        <div class="info-row">
                            <span class="info-label">Name:</span>
                            <span>${customerName}</span>
                        </div>
                        ${customerPhone ? `
                        <div class="info-row">
                            <span class="info-label">Phone:</span>
                            <span>${customerPhone}</span>
                        </div>
                        ` : ""}
                    </div>
                </div>
                
                <table class="product-table">
                    <thead>
                        <tr>
                            <th>Product Code</th>
                            <th>Category</th>
                            <th>Size</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cart.map(item => `
                        <tr>
                            <td>${item.kurti.code.toUpperCase()}</td>
                            <td>${item.kurti.category}</td>
                            <td>${item.selectedSize.toUpperCase()}</td>
                            <td>${item.quantity}</td>
                            <td>₹${item.sellingPrice}</td>
                            <td>₹${item.sellingPrice * item.quantity}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="total-section">
                    <div style="font-size: 16px; margin-bottom: 5px;">
                        <strong>Subtotal: ₹${totalAmount}</strong>
                    </div>
                    <div style="font-size: 16px; margin-bottom: 10px;">
                        <strong>Tax: ₹0</strong>
                    </div>
                    <div class="total-amount">
                        Total Amount: ₹${totalAmount}
                    </div>
                </div>
                
                <div class="footer">
                    <div class="thank-you">Thank you for your purchase!</div>
                    <p>Visit us again for more amazing collections</p>
                    <p style="font-size: 12px; color: #999;">
                        This is a computer generated invoice. For any queries, please contact us.
                    </p>
                </div>
            </div>
        </body>
        </html>
        `;
  };

  const resetForm = () => {
    setCode("");
    setKurti(null);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedLocation("");
    setBillCreatedBy("");
    // setShopName("");
    setSelectedSize("");
    setSellingPrice("");
    setQuantity(1);
  };

  const getAvailableSizes = () => {
    if (!kurti?.sizes) return [];
    return kurti.sizes.filter((sz: any) => sz.quantity > 0);
  };

  return (
    <Card className="w-[95%] max-w-6xl">
      <CardHeader>
        <p className="text-2xl font-semibold text-center">
          🛒 Multi-Product Sale System
        </p>
      </CardHeader>
      <CardContent className="w-full flex flex-col space-evenly justify-center flex-wrap gap-4">
        
        {/* Customer Details Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Customer Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="customer-name">Customer Name *</Label>
              <Input
                id="customer-name"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="customer-phone">Customer Phone (Optional)</Label>
              <Input
                id="customer-phone"
                placeholder="Enter customer phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            {/* <div>
              <Label htmlFor="shop-name">Shop Name *</Label>
              <Input
                id="shop-name"
                placeholder="Enter shop name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div> */}
            <div>
              <Label htmlFor="shop-location">Shop Location *</Label>
              <select
                id="shop-location"
                className="w-full p-2 border rounded-md"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option value="">Select Location</option>
                <option value="Katargam">Katargam</option>
                <option value="Amroli">Amroli</option>
                <option value="Mota Varachha">Mota Varachha</option>
              </select>
            </div>
            <div>
              <Label htmlFor="bill-by">Bill Created By *</Label>
              <Input
                id="bill-by"
                placeholder="Enter person name"
                value={billCreatedBy}
                onChange={(e) => setBillCreatedBy(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Find Product</h3>
          <div className="flex flex-row flex-wrap gap-2 items-end">
            <div className="flex flex-col flex-wrap">
              <Label htmlFor="product-code" className="mb-[10px]">Product Code</Label>
              <Input
                id="product-code"
                className="w-[250px] p-2"
                placeholder="Enter product code (without size)"
                value={code}
                onKeyUp={(e) => {
                  if (e.key === "Enter") {
                    handleFind();
                  }
                }}
                onChange={(e) => {
                  setCode(e.target.value);
                }}
              />
            </div>
            <Button
              type="button"
              onClick={handleFind}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Find Product
            </Button>
          </div>
        </div>

        {/* Product Details */}
        {kurti && (
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Product Details</h3>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-shrink-0">
                <img
                  src={kurti.images[0]?.url}
                  alt={kurti.code}
                  className="w-64 h-64 object-cover rounded-lg border"
                />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-xl font-bold">
                  Code: {kurti.code.toUpperCase()}
                </p>
                <p className="text-lg">Category: {kurti.category}</p>
                <p className="text-lg">Party: {kurti.party}</p>
                <p className="text-xl font-semibold text-green-600">
                  MRP: ₹{kurti.sellingPrice}
                </p>

                {/* Size Table */}
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Available Sizes:</h4>
                  <div className="flex flex-wrap gap-4">
                    <Table className="border border-collapse max-w-md">
                      <TableHeader>
                        <TableRow className="bg-slate-800">
                          <TableHead className="font-bold border text-white">
                            SIZE
                          </TableHead>
                          <TableHead className="font-bold border text-white">
                            STOCK
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kurti.sizes.map((sz: any, i: number) => (
                          <TableRow
                            key={i}
                            className={sz.quantity === 0 ? "opacity-50" : ""}
                          >
                            <TableCell className="border">
                              {sz.size.toUpperCase()}
                            </TableCell>
                            <TableCell
                              className={`border ${
                                sz.quantity === 0
                                  ? "text-red-500"
                                  : "text-green-600"
                              }`}
                            >
                              {sz.quantity}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Add to Cart Form */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold mb-3 text-yellow-800">Add to Cart</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label htmlFor="size-select">Select Size *</Label>
                      <select
                        id="size-select"
                        className="w-full p-2 border rounded-md"
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                      >
                        <option value="">Select Size</option>
                        {getAvailableSizes().map((sz: any, i: number) => (
                          <option key={i} value={sz.size}>
                            {sz.size.toUpperCase()} (Stock: {sz.quantity})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        placeholder="Enter quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="selling-price">Selling Price *</Label>
                      <Input
                        id="selling-price"
                        type="number"
                        placeholder="Enter selling price"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={addToCart}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shopping Cart */}
        {cart.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-green-800">
              Shopping Cart ({cart.length} items)
            </h3>
            
            <div className="overflow-x-auto">
              <Table className="border border-collapse">
                <TableHeader>
                  <TableRow className="bg-green-800">
                    <TableHead className="font-bold border text-white">Product</TableHead>
                    <TableHead className="font-bold border text-white">Size</TableHead>
                    <TableHead className="font-bold border text-white">Quantity</TableHead>
                    <TableHead className="font-bold border text-white">Unit Price</TableHead>
                    <TableHead className="font-bold border text-white">Total</TableHead>
                    <TableHead className="font-bold border text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="border">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.kurti.images[0]?.url}
                            alt={item.kurti.code}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <div className="font-semibold">{item.kurti.code.toUpperCase()}</div>
                            <div className="text-sm text-gray-600">{item.kurti.category}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="border">{item.selectedSize.toUpperCase()}</TableCell>
                      <TableCell className="border">
                        <Input
                          type="number"
                          min="1"
                          max={item.availableStock}
                          value={item.quantity}
                          onChange={(e) => updateCartItemQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="border">
                        <Input
                          type="number"
                          min="1"
                          value={item.sellingPrice}
                          onChange={(e) => updateCartItemPrice(item.id, parseInt(e.target.value) || 1)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="border font-semibold">
                        ₹{item.sellingPrice * item.quantity}
                      </TableCell>
                      <TableCell className="border">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-green-300">
              <div className="text-xl font-bold text-green-800">
                Total Amount: ₹{getTotalAmount()}
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleSell}
                  disabled={selling || cart.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {selling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="mr-2 h-4 w-4" />
                  )}
                  Complete Sale & Generate Invoice
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={selling}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SellerHelp = () => {
  return (
    <>
      <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.SELLER]}>
        <SellPage />
      </RoleGateForComponent>
      <RoleGateForComponent allowedRole={[UserRole.UPLOADER]}>
        <NotAllowedPage />
      </RoleGateForComponent>
    </>
  );
};

export default SellerHelp;