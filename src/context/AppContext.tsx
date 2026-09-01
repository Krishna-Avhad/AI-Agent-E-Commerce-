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
  backendConnected: boolean;
  
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
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
  
  // Actions
  placeOrder: (orderDetails: Partial<Order>) => Order;
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
      text: "👋 Welcome to **RazorFlow AI**. Connected to live Supabase PostgreSQL backend. I can parse complex shopping intents, compare high-spec gear, compose custom hardware bundles, or execute checkout actions. What are you building today?",
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

      const [prodsRes, bundlesRes, ordersRes, logsRes, toolsRes] = await Promise.all([
        fetch('/api/products').catch(() => null),
        fetch('/api/bundles').catch(() => null),
        fetch('/api/orders').catch(() => null),
        fetch('/api/audit-logs').catch(() => null),
        fetch('/api/mcp-tools').catch(() => null)
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

  const sendChatMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text,
      timestamp: 'Just now'
    };
    setChatMessages((prev) => [...prev, userMsg]);

    // Simulate AI Intent Processing
    setTimeout(() => {
      const lower = text.toLowerCase();
      let replyText = "I parsed your intent and analyzed our live Supabase vector embeddings.";
      let suggestions: Product[] = [];
      let actions: ChatMessage['actions'] = [];

      if (lower.includes('headphone') || lower.includes('audio') || lower.includes('noise') || lower.includes('music')) {
        const match = products.find((p) => p.category === 'Audio') || products[0];
        replyText = `Based on your request for acoustic clarity, I recommend the **${match.name}** (Match score: ${match.aiMatchScore}%). It features studio drivers and 42-hour active cancellation.`;
        suggestions = [match];
        actions = [
          { label: `View ${match.name.split(' ')[0]} Specs`, actionType: 'view_product', payload: match },
          { label: `Add to Bag ($${match.price})`, actionType: 'add_to_cart', payload: match }
        ];
      } else if (lower.includes('keyboard') || lower.includes('typing') || lower.includes('ergonomic') || lower.includes('desk')) {
        const kb = products.find((p) => p.category === 'Workstation') || products[1];
        replyText = `For optimal developer ergonomics, the **${kb.name}** relieves wrist strain under sustained coding sprints.`;
        suggestions = [kb];
        actions = [
          { label: 'Explore Ergonomic Bundles', actionType: 'view_bundle', payload: bundles[0] },
          { label: 'Compare Hardware', actionType: 'compare_products', payload: [kb] }
        ];
      } else if (lower.includes('bundle') || lower.includes('deal') || lower.includes('discount')) {
        const b = bundles[0];
        replyText = `Here is our top curated recommendation: **${b.title}** — save ${b.savingsPercentage}% compared to individual retail.`;
        actions = [
          { label: `Review ${b.title}`, actionType: 'view_bundle', payload: b }
        ];
      } else {
        replyText = `I searched our Supabase PostgreSQL vector index for "${text}". Would you like me to show the top matching item or compare specifications?`;
        suggestions = products.slice(0, 2);
        actions = [
          { label: 'Browse Full Catalog', actionType: 'view_product', payload: products[0] }
        ];
      }

      const aiMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'ai',
        text: replyText,
        timestamp: 'Just now',
        productSuggestions: suggestions.length > 0 ? suggestions : undefined,
        actions
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    }, 600);
  };

  const placeOrder = (orderDetails: Partial<Order>): Order => {
    const newId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const newAuditId = `AUD-${Math.floor(80000 + Math.random() * 10000)}`;
    const newOrder: Order = {
      id: newId,
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
      paymentMethod: orderDetails.paymentMethod || 'Razorpay UPI',
      paymentStatus: 'Paid',
      channel: 'Direct Consumer',
      trackingNumber: `DEL-RZ-${Math.floor(1000000 + Math.random() * 9000000)}`,
      estimatedDelivery: 'Sep 04, 2026',
      aiConfidenceScore: 0.99,
      auditId: newAuditId
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Create Audit Log for Order
    const newAudit: AuditEvent = {
      id: newAuditId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: 'Razorpay UPI Gateway',
      actorType: 'Razorpay Gateway',
      action: 'payment.authorized_and_settled',
      entityType: 'Order',
      entityId: newId,
      status: 'Success',
      riskScore: 'Low',
      latencyMs: 110,
      ipAddress: '103.21.244.0',
      details: `Order ${newId} authorized via Razorpay UPI instant settlement engine.`,
      payloadJson: { orderId: newId, total: newOrder.total, itemsCount: newOrder.items.length }
    };
    setAuditLogs((prev) => [newAudit, ...prev]);

    // Async POST to Supabase PostgreSQL Backend
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    }).catch((err) => console.warn('Order persisted locally; backend sync pending...', err));

    clearCart();
    setSelectedOrder(newOrder);
    return newOrder;
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
        backendConnected,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
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
