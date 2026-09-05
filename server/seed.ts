import { USD_TO_INR_RATE } from './constants.js';
import { randomUUID } from 'crypto';
import { pool } from './db.js';

export async function seedNormalizedDatabase() {
  console.log('🌱 Starting comprehensive real production seeding (25+ SKUs, relational graph, 20+ customers)...');

  // 1. Merchant
  await pool.query(`
    INSERT INTO merchants (id, name, description, business_category, currency, status)
    VALUES ('merch_razorflow_01', 'RazorFlow Hardware Labs', 'High-performance audio, ergonomic workstations, and developer hardware peripherals.', 'Electronics & Hardware', 'INR', 'active')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;
  `);

  // 2. Merchant Settings
  await pool.query(`
    INSERT INTO merchant_settings (merchant_id, agent_enabled, agent_max_order_value, agent_daily_limit, require_payment_confirmation, max_discount_percent, max_discount_amount, auto_upsell_enabled, auto_campaign_enabled)
    VALUES ('merch_razorflow_01', true, 500000.00, 2500000.00, true, 15.00, 25000.00, true, true)
    ON CONFLICT (merchant_id) DO UPDATE SET 
      agent_max_order_value = EXCLUDED.agent_max_order_value, 
      agent_daily_limit = EXCLUDED.agent_daily_limit,
      max_discount_percent = EXCLUDED.max_discount_percent,
      max_discount_amount = EXCLUDED.max_discount_amount;
  `);

  // 3. Users (1 Merchant Admin, 1 Staff)
  await pool.query(`
    INSERT INTO users (id, role, merchant_id, name, email)
    VALUES 
      ('user_admin_01', 'MERCHANT_ADMIN', 'merch_razorflow_01', 'Krish Merchant Admin', 'krish@razorflow.ai'),
      ('user_staff_01', 'MERCHANT_STAFF', 'merch_razorflow_01', 'Sarah Operations Lead', 'sarah@razorflow.ai')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 4. Products (25 Curated Hardware SKUs)
  const products = [
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Titanium Display Pro XDR',
      category: 'Displays',
      price: 149999,
      original_price: 179999,
      currency: 'INR',
      rating: 4.9,
      review_count: 42,
      stock_quantity: 5,
      image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Ultra-premium titanium frame 6K reference display for professional color grading and high-end workstations.',
      sku: 'SKU-TITAN-XDR',
      brand: 'Titanium',
      featured: true,
      ai_match_score: 99,
      ai_match_reason: 'Ultimate visual fidelity for zero-compromise creators.',
      ai_readiness_score: 95,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Monitor', '6K', 'Reference', 'Titanium']),
      specs: JSON.stringify({'Resolution': '6016 x 3384', 'Brightness': '1600 nits'})
    },
    // --- CATEGORY: Audio (prod-01 to prod-05) ---
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Aether Pro Spatial Headphone',
      category: 'Audio',
      price: Math.round(349 * USD_TO_INR_RATE),
      original_price: Math.round(399 * USD_TO_INR_RATE),
      currency: 'INR',
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
      merchant_id: 'merch_razorflow_01',
      name: 'Vortex Studio Podcaster Microphone',
      category: 'Audio',
      price: Math.round(159 * USD_TO_INR_RATE),
      original_price: Math.round(199 * USD_TO_INR_RATE),
      currency: 'INR',
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
      tags: JSON.stringify(['Dual Output', 'DSP Hardware', 'Voice Focus', 'Broadcast']),
      specs: JSON.stringify({
        'Polar Pattern': 'Cardioid Dynamic',
        'Sample Rate': '24-bit / 96kHz High-Res',
        'DSP': 'Built-in Limiter, Compressor, High-Pass'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'AcousticShield Desk Isolation Screen',
      category: 'Audio',
      price: Math.round(89 * USD_TO_INR_RATE),
      original_price: Math.round(110 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.7,
      review_count: 142,
      stock_quantity: 40,
      image_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'High-density recycled PET acoustic baffle panel reducing vocal room reverberation and desk reflections by 68%.',
      sku: 'SKU-ACOUST-03',
      brand: 'Aether Audio',
      featured: false,
      ai_match_score: 89,
      ai_match_reason: 'Optimizes room clarity when paired with broadcast microphones.',
      ai_readiness_score: 90,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Acoustic Panel', 'Noise Baffle', 'Eco PET']),
      specs: JSON.stringify({
        'NRC Rating': '0.85 Noise Reduction Coefficient',
        'Dimensions': '60cm x 40cm Curved Profile',
        'Mounting': 'Universal C-Clamp Included'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'SonicDAC Pro Audiophile USB-C Amp',
      category: 'Audio',
      price: Math.round(129 * USD_TO_INR_RATE),
      original_price: Math.round(159 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.9,
      review_count: 198,
      stock_quantity: 34,
      image_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Dual ESS Sabre ES9038Q2M DAC architecture delivering ultra-low distortion and 600-ohm headphone drive capacity.',
      sku: 'SKU-DAC-PRO',
      brand: 'Sonic Labs',
      featured: false,
      ai_match_score: 93,
      ai_match_reason: 'Unlocks full potential of lossless studio monitoring headphones.',
      ai_readiness_score: 92,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Hi-Res Audio', 'ESS Sabre', 'DSD512', 'MQA']),
      specs: JSON.stringify({
        'DAC Chipset': 'Dual ESS Sabre ES9038Q2M',
        'Output Power': '1000mW @ 32 Ohms',
        'THD+N': '< 0.00018%'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'StudioFlex Articulated Boom Arm',
      category: 'Audio',
      price: Math.round(69 * USD_TO_INR_RATE),
      original_price: Math.round(85 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.8,
      review_count: 310,
      stock_quantity: 75,
      image_url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Internal spring-loaded all-aluminum low-profile microphone boom arm with integrated magnetic cable channel.',
      sku: 'SKU-BOOM-ARM',
      brand: 'Vortex Audio',
      featured: false,
      ai_match_score: 92,
      ai_match_reason: 'Eliminates desk clutter and mechanical keyboard vibration pickup.',
      ai_readiness_score: 88,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Boom Arm', 'Internal Springs', 'Cable Channel']),
      specs: JSON.stringify({
        'Payload Capacity': '2.2kg (4.8 lbs)',
        'Reach': '95cm (37.4 in) Full Extension',
        'Rotation': '360° Horizontal Bearing'
      })
    },

    // --- CATEGORY: Workstation & Keyboards (prod-06 to prod-10) ---
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Kinesis Precision Mechanical Keyboard',
      category: 'Workstation',
      price: Math.round(189 * USD_TO_INR_RATE),
      original_price: Math.round(220 * USD_TO_INR_RATE),
      currency: 'INR',
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
      merchant_id: 'merch_razorflow_01',
      name: 'Keychron C1 Pro Tenkeyless Mechanical Keyboard',
      category: 'Workstation',
      price: 4299,
      original_price: 4999,
      currency: 'INR',
      rating: 4.8,
      review_count: 480,
      stock_quantity: 55,
      image_url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify(['https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&auto=format&fit=crop&q=80']),
      description: 'Tenkeyless wired mechanical keyboard with hot-swappable tactile switches, QMK/VIA programmability, and south-facing RGB backlighting.',
      sku: 'SKU-KB-KC1',
      brand: 'Keychron',
      featured: true,
      ai_match_score: 93,
      ai_match_reason: 'Top pick for budget-conscious mechanical keyboard enthusiasts with full QMK/VIA customization.',
      ai_readiness_score: 91,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Mechanical Keyboard', 'Tenkeyless', 'Hot-Swap', 'RGB', 'QMK/VIA']),
      specs: JSON.stringify({
        'Layout': 'Tenkeyless (87 Keys)',
        'Switches': 'Keychron K Pro Brown Tactile',
        'Chassis': 'Reinforced ABS Structural Frame',
        'Polling Rate': '1000Hz Ultra-fast',
        'Connectivity': 'USB Type-C Detachable Cable'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Royal Kludge RK61 Wireless 60% Mechanical Keyboard',
      category: 'Workstation',
      price: 3899,
      original_price: 4499,
      currency: 'INR',
      rating: 4.7,
      review_count: 650,
      stock_quantity: 70,
      image_url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify(['https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=80']),
      description: 'Ultra-compact 60% mechanical keyboard with multi-device Bluetooth 5.1, 2.4GHz wireless dongle, hot-swappable red switches, and customizable RGB backlighting.',
      sku: 'SKU-KB-RK61',
      brand: 'Royal Kludge',
      featured: false,
      ai_match_score: 91,
      ai_match_reason: 'Compact wireless mechanical keyboard ideal for portable setups and small desk spaces under budget.',
      ai_readiness_score: 89,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Mechanical Keyboard', 'Wireless', '60% Compact', 'Hot-Swap', 'Bluetooth']),
      specs: JSON.stringify({
        'Layout': '60% Ultra-Compact (61 Keys)',
        'Switches': 'Hot-Swappable RK Red Linear',
        'Chassis': 'Compact ABS Ergonomic Casing',
        'Polling Rate': '1000Hz (Wired/2.4G), 125Hz (Bluetooth)',
        'Battery': '1450mAh (Up to 100 hours)'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Redragon K552 Kumara RGB Mechanical Keyboard',
      category: 'Workstation',
      price: 2699,
      original_price: 3299,
      currency: 'INR',
      rating: 4.6,
      review_count: 1200,
      stock_quantity: 85,
      image_url: 'https://images.unsplash.com/photo-1541140532154-b024d705b909?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify(['https://images.unsplash.com/photo-1541140532154-b024d705b909?w=800&auto=format&fit=crop&q=80']),
      description: 'Durable metal and ABS construction compact 87-key tenkeyless mechanical keyboard with dust-proof mechanical clicky switches and vivid RGB backlighting.',
      sku: 'SKU-KB-RD552',
      brand: 'Redragon',
      featured: false,
      ai_match_score: 88,
      ai_match_reason: 'Heavy-duty affordable mechanical keyboard with responsive tactile clicky feedback.',
      ai_readiness_score: 87,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Mechanical Keyboard', 'Gaming', 'Tenkeyless', 'RGB', 'Clicky Blue']),
      specs: JSON.stringify({
        'Layout': 'Tenkeyless (87 Keys)',
        'Switches': 'Custom Outemu Blue Clicky',
        'Chassis': 'Solid Metal Alloy & ABS Matrix',
        'Polling Rate': '1000Hz High-Speed',
        'Connectivity': 'Gold-Plated Corrosion-Free USB'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Pulse MX Ergonomic Vertical Mouse',
      category: 'Workstation',
      price: Math.round(99 * USD_TO_INR_RATE),
      original_price: Math.round(119 * USD_TO_INR_RATE),
      currency: 'INR',
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
      merchant_id: 'merch_razorflow_01',
      name: 'AeroLift Dual Motor Standing Desk',
      category: 'Workstation',
      price: Math.round(549 * USD_TO_INR_RATE),
      original_price: Math.round(620 * USD_TO_INR_RATE),
      currency: 'INR',
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
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'ErgoRest Memory Foam Wrist Support',
      category: 'Workstation',
      price: Math.round(29 * USD_TO_INR_RATE),
      original_price: Math.round(39 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.6,
      review_count: 175,
      stock_quantity: 120,
      image_url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Cooling gel-infused ergonomic wrist pillow contoured specifically for 75% mechanical keyboards.',
      sku: 'SKU-WRIST-75',
      brand: 'Pulse Ergonomics',
      featured: false,
      ai_match_score: 90,
      ai_match_reason: 'Affordable comfort upgrade for mechanical keyboard typing.',
      ai_readiness_score: 87,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Wrist Rest', 'Memory Foam', 'Cooling Gel']),
      specs: JSON.stringify({
        'Length': '32cm (Fits 75% Layout)',
        'Material': 'Medical-grade High Density Foam',
        'Base': 'Anti-slip Textured Rubber'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Titanium Anodized Keycap Artisan Set',
      category: 'Workstation',
      price: Math.round(79 * USD_TO_INR_RATE),
      original_price: Math.round(99 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.8,
      review_count: 96,
      stock_quantity: 50,
      image_url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Solid Grade 5 Titanium tactile home row accent keycaps with laser-etched precision coordinates.',
      sku: 'SKU-KEY-TITAN',
      brand: 'Kinesis Labs',
      featured: false,
      ai_match_score: 87,
      ai_match_reason: 'Premium luxury upgrade for mechanical keyboard enthusiasts.',
      ai_readiness_score: 85,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Titanium Keycaps', 'Artisan', 'Cherry MX']),
      specs: JSON.stringify({
        'Material': 'Grade 5 Aerospace Titanium',
        'Profile': 'Cherry Profile R3/R4',
        'Stem': 'Universal Cross MX Compatible'
      })
    },

    // --- CATEGORY: Displays (prod-11 to prod-14) ---
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Nova Pro 4K HDR USB-C Monitor',
      category: 'Displays',
      price: Math.round(699 * USD_TO_INR_RATE),
      original_price: Math.round(799 * USD_TO_INR_RATE),
      currency: 'INR',
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
      merchant_id: 'merch_razorflow_01',
      name: 'Nova Ultrawide 34" Curved Studio Display',
      category: 'Displays',
      price: Math.round(899 * USD_TO_INR_RATE),
      original_price: Math.round(999 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.9,
      review_count: 240,
      stock_quantity: 14,
      image_url: 'https://images.unsplash.com/photo-1551645120-d70bfe84c826?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: '1900R curvature panoramic 3440x1440p monitor with 144Hz refresh rate and dual-host picture-by-picture mode.',
      sku: 'SKU-MON-UW34',
      brand: 'Nova Displays',
      featured: false,
      ai_match_score: 95,
      ai_match_reason: 'Expansive screen estate for simultaneous IDE and simulator windows.',
      ai_readiness_score: 93,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Ultrawide', '144Hz', 'Thunderbolt 4', '1900R Curve']),
      specs: JSON.stringify({
        'Resolution': '3440 x 1440 (21:9 Aspect)',
        'Refresh Rate': '144Hz Variable',
        'Power Delivery': '100W USB-C'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'OmniArm Gas-Spring Heavy-Duty Monitor Arm',
      category: 'Displays',
      price: Math.round(119 * USD_TO_INR_RATE),
      original_price: Math.round(149 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.8,
      review_count: 320,
      stock_quantity: 55,
      image_url: 'https://images.unsplash.com/photo-1547119957-637f8679db1e?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Zero-gravity counterbalance monitor arm supporting up to 38-inch ultrawides with integrated USB 3.0 passthrough ports.',
      sku: 'SKU-ARM-OMNI',
      brand: 'Nova Displays',
      featured: false,
      ai_match_score: 93,
      ai_match_reason: 'Frees up 40% desktop space and provides ergonomic eye-level adjustment.',
      ai_readiness_score: 91,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Monitor Arm', 'Gas Spring', 'VESA 100']),
      specs: JSON.stringify({
        'VESA Standard': '75x75mm / 100x100mm',
        'Max Weight': '15kg (33 lbs)',
        'Tilt/Swivel': '+90°/-45° Tilt, 360° Pivot'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Thunderbolt 4 10-in-1 Dual 4K Dock',
      category: 'Displays',
      price: Math.round(249 * USD_TO_INR_RATE),
      original_price: Math.round(299 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.9,
      review_count: 188,
      stock_quantity: 28,
      image_url: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: '40Gbps single cable dock driving dual 4K @ 60Hz displays with 2.5GbE Ethernet and 96W host laptop charging.',
      sku: 'SKU-DOCK-TB4',
      brand: 'Nova Displays',
      featured: false,
      ai_match_score: 96,
      ai_match_reason: 'Single cable workstation dock unifying displays, audio, and high-speed network.',
      ai_readiness_score: 94,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Thunderbolt 4', '40Gbps', 'Dual 4K', '96W PD']),
      specs: JSON.stringify({
        'Bandwidth': '40Gbps Bi-directional',
        'Ethernet': '2.5 Gigabit RJ45',
        'Power Delivery': '96W Smart Charging'
      })
    },

    // --- CATEGORY: Lighting & Smart Sensors (prod-15 to prod-18) ---
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Lumix Ergonomic OLED Desk Lamp',
      category: 'Lighting',
      price: Math.round(129 * USD_TO_INR_RATE),
      original_price: Math.round(149 * USD_TO_INR_RATE),
      currency: 'INR',
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
      merchant_id: 'merch_razorflow_01',
      name: 'ScreenGlow Pro Asymmetric Monitor Lightbar',
      category: 'Lighting',
      price: Math.round(79 * USD_TO_INR_RATE),
      original_price: Math.round(99 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.8,
      review_count: 410,
      stock_quantity: 80,
      image_url: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Zero-screen-reflection monitor top lightbar with wireless desktop rotary dial controller and auto ambient sensor.',
      sku: 'SKU-LGT-BAR',
      brand: 'Lumix Design',
      featured: false,
      ai_match_score: 94,
      ai_match_reason: 'Illuminates desk surface without any monitor glare or washed-out pixels.',
      ai_readiness_score: 91,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Monitor Lightbar', 'Wireless Dial', 'Zero Glare']),
      specs: JSON.stringify({
        'Beam Angle': '45° Asymmetric Forward',
        'Controller': '2.4GHz Wireless Dial',
        'Power': '5V USB-C Direct from Monitor'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'AuraAmbient RGB Backlight Diffusion Tube',
      category: 'Lighting',
      price: Math.round(59 * USD_TO_INR_RATE),
      original_price: Math.round(75 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.6,
      review_count: 165,
      stock_quantity: 90,
      image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Frosted silicone addressable RGB tube for indirect desk edge glow with music sync and custom color temperature scenes.',
      sku: 'SKU-AURA-TUBE',
      brand: 'Lumix Design',
      featured: false,
      ai_match_score: 88,
      ai_match_reason: 'Enhances aesthetic desk ambiance for video recordings and late night workflows.',
      ai_readiness_score: 86,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Ambient RGB', 'Silicone Diffuser', 'App Control']),
      specs: JSON.stringify({
        'Length': '1.5m Flexible Silicone Tube',
        'LED Density': '96 LEDs/meter Addressable',
        'Connectivity': 'Bluetooth 5.0 + HomeKit'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'AirSense Precision Desk Environmental Sensor',
      category: 'Lighting',
      price: Math.round(99 * USD_TO_INR_RATE),
      original_price: Math.round(120 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.8,
      review_count: 88,
      stock_quantity: 45,
      image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Real-time e-ink desk monitor tracking CO2, VOCs, PM2.5, humidity, temperature, and ambient acoustic decibels.',
      sku: 'SKU-SENS-AIR',
      brand: 'Lumix Design',
      featured: false,
      ai_match_score: 91,
      ai_match_reason: 'Ensures optimal deep-work cognitive performance via room air quality alerts.',
      ai_readiness_score: 89,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['CO2 Sensor', 'E-Ink Display', 'Cognitive Focus']),
      specs: JSON.stringify({
        'Display': '2.9" High-contrast E-Ink',
        'Sensors': 'NDIR CO2, Sensirion VOC, Laser PM2.5',
        'Battery': '6 Months Rechargeable USB-C'
      })
    },

    // --- CATEGORY: Accessories & Desk Mats (prod-19 to prod-25) ---
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Nexus Magnetic Modular Desk Mat',
      category: 'Accessories',
      price: Math.round(49 * USD_TO_INR_RATE),
      original_price: Math.round(65 * USD_TO_INR_RATE),
      currency: 'INR',
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
      merchant_id: 'merch_razorflow_01',
      name: 'MagAnchor Precision Cable Clamps (4-Pack)',
      category: 'Accessories',
      price: Math.round(24 * USD_TO_INR_RATE),
      original_price: Math.round(32 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.7,
      review_count: 215,
      stock_quantity: 150,
      image_url: 'https://images.unsplash.com/photo-1621252179027-94459d278660?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'CNC machined aerospace aluminum magnetic cable anchors with silicone friction collars preventing cables from sliding off desks.',
      sku: 'SKU-MAG-CLAMP',
      brand: 'Nexus Craft',
      featured: false,
      ai_match_score: 89,
      ai_match_reason: 'Essential companion for Nexus desk mats to organize USB-C charging leads.',
      ai_readiness_score: 86,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Cable Organizer', 'CNC Aluminum', 'Neodymium']),
      specs: JSON.stringify({
        'Material': 'Anodized Space Grey Aluminum',
        'Magnets': 'N52 Neodymium Internal',
        'Compatibility': 'Cables up to 6mm Diameter'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'UnderDesk PowerHub Cable Management Raceway',
      category: 'Accessories',
      price: Math.round(39 * USD_TO_INR_RATE),
      original_price: Math.round(49 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.8,
      review_count: 178,
      stock_quantity: 95,
      image_url: 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Flame-retardant steel mesh cable tray with integrated 6-socket surge protected power strip and dual USB-C 65W GaN fast chargers.',
      sku: 'SKU-CABLE-RACE',
      brand: 'AeroLift Systems',
      featured: false,
      ai_match_score: 93,
      ai_match_reason: 'Conceals all workstation power bricks and cable slack cleanly under standing desks.',
      ai_readiness_score: 90,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Cable Tray', 'Power Strip', 'Standing Desk']),
      specs: JSON.stringify({
        'Length': '75cm High Capacity',
        'Outlets': '6x Universal AC + 2x USB-C 65W GaN',
        'Load Rating': '10kg Steel Mesh'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'ChargeStand MagSafe 3-in-1 Fast Station',
      category: 'Accessories',
      price: Math.round(89 * USD_TO_INR_RATE),
      original_price: Math.round(110 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.9,
      review_count: 280,
      stock_quantity: 60,
      image_url: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Solid aluminum charging stand simultaneously powering iPhone (15W Qi2 MagSafe), Apple Watch, and AirPods.',
      sku: 'SKU-MAG-3IN1',
      brand: 'Nexus Craft',
      featured: false,
      ai_match_score: 91,
      ai_match_reason: 'Compact charging station keeping mobile devices powered without desk clutter.',
      ai_readiness_score: 88,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['MagSafe', 'Qi2 15W', '3-in-1 Station']),
      specs: JSON.stringify({
        'iPhone Output': '15W Fast Magnetic Wireless',
        'Watch Output': '5W Fast Charge Module',
        'AirPods Output': '5W Base Pad'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Walnut Solid Wood Headphone Stand',
      category: 'Accessories',
      price: Math.round(45 * USD_TO_INR_RATE),
      original_price: Math.round(59 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.8,
      review_count: 190,
      stock_quantity: 70,
      image_url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Curved solid North American walnut headphone rest on weighted sandblasted steel base with integrated cable wrap peg.',
      sku: 'SKU-STAND-WOOD',
      brand: 'Nexus Craft',
      featured: false,
      ai_match_score: 90,
      ai_match_reason: 'Elegant display perch protecting headband cushion from indentations.',
      ai_readiness_score: 87,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Headphone Stand', 'Solid Walnut', 'Weighted Base']),
      specs: JSON.stringify({
        'Material': 'Solid Natural Walnut + Matte Steel',
        'Base Weight': '680g Heavy Anti-Tip Base',
        'Height': '28cm (Fits All Over-Ear Cans)'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'CarbonFiber Laptop Elevator Riser',
      category: 'Accessories',
      price: Math.round(55 * USD_TO_INR_RATE),
      original_price: Math.round(69 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.7,
      review_count: 145,
      stock_quantity: 65,
      image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Ultra-lightweight real 3K matte carbon fiber laptop stand aligning display to eye height and maximizing thermal airflow.',
      sku: 'SKU-STAND-CF',
      brand: 'Pulse Ergonomics',
      featured: false,
      ai_match_score: 92,
      ai_match_reason: 'Eliminates neck tilt when using laptop side-by-side with 4K desktop monitor.',
      ai_readiness_score: 89,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Laptop Stand', 'Carbon Fiber', 'Thermal Flow']),
      specs: JSON.stringify({
        'Material': 'Real 3K Twill Carbon Fiber',
        'Elevation Angle': '18° Ergonomic Incline',
        'Weight': 'Only 145g Ultra-Portable'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Microfiber Optical Screen & Lens Cleaning Kit',
      category: 'Accessories',
      price: Math.round(19 * USD_TO_INR_RATE),
      original_price: Math.round(25 * USD_TO_INR_RATE),
      currency: 'INR',
      rating: 4.9,
      review_count: 380,
      stock_quantity: 200,
      image_url: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Alcohol-free and ammonia-free screen cleaner solution paired with 3x edgeless high-density microfiber cloths.',
      sku: 'SKU-CLN-KIT',
      brand: 'Nexus Craft',
      featured: false,
      ai_match_score: 85,
      ai_match_reason: 'Safe maintenance fluid for nano-texture and IPS Black monitor glass.',
      ai_readiness_score: 84,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Screen Cleaner', 'Microfiber', 'Nano Safe']),
      specs: JSON.stringify({
        'Solution Volume': '200ml Non-toxic Mist',
        'Cloths': '3x 30cm x 30cm 300GSM Plush',
        'Coating Safety': 'Safe for Anti-Reflective & OLED'
      })
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Signature Collection Leather Jacket',
      category: 'Fashion & Apparel',
      price: Math.round(24999),
      original_price: Math.round(29999),
      currency: 'INR',
      rating: 4.8,
      review_count: 312,
      stock_quantity: 45,
      image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Premium full-grain leather jacket with a tailored fit, featuring reinforced stitching and a timeless design suitable for both casual and formal wear.',
      sku: 'SKU-FASH-001',
      brand: 'Urban Couture',
      featured: true,
      ai_match_score: 94,
      ai_match_reason: 'Highly rated premium apparel with classic styling.',
      ai_readiness_score: 95,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Leather', 'Jacket', 'Premium', 'Men']),
      specs: JSON.stringify({'Material': 'Full-grain Leather', 'Fit': 'Tailored', 'Care': 'Dry Clean Only'})
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Luxe Botanicals Hydrating Serum',
      category: 'Beauty & Personal Care',
      price: Math.round(3499),
      original_price: Math.round(4299),
      currency: 'INR',
      rating: 4.7,
      review_count: 856,
      stock_quantity: 120,
      image_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'An advanced hydrating serum infused with hyaluronic acid and natural botanicals to restore skin moisture, elasticity, and radiant glow.',
      sku: 'SKU-BEAU-001',
      brand: 'Luxe Botanicals',
      featured: true,
      ai_match_score: 96,
      ai_match_reason: 'Best-selling skincare essential for all skin types.',
      ai_readiness_score: 93,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Skincare', 'Hydration', 'Serum', 'Vegan']),
      specs: JSON.stringify({'Volume': '30ml', 'Key Ingredients': 'Hyaluronic Acid, Vitamin C', 'Skin Type': 'All'})
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Apex Pro Smart Coffee Maker',
      category: 'Home & Kitchen',
      price: Math.round(18999),
      original_price: Math.round(21999),
      currency: 'INR',
      rating: 4.9,
      review_count: 421,
      stock_quantity: 30,
      image_url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Wi-Fi enabled smart coffee machine with programmable brewing cycles, built-in grinder, and precision temperature control.',
      sku: 'SKU-HOME-001',
      brand: 'Apex Appliances',
      featured: true,
      ai_match_score: 98,
      ai_match_reason: 'Smart home integration combined with barista-quality brewing.',
      ai_readiness_score: 97,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Smart Home', 'Coffee', 'Kitchen', 'Appliance']),
      specs: JSON.stringify({'Connectivity': 'Wi-Fi, Bluetooth', 'Capacity': '1.5 Liters', 'Grinder': 'Ceramic Burr'})
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Velocity Ultra Running Shoes',
      category: 'Sports & Outdoors',
      price: Math.round(11999),
      original_price: Math.round(14999),
      currency: 'INR',
      rating: 4.6,
      review_count: 590,
      stock_quantity: 85,
      image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Engineered for speed and comfort, featuring responsive foam cushioning, breathable mesh upper, and a carbon-fiber plate for maximum energy return.',
      sku: 'SKU-SPRT-001',
      brand: 'Velocity',
      featured: false,
      ai_match_score: 92,
      ai_match_reason: 'High-performance athletic gear for marathon runners and sprinters.',
      ai_readiness_score: 94,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Running', 'Shoes', 'Athletic', 'Men']),
      specs: JSON.stringify({'Weight': '210g', 'Drop': '8mm', 'Cushioning': 'Responsive Foam'})
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: '"The Innovator\'s Mindset" by Dr. E. Carter',
      category: 'Books',
      price: Math.round(1299),
      original_price: Math.round(1599),
      currency: 'INR',
      rating: 4.9,
      review_count: 1240,
      stock_quantity: 200,
      image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'A New York Times bestseller exploring the psychology of innovation, disruption, and creative problem-solving in the modern tech era.',
      sku: 'SKU-BOOK-001',
      brand: 'Penguin Publishers',
      featured: false,
      ai_match_score: 90,
      ai_match_reason: 'Highly recommended for tech professionals and entrepreneurs.',
      ai_readiness_score: 95,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Book', 'Non-fiction', 'Business', 'Innovation']),
      specs: JSON.stringify({'Format': 'Hardcover', 'Pages': '342', 'Language': 'English'})
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'OmniVision 65-inch 4K OLED Smart TV',
      category: 'Electronics',
      price: Math.round(145999),
      original_price: Math.round(169999),
      currency: 'INR',
      rating: 4.8,
      review_count: 310,
      stock_quantity: 15,
      image_url: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Immersive 4K OLED display with infinite contrast, Dolby Vision IQ, and AI-powered upscaling for the ultimate cinematic experience at home.',
      sku: 'SKU-ELEC-001',
      brand: 'OmniVision',
      featured: true,
      ai_match_score: 97,
      ai_match_reason: 'Premium home entertainment hub with next-gen AI processing.',
      ai_readiness_score: 98,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['TV', 'OLED', '4K', 'Smart Home']),
      specs: JSON.stringify({'Resolution': '4K UHD (3840 x 2160)', 'Refresh Rate': '120Hz', 'HDR': 'Dolby Vision, HDR10+'})
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'EcoFit Premium Yoga Mat',
      category: 'Sports & Outdoors',
      price: Math.round(2499),
      original_price: Math.round(3499),
      currency: 'INR',
      rating: 4.7,
      review_count: 842,
      stock_quantity: 150,
      image_url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Extra-thick, slip-resistant yoga mat made from 100% natural and biodegradable tree rubber. Features alignment lines for perfect posture.',
      sku: 'SKU-SPRT-002',
      brand: 'EcoFit',
      featured: false,
      ai_match_score: 88,
      ai_match_reason: 'Eco-friendly and supportive fitness accessory.',
      ai_readiness_score: 92,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Yoga', 'Fitness', 'Eco-friendly', 'Mat']),
      specs: JSON.stringify({'Material': 'Natural Rubber', 'Thickness': '6mm', 'Dimensions': '72" x 26"'})
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Aura Bloom Eau de Parfum',
      category: 'Beauty & Personal Care',
      price: Math.round(8999),
      original_price: Math.round(10499),
      currency: 'INR',
      rating: 4.6,
      review_count: 450,
      stock_quantity: 60,
      image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'A captivating floral fragrance blending notes of wild jasmine, vanilla orchid, and warm sandalwood for an unforgettable signature scent.',
      sku: 'SKU-BEAU-002',
      brand: 'Aura',
      featured: false,
      ai_match_score: 91,
      ai_match_reason: 'Highly sought-after luxury fragrance for evening wear.',
      ai_readiness_score: 94,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Perfume', 'Fragrance', 'Luxury', 'Women']),
      specs: JSON.stringify({'Volume': '100ml', 'Fragrance Family': 'Floral Oriental', 'Longevity': '12+ Hours'})
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'Chronos Classic Automatic Watch',
      category: 'Fashion & Apparel',
      price: Math.round(35999),
      original_price: Math.round(42000),
      currency: 'INR',
      rating: 4.8,
      review_count: 215,
      stock_quantity: 25,
      image_url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'An elegant timepiece featuring a Swiss automatic movement, sapphire crystal glass, and a genuine Italian leather strap.',
      sku: 'SKU-FASH-002',
      brand: 'Chronos',
      featured: true,
      ai_match_score: 95,
      ai_match_reason: 'Timeless luxury accessory with precision engineering.',
      ai_readiness_score: 96,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Watch', 'Luxury', 'Automatic', 'Men']),
      specs: JSON.stringify({'Movement': 'Swiss Automatic', 'Glass': 'Sapphire Crystal', 'Water Resistance': '50m'})
    },
    {
      merchant_id: 'merch_razorflow_01',
      name: 'SleepWell Cloud Memory Foam Mattress',
      category: 'Home & Kitchen',
      price: Math.round(45999),
      original_price: Math.round(55000),
      currency: 'INR',
      rating: 4.9,
      review_count: 1890,
      stock_quantity: 18,
      image_url: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?w=800&auto=format&fit=crop&q=80',
      gallery: JSON.stringify([]),
      description: 'Multi-layer cooling memory foam mattress providing optimal spine alignment, pressure relief, and motion isolation for restorative sleep.',
      sku: 'SKU-HOME-002',
      brand: 'SleepWell',
      featured: false,
      ai_match_score: 93,
      ai_match_reason: 'Highly rated home essential for health and wellness.',
      ai_readiness_score: 91,
      vector_embedding_status: 'synced',
      tags: JSON.stringify(['Mattress', 'Bedroom', 'Memory Foam', 'Comfort']),
      specs: JSON.stringify({'Size': 'Queen (60x80 inches)', 'Firmness': 'Medium Firm', 'Thickness': '12 inches'})
    }
  ];
  
  products.forEach(p => p.id = randomUUID());
  const skuToId = Object.fromEntries(products.map(p => [p.sku, p.id]));


  // Clean tables for deterministic fresh seeding
  await pool.query(`
    TRUNCATE TABLE product_relationships, cart_items, order_items, bundles, products CASCADE;
  `);

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
        ai_match_score = EXCLUDED.ai_match_score,
        image = EXCLUDED.image,
        image_url = EXCLUDED.image_url;`,
      [
        p.id, p.merchant_id, p.name, p.description, p.category, p.price, p.original_price, p.currency, p.rating, p.review_count,
        p.stock_quantity, p.image_url, p.image_url, p.gallery, p.sku, p.brand, p.featured, p.ai_match_score, p.ai_match_reason,
        p.ai_readiness_score, p.vector_embedding_status, p.tags, p.specs
      ]
    );
  }

  // 5. Product Relationships Graph (Upsell, Cross-sell, Accessory edges)
  const relationships = [
    { id: 'rel-01', product_sku: 'SKU-AETH-901', related_product_sku: 'SKU-MIC-VX1', relationship_type: 'CROSS_SELL', score: 0.94, reason: 'Pair broadcast microphone with ANC headphones for full vocal clarity & monitoring stack.' },
    { id: 'rel-02', product_sku: 'SKU-AETH-901', related_product_sku: 'SKU-DAC-PRO', relationship_type: 'UPSELL', score: 0.96, reason: 'Audiophile USB-C DAC amplifier drives lossless acoustic fidelity on Aether Pro headphones.' },
    { id: 'rel-03', product_sku: 'SKU-AETH-901', related_product_sku: 'SKU-STAND-WOOD', relationship_type: 'ACCESSORY', score: 0.91, reason: 'Solid walnut wooden stand displays and protects over-ear headphones on desk.' },
    { id: 'rel-04', product_sku: 'SKU-KB-75X', related_product_sku: 'SKU-MOU-V57', relationship_type: 'CROSS_SELL', score: 0.97, reason: 'Vertical ergonomic mouse neutralizes wrist strain when paired with 75% mechanical keyboard.' },
    { id: 'rel-05', product_sku: 'SKU-KB-75X', related_product_sku: 'SKU-WRIST-75', relationship_type: 'ACCESSORY', score: 0.92, reason: 'Memory foam cooling gel wrist rest relieves pressure during sustained coding sprints.' },
    { id: 'rel-06', product_sku: 'SKU-KB-75X', related_product_sku: 'SKU-MAT-NX9', relationship_type: 'CROSS_SELL', score: 0.89, reason: 'Magnetic vegan leather desk mat provides cushioned tactile feedback and cable routing.' },
    { id: 'rel-07', product_sku: 'SKU-MON-4K27', related_product_sku: 'SKU-ARM-OMNI', relationship_type: 'ACCESSORY', score: 0.95, reason: 'Gas-spring heavy duty monitor arm frees desk space and allows 360-degree rotation.' },
    { id: 'rel-08', product_sku: 'SKU-MON-4K27', related_product_sku: 'SKU-DOCK-TB4', relationship_type: 'UPSELL', score: 0.98, reason: 'Thunderbolt 4 dual dock drives 4K monitors with single-cable 96W laptop charging.' },
    { id: 'rel-09', product_sku: 'SKU-MON-4K27', related_product_sku: 'SKU-LGT-BAR', relationship_type: 'CROSS_SELL', score: 0.93, reason: 'Asymmetric monitor lightbar illuminates workspace without screen reflections.' },
    { id: 'rel-10', product_sku: 'SKU-DSK-AERO', related_product_sku: 'SKU-CABLE-RACE', relationship_type: 'ACCESSORY', score: 0.96, reason: 'Under-desk cable raceway and GaN power hub keeps all standing desk wiring hidden.' },
    { id: 'rel-11', product_sku: 'SKU-MAT-NX9', related_product_sku: 'SKU-MAG-CLAMP', relationship_type: 'ACCESSORY', score: 0.94, reason: 'CNC aluminum magnetic clamps snap directly into Nexus mat channels for cable retention.' },
    { id: 'rel-12', product_sku: 'SKU-MAT-NX9', related_product_sku: 'SKU-MAG-3IN1', relationship_type: 'CROSS_SELL', score: 0.91, reason: '3-in-1 MagSafe station organizes phone, watch, and earbuds charging in matching style.' }
  ];

  for (const r of relationships) {
    await pool.query(
      `INSERT INTO product_relationships (id, product_id, related_product_id, relationship_type, score, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score, reason = EXCLUDED.reason;`,
      [r.id, skuToId[r.product_sku], skuToId[r.related_product_sku], r.relationship_type, r.score, r.reason]
    );
  }

  // 6. Customers (20+ realistic customer accounts)
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
    { id: 'cust-10', name: 'Kavita Nair', email: 'kavita.nair@ai-research.org', phone: '+91 98950 34567' },
    { id: 'cust-11', name: 'Marcus Sterling', email: 'marcus.s@velocity.ai', phone: '+1 415 800 9012' },
    { id: 'cust-12', name: 'ProcureBot Gemini-Flash', email: 'gemini-buyer@enterprise-procure.io', phone: '+1 800 436 4641' },
    { id: 'cust-13', name: 'Siddharth Rao', email: 'siddharth.r@kerneldev.in', phone: '+91 98711 22334' },
    { id: 'cust-14', name: 'Elena Rostova', email: 'elena.rostova@visualfx.de', phone: '+49 30 901820' },
    { id: 'cust-15', name: 'Autonomous Workstation Bot #88', email: 'deskbot-88@agentic.cloud', phone: '+1 888 204 8888' },
    { id: 'cust-16', name: 'Tanvi Joshi', email: 'tanvi.j@aerodynamics.in', phone: '+91 98440 99887' },
    { id: 'cust-17', name: 'Rahul Chawla', email: 'rahul.c@soundengineer.co', phone: '+91 98112 33445' },
    { id: 'cust-18', name: 'Autonomous Procurement Node #12', email: 'node-12@uap-commerce.org', phone: '+1 800 827 0012' },
    { id: 'cust-19', name: 'Zoya Akhtar', email: 'zoya.akhtar@creativeagency.in', phone: '+91 99200 44556' },
    { id: 'cust-20', name: 'Harish Sundaram', email: 'harish.s@quantumedge.io', phone: '+91 98800 77665' }
  ];

  for (const c of customers) {
    await pool.query(
      `INSERT INTO customers (id, merchant_id, name, email, phone)
       VALUES ($1, 'merch_razorflow_01', $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;`,
      [c.id, c.name, c.email, c.phone]
    );
  }

  // 7. Bundles
  const bundles = [
    {
      id: 'bundle-01',
      title: 'The Executive Creator Studio',
      tagline: 'Precision 4K Visuals + Studio Grade Acoustics',
      description: 'Curated by RazorFlow AI for content developers and creative directors wanting pristine fidelity without configuration friction.',
      match_score: 99,
      original_total: Math.round(1207),
      bundle_price: Math.round(999 * USD_TO_INR_RATE),
      savings_percentage: 17,
      category: 'Workstation Stack',
      product_skus: ['SKU-AETH-901', 'SKU-MON-4K27', 'SKU-MIC-VX1'],
      curated_reason: 'Complete audiovisual synthesis with unified USB-C single cable topology and active voice isolation.'
    },
    {
      id: 'bundle-02',
      title: 'Zero-Strain Ergonomic Stack',
      tagline: 'End-to-End Ergonomics for 10+ Hour Coding Sprints',
      description: 'Engineered pairing of 75% mechanical tactile keyboard, 57° vertical mouse, memory wrist pillow, and circadian task lighting.',
      match_score: 97,
      original_total: Math.round(446 * USD_TO_INR_RATE),
      bundle_price: Math.round(369 * USD_TO_INR_RATE),
      savings_percentage: 17,
      category: 'Ergonomics',
      product_skus: ['SKU-KB-75X', 'SKU-MOU-V57', 'SKU-WRIST-75', 'SKU-LUM-204'],
      curated_reason: 'Eliminates wrist fatigue and eye strain via synchronized tactile and optical comfort.'
    },
    {
      id: 'bundle-03',
      title: 'Minimalist Focus Station',
      tagline: 'Quiet Luxury Desk Essential Kit',
      description: 'Sleek anodized keyboard paired with modular magnetic vegan leather mat, cable clamps, and ANC studio headphones.',
      match_score: 94,
      original_total: Math.round(611 * USD_TO_INR_RATE),
      bundle_price: Math.round(499 * USD_TO_INR_RATE),
      savings_percentage: 18,
      category: 'Minimalism',
      product_skus: ['SKU-AETH-901', 'SKU-KB-75X', 'SKU-MAT-NX9', 'SKU-MAG-CLAMP'],
      curated_reason: 'Reduces visual clutter and increases deep-work focus scores by 3.2x.'
    }
  ];

  for (const b of bundles) {
    await pool.query(
      `INSERT INTO bundles (id, title, tagline, description, match_score, original_total, bundle_price, savings_percentage, category, product_ids, curated_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET 
         title = EXCLUDED.title, 
         bundle_price = EXCLUDED.bundle_price, 
         original_total = EXCLUDED.original_total, 
         product_ids = EXCLUDED.product_ids;`,
      [b.id, b.title, b.tagline, b.description, b.match_score, b.original_total, b.bundle_price, b.savings_percentage, b.category, JSON.stringify(b.product_skus.map(sku => skuToId[sku])), b.curated_reason]
    );
  }

  // 8. Bounded Agent Policies in Supabase
  const policies = [
    { id: 'pol-01', policy_type: 'MAX_DISCOUNT', config: { max_discount_percent: 15, max_discount_amount: 2500, allowed_channels: ['AI_COPILOT', 'A2A_AGENT'] } },
    { id: 'pol-02', policy_type: 'SPENDING_LIMIT', config: { max_single_transaction: 50000, daily_spending_cap: 500000, require_human_approval_above: 25000 } },
    { id: 'pol-03', policy_type: 'AUTONOMOUS_CHECKOUT', config: { allow_direct_settlement: true, max_autonomous_a2a_order: 15000, allowed_currencies: ['INR', 'USD'] } }
  ];

  for (const pol of policies) {
    await pool.query(
      `INSERT INTO agent_policies (id, merchant_id, policy_type, configuration, enabled)
       VALUES ($1, 'merch_razorflow_01', $2, $3, true)
       ON CONFLICT (id) DO UPDATE SET configuration = EXCLUDED.configuration;`,
      [pol.id, pol.policy_type, JSON.stringify(pol.config)]
    );
  }

  console.log('✅ Real production dataset (25 Hardware SKUs, relational graph, 20+ customers) seeded successfully.');
}
