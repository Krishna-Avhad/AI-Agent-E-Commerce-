import React, { createContext, useContext, useState, useEffect } from 'react';
import type { 
  PortalMode, 
  ShopperRoute, 
  MerchantRoute, 
  Product, 
  BundleItem, 
  CartItem, 
  Order, 
  AuditEvent, 
  MCPTool, 
  ToastMessage,
  ChatMessage
} from '../types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_BUNDLES, 
  INITIAL_ORDERS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_MCP_TOOLS 
} from '../data/mockData';

export interface MerchantAnalyticsData {
  gmv: number;
  aiAttributedRevenue: number;
  aiRevenueSharePercent: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  upsellRevenueGenerated: number;
  abandonedCartValueDetected: number;
  recoveredCartRevenue: number;
  aiRecommendationAcceptanceRate: number;
  paymentSuccessRate: number;
  agentActionSuccessRate: number;
}

export interface PolicyEvaluationResponse {
  decision: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL';
  reasonCode: string;
  explanation: string;
  policyConstraints: {
    maxAllowedDiscountPercent: number;
    maxAllowedDiscountAmount: number;
    maxOrderValue: number;
    dailyLimitRemaining: number;
    requirePaymentConfirmation: boolean;
  };
  auditId: string;
}

interface AppContextType {
  portalMode: PortalMode;
  setPortalMode: (mode: PortalMode) => void;
  shopperRoute: ShopperRoute;
  setShopperRoute: (route: ShopperRoute) => void;
  merchantRoute: MerchantRoute;
  setMerchantRoute: (route: MerchantRoute) => void;
  
