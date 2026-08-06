// lib/types/index.ts — Full type definitions with variants

export interface ProductVariant {
  id: string;
  size: string;       // "US 7", "M", "XL", "One Size", etc.
  color: string;      // "White", "Black", "Navy", etc.
  basePrice: number;  // vendor cost for this variant
  retailPrice: number;// fixed customer price for this variant
  stock: number;
  sku: string;
}

export interface Product {
  id?: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  vendorId: string;
  vendorName: string;
  basePrice: number;       // default base (lowest variant)
  suggestedRetail: number; // default retail (lowest variant)
  retailPrice: number;
  stock: number;           // total stock across all variants
  images: string[];
  tags: string[];
  variants: ProductVariant[];
  status: "active"|"inactive";
  addedBy: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface StoreProduct {
  id?: string;
  storeId: string;
  merchantId: string;
  productId: string;
  productName: string;
  productImage: string;
  basePrice: number;
  retailPrice: number;
  suggestedRetail: number;
  merchantProfit: number;
  vendorId: string;
  vendorName: string;
  category: string;
  variants: ProductVariant[];
  isVisible: boolean;
  addedAt?: any;
}

export interface OrderItem {
  productId: string;
  storeProductId?: string;
  productName: string;
  productImage?: string;
  variantId: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;  // retail price
  basePrice: number;  // cost price
  merchantProfit?: number;
}

export type OrderStatus = "pending"|"submitted"|"processing"|"shipped"|"delivered"|"cancelled";

export interface Order {
  id?: string;
  storeId: string;
  merchantId: string;
  storeName: string;
  placedByAdmin: boolean;
  adminId?: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address: { line1:string; city:string; state:string; zip:string; country:string; };
  };
  items: OrderItem[];
  subtotal: number;
  total: number;
  totalBaseCost: number;
  customerPayment?: number;
  platformCommission?: number;
  merchantEarnings?: number;
  totalReimbursement?: number;
  status: "pending"|"submitted"|"processing"|"shipped"|"delivered"|"cancelled";
  trackingNumber?: string;
  notes?: string;
  fundsDeducted: boolean;
  reimbursed: boolean;
  placedAt?: any;
  updatedAt?: any;
  merchantSubmittedAt?: any;
  reimbursementDue?: any;
  estimatedDelivery?: any;
}

export interface Vendor {
  id?: string;
  name: string;
  country: string;
  specialty?: string;
  contact?: string;
  email?: string;
  phone?: string;
  website?: string;
  description?: string;
  status: "active"|"inactive";
  rating?: number;
  productsCount?: number;
  addedBy?: string;
  notes?: string;
  joinedAt?: any;
  updatedAt?: any;
}

export interface Store {
  id?: string;
  merchantId: string;
  storeName: string;
  domain: string;
  category: string;
  country: string;
  plan: "starter"|"growth"|"pro";
  status: "pending"|"active"|"blocked"|"suspended";
  commissionRate: number;
  merchantMargin: number;
  maxProducts: number;
  rating: number;
  totalOrders: number;
  onTimeOrders: number;
  blockedReason?: string;
  settings?: {
    currency: string;
    salesTarget?: number;
    deliveryDays?: number;
    supportEmail?: string;
  };
  joinedAt?: any;
  updatedAt?: any;
}

export interface KYCSubmission {
  id?: string;
  merchantId: string;
  storeId: string;
  storeName: string;
  merchantName: string;
  merchantEmail: string;
  idType: string;
  idNumber: string;
  dateOfBirth: string;
  issuingCountry: string;
  idExpiryDate: string;
  fullAddress: string;
  country: string;
  idFrontUrl: string;
  idBackUrl: string;
  status: "pending"|"approved"|"rejected";
  rejectionReason?: string;
  reviewedBy?: string;
  submittedAt?: any;
  reviewedAt?: any;
}
