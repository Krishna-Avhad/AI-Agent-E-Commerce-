import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { AIChatDrawer } from './components/common/AIChatDrawer';
import { ToastContainer } from './components/common/ToastContainer';

// Shopper Pages
import { AIHomePage } from './components/shopper/AIHomePage';
import { ProductCatalogPage } from './components/shopper/ProductCatalogPage';
import { ProductDetailPage } from './components/shopper/ProductDetailPage';
import { ProductComparePage } from './components/shopper/ProductComparePage';
import { AIBundlesPage } from './components/shopper/AIBundlesPage';
import { CartPage } from './components/shopper/CartPage';
import { CheckoutPage } from './components/shopper/CheckoutPage';
import { OrderSuccessPage } from './components/shopper/OrderSuccessPage';
import { OrderDetailsPage } from './components/shopper/OrderDetailsPage';
import { OrdersPage } from './components/shopper/OrdersPage';

// Merchant Pages
import { MerchantOverviewPage } from './components/merchant/MerchantOverviewPage';
import { ProductManagementPage } from './components/merchant/ProductManagementPage';
import { OrdersManagementPage } from './components/merchant/OrdersManagementPage';
import { BundleManagementPage } from './components/merchant/BundleManagementPage';
import { RevenueAnalyticsPage } from './components/merchant/RevenueAnalyticsPage';
import { CustomerIntentAnalyticsPage } from './components/merchant/CustomerIntentAnalyticsPage';
import { AIReadinessPage } from './components/merchant/AIReadinessPage';
import { AgentCommercePage } from './components/merchant/AgentCommercePage';
import { MCPIntegrationPage } from './components/merchant/MCPIntegrationPage';
import { AuditTrailPage } from './components/merchant/AuditTrailPage';
import { AuditTimelinePage } from './components/merchant/AuditTimelinePage';
import { SystemStatusPage } from './components/merchant/SystemStatusPage';
import { MerchantAIControlCenter } from './components/merchant/ai-control/MerchantAIControlCenter';

const AppContent: React.FC = () => {
  const {
    portalMode,
    shopperRoute,
    merchantRoute,
    isMobileSimulator,
    setIsMobileSimulator
  } = useApp();

  const renderShopperView = () => {
    switch (shopperRoute) {
      case 'home':
        return <AIHomePage />;
      case 'catalog':
        return <ProductCatalogPage />;
      case 'product-detail':
        return <ProductDetailPage />;
      case 'compare':
        return <ProductComparePage />;
      case 'bundles':
        return <AIBundlesPage />;
      case 'cart':
        return <CartPage />;
      case 'checkout':
        return <CheckoutPage />;
      case 'orders':
        return <OrdersPage />;
      case 'order-success':
        return <OrderSuccessPage />;
      case 'order-detail':
        return <OrderDetailsPage />;
      default:
        return <AIHomePage />;
    }
  };

  const renderMerchantView = () => {
    switch (merchantRoute) {
      case 'overview':
        return <MerchantOverviewPage />;
      case 'products':
        return <ProductManagementPage />;
      case 'orders':
        return <OrdersManagementPage />;
      case 'bundles':
        return <BundleManagementPage />;
      case 'analytics':
        return <RevenueAnalyticsPage />;
      case 'intent-analytics':
        return <CustomerIntentAnalyticsPage />;
      case 'ai-readiness':
        return <AIReadinessPage />;
      case 'agent-commerce':
        return <AgentCommercePage />;
      case 'mcp-integration':
        return <MCPIntegrationPage />;
      case 'audit-trail':
        return <AuditTrailPage />;
      case 'audit-timeline':
        return <AuditTimelinePage />;
      case 'system-status':
        return <SystemStatusPage />;
      case 'ai-control':
        return <MerchantAIControlCenter />;
      default:
        return <MerchantOverviewPage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FB] text-slate-900 font-sans selection:bg-teal-500 selection:text-white">
      <Navbar />

      {/* Main View Area */}
      {isMobileSimulator ? (
        /* Stitch Mobile Viewport Frame Simulation */
        <div className="flex-1 py-8 px-4 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md">
          <div className="text-center text-white text-xs mb-3 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            <span>Stitch Mobile Device Preview (390 x 844)</span>
            <button
              onClick={() => setIsMobileSimulator(false)}
              className="text-teal-300 underline font-semibold ml-2 hover:text-white"
            >
              Exit Frame
            </button>
          </div>

          <div className="w-[390px] h-[844px] bg-[#F7F9FB] rounded-[48px] border-[10px] border-slate-800 shadow-2xl overflow-y-auto overflow-x-hidden relative flex flex-col">
            {/* Phone Notch */}
            <div className="sticky top-0 z-50 bg-[#F7F9FB] pt-2 pb-1 px-6 flex justify-between items-center text-[10px] text-slate-800 font-bold border-b border-slate-200/50">
              <span>9:41</span>
              <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto" />
              <span>5G 100%</span>
            </div>

            <div className="p-4 flex-1">
              {portalMode === 'shopper' ? renderShopperView() : renderMerchantView()}
            </div>
          </div>
        </div>
      ) : (
        /* Standard Responsive Desktop / Tablet View */
        <div className="flex-1 flex w-full">
          {portalMode === 'merchant' && <Sidebar />}

          <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
            {portalMode === 'shopper' ? renderShopperView() : renderMerchantView()}
          </main>
        </div>
      )}

      {/* Global AI Assistant Drawer & Notifications */}
      <AIChatDrawer />
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