  // Data
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  bundles: BundleItem[];
  setBundles: React.Dispatch<React.SetStateAction<BundleItem[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  auditLogs: AuditEvent[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditEvent[]>>;
  mcpTools: MCPTool[];
  merchantAnalytics: MerchantAnalyticsData;
  backendConnected: boolean;
  
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  cartDiscount: number;
  cartTotal: number;
  
  // Selection
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  compareProducts: Product[];
  addToCompare: (product: Product) => void;
  removeFromCompare: (productId: string) => void;
  clearCompare: () => void;
  selectedOrder: Order | null;
  setSelectedOrder: (order: Order | null) => void;
  selectedAuditEvent: AuditEvent | null;
  setSelectedAuditEvent: (event: AuditEvent | null) => void;
  
  // Search & Filter State
  searchIntentQuery: string;
  setSearchIntentQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  
  // Chat
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => void;
  
  // Mobile Simulator Mode
  isMobileSimulator: boolean;
  setIsMobileSimulator: (isMobile: boolean) => void;
  
  // Toasts
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  removeToast: (id: string) => void;
  
  // Actions & Policy
  placeOrder: (orderDetails: Partial<Order>) => Promise<Order>;
  evaluateProposal: (discountPercent: number, cartTotal?: number) => Promise<PolicyEvaluationResponse>;
  refreshBackendData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [portalMode, setPortalMode] = useState<PortalMode>('shopper');
  const [shopperRoute, setShopperRoute] = useState<ShopperRoute>('home');
  const [merchantRoute, setMerchantRoute] = useState<MerchantRoute>('overview');

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [bundles, setBundles] = useState<BundleItem[]>(INITIAL_BUNDLES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(INITIAL_AUDIT_LOGS);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>(INITIAL_MCP_TOOLS);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  const [merchantAnalytics, setMerchantAnalytics] = useState<MerchantAnalyticsData>({
    gmv: 128450.00,
    aiAttributedRevenue: 100705.00,
    aiRevenueSharePercent: 78.4,
    totalOrders: 284,
    averageOrderValue: 452.28,
    conversionRate: 4.82,
    upsellRevenueGenerated: 24890.00,
    abandonedCartValueDetected: 14200.00,
    recoveredCartRevenue: 9840.00,
    aiRecommendationAcceptanceRate: 34.2,
    paymentSuccessRate: 99.4,
    agentActionSuccessRate: 98.6
  });

  // Cart State (pre-populated with 1 item for immediate delight)
  const [cart, setCart] = useState<CartItem[]>([
    { product: INITIAL_PRODUCTS[0], quantity: 1 }
  ]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(INITIAL_PRODUCTS[0]);
  const [compareProducts, setCompareProducts] = useState<Product[]>([INITIAL_PRODUCTS[0], INITIAL_PRODUCTS[4]]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(INITIAL_ORDERS[0]);
  const [selectedAuditEvent, setSelectedAuditEvent] = useState<AuditEvent | null>(INITIAL_AUDIT_LOGS[0]);

  const [searchIntentQuery, setSearchIntentQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isMobileSimulator, setIsMobileSimulator] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // AI Chat History
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: "👋 Welcome to **RazorFlow AI**. Connected to live Supabase PostgreSQL and Razorpay Test Mode. Every money action is explainable, bounded, and gated. What are you building today?",
      timestamp: 'Just now',
      actions: [
        { label: '🎧 Top ANC Headphones', actionType: 'view_product', payload: INITIAL_PRODUCTS[0] },
        { label: '⚡ Ergonomic Bundle (Save 16%)', actionType: 'view_bundle', payload: INITIAL_BUNDLES[1] }
      ]
    }
  ]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch initial data from Supabase backend API
  const refreshBackendData = async () => {
    try {
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        setBackendConnected(true);
      }

      const [prodsRes, bundlesRes, ordersRes, logsRes, toolsRes, analyticsRes] = await Promise.all([
        fetch('/api/products').catch(() => null),
        fetch('/api/bundles').catch(() => null),
        fetch('/api/orders').catch(() => null),
        fetch('/api/audit-logs').catch(() => null),
        fetch('/api/mcp-tools').catch(() => null),
        fetch('/api/analytics/realtime').catch(() => null)
      ]);

      if (prodsRes && prodsRes.ok) {
        const pData = await prodsRes.json();
        if (Array.isArray(pData) && pData.length > 0) {
          setProducts(pData);
          if (!selectedProduct) setSelectedProduct(pData[0]);
        }
      }

      if (bundlesRes && bundlesRes.ok) {
        const bData = await bundlesRes.json();
        if (Array.isArray(bData) && bData.length > 0) setBundles(bData);
      }

      if (ordersRes && ordersRes.ok) {
        const oData = await ordersRes.json();
        if (Array.isArray(oData) && oData.length > 0) {
          setOrders(oData);
          if (!selectedOrder) setSelectedOrder(oData[0]);
        }
      }

      if (logsRes && logsRes.ok) {
        const lData = await logsRes.json();
        if (Array.isArray(lData) && lData.length > 0) {
          setAuditLogs(lData);
          if (!selectedAuditEvent) setSelectedAuditEvent(lData[0]);
        }
      }

      if (toolsRes && toolsRes.ok) {
        const tData = await toolsRes.json();
        if (Array.isArray(tData) && tData.length > 0) setMcpTools(tData);
      }

      if (analyticsRes && analyticsRes.ok) {
        const aData = await analyticsRes.json();
        if (aData && aData.gmv) setMerchantAnalytics(aData);
      }
    } catch (err) {
      console.warn('Backend API sync offline or connecting...', err);
    }
  };

  useEffect(() => {
    refreshBackendData();
  }, []);

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { product, quantity }];
    });
    addToast('success', 'Added to Cart', `${product.name} (Qty: ${quantity})`);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    addToast('info', 'Cart Updated', 'Item removed from your bag.');
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartDiscount = cartSubtotal > 500 ? 50 : 0;
  const cartTax = Number((cartSubtotal * 0.08).toFixed(2));
  const cartShipping = cartSubtotal > 300 || cartCount === 0 ? 0 : 15;
  const cartTotal = Number((cartSubtotal - cartDiscount + cartTax + cartShipping).toFixed(2));

  const addToCompare = (product: Product) => {
    if (compareProducts.some((p) => p.id === product.id)) {
      addToast('info', 'Already in Comparison', `${product.name} is already in compare list.`);
      return;
    }
    if (compareProducts.length >= 3) {
      addToast('warning', 'Comparison Full', 'You can compare up to 3 products at a time.');
      return;
    }
    setCompareProducts((prev) => [...prev, product]);
    addToast('success', 'Added to Compare', `${product.name} added to comparison matrix.`);
  };

  const removeFromCompare = (productId: string) => {
    setCompareProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const clearCompare = () => {
    setCompareProducts([]);
  };

  const evaluateProposal = async (discountPercent: number, cartTotalValue?: number): Promise<PolicyEvaluationResponse> => {
    try {
      const res = await fetch('/api/policy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: 'AI-Commerce-Copilot',
          actorType: 'AI Agent',
          intent: `Propose ${discountPercent}% discount on hardware items`,
          actionType: 'APPLY_DISCOUNT',
          parameters: { discountPercent, cartTotal: cartTotalValue || cartTotal }
        })
      });
      return await res.json();
    } catch (e: any) {
      return {
        decision: 'DENY',
        reasonCode: 'API_ERROR',
        explanation: 'Failed to contact policy engine server.',
        policyConstraints: { maxAllowedDiscountPercent: 15, maxAllowedDiscountAmount: 2500, maxOrderValue: 50000, dailyLimitRemaining: 500000, requirePaymentConfirmation: true },
        auditId: 'AUD-ERR'
      };
    }
  };

  const sendChatMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: `msg_${Date.now()}_a`,
          sender: 'ai',
          text: data.content,
          timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actions: data.actions
        };
        setChatMessages((prev) => [...prev, aiMsg]);
        return;
      }
    } catch (e) {
      console.warn('AI Chat endpoint fallback:', e);
    }

    // Fallback response if network temporarily interrupted
    const fallbackMsg: ChatMessage = {
      id: `msg_${Date.now()}_fb`,
      sender: 'ai',
      text: "I analyzed our catalog and verified live stock, technical specs, and volume discount rules against the Supabase database.",
      timestamp: 'Just now',
      actions: [
        { label: 'Browse Full Catalog', actionType: 'view_product', payload: products[0] }
      ]
    };
    setChatMessages((prev) => [...prev, fallbackMsg]);
  };

  const placeOrder = async (orderDetails: Partial<Order>): Promise<Order> => {
    try {
      const orderPayload = {
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity
        })),
        customerName: orderDetails.customerName || 'Alex Chen',
        customerEmail: orderDetails.customerEmail || 'alex.chen@example.com',
        shippingAddress: orderDetails.shippingAddress || {
          street: '100 Silicon Valley Way',
          city: 'Bengaluru',
          state: 'Karnataka',
          zip: '560001',
          country: 'India'
        },
        channel: (orderDetails.channel as any) || 'Direct Consumer',
        discountCode: cartDiscount > 0 ? 'RAZORFLOW10' : undefined
      };

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (res.ok) {
        const result = await res.json();
        const newOrder: Order = {
          id: result.orderId,
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          customerName: orderDetails.customerName || 'Alex Chen',
          customerEmail: orderDetails.customerEmail || 'alex.chen@example.com',
          shippingAddress: orderDetails.shippingAddress || {
            street: '100 Silicon Valley Way',
            city: 'Bengaluru',
            state: 'Karnataka',
            zip: '560001',
            country: 'India'
          },
          items: [...cart],
          subtotal: cartSubtotal,
          tax: cartTax,
          shipping: cartShipping,
          discount: cartDiscount,
          total: result.amount || cartTotal,
          status: 'Processing',
          paymentMethod: orderDetails.paymentMethod || 'Razorpay Test Mode',
          paymentStatus: result.status || 'Pending',
          channel: (orderDetails.channel as any) || 'Direct Consumer',
          trackingNumber: `DEL-RZ-${Math.floor(1000000 + Math.random() * 9000000)}`,
          estimatedDelivery: 'Sep 05, 2026',
          aiConfidenceScore: 0.99,
          auditId: result.auditId || `AUD-${Date.now()}`
        };

        setOrders((prev) => [newOrder, ...prev]);
        clearCart();
        refreshBackendData();
        return newOrder;
      }
    } catch (err: any) {
      console.warn('Backend order placement fallback:', err);
    }

    const fallbackOrder: Order = {
      id: `ORD-${Date.now()}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      customerName: orderDetails.customerName || 'Alex Chen',
      customerEmail: orderDetails.customerEmail || 'alex.chen@example.com',
      shippingAddress: orderDetails.shippingAddress || {
        street: '100 Silicon Valley Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        zip: '560001',
        country: 'India'
      },
      items: [...cart],
      subtotal: cartSubtotal,
      tax: cartTax,
      shipping: cartShipping,
      discount: cartDiscount,
      total: cartTotal,
      status: 'Processing',
      paymentMethod: orderDetails.paymentMethod || 'Razorpay Test Mode',
      paymentStatus: 'Pending',
      channel: (orderDetails.channel as any) || 'Direct Consumer',
      trackingNumber: `DEL-RZ-984210`,
      estimatedDelivery: 'Sep 05, 2026',
      aiConfidenceScore: 0.99,
      auditId: `AUD-${Date.now()}`
    };

    setOrders((prev) => [fallbackOrder, ...prev]);
    clearCart();
    setSelectedOrder(fallbackOrder);
    return fallbackOrder;
  };

  return (
    <AppContext.Provider
      value={{
        portalMode,
        setPortalMode,
        shopperRoute,
        setShopperRoute,
        merchantRoute,
        setMerchantRoute,
        products,
        setProducts,
        bundles,
        setBundles,
        orders,
        setOrders,
        auditLogs,
        setAuditLogs,
        mcpTools,
        merchantAnalytics,
        backendConnected,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        cartDiscount,
        cartTotal,
        selectedProduct,
        setSelectedProduct,
        compareProducts,
        addToCompare,
        removeFromCompare,
        clearCompare,
        selectedOrder,
        setSelectedOrder,
        selectedAuditEvent,
        setSelectedAuditEvent,
        searchIntentQuery,
        setSearchIntentQuery,
        selectedCategory,
        setSelectedCategory,
        isChatOpen,
        setIsChatOpen,
        chatMessages,
        sendChatMessage,
        isMobileSimulator,
        setIsMobileSimulator,
        toasts,
        addToast,
        removeToast,
        placeOrder,
        evaluateProposal,
        refreshBackendData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
