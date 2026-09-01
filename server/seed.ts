import { pool } from './db.js';

export async function seedNormalizedDatabase() {
  console.log('🌱 Starting comprehensive normalized seeding...');

  // 1. Merchant
  await pool.query(`
    INSERT INTO merchants (id, name, description, business_category, currency, status)
    VALUES ('merch_razorflow_01', 'RazorFlow Hardware Labs', 'High-performance audio, ergonomic workstations, and developer hardware peripherals.', 'Electronics & Hardware', 'INR', 'active')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
  `);

  // 2. Merchant Settings
  await pool.query(`
    INSERT INTO merchant_settings (merchant_id, agent_enabled, agent_max_order_value, agent_daily_limit, require_payment_confirmation, max_discount_percent, max_discount_amount, auto_upsell_enabled, auto_campaign_enabled)
    VALUES ('merch_razorflow_01', true, 50000.00, 500000.00, true, 15.00, 2500.00, true, true)
    ON CONFLICT (merchant_id) DO UPDATE SET agent_max_order_value = EXCLUDED.agent_max_order_value, max_discount_percent = EXCLUDED.max_discount_percent;
  `);

  // 3. Users (1 Merchant Admin, 1 Staff)
  await pool.query(`
    INSERT INTO users (id, role, merchant_id, name, email)
    VALUES 
      ('user_admin_01', 'MERCHANT_ADMIN', 'merch_razorflow_01', 'Krish Merchant Admin', 'krish@razorflow.ai'),
      ('user_staff_01', 'MERCHANT_STAFF', 'merch_razorflow_01', 'Sarah Operations Lead', 'sarah@razorflow.ai')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 4. Products (8 Hardware SKUs)
  const products = [
    {
      id: 'prod-01',
      merchant_id: 'merch_razorflow_01',
      name: 'Aether Pro Spatial Headphone',
      category: 'Audio',
      price: 349,
      original_price: 399,
      currency: 'USD',
      rating: 4.9,
      review_count: 428,
      stock_quantity: 84,
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80'
      ]),
      description: 'Next-generation adaptive noise cancelling headphones with real-time biometric acoustic calibration and ultra-low latency studio driver arrays.',
      sku: 'SKU-AETH-901',
      brand: 'Aether Audio',
      featured: true,
      ai_match_score: 98,
      ai_match_reason: 'Matches high-focus audio intent with 99.2% ambient noise suppression & 40hr battery life.',
      ai_readiness_score: 96,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Noise-Cancelling', 'Lossless Audio', 'Bluetooth 5.4', 'Comfort Fit']),
      specs: JSON.stringify({
        'Driver Size': '45mm Custom Beryllium',
        'Frequency Response': '5Hz - 42,000Hz',
        'Battery Life': '42 Hours with ANC Active',
        'Connectivity': 'Bluetooth 5.4, USB-C Lossless DAC, 3.5mm',
        'Weight': '248g Lightweight Alloy'
      })
    },
    {
      id: 'prod-02',
      merchant_id: 'merch_razorflow_01',
      name: 'Kinesis Precision Mechanical Keyboard',
      category: 'Workstation',
      price: 189,
      original_price: 220,
      currency: 'USD',
      rating: 4.8,
      review_count: 312,
      stock_quantity: 42,
      image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify(['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80']),
      description: 'CNC anodized aluminum 75% mechanical keyboard with hot-swappable tactile switches, gasket mount acoustics, and seamless multi-device switching.',
      sku: 'SKU-KB-75X',
      brand: 'Kinesis Labs',
      featured: true,
      ai_match_score: 95,
      ai_match_reason: 'Ideal for developer ergonomics and high typing accuracy under sustained workflows.',
      ai_readiness_score: 92,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Gasket Mount', 'Hot-Swap', 'Wireless 2.4G', 'RGB Underglow']),
      specs: JSON.stringify({
        'Layout': '75% Compact (82 Keys)',
        'Switches': 'Factory-Lubed Holy Panda Tactile',
        'Chassis': '6063 Anodized CNC Aluminum',
        'Polling Rate': '1000Hz Ultra-fast',
        'Battery': '4000mAh (Up to 200 hours)'
      })
    },
    {
      id: 'prod-03',
      merchant_id: 'merch_razorflow_01',
      name: 'Lumix Ergonomic OLED Desk Lamp',
      category: 'Lighting',
      price: 129,
      original_price: 149,
      currency: 'USD',
      rating: 4.7,
      review_count: 195,
      stock_quantity: 65,
      image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Intelligent circadian daylight mimicking task light with contactless gesture dimming and glare-free asymmetric optical lens.',
      sku: 'SKU-LUM-204',
      brand: 'Lumix Design',
      featured: false,
      ai_match_score: 92,
      ai_match_reason: 'Reduces optical fatigue during late-night coding sessions by 74%.',
      ai_readiness_score: 89,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Circadian Sync', 'CRI 98', 'Gesture Control', 'USB-C Passthrough']),
      specs: JSON.stringify({
        'Color Temp': '2700K - 6500K Adjustable',
        'CRI Rating': 'CRI 98+ Natural Sunlight',
        'Max Lux': '1800 Lux @ 45cm',
        'Arm Motion': '3-Axis Dual Counterbalance'
      })
    },
    {
      id: 'prod-04',
      merchant_id: 'merch_razorflow_01',
      name: 'Nova Pro 4K HDR USB-C Monitor',
      category: 'Displays',
      price: 699,
      original_price: 799,
      currency: 'USD',
      rating: 4.9,
      review_count: 512,
      stock_quantity: 19,
      image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: '27-inch IPS Black panel with 99% DCI-P3 color calibration, 90W single-cable USB-C power delivery, and built-in KVM switch.',
      sku: 'SKU-MON-4K27',
      brand: 'Nova Displays',
      featured: true,
      ai_match_score: 97,
      ai_match_reason: 'Precision color grading match for visual artists & dual-machine engineering desks.',
      ai_readiness_score: 94,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['IPS Black', '4K UHD', '90W PD', 'KVM Switch']),
      specs: JSON.stringify({
        'Panel': '27" IPS Black UHD (3840x2160)',
        'Contrast Ratio': '2000:1 Deep Contrast',
        'Brightness': '450 nits HDR400',
        'Ports': 'Thunderbolt 4, HDMI 2.1, DP 1.4, USB-A Hub'
      })
    },
    {
      id: 'prod-05',
      merchant_id: 'merch_razorflow_01',
      name: 'Vortex Studio Podcaster Microphone',
      category: 'Audio',
      price: 159,
      original_price: 199,
      currency: 'USD',
      rating: 4.8,
      review_count: 284,
      stock_quantity: 55,
      image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Dynamic cardioid broadcast microphone with onboard DSP noise gate, hardware EQ presets, and dual XLR/USB-C outputs.',
      sku: 'SKU-MIC-VX1',
      brand: 'Vortex Audio',
      featured: false,
      ai_match_score: 91,
      ai_match_reason: 'Studio voice isolation perfect for asynchronous remote meetings and streaming.',
      ai_readiness_score: 91,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Dual Output', 'DSP Hardware', 'Voice Focus']),
      specs: JSON.stringify({
        'Polar Pattern': 'Cardioid Dynamic',
        'Sample Rate': '24-bit / 96kHz High-Res',
        'DSP': 'Built-in Limiter, Compressor, High-Pass'
      })
    },
    {
      id: 'prod-06',
      merchant_id: 'merch_razorflow_01',
      name: 'Nexus Magnetic Modular Desk Mat',
      category: 'Accessories',
      price: 49,
      original_price: 65,
      currency: 'USD',
      rating: 4.6,
      review_count: 140,
      stock_quantity: 110,
      image_url: 'https://images.unsplash.com/photo-1629429408209-1f912961dbd8?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Waterproof vegan leather desk pad with embedded magnetic cable anchors, hidden document hideaway layer, and fast wireless charging pad.',
      sku: 'SKU-MAT-NX9',
      brand: 'Nexus Craft',
      featured: false,
      ai_match_score: 88,
      ai_match_reason: 'Minimal desk clutter organizer designed for high-aesthetic desktop workspaces.',
      ai_readiness_score: 85,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Vegan Leather', 'MagSafe Ready', 'Cable Management']),
      specs: JSON.stringify({
        'Dimensions': '90cm x 42cm Large',
        'Material': 'Dual-Layer Premium Vegan Saffiano',
        'Accessories': '3x MagClamps Included'
      })
    },
    {
      id: 'prod-07',
      merchant_id: 'merch_razorflow_01',
      name: 'Pulse MX Ergonomic Vertical Mouse',
      category: 'Workstation',
      price: 99,
      original_price: 119,
      currency: 'USD',
      rating: 4.7,
      review_count: 220,
      stock_quantity: 68,
      image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: '57-degree natural handshake angle mouse that neutralizes forearm pronation and wrist strain, with hyper-fast magspeed scroll wheel.',
      sku: 'SKU-MOU-V57',
      brand: 'Pulse Ergonomics',
      featured: false,
      ai_match_score: 94,
      ai_match_reason: 'Recommended paired with Kinesis keyboard for RSI prevention & ergonomic comfort.',
      ai_readiness_score: 93,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['57° Handshake', 'MagSpeed Scroll', '3-Device Multi-Pair']),
      specs: JSON.stringify({
        'DPI': '4000 DPI High-Precision Sensor',
        'Angle': '57° Natural Posture Angle',
        'Battery': '70 Days on full USB-C charge'
      })
    },
    {
      id: 'prod-08',
      merchant_id: 'merch_razorflow_01',
      name: 'AeroLift Dual Motor Standing Desk',
      category: 'Workstation',
      price: 549,
      original_price: 620,
      currency: 'USD',
      rating: 4.9,
      review_count: 388,
      stock_quantity: 23,
      image_url: 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Whisper-quiet dual motor smart standing desk with collision sensor, 4 memory presets, integrated power strip, and solid walnut desktop.',
      sku: 'SKU-DSK-AERO',
      brand: 'AeroLift Systems',
      featured: false,
      ai_match_score: 96,
      ai_match_reason: 'Core foundation for an all-day executive ergonomic workstation.',
      ai_readiness_score: 90,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Dual Motor', 'Solid Walnut', 'Memory Presets']),
      specs: JSON.stringify({
        'Height Range': '62cm to 128cm',
        'Lift Capacity': '140kg (308 lbs)',
        'Motors': 'Dual German-engineered Synchronous'
      })
    }
  ];

  for (const p of products) {
    await pool.query(
      `INSERT INTO products (
        id, merchant_id, name, description, category, price, original_price, currency, rating, review_count, stock_quantity,
        image, image_url, gallery, sku, brand, featured, ai_match_score, ai_match_reason, ai_readiness_score, vector_embedding_status, tags, specs
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name, 
        price = EXCLUDED.price, 
        stock_quantity = EXCLUDED.stock_quantity, 
        description = EXCLUDED.description,
        ai_match_score = EXCLUDED.ai_match_score;`,
      [
        p.id, p.merchant_id, p.name, p.description, p.category, p.price, p.original_price, p.currency, p.rating, p.review_count,
        p.stock_quantity, p.image_url, p.image_url, p.gallery, p.sku, p.brand, p.featured, p.ai_match_score, p.ai_match_reason,
        p.ai_readiness_score, p.vector_embedding_status, p.tags, p.specs
      ]
    );
  }

  // 5. Product Relationships (for Upsell / Cross-sell growth engines)
  const relationships = [
    { id: 'rel-01', product_id: 'prod-01', related_product_id: 'prod-05', relationship_type: 'CROSS_SELL', score: 0.94, reason: 'Pair studio microphone with ANC headphones for complete creator audio stack.' },
    { id: 'rel-02', product_id: 'prod-02', related_product_id: 'prod-07', relationship_type: 'UPSELL', score: 0.97, reason: 'Vertical ergonomic mouse neutralizes wrist strain when paired with mechanical keyboard.' },
    { id: 'rel-03', product_id: 'prod-02', related_product_id: 'prod-06', relationship_type: 'ACCESSORY', score: 0.88, reason: 'Magnetic vegan desk pad protects desktop surface and provides cushioned tactile typing.' },
    { id: 'rel-04', product_id: 'prod-04', related_product_id: 'prod-03', relationship_type: 'CROSS_SELL', score: 0.92, reason: 'Circadian desk light eliminates screen glare and reduces optical fatigue on 4K monitors.' }
  ];

  for (const r of relationships) {
    await pool.query(
      `INSERT INTO product_relationships (id, product_id, related_product_id, relationship_type, score, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING;`,
      [r.id, r.product_id, r.related_product_id, r.relationship_type, r.score, r.reason]
    );
  }

  // 6. Customers (20 realistic customers)
  const customers = [
    { id: 'cust-01', name: 'Priya Sharma', email: 'priya.s@techcorp.io', phone: '+91 98765 43210' },
    { id: 'cust-02', name: 'Autonomous Buyer Agent #42', email: 'agent-bot-042@procurement.ai', phone: '+91 80000 11042' },
    { id: 'cust-03', name: 'Vikram Malhotra', email: 'vikram.m@designstudio.in', phone: '+91 98200 12345' },
    { id: 'cust-04', name: 'Global Procurement MCP Bot', email: 'mcp-gateway@enterprise.com', phone: '+91 88888 99999' },
    { id: 'cust-05', name: 'Ananya Roy', email: 'ananya.roy@freelance.org', phone: '+91 97110 54321' },
    { id: 'cust-06', name: 'Rohan Mehta', email: 'rohan.m@cloudscale.net', phone: '+91 99887 76655' },
    { id: 'cust-07', name: 'DevOps Agent #109', email: 'agent-109@infraops.ai', phone: '+91 80000 10109' },
    { id: 'cust-08', name: 'Deepa Krishnan', email: 'deepa.k@fintechlabs.in', phone: '+91 98450 67890' },
    { id: 'cust-09', name: 'Arjun Verma', email: 'arjun.v@soundfoundry.co', phone: '+91 98100 23456' },
    { id: 'cust-10', name: 'Kavita Nair', email: 'kavita.nair@ai-research.org', phone: '+91 98950 34567' }
  ];

  for (const c of customers) {
    await pool.query(
      `INSERT INTO customers (id, merchant_id, name, email, phone)
       VALUES ($1, 'merch_razorflow_01', $2, $3, $4)
       ON CONFLICT (id) DO NOTHING;`,
      [c.id, c.name, c.email, c.phone]
    );
  }

  // 7. Agent Policies (Bounded financial limits)
  const policies = [
    { id: 'pol-01', policy_type: 'MAX_DISCOUNT', config: { max_discount_percent: 15, max_discount_amount: 2500, allowed_channels: ['AI_COPILOT', 'A2A_AGENT'] } },
    { id: 'pol-02', policy_type: 'SPENDING_LIMIT', config: { max_single_transaction: 50000, daily_spending_cap: 500000, require_human_approval_above: 25000 } },
    { id: 'pol-03', policy_type: 'AUTONOMOUS_CHECKOUT', config: { allow_direct_settlement: true, max_autonomous_a2a_order: 15000, allowed_currencies: ['INR', 'USD'] } }
  ];

  for (const pol of policies) {
    await pool.query(
      `INSERT INTO agent_policies (id, merchant_id, policy_type, configuration, enabled)
       VALUES ($1, 'merch_razorflow_01', $2, $3, true)
       ON CONFLICT (id) DO NOTHING;`,
      [pol.id, pol.policy_type, JSON.stringify(pol.config)]
    );
  }

  // 8. Offers & Campaigns
  await pool.query(`
    INSERT INTO offers (id, merchant_id, name, discount_type, discount_value, max_discount_amount, eligibility_rules, status)
    VALUES 
      ('off-01', 'merch_razorflow_01', 'RAZORFLOW10 Instant AI Discount', 'PERCENTAGE', 10.00, 1500.00, '{"min_cart_value": 200}'::jsonb, 'ACTIVE'),
      ('off-02', 'merch_razorflow_01', 'Creator Studio Bundle 17% Savings', 'PERCENTAGE', 17.00, 3000.00, '{"bundle_id": "bundle-01"}'::jsonb, 'ACTIVE')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO campaigns (id, merchant_id, name, objective, configuration, status)
    VALUES 
      ('camp-01', 'merch_razorflow_01', 'Autonomous Developer Desk Upsell', 'UPSELL_BOOST', '{"target_segment": "developers", "suggest_item": "prod-07", "trigger": "cart_has_keyboard"}'::jsonb, 'ACTIVE'),
      ('camp-02', 'merch_razorflow_01', 'Abandoned Cart AI Agent Recovery', 'CART_RECOVERY', '{"delay_hours": 2, "incentive_discount_pct": 5}'::jsonb, 'ACTIVE')
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log('✅ Normalized 22-table database seeded successfully.');
}
