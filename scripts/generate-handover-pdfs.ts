import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

function findBrowserExecutable(): string {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Neither Google Chrome nor Microsoft Edge was found.");
}

const SHARED_CSS = `
  @page {
    size: A4;
    margin: 16mm 15mm 16mm 15mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    color: #181512;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 10.5pt;
    line-height: 1.55;
  }
  .cover-banner {
    background: linear-gradient(135deg, #141210 0%, #241e17 55%, #33291c 100%);
    color: #fcfaf6;
    padding: 28px 32px;
    border-radius: 14px;
    border: 1.5px solid #c5a059;
    margin-bottom: 22px;
    position: relative;
  }
  .cover-tag {
    display: inline-block;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 2.5px;
    color: #e6c67c;
    background: rgba(197, 160, 89, 0.16);
    border: 1px solid rgba(197, 160, 89, 0.45);
    padding: 4px 12px;
    border-radius: 999px;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .cover-banner h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22pt;
    margin: 4px 0 8px 0;
    color: #ffffff;
    letter-spacing: -0.3px;
    line-height: 1.2;
  }
  .cover-banner p.sub {
    margin: 0 0 16px 0;
    color: #d8cfc2;
    font-size: 10.5pt;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    border-top: 1px solid rgba(197, 160, 89, 0.35);
    padding-top: 12px;
    font-size: 8.5pt;
  }
  .meta-item span.label {
    display: block;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #c5a059;
    font-size: 7.5pt;
    font-weight: 700;
  }
  .meta-item span.val {
    color: #ffffff;
    font-weight: 600;
  }
  h2 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 14.5pt;
    color: #141210;
    border-bottom: 2px solid #c5a059;
    padding-bottom: 5px;
    margin-top: 22px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 11.5pt;
    color: #7c5c22;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }
  p {
    margin: 0 0 8px 0;
  }
  ul, ol {
    margin: 0 0 10px 0;
    padding-left: 20px;
  }
  li {
    margin-bottom: 4px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 16px 0;
    font-size: 9pt;
    page-break-inside: auto;
  }
  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  th {
    background: #181512;
    color: #e6c67c;
    text-align: left;
    padding: 7px 10px;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    border: 1px solid #2d261e;
  }
  td {
    padding: 6.5px 10px;
    border: 1px solid #e2d9c8;
    vertical-align: top;
  }
  tr:nth-child(even) td {
    background: #faf7f2;
  }
  .callout {
    background: #faf6ee;
    border-left: 4px solid #c5a059;
    border-top: 1px solid #eadfcd;
    border-right: 1px solid #eadfcd;
    border-bottom: 1px solid #eadfcd;
    padding: 10px 14px;
    border-radius: 0 8px 8px 0;
    margin: 10px 0 14px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  .badge {
    display: inline-block;
    padding: 1.5px 7px;
    border-radius: 999px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-gold { background: #f4ead5; color: #7c5c22; border: 1px solid #c5a059; }
  .badge-green { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
  .badge-dark { background: #181512; color: #e6c67c; }
  code {
    font-family: Consolas, 'Courier New', monospace;
    font-size: 8.5pt;
    background: #f3ede2;
    color: #5b4114;
    padding: 1px 5px;
    border-radius: 4px;
  }
  pre {
    background: #181512;
    color: #f5efe6;
    padding: 11px 14px;
    border-radius: 8px;
    border: 1px solid #c5a059;
    font-family: Consolas, 'Courier New', monospace;
    font-size: 8.2pt;
    line-height: 1.45;
    overflow-x: hidden;
    white-space: pre-wrap;
    word-break: break-all;
    page-break-inside: avoid;
  }
  .diagram-box {
    border: 1px solid #d8c8a8;
    background: #fdfbf7;
    border-radius: 10px;
    padding: 12px;
    margin: 12px 0 16px 0;
    text-align: center;
    page-break-inside: avoid;
  }
  .diagram-caption {
    font-size: 8.5pt;
    color: #6b5e4c;
    font-weight: 600;
    margin-top: 6px;
  }
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 8px 0 14px 0;
  }
  .card {
    border: 1px solid #e2d9c8;
    background: #fcfaf6;
    border-radius: 8px;
    padding: 10px 12px;
    page-break-inside: avoid;
  }
  .card h4 {
    margin: 0 0 5px 0;
    font-size: 10pt;
    color: #181512;
  }
  .footer-signoff {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1.5px solid #c5a059;
    display: flex;
    justify-content: space-between;
    font-size: 8.5pt;
    color: #6b5e4c;
  }
`;

function wrapHtml(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>${SHARED_CSS}</style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}

// ============================================================================
// DOCUMENT 1: SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
// ============================================================================
const srsHtml = wrapHtml(
  "M.shaies Fragrances — Software Requirements Specification (SRS)",
  `
  <div class="cover-banner">
    <div class="cover-tag">Document 01 · IEEE 830 / ISO 29148 Standard</div>
    <h1>Software Requirements Specification (SRS)</h1>
    <p class="sub">M.shaies Haute Parfumerie — Luxury E-Commerce Platform, 3D Showcase &amp; Enterprise Admin Portal</p>
    <div class="meta-grid">
      <div class="meta-item"><span class="label">Production Domain</span><span class="val">www.mshaiesfragrances.com</span></div>
      <div class="meta-item"><span class="label">Cloud Stack</span><span class="val">Vercel SSR + Supabase + Spaceship</span></div>
      <div class="meta-item"><span class="label">Document Version</span><span class="val">v4.0 Production Release</span></div>
      <div class="meta-item"><span class="label">Status</span><span class="val">Approved &amp; Deployed Live</span></div>
    </div>
  </div>

  <h2>1. Executive Summary &amp; Project Scope</h2>
  <p>
    <strong>M.shaies Haute Parfumerie</strong> (live at <code>https://www.mshaiesfragrances.com</code>) is a full-stack luxury fragrance and horology e-commerce platform engineered for the Pakistani market. The system unifies an interactive 3D WebGL storefront, dynamic multi-photo fragrance catalog, multi-channel Pakistani payment checkout (Cash on Delivery, JazzCash, Easypaisa, NayaPay), a 15-module Staff &amp; Executive Admin Command Center, an automated SEO &amp; XML sitemap engine, and an 18-point hardened server-side security layer.
  </p>

  <div class="callout">
    <strong>Core Business Objectives:</strong>
    <ul>
      <li>Deliver an ultra-fast, luxury mobile and desktop shopping experience tailored for Pakistani customers with native PKR (<code>₨</code>) pricing.</li>
      <li>Guarantee 100% pricing accuracy between the Admin Dashboard and public storefront (eliminating unintended size-multiplier inflation).</li>
      <li>Provide complete self-service store administration (products, multi-image galleries, custom ML flacon sizes, percent/flat vouchers, orders, pixels, and backups) backed by Supabase PostgreSQL.</li>
    </ul>
  </div>

  <h2>2. User Classes &amp; Actor Profiles</h2>
  <table>
    <thead>
      <tr>
        <th>Actor / Persona</th>
        <th>Access Level</th>
        <th>Primary Responsibilities &amp; Capabilities</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Public Shopper (Customer)</strong></td>
        <td>Public (HTTPS)</td>
        <td>Browses collections (Attars, Perfumes, Watches), filters by olfactory family/longevity/gender, selects flacon sizes, applies discount vouchers, places orders via COD/JazzCash/Easypaisa/NayaPay, downloads official invoices, and submits reviews.</td>
      </tr>
      <tr>
        <td><strong>Maison Administrator</strong></td>
        <td>Protected RBAC (<code>/admin</code>)</td>
        <td>Signs in via verified Supabase Auth + server-signed HMAC-SHA256 session token (stored strictly in <code>sessionStorage</code>). Manages catalog, multi-photo galleries, flacon sizes, vouchers, orders, courier dispatch, email notifications, and marketing pixels.</td>
      </tr>
      <tr>
        <td><strong>Search Engine Crawler</strong></td>
        <td>Automated Bot</td>
        <td>Crawls <code>/robots.txt</code>, dynamic <code>/sitemap.xml</code>, binary <code>/api/product-image/:id</code> endpoints, and SSR HTML pages containing JSON-LD schemas (<code>Organization</code>, <code>WebSite</code>, <code>ItemList</code>, <code>Product</code>, <code>BreadcrumbList</code>, <code>FAQPage</code>).</td>
      </tr>
      <tr>
        <td><strong>Courier / Webhook Client</strong></td>
        <td>Signed API</td>
        <td>Dispatches order status updates to <code>POST /api/webhooks/order-status</code> authenticated via <code>HMAC-SHA256</code> signature and 5-minute timestamp replay protection.</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Functional Requirements Specification</h2>

  <h3>3.1 Storefront &amp; Product Discovery (FR-01 to FR-12)</h3>
  <table>
    <thead>
      <tr>
        <th style="width:14%">Req ID</th>
        <th style="width:28%">Feature Module</th>
        <th>Detailed Functional Requirement</th>
        <th style="width:12%">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>FR-01</code></td>
        <td>Interactive 3D Hero Showcase</td>
        <td>Render an interactive 3D perfume bottle on the homepage hero with hardware-accelerated lighting and instant WebP poster fallback (<code>/bottle-poster.webp</code>) for sub-second LCP.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
      <tr>
        <td><code>FR-02</code></td>
        <td>Category Collections</td>
        <td>Provide dedicated routes for All Products (<code>/shop</code>), Pure Attar Oils (<code>/attars</code>), Extrait Perfumes (<code>/perfumes</code>), and Horology Watches (<code>/watches</code>).</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
      <tr>
        <td><code>FR-03</code></td>
        <td>Sensory &amp; Olfactory Filtering</td>
        <td>Filter catalog items in real time by category, fragrance family accord, target gender (Men/Women/Unisex), longevity hours (16+ / 20+ hrs), occasion, in-stock status, and search query.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
      <tr>
        <td><code>FR-04</code></td>
        <td>Multi-Photo Product Stage</td>
        <td>Support up to 8 high-resolution images per product on <code>/product/$id</code> with smooth crossfade transitions, thumbnail strip selector, and mobile swipe navigation.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
      <tr>
        <td><code>FR-05</code></td>
        <td>Exact Base-Volume Pricing Engine</td>
        <td>Display the exact PKR price configured in the Admin Dashboard (<code>1.0x</code> multiplier default). Single-size products (e.g., <code>8ml</code> Cherry Blossom at <code>₨ 1,500</code>) and options matching <code>product.volume</code> always render exact <code>product.price</code>.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
      <tr>
        <td><code>FR-06</code></td>
        <td>Olfactory Notes Pyramid &amp; Specs</td>
        <td>Display Top, Heart, and Base fragrance notes alongside Longevity (hours), Sillage rating, Inspiration reference, and Batch number on every product page.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
    </tbody>
  </table>

  <h3>3.2 Cart, Voucher Engine &amp; Pakistani Checkout (FR-13 to FR-22)</h3>
  <table>
    <thead>
      <tr>
        <th style="width:14%">Req ID</th>
        <th style="width:28%">Feature Module</th>
        <th>Detailed Functional Requirement</th>
        <th style="width:12%">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>FR-13</code></td>
        <td>Slide-Over Shopping Bag</td>
        <td>Provide a persistent cart drawer with quantity controls, free-shipping progress bar (threshold <code>₨ 5,000</code>), optional royal gift wrapping (<code>+₨ 250</code>), and instant WhatsApp order shortcut.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
      <tr>
        <td><code>FR-14</code></td>
        <td>Dual-Mode Voucher Redemption</td>
        <td>Validate coupon codes supporting <strong>In Percent (%)</strong> discounts, <strong>In Number (₨)</strong> flat PKR discounts, and <strong>Free Shipping</strong> vouchers with minimum order and max-usage enforcement.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
      <tr>
        <td><code>FR-15</code></td>
        <td>Multi-Method Pakistani Checkout</td>
        <td>Support Cash on Delivery (COD), JazzCash, Easypaisa, and NayaPay payments with live account transfer instructions and Transaction ID (TID) recording.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
      <tr>
        <td><code>FR-16</code></td>
        <td>Authoritative Server Order Placement</td>
        <td>Verify product prices server-side against Supabase (blocking CWE-472 price tampering), deduct product stock, persist <code>orders</code> and <code>order_items</code>, and trigger confirmation emails.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
      <tr>
        <td><code>FR-17</code></td>
        <td>Digital &amp; Printable Invoice</td>
        <td>Generate an official luxury invoice at <code>/invoice/$orderId</code> with itemized summary, payment status badge, print/PDF stylesheet, and WhatsApp share link.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
    </tbody>
  </table>

  <h3>3.3 Admin Command Center &amp; Marketing Analytics (FR-23 to FR-35)</h3>
  <table>
    <thead>
      <tr>
        <th style="width:14%">Req ID</th>
        <th style="width:28%">Feature Module</th>
        <th>Detailed Functional Requirement</th>
        <th style="width:12%">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>FR-23</code></td>
        <td>Product &amp; Gallery Manager</td>
        <td>Add, edit, duplicate, and delete products with up to 5–8 uploaded gallery images, custom ML flacon size chips (e.g. <code>8ml</code>, <code>12ml</code>, <code>50ml</code>), and CSV bulk import/export.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
      <tr>
        <td><code>FR-24</code></td>
        <td>Percent (%) &amp; Number (₨) Voucher Studio</td>
        <td>Create, edit, toggle, and delete vouchers with explicit 1-click format cards for <strong>In Percent (%)</strong> vs <strong>In Number (₨)</strong> offers, quick presets, and live checkout calculator preview.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
      <tr>
        <td><code>FR-25</code></td>
        <td>Order &amp; Courier Dispatch Console</td>
        <td>Filter orders, update fulfillment status (Pending, Confirmed, Shipped, Delivered, Cancelled), assign courier tracking (TCS, Leopards, PostEx, M&amp;P), and send 1-click WhatsApp/Email updates.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
      <tr>
        <td><code>FR-26</code></td>
        <td>Google GMP &amp; Meta Pixel Integration</td>
        <td>Configure Google Analytics 4 (<code>G-XXXXXXXXXX</code>), Google Tag Manager (<code>GTM-XXXXXXX</code>), Google Ads Conversion ID/Label, and Meta Pixel ID from Admin Settings with automatic <code>PageView</code>, <code>ViewContent</code>, <code>AddToCart</code>, <code>InitiateCheckout</code>, and <code>Purchase</code> events.</td>
        <td><span class="badge badge-green">Live</span></td>
      </tr>
    </tbody>
  </table>

  <h2>4. Non-Functional Requirements (Performance, Security &amp; SEO)</h2>
  <ul>
    <li><strong>NFR-01 (Performance):</strong> Code-split 3D WebGL engine loaded via <code>requestIdleCallback</code>; native 60/120Hz mobile product cards; 5-minute in-memory server cache with instant tag invalidation on admin edits.</li>
    <li><strong>NFR-02 (Security):</strong> 18-point production hardening including zero auth tokens in <code>localStorage</code> (ephemeral <code>sessionStorage</code> only), server-side RBAC on all mutations, Supabase Row-Level Security (RLS), salted <code>scrypt</code> password hashing, MIME + magic-byte file upload validation, XSS sanitization, global IP rate limiting, strict CORS allowlist, and HMAC-SHA256 webhook signature verification.</li>
    <li><strong>NFR-03 (Search Engine Optimization):</strong> Server-Side Rendered (SSR) meta tags, strict single-<code>&lt;h1&gt;</code> heading hierarchy per route, <code>https://www.mshaiesfragrances.com</code> canonical alignment, dynamic <code>/sitemap.xml</code> with <code>&lt;image:image&gt;</code> tags, binary <code>/api/product-image/:id</code> crawler endpoint, and 6 Schema.org JSON-LD types.</li>
  </ul>

  <div class="footer-signoff">
    <span>M.shaies Haute Parfumerie · Software Requirements Specification (SRS)</span>
    <span>https://www.mshaiesfragrances.com · Confidential &amp; Proprietary</span>
  </div>
  `
);

// ============================================================================
// DOCUMENT 2: SYSTEM & DATABASE DESIGN DOCUMENT (SDD)
// ============================================================================
const sddHtml = wrapHtml(
  "M.shaies Fragrances — System & Database Design Document (SDD)",
  `
  <div class="cover-banner">
    <div class="cover-tag">Document 02 · Architecture, ERD &amp; Security Blueprint</div>
    <h1>System &amp; Database Design Document (SDD)</h1>
    <p class="sub">Full-Stack Cloud Architecture, PostgreSQL Entity-Relationship Design, Codebase Structure &amp; Security Model</p>
    <div class="meta-grid">
      <div class="meta-item"><span class="label">Frontend / SSR</span><span class="val">React 19 + TanStack Start + Vite 8</span></div>
      <div class="meta-item"><span class="label">Backend Runtime</span><span class="val">Nitro Server + Server Functions</span></div>
      <div class="meta-item"><span class="label">Database Engine</span><span class="val">Supabase PostgreSQL + Drizzle ORM</span></div>
      <div class="meta-item"><span class="label">Edge Network</span><span class="val">Vercel Global CDN + Spaceship DNS</span></div>
    </div>
  </div>

  <h2>1. High-Level System Architecture</h2>
  <p>
    The platform follows a modern Serverless Edge SSR architecture. DNS traffic for <code>mshaiesfragrances.com</code> is routed via Spaceship DNS to Vercel's Edge Network, where TanStack Start and Nitro execute Server-Side Rendering (SSR), security middleware, rate limiting, and authenticated RPC server functions connected to Supabase PostgreSQL.
  </p>

  <div class="diagram-box">
    <svg viewBox="0 0 820 230" width="100%" height="210" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#231d16" />
          <stop offset="100%" stop-color="#382d20" />
        </linearGradient>
      </defs>
      <!-- Client Box -->
      <rect x="15" y="45" width="165" height="135" rx="10" fill="#fcfaf6" stroke="#c5a059" stroke-width="2"/>
      <text x="97" y="72" text-anchor="middle" font-weight="bold" font-size="12" fill="#181512">Client &amp; Crawlers</text>
      <text x="97" y="95" text-anchor="middle" font-size="10" fill="#555">• Mobile &amp; Desktop UI</text>
      <text x="97" y="113" text-anchor="middle" font-size="10" fill="#555">• Three.js 3D Flacon</text>
      <text x="97" y="131" text-anchor="middle" font-size="10" fill="#555">• GA4 / GTM / Meta Pixel</text>
      <text x="97" y="149" text-anchor="middle" font-size="10" fill="#555">• Googlebot / Bingbot</text>

      <!-- Arrow 1 -->
      <line x1="180" y1="112" x2="225" y2="112" stroke="#c5a059" stroke-width="2.5"/>
      <polygon points="225,107 235,112 225,117" fill="#c5a059"/>
      <text x="207" y="102" text-anchor="middle" font-size="8.5" fill="#7c5c22" font-weight="bold">HTTPS</text>

      <!-- Spaceship + Vercel Edge -->
      <rect x="235" y="25" width="185" height="175" rx="10" fill="url(#goldGrad)" stroke="#c5a059" stroke-width="2"/>
      <text x="327" y="50" text-anchor="middle" font-weight="bold" font-size="12" fill="#e6c67c">Vercel Edge + Nitro SSR</text>
      <text x="327" y="67" text-anchor="middle" font-size="9" fill="#d8cfc2">(www.mshaiesfragrances.com)</text>
      <rect x="250" y="78" width="155" height="24" rx="5" fill="#141210" stroke="#c5a059" stroke-width="1"/>
      <text x="327" y="94" text-anchor="middle" font-size="9.5" fill="#fff">Global IP Rate Limiter &amp; CORS</text>
      <rect x="250" y="108" width="155" height="24" rx="5" fill="#141210" stroke="#c5a059" stroke-width="1"/>
      <text x="327" y="124" text-anchor="middle" font-size="9.5" fill="#fff">SSR Loader + JSON-LD SEO</text>
      <rect x="250" y="138" width="155" height="24" rx="5" fill="#141210" stroke="#c5a059" stroke-width="1"/>
      <text x="327" y="154" text-anchor="middle" font-size="9.5" fill="#fff">/sitemap.xml &amp; /api/product-image</text>
      <rect x="250" y="168" width="155" height="22" rx="5" fill="#141210" stroke="#c5a059" stroke-width="1"/>
      <text x="327" y="183" text-anchor="middle" font-size="9.5" fill="#fff">5-Min Tag Server Cache</text>

      <!-- Arrow 2 -->
      <line x1="420" y1="112" x2="465" y2="112" stroke="#c5a059" stroke-width="2.5"/>
      <polygon points="465,107 475,112 465,117" fill="#c5a059"/>
      <text x="447" y="102" text-anchor="middle" font-size="8.5" fill="#7c5c22" font-weight="bold">RPC</text>

      <!-- Server Functions Layer -->
      <rect x="475" y="35" width="155" height="155" rx="10" fill="#fcfaf6" stroke="#c5a059" stroke-width="2"/>
      <text x="552" y="58" text-anchor="middle" font-weight="bold" font-size="11.5" fill="#181512">Server Functions</text>
      <text x="552" y="78" text-anchor="middle" font-size="9.5" fill="#444">• auth.server.ts (HMAC)</text>
      <text x="552" y="95" text-anchor="middle" font-size="9.5" fill="#444">• products.server.ts</text>
      <text x="552" y="112" text-anchor="middle" font-size="9.5" fill="#444">• orders.server.ts</text>
      <text x="552" y="129" text-anchor="middle" font-size="9.5" fill="#444">• coupons.server.ts</text>
      <text x="552" y="146" text-anchor="middle" font-size="9.5" fill="#444">• settings.server.ts</text>
      <text x="552" y="163" text-anchor="middle" font-size="9.5" fill="#444">• sanitize.ts (XSS/MIME)</text>

      <!-- Arrow 3 -->
      <line x1="630" y1="112" x2="665" y2="112" stroke="#c5a059" stroke-width="2.5"/>
      <polygon points="665,107 675,112 665,117" fill="#c5a059"/>

      <!-- Supabase Box -->
      <rect x="675" y="45" width="130" height="135" rx="10" fill="#141210" stroke="#c5a059" stroke-width="2"/>
      <text x="740" y="70" text-anchor="middle" font-weight="bold" font-size="11.5" fill="#e6c67c">Supabase Cloud</text>
      <text x="740" y="92" text-anchor="middle" font-size="9.5" fill="#fff">• PostgreSQL 15+</text>
      <text x="740" y="110" text-anchor="middle" font-size="9.5" fill="#fff">• Row-Level Security</text>
      <text x="740" y="128" text-anchor="middle" font-size="9.5" fill="#fff">• Supabase Auth</text>
      <text x="740" y="146" text-anchor="middle" font-size="9.5" fill="#fff">• Audit Trail Logs</text>
    </svg>
    <div class="diagram-caption">Figure 1.1 — End-to-End Request, SSR, Security Middleware, and Supabase Persistence Topology</div>
  </div>

  <h2>2. Database Design &amp; Entity-Relationship Diagram (ERD)</h2>
  <p>
    The database schema is defined in <code>src/lib/db/schema.ts</code> (Drizzle ORM) and deployed on Supabase PostgreSQL (<code>jpabwkunidenjazbyugh.supabase.co</code>) with Row-Level Security (RLS) enforced on every table via <code>supabase/rls_policies.sql</code>.
  </p>

  <div class="diagram-box">
    <svg viewBox="0 0 820 340" width="100%" height="310" xmlns="http://www.w3.org/2000/svg">
      <!-- PRODUCTS TABLE -->
      <rect x="15" y="15" width="195" height="150" rx="8" fill="#fcfaf6" stroke="#181512" stroke-width="1.8"/>
      <rect x="15" y="15" width="195" height="26" rx="8" fill="#181512"/>
      <text x="112" y="32" text-anchor="middle" font-weight="bold" font-size="11" fill="#e6c67c">products</text>
      <text x="25" y="56" font-size="9.5" font-family="Consolas, monospace" fill="#181512">PK id (text)</text>
      <text x="25" y="72" font-size="9.5" font-family="Consolas, monospace" fill="#333">   name, price (int), stock</text>
      <text x="25" y="88" font-size="9.5" font-family="Consolas, monospace" fill="#333">   category, volume</text>
      <text x="25" y="104" font-size="9.5" font-family="Consolas, monospace" fill="#333">   image (primary photo)</text>
      <text x="25" y="120" font-size="9.5" font-family="Consolas, monospace" fill="#7c5c22" font-weight="bold">   accent (JSON: images[], sizes[])</text>
      <text x="25" y="136" font-size="9.5" font-family="Consolas, monospace" fill="#333">   notes, top/heart/base_notes</text>
      <text x="25" y="152" font-size="9.5" font-family="Consolas, monospace" fill="#333">   longevity_hours, sillage</text>

      <!-- PRODUCT_REVIEWS TABLE -->
      <rect x="15" y="195" width="195" height="130" rx="8" fill="#fcfaf6" stroke="#181512" stroke-width="1.8"/>
      <rect x="15" y="195" width="195" height="26" rx="8" fill="#181512"/>
      <text x="112" y="212" text-anchor="middle" font-weight="bold" font-size="11" fill="#e6c67c">product_reviews</text>
      <text x="25" y="236" font-size="9.5" font-family="Consolas, monospace" fill="#181512">PK id (text)</text>
      <text x="25" y="252" font-size="9.5" font-family="Consolas, monospace" fill="#7c5c22" font-weight="bold">FK product_id -&gt; products.id</text>
      <text x="25" y="268" font-size="9.5" font-family="Consolas, monospace" fill="#333">   author, city, rating (1-5)</text>
      <text x="25" y="284" font-size="9.5" font-family="Consolas, monospace" fill="#333">   title, comment, date</text>
      <text x="25" y="300" font-size="9.5" font-family="Consolas, monospace" fill="#333">   verified, helpful_count</text>

      <!-- Relation products -> product_reviews -->
      <line x1="112" y1="165" x2="112" y2="195" stroke="#c5a059" stroke-width="2"/>
      <text x="128" y="184" font-size="8.5" fill="#7c5c22" font-weight="bold">1 : N</text>

      <!-- ORDER_ITEMS TABLE -->
      <rect x="275" y="15" width="215" height="135" rx="8" fill="#fcfaf6" stroke="#181512" stroke-width="1.8"/>
      <rect x="275" y="15" width="215" height="26" rx="8" fill="#181512"/>
      <text x="382" y="32" text-anchor="middle" font-weight="bold" font-size="11" fill="#e6c67c">order_items</text>
      <text x="285" y="56" font-size="9.5" font-family="Consolas, monospace" fill="#181512">PK id (serial)</text>
      <text x="285" y="72" font-size="9.5" font-family="Consolas, monospace" fill="#7c5c22" font-weight="bold">FK order_id -&gt; orders.id</text>
      <text x="285" y="88" font-size="9.5" font-family="Consolas, monospace" fill="#7c5c22" font-weight="bold">FK product_id -&gt; products.id</text>
      <text x="285" y="104" font-size="9.5" font-family="Consolas, monospace" fill="#333">   name, price (int), qty (int)</text>
      <text x="285" y="120" font-size="9.5" font-family="Consolas, monospace" fill="#333">   volume, image</text>

      <!-- Relation products -> order_items -->
      <line x1="210" y1="80" x2="275" y2="80" stroke="#c5a059" stroke-width="2"/>
      <text x="242" y="73" text-anchor="middle" font-size="8.5" fill="#7c5c22" font-weight="bold">1 : N</text>

      <!-- ORDERS TABLE -->
      <rect x="275" y="180" width="215" height="145" rx="8" fill="#fcfaf6" stroke="#181512" stroke-width="1.8"/>
      <rect x="275" y="180" width="215" height="26" rx="8" fill="#181512"/>
      <text x="382" y="197" text-anchor="middle" font-weight="bold" font-size="11" fill="#e6c67c">orders</text>
      <text x="285" y="220" font-size="9.5" font-family="Consolas, monospace" fill="#181512">PK id (text, e.g. MSH-73629)</text>
      <text x="285" y="236" font-size="9.5" font-family="Consolas, monospace" fill="#7c5c22" font-weight="bold">FK customer_id -&gt; customers.id</text>
      <text x="285" y="252" font-size="9.5" font-family="Consolas, monospace" fill="#333">   customer_name, phone, city</text>
      <text x="285" y="268" font-size="9.5" font-family="Consolas, monospace" fill="#333">   subtotal, discount, total</text>
      <text x="285" y="284" font-size="9.5" font-family="Consolas, monospace" fill="#333">   payment_method, payment_status</text>
      <text x="285" y="300" font-size="9.5" font-family="Consolas, monospace" fill="#333">   order_status, tracking_number</text>

      <!-- Relation orders -> order_items -->
      <line x1="382" y1="150" x2="382" y2="180" stroke="#c5a059" stroke-width="2"/>
      <text x="400" y="169" font-size="8.5" fill="#7c5c22" font-weight="bold">1 : N</text>

      <!-- COUPONS TABLE -->
      <rect x="545" y="15" width="260" height="95" rx="8" fill="#fcfaf6" stroke="#181512" stroke-width="1.8"/>
      <rect x="545" y="15" width="260" height="24" rx="8" fill="#181512"/>
      <text x="675" y="31" text-anchor="middle" font-weight="bold" font-size="11" fill="#e6c67c">coupons (Vouchers)</text>
      <text x="555" y="53" font-size="9.5" font-family="Consolas, monospace" fill="#181512">PK id | UNIQUE code (text)</text>
      <text x="555" y="69" font-size="9.5" font-family="Consolas, monospace" fill="#7c5c22" font-weight="bold">   type ('percent' | 'flat' | 'shipping')</text>
      <text x="555" y="85" font-size="9.5" font-family="Consolas, monospace" fill="#333">   value, min_order, used_count, is_active</text>

      <!-- STORE_SETTINGS TABLE -->
      <rect x="545" y="122" width="260" height="95" rx="8" fill="#fcfaf6" stroke="#181512" stroke-width="1.8"/>
      <rect x="545" y="122" width="260" height="24" rx="8" fill="#181512"/>
      <text x="675" y="138" text-anchor="middle" font-weight="bold" font-size="11" fill="#e6c67c">store_settings</text>
      <text x="555" y="160" font-size="9.5" font-family="Consolas, monospace" fill="#181512">PK id ('default')</text>
      <text x="555" y="176" font-size="9.5" font-family="Consolas, monospace" fill="#333">   free_shipping_threshold, shipping_fees</text>
      <text x="555" y="192" font-size="9.5" font-family="Consolas, monospace" fill="#333">   whatsapp_number, jazzcash/easypaisa</text>

      <!-- AUDIT_LOGS TABLE -->
      <rect x="545" y="230" width="260" height="95" rx="8" fill="#fcfaf6" stroke="#181512" stroke-width="1.8"/>
      <rect x="545" y="230" width="260" height="24" rx="8" fill="#181512"/>
      <text x="675" y="246" text-anchor="middle" font-weight="bold" font-size="11" fill="#e6c67c">audit_logs &amp; system_config</text>
      <text x="555" y="268" font-size="9.5" font-family="Consolas, monospace" fill="#181512">PK id (log-* | system-config-*)</text>
      <text x="555" y="284" font-size="9.5" font-family="Consolas, monospace" fill="#333">   action, category, user, timestamp</text>
      <text x="555" y="300" font-size="9.5" font-family="Consolas, monospace" fill="#7c5c22" font-weight="bold">   details (JSON: banners, pixels, SMTP)</text>
    </svg>
    <div class="diagram-caption">Figure 2.1 — Supabase PostgreSQL Entity-Relationship Diagram (ERD)</div>
  </div>

  <h3>2.1 Detailed Database Table Schemas</h3>
  <table>
    <thead>
      <tr>
        <th style="width:18%">Table Name</th>
        <th style="width:22%">Primary / Foreign Keys</th>
        <th>Columns &amp; Data Design</th>
        <th style="width:22%">RLS Access Policy</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>products</code></td>
        <td><code>PK: id (text)</code></td>
        <td><code>name</code>, <code>price (int)</code>, <code>category</code>, <code>volume</code>, <code>stock (int)</code>, <code>tagline</code>, <code>notes</code>, <code>top_notes</code>, <code>heart_notes</code>, <code>base_notes</code>, <code>image</code> (primary), <code>accent</code> (JSON storing <code>{ images: string[], sizes: string[] }</code> for multi-photo galleries &amp; custom ML flacons), <code>description</code>, <code>is_featured</code>, <code>gender</code>, <code>longevity_hours</code>, <code>sillage_rating</code>, <code>inspired_by</code>, <code>fragrance_family</code>, <code>sample_price</code>, <code>batch_number</code>.</td>
        <td>Public <code>SELECT</code>; Service Role / Verified Admin <code>ALL</code>.</td>
      </tr>
      <tr>
        <td><code>orders</code></td>
        <td><code>PK: id (text)</code><br/><code>FK: customer_id</code></td>
        <td><code>customer_name</code>, <code>email</code>, <code>phone</code>, <code>address</code>, <code>city</code>, <code>postal_code</code>, <code>shipping_method</code>, <code>payment_method</code> (<code>cod</code>/<code>jazzcash</code>/<code>easypaisa</code>/<code>nayapay</code>), <code>payment_status</code>, <code>order_status</code>, <code>transaction_id</code>, <code>subtotal</code>, <code>shipping_fee</code>, <code>discount_code</code>, <code>discount_amount</code>, <code>total</code>, <code>is_gift_wrapped</code>, <code>gift_message</code>, <code>courier_name</code>, <code>tracking_number</code>.</td>
        <td>Service Role <code>ALL</code>; Admin JWT Role <code>SELECT</code>; Blocked for anonymous.</td>
      </tr>
      <tr>
        <td><code>order_items</code></td>
        <td><code>PK: id (serial)</code><br/><code>FK: order_id</code><br/><code>FK: product_id</code></td>
        <td><code>order_id</code> (cascade delete), <code>product_id</code> (nullable FK resolved against base product ID even when cart item ID includes size suffix like <code>-8ml</code>), <code>name</code>, <code>price</code>, <code>qty</code>, <code>volume</code>, <code>image</code>.</td>
        <td>Service Role <code>ALL</code>; Blocked for anonymous.</td>
      </tr>
      <tr>
        <td><code>coupons</code></td>
        <td><code>PK: id (text)</code><br/><code>UNIQUE: code</code></td>
        <td><code>code</code> (uppercase), <code>type</code> (<code>'percent'</code> for % offers, <code>'flat'</code> for PKR number offers, <code>'shipping'</code> for free delivery), <code>value (nonnegative int)</code>, <code>min_order</code>, <code>description</code>, <code>is_active</code>, <code>used_count</code>, <code>max_uses</code>, <code>expiry_date</code>.</td>
        <td>Validated server-side via <code>orders.server.ts</code> &amp; <code>coupons.server.ts</code>.</td>
      </tr>
      <tr>
        <td><code>product_reviews</code></td>
        <td><code>PK: id (text)</code><br/><code>FK: product_id</code></td>
        <td><code>product_id</code> (cascade), <code>author</code>, <code>city</code>, <code>rating (1..5)</code>, <code>title</code>, <code>comment</code> (XSS-sanitized), <code>date</code>, <code>verified</code>, <code>helpful_count</code>.</td>
        <td>Public <code>SELECT</code>; Rate-limited &amp; sanitized server <code>INSERT</code>.</td>
      </tr>
      <tr>
        <td><code>store_settings</code></td>
        <td><code>PK: id ('default')</code></td>
        <td><code>free_shipping_threshold (5000)</code>, <code>standard_shipping_fee (400)</code>, <code>express_shipping_fee</code>, <code>lahore_local_fee</code>, <code>cod_fee</code>, <code>whatsapp_number</code>, <code>contact_email</code>, <code>instagram_url</code>, <code>facebook_url</code>, <code>tiktok_url</code>, <code>jazzcash_number</code>, <code>easypaisa_number</code>, <code>nayapay_number</code>.</td>
        <td>Public <code>SELECT</code> (safe fields); Admin <code>UPDATE</code>.</td>
      </tr>
      <tr>
        <td><code>audit_logs</code></td>
        <td><code>PK: id (text)</code></td>
        <td>Stores administrative activity audit records (<code>log-*</code>) as well as extended JSON configuration rows (<code>system-config-banners</code> for promotional slides, flacon sizes, mobile payment titles, and Google GMP / Meta Pixel IDs; <code>system-config-email</code> for encrypted/server-only SMTP &amp; Resend dispatcher settings).</td>
        <td>Service Role <code>ALL</code>; Admin JWT Role <code>SELECT</code>.</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Codebase Module Architecture</h2>
  <table>
    <thead>
      <tr>
        <th>Directory / File Path</th>
        <th>Architectural Role</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>src/server.ts</code></td>
        <td>Custom Nitro SSR entry point: global sliding-window IP rate limiter, strict CORS origin guard, dynamic XML sitemap generator (<code>/sitemap.xml</code>), binary product image endpoint (<code>/api/product-image/:id</code>), verified webhook handler (<code>/api/webhooks/order-status</code>), and security response headers.</td>
      </tr>
      <tr>
        <td><code>src/routes/__root.tsx</code></td>
        <td>Root SSR shell: loads initial products &amp; public store settings on the server, injects global SEO metadata, <code>Organization</code> &amp; <code>WebSite</code> JSON-LD schemas, and mounts <code>PixelTracker</code>, <code>Navbar</code>, <code>CartDrawer</code>, and <code>Footer</code>.</td>
      </tr>
      <tr>
        <td><code>src/routes/product.$id.tsx</code></td>
        <td>Product Detail SSR route: server-side loader for product SEO &amp; <code>Product</code> + <code>BreadcrumbList</code> JSON-LD schemas, multi-photo gallery stage, exact base-volume flacon price calculator (<code>getFlaconOptionPrice</code>), olfactory pyramid, and customer review engine.</td>
      </tr>
      <tr>
        <td><code>src/routes/admin.tsx</code></td>
        <td>15-tab Admin Command Center: KPI dashboard, product &amp; multi-photo gallery editor, custom ML size creator, Percent (%) vs Number (₨) voucher studio, order &amp; courier dispatch manager, Google GMP &amp; Meta Pixel manager, email settings, and database backup.</td>
      </tr>
      <tr>
        <td><code>src/lib/security/sanitize.ts</code></td>
        <td>XSS HTML/script stripper (<code>sanitizeText</code>), RFC 5322 + disposable-domain email verifier (<code>verifyEmailAddress</code>), base64 magic-byte &amp; MIME image upload validator (<code>validateImageUpload</code>), and log secret redactor (<code>redactSensitiveData</code>).</td>
      </tr>
      <tr>
        <td><code>src/lib/security/session.server.ts</code></td>
        <td>HMAC-SHA256 admin session token signer &amp; constant-time verifier, salted <code>scrypt</code> password hasher/verifier, and HMAC-SHA256 webhook signature verifier with 5-minute timestamp replay window.</td>
      </tr>
    </tbody>
  </table>

  <div class="footer-signoff">
    <span>M.shaies Haute Parfumerie · System &amp; Database Design Document (SDD)</span>
    <span>https://www.mshaiesfragrances.com · Confidential &amp; Proprietary</span>
  </div>
  `
);

// ============================================================================
// DOCUMENT 3: FINAL DELIVERABLES & PROJECT COMPLETION REPORT
// ============================================================================
const deliverablesHtml = wrapHtml(
  "M.shaies Fragrances — Final Deliverables & Project Completion Report",
  `
  <div class="cover-banner">
    <div class="cover-tag">Document 03 · Executive Handover &amp; Engineering Ledger</div>
    <h1>Final Deliverables &amp; Project Completion Report</h1>
    <p class="sub">Complete Record of All Engineered Features, Database Fixes, SEO Upgrades, Security Hardening &amp; Live Verification</p>
    <div class="meta-grid">
      <div class="meta-item"><span class="label">Live Website</span><span class="val">www.mshaiesfragrances.com</span></div>
      <div class="meta-item"><span class="label">GitHub Repository</span><span class="val">mshaies-fragrances-website</span></div>
      <div class="meta-item"><span class="label">Latest Commit</span><span class="val">e4721d0 (main)</span></div>
      <div class="meta-item"><span class="label">Build &amp; QA Status</span><span class="val">0 Errors · 100% Passing</span></div>
    </div>
  </div>

  <h2>1. Master Deliverables Checklist</h2>
  <table>
    <thead>
      <tr>
        <th>Deliverable Category</th>
        <th>Artifact / Live Resource</th>
        <th>Verification Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Live Production Website</strong></td>
        <td><code>https://www.mshaiesfragrances.com</code> (with automatic <code>308</code> redirect from <code>https://mshaiesfragrances.com</code> and active SSL certificate)</td>
        <td><span class="badge badge-green">HTTP 200 OK · Live</span></td>
      </tr>
      <tr>
        <td><strong>2. GitHub Source Repository</strong></td>
        <td><code>https://github.com/mohammadshaies/mshaies-fragrances-website</code> (Branch: <code>main</code>, auto-deploying to Vercel)</td>
        <td><span class="badge badge-green">Synced &amp; Clean</span></td>
      </tr>
      <tr>
        <td><strong>3. Supabase Cloud Database</strong></td>
        <td>Project <code>jpabwkunidenjazbyugh</code> — 11 tables configured with multi-photo gallery persistence, order foreign-key mapping, and hardened RLS policies (<code>supabase/rls_policies.sql</code>)</td>
        <td><span class="badge badge-green">Verified Live</span></td>
      </tr>
      <tr>
        <td><strong>4. Dynamic SEO &amp; Crawler Engine</strong></td>
        <td>Live XML Sitemap (<code>https://www.mshaiesfragrances.com/sitemap.xml</code>), Crawler Policy (<code>/robots.txt</code>), and Binary Image Crawler Endpoint (<code>/api/product-image/:id</code>)</td>
        <td><span class="badge badge-green">HTTP 200 OK · Live</span></td>
      </tr>
      <tr>
        <td><strong>5. Technical Documentation Suite</strong></td>
        <td>5-Volume PDF Handover Package: (1) SRS Document, (2) System &amp; Database Design Document, (3) Final Deliverables Report, (4) Domain/Vercel/Supabase Deployment Guide, (5) Admin Operations Manual</td>
        <td><span class="badge badge-green">Delivered in /documents</span></td>
      </tr>
    </tbody>
  </table>

  <h2>2. Complete Engineering Ledger — Everything Done on This Website</h2>

  <h3>2.1 Database &amp; Multi-Image Product Gallery Persistence Fix</h3>
  <ul>
    <li><strong>Issue Resolved:</strong> Adding multiple gallery images to an existing product in the Admin Dashboard previously only saved the primary image because the Supabase <code>products</code> table did not have a separate <code>images</code> column.</li>
    <li><strong>Engineering Solution (<code>src/lib/api/products.server.ts</code>):</strong> Engineered <code>productToSupabaseRow()</code> and <code>parseAccentMetadata()</code> to serialize the full <code>images: string[]</code> array alongside <code>sizes: string[]</code> inside the <code>products.accent</code> JSON column, and ensured the Edit Product modal in <code>src/routes/admin.tsx</code> deep-clones all gallery images when opened.</li>
    <li><strong>Order Items &amp; Mobile Payment Persistence (<code>src/lib/api/orders.server.ts</code>, <code>settings.server.ts</code>):</strong> Fixed <code>order_items.product_id</code> foreign key resolution when cart item IDs include volume suffixes (e.g. <code>cherry-blossom-pure-attar-5421-8ml</code>), and persisted JazzCash/Easypaisa/NayaPay account titles and instructions.</li>
  </ul>

  <h3>2.2 Exact Product Pricing Engine Fix (Resolved ₨ 1,500 Showing as ₨ 2,850)</h3>
  <ul>
    <li><strong>Issue Resolved:</strong> Products like <strong>Cherry Blossom Pure Attar</strong> configured at <strong>₨ 1,500</strong> (<code>8ml Pure Attar</code>, <code>availableSizes: ["8ml"]</code>) were displaying <strong>₨ 2,850</strong> on the public product page because <code>getCustomSizeDetails()</code> automatically assigned a <code>1.9x</code> multiplier (<code>1500 × 1.9 = 2850</code>) to any flacon between 7ml and 12ml.</li>
    <li><strong>Engineering Solution (<code>src/lib/products-store.tsx</code>, <code>src/routes/product.$id.tsx</code>):</strong>
      <ul>
        <li>Changed <code>getCustomSizeDetails()</code> and <code>DEFAULT_FLACON_SIZES</code> to default to a <strong><code>1.0x</code> multiplier</strong> so products always display the exact price entered in the Admin Dashboard.</li>
        <li>Added <code>getFlaconOptionPrice()</code> on <code>/product/$id</code> so single-size products and size options matching the product's configured base <code>volume</code> always render exact <code>product.price</code> (<strong>₨ 1,500</strong>).</li>
        <li>Bumped the client settings cache key (<code>mshaies_settings_v7</code>) to automatically purge any browser-cached <code>1.9x</code> multipliers.</li>
      </ul>
    </li>
  </ul>

  <h3>2.3 Dual-Format Admin Voucher System: In Percent (%) vs. In Number (₨)</h3>
  <ul>
    <li><strong>Engineering Solution (<code>src/routes/admin.tsx</code>, <code>src/lib/api/coupons.server.ts</code>):</strong> Upgraded the Voucher Studio in the Admin Dashboard with explicit visual format selector cards for <strong>In Percent (%)</strong> (with <code>5%</code>, <code>10%</code>, <code>15%</code>, <code>20%</code>, <code>25%</code>, <code>30%</code>, <code>50%</code> quick presets and 1–100% validation), <strong>In Number (₨)</strong> (with <code>₨ 250</code>, <code>₨ 500</code>, <code>₨ 1,000</code>, <code>₨ 1,500</code>, <code>₨ 2,000</code>, <code>₨ 3,000</code>, <code>₨ 5,000</code> quick presets), and <strong>Free Shipping</strong>, complete with a live checkout discount preview and a full <strong>Edit Voucher Modal</strong>.</li>
  </ul>

  <h3>2.4 Turnkey Google GMP (GA4, GTM, Google Ads) &amp; Meta Pixel Tracking</h3>
  <ul>
    <li><strong>Engineering Solution (<code>src/lib/pixel-tracking.ts</code>, <code>src/components/PixelTracker.tsx</code>, <code>src/routes/admin.tsx</code>):</strong> Built a full client + admin tracking system supporting Google Analytics 4 (GA4), Google Tag Manager (GTM), Google Ads Conversion Tracking, and Meta (Facebook/Instagram) Pixel. Automatically fires deduplicated <code>PageView</code>, <code>ViewContent</code> / <code>view_item</code>, <code>AddToCart</code> / <code>add_to_cart</code>, <code>InitiateCheckout</code> / <code>begin_checkout</code>, and <code>Purchase</code> / <code>purchase</code> events with PKR values.</li>
  </ul>

  <h3>2.5 Admin Stability, Speed Optimization &amp; Zero TypeScript Errors</h3>
  <ul>
    <li>Resolved all runtime <code>ReferenceError</code> crashes (missing <code>useRef</code> import in <code>admin.tsx</code> and missing <code>useProductsStore</code> import in catalog routes) and fixed all 80 TypeScript compiler errors (<code>bun x tsc --noEmit</code> passes with <strong>0 errors</strong>).</li>
    <li>Removed 4 MB of blocking global 3D asset preloads from <code>__root.tsx</code> and enabled intent-based route preloading in <code>src/router.tsx</code> for instant page transitions.</li>
  </ul>

  <h3>2.6 Complete 11-Pillar Technical SEO, Dynamic Sitemap &amp; Custom Domain Alignment</h3>
  <ul>
    <li>Aligned all canonical tags, OpenGraph URLs, <code>robots.txt</code>, and JSON-LD schemas with your live primary domain <strong><code>https://www.mshaiesfragrances.com</code></strong> (matching Vercel's <code>308</code> redirect target).</li>
    <li>Built a live dynamic XML sitemap at <code>/sitemap.xml</code> and binary image crawler endpoint at <code>/api/product-image/:id</code> in <code>src/server.ts</code>.</li>
    <li>Enforced a strict single-<code>&lt;h1&gt;</code> heading hierarchy across all 11 public routes, added rich <code>alt</code> and <code>title</code> attributes on all images/links, added visible semantic breadcrumbs, and deployed 6 Schema.org JSON-LD types (<code>Organization</code>, <code>OnlineStore</code>, <code>WebSite</code>, <code>ItemList</code>, <code>Product</code> with <code>shippingDetails</code> &amp; <code>hasMerchantReturnPolicy</code>, and <code>FAQPage</code>).</li>
  </ul>

  <h3>2.7 18-Point Production Security Hardening</h3>
  <ul>
    <li>Eliminated auth token storage in <code>localStorage</code> (isolated to ephemeral <code>sessionStorage</code>), added CWE-472 server-side order price verification, RFC 5322 + disposable-domain email verification, salted <code>scrypt</code> password hashing, base64 magic-byte &amp; MIME image upload validation (blocking SVG XSS), server-side XSS text sanitization, global sliding-window IP rate limiting, strict CORS origin enforcement, HMAC-SHA256 webhook signature verification, sensitive log redaction, and hardened Supabase RLS policies.</li>
  </ul>

  <h2>3. Live Catalog &amp; Production Route Verification Matrix</h2>
  <table>
    <thead>
      <tr>
        <th>Live Product / Route</th>
        <th>Volume &amp; Photos</th>
        <th>Database Price</th>
        <th>Live Website Price &amp; HTTP Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>/product/ceo-pure-attar-2436</code><br/><strong>CEO Pure Attar</strong></td>
        <td><code>8ml Pure Attar</code> · 3 Photos</td>
        <td><code>₨ 2,000</code></td>
        <td><span class="badge badge-green">200 OK · ₨ 2,000</span></td>
      </tr>
      <tr>
        <td><code>/product/cherry-blossom-pure-attar-5421</code><br/><strong>Cherry Blossom Pure Attar</strong></td>
        <td><code>8ml Pure Attar</code> · 3 Photos</td>
        <td><code>₨ 1,500</code></td>
        <td><span class="badge badge-green">200 OK · ₨ 1,500</span></td>
      </tr>
      <tr>
        <td><code>/product/lady-million-pure-attar-7926</code><br/><strong>Lady Million Pure Attar</strong></td>
        <td><code>8ml Pure Attar</code> · 3 Photos</td>
        <td><code>₨ 1,500</code></td>
        <td><span class="badge badge-green">200 OK · ₨ 1,500</span></td>
      </tr>
      <tr>
        <td><code>/product/millionaire-attar-...-5210</code><br/><strong>Millionaire Attar (1 Million Inspired)</strong></td>
        <td><code>8ml Pure Attar</code> · 3 Photos</td>
        <td><code>₨ 1,499</code></td>
        <td><span class="badge badge-green">200 OK · ₨ 1,499</span></td>
      </tr>
    </tbody>
  </table>

  <div class="footer-signoff">
    <span>M.shaies Haute Parfumerie · Final Deliverables &amp; Completion Report</span>
    <span>https://www.mshaiesfragrances.com · Confidential &amp; Proprietary</span>
  </div>
  `
);

// ============================================================================
// DOCUMENT 4: DOMAIN (SPACESHIP), VERCEL & SUPABASE DEPLOYMENT GUIDE
// ============================================================================
const deploymentHtml = wrapHtml(
  "M.shaies Fragrances — Domain, Vercel & Supabase Deployment Guide",
  `
  <div class="cover-banner">
    <div class="cover-tag">Document 04 · Cloud Infrastructure &amp; DevOps Runbook</div>
    <h1>Domain (Spaceship), Vercel &amp; Supabase Architecture Guide</h1>
    <p class="sub">Complete Configuration Reference for Your Custom Domain, DNS Records, Vercel CI/CD Pipeline &amp; Supabase Cloud</p>
    <div class="meta-grid">
      <div class="meta-item"><span class="label">Domain Registrar</span><span class="val">Spaceship.com</span></div>
      <div class="meta-item"><span class="label">Primary Domain</span><span class="val">www.mshaiesfragrances.com</span></div>
      <div class="meta-item"><span class="val">Vercel Hosting</span><span class="label">Production Auto-Deploy</span></div>
      <div class="meta-item"><span class="label">Database Project</span><span class="val">jpabwkunidenjazbyugh</span></div>
    </div>
  </div>

  <h2>1. Custom Domain &amp; Spaceship.com DNS Configuration</h2>
  <p>
    Your domain <strong><code>mshaiesfragrances.com</code></strong> is registered with <strong>Spaceship.com</strong> (auto-renew enabled, private WHOIS protection active) and connected directly to your Vercel production deployment via Custom DNS Records.
  </p>

  <table>
    <thead>
      <tr>
        <th>Record Type</th>
        <th>Host / Name</th>
        <th>Value / Target</th>
        <th>TTL</th>
        <th>Purpose</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong><code>A</code></strong></td>
        <td><code>@</code></td>
        <td><code>216.198.79.1</code></td>
        <td>30 min</td>
        <td>Points root/apex domain (<code>mshaiesfragrances.com</code>) to Vercel Anycast Edge IP.</td>
      </tr>
      <tr>
        <td><strong><code>CNAME</code></strong></td>
        <td><code>www</code></td>
        <td><code>2ae791840c563ac2.vercel-dns-017.com</code></td>
        <td>30 min</td>
        <td>Points <code>www.mshaiesfragrances.com</code> to your dedicated Vercel project alias.</td>
      </tr>
    </tbody>
  </table>

  <div class="callout">
    <strong>Canonical Routing &amp; SSL Certificate Behavior:</strong>
    <ul>
      <li><strong>Apex-to-WWW Permanent Redirect (HTTP 308):</strong> Vercel automatically redirects requests from <code>https://mshaiesfragrances.com</code> to <code>https://www.mshaiesfragrances.com</code> (<code>308 Permanent Redirect</code>).</li>
      <li><strong>SEO Canonical Consistency:</strong> All <code>&lt;link rel="canonical"&gt;</code> tags, <code>robots.txt</code>, <code>/sitemap.xml</code>, and Schema.org JSON-LD URLs use <code>https://www.mshaiesfragrances.com</code> so search engines never encounter redirect loops.</li>
      <li><strong>SSL/TLS:</strong> Managed and auto-renewed by Vercel Let's Encrypt Authority with <code>Strict-Transport-Security: max-age=63072000; includeSubDomains; preload</code>.</li>
    </ul>
  </div>

  <h2>2. Vercel Hosting &amp; GitHub CI/CD Pipeline</h2>
  <ul>
    <li><strong>Connected Git Repository:</strong> <code>https://github.com/mohammadshaies/mshaies-fragrances-website.git</code></li>
    <li><strong>Production Branch:</strong> <code>main</code> (Every <code>git push origin main</code> triggers an automatic production build and zero-downtime deployment on Vercel).</li>
    <li><strong>Build Command:</strong> <code>cross-env NODE_OPTIONS=--max-old-space-size=4096 vite build</code></li>
    <li><strong>Server Preset:</strong> Nitro automatically detects <code>process.env.VERCEL</code> in <code>vite.config.ts</code> and outputs a Vercel Serverless / Edge-ready bundle in <code>.output/</code>.</li>
  </ul>

  <h3>2.1 Server Environment Variables (Vercel Project Settings)</h3>
  <table>
    <thead>
      <tr>
        <th>Variable Name</th>
        <th>Scope</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>VITE_SUPABASE_URL</code></td>
        <td>Server &amp; Client</td>
        <td><code>https://jpabwkunidenjazbyugh.supabase.co</code></td>
      </tr>
      <tr>
        <td><code>VITE_SUPABASE_ANON_KEY</code></td>
        <td>Server &amp; Client</td>
        <td>Public publishable Supabase anonymous key (governed by Row-Level Security).</td>
      </tr>
      <tr>
        <td><code>SUPABASE_SERVICE_ROLE_KEY</code></td>
        <td><strong>Server Only</strong></td>
        <td>Secret service-role key used exclusively inside <code>.server.ts</code> functions for verified admin mutations and order processing. Never exposed to the browser.</td>
      </tr>
      <tr>
        <td><code>SESSION_SECRET</code></td>
        <td><strong>Server Only</strong></td>
        <td>High-entropy secret used by <code>src/lib/security/session.server.ts</code> to sign and verify <code>msh.&lt;payload&gt;.&lt;signature&gt;</code> admin tokens.</td>
      </tr>
      <tr>
        <td><code>WEBHOOK_SECRET</code></td>
        <td><strong>Server Only</strong></td>
        <td>Secret key used to verify <code>X-Webhook-Signature</code> HMAC-SHA256 headers on <code>POST /api/webhooks/order-status</code>.</td>
      </tr>
      <tr>
        <td><code>GEMINI_API_KEY</code></td>
        <td><strong>Server Only</strong></td>
        <td>Optional Google Gemini API key for the AI Scent Sommelier advisor (<code>src/lib/api/advisor.server.ts</code>).</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Supabase Database &amp; Row-Level Security Maintenance</h2>
  <ol>
    <li>Log in to <a href="https://supabase.com/dashboard">https://supabase.com/dashboard</a> and select project <code>jpabwkunidenjazbyugh</code>.</li>
    <li>To apply or refresh Row-Level Security policies at any time, open <strong>SQL Editor</strong>, paste the contents of <code>supabase/rls_policies.sql</code>, and click <strong>Run</strong>. The script is 100% idempotent.</li>
    <li>Under <strong>Authentication → URL Configuration</strong>, ensure <strong>Site URL</strong> is set to <code>https://www.mshaiesfragrances.com</code> and <strong>Redirect URLs</strong> includes <code>https://www.mshaiesfragrances.com/**</code>.</li>
  </ol>

  <h2>4. Google Search Console &amp; Sitemap Submission</h2>
  <ol>
    <li>Open <a href="https://search.google.com/search-console">Google Search Console</a> and add the URL-Prefix property <code>https://www.mshaiesfragrances.com</code>.</li>
    <li>In the left sidebar, click <strong>Sitemaps</strong> and submit <code>sitemap.xml</code> (full URL: <code>https://www.mshaiesfragrances.com/sitemap.xml</code>).</li>
    <li>Whenever you add or update a fragrance in the Admin Dashboard, <code>/sitemap.xml</code> and <code>/api/product-image/:id</code> update automatically—no code edits or manual sitemap uploads are ever required.</li>
  </ol>

  <div class="footer-signoff">
    <span>M.shaies Haute Parfumerie · Domain, Vercel &amp; Supabase Deployment Guide</span>
    <span>https://www.mshaiesfragrances.com · Confidential &amp; Proprietary</span>
  </div>
  `
);

// ============================================================================
// DOCUMENT 5: ADMIN OPERATIONS & STORE MAINTENANCE MANUAL
// ============================================================================
const manualHtml = wrapHtml(
  "M.shaies Fragrances — Admin Operations & Store Maintenance Manual",
  `
  <div class="cover-banner">
    <div class="cover-tag">Document 05 · Store Owner &amp; Staff Playbook</div>
    <h1>Admin Operations &amp; Store Maintenance Manual</h1>
    <p class="sub">Step-by-Step Guide for Managing Products, Multi-Photo Galleries, Vouchers, Orders, Pixels &amp; Backups</p>
    <div class="meta-grid">
      <div class="meta-item"><span class="label">Admin Portal URL</span><span class="val">/admin</span></div>
      <div class="meta-item"><span class="label">Auth Mechanism</span><span class="val">Supabase Auth + HMAC Token</span></div>
      <div class="meta-item"><span class="label">Session Storage</span><span class="val">Tab-Isolated sessionStorage</span></div>
      <div class="meta-item"><span class="label">Currency Format</span><span class="val">Pakistani Rupee (₨ / PKR)</span></div>
    </div>
  </div>

  <h2>1. Accessing &amp; Signing Into the Admin Portal</h2>
  <ol>
    <li>Navigate to <code>https://www.mshaiesfragrances.com/admin</code>.</li>
    <li>Enter your verified Supabase Administrator Email and Password.</li>
    <li>Upon verification, the server issues a cryptographically signed HMAC-SHA256 session token stored strictly in your current browser tab's <code>sessionStorage</code> (never in <code>localStorage</code>). Closing the browser tab or clicking <strong>Lock Console</strong> immediately terminates the session.</li>
  </ol>

  <h2>2. Adding &amp; Editing Fragrances (Exact Pricing &amp; Multi-Photo Galleries)</h2>
  <div class="two-col">
    <div class="card">
      <h4>A. Setting Exact Product Prices</h4>
      <p>Enter your desired price in PKR (e.g., <code>1500</code>) and Volume description (e.g., <code>8ml Pure Attar</code>). The storefront displays the exact <strong>₨ 1,500</strong> price you enter without any automatic multiplier inflation.</p>
    </div>
    <div class="card">
      <h4>B. Uploading Multiple Gallery Photos</h4>
      <p>In the Add or Edit Fragrance modal, upload or paste up to <strong>5–8 product photos</strong>. All photos are validated for security, saved in Supabase, and rendered in the interactive product gallery.</p>
    </div>
  </div>
  <ul>
    <li><strong>Custom ML Flacon Sizes:</strong> Use the <em>"Write Custom ML / Add Size"</em> box in the Add/Edit modal to add custom sizes such as <code>8ml</code>, <code>10ml</code>, <code>12ml</code>, <code>30ml</code>, <code>50ml</code>, or <code>100ml</code>, or click <em>"None (Single Size)"</em> for single-flacon products.</li>
  </ul>

  <h2>3. Managing Vouchers: In Percent (%) vs. In Number (₨)</h2>
  <ol>
    <li>Open <strong>Admin Portal → Vouchers / Coupons</strong>.</li>
    <li>Choose how you want to give the offer using the visual format cards:
      <ul>
        <li><strong>In Percent (%):</strong> Deducts a percentage (e.g., <code>10%</code>, <code>15%</code>, <code>20%</code>) from the customer's cart subtotal.</li>
        <li><strong>In Number (₨):</strong> Deducts a fixed rupee amount (e.g., <code>₨ 300</code>, <code>₨ 500</code>, <code>₨ 1,000</code>) from the subtotal.</li>
        <li><strong>Free Shipping:</strong> Waives delivery charges regardless of order subtotal.</li>
      </ul>
    </li>
    <li>Check the <strong>Live Discount Preview</strong> box at the bottom of the form, then click <strong>Create Voucher</strong> (or click the Edit icon on any existing voucher to adjust its format or value at any time).</li>
  </ol>

  <h2>4. Processing Orders &amp; Courier Dispatch</h2>
  <ol>
    <li>Open <strong>Admin Portal → Orders</strong> to view all incoming orders.</li>
    <li>For <strong>JazzCash / Easypaisa / NayaPay</strong> orders, verify the customer's submitted <strong>Transaction ID (TID)</strong> and toggle Payment Status to <strong>Paid</strong>.</li>
    <li>Click <strong>Dispatch / Courier</strong> on an order, select the courier (TCS Express, Leopards, PostEx, M&amp;P, Call Courier), enter the tracking number, and click <strong>Send WhatsApp Update</strong> or <strong>Resend Invoice Email</strong> to notify the customer with a direct link to <code>https://www.mshaiesfragrances.com/invoice/MSH-XXXXX</code>.</li>
  </ol>

  <h2>5. Google GMP (GA4 / GTM / Google Ads) &amp; Meta Pixel Setup</h2>
  <ol>
    <li>Open <strong>Admin Portal → Settings → Marketing Pixels (Google GMP &amp; Meta Pixel)</strong>.</li>
    <li>Paste your <strong>GA4 Measurement ID</strong> (<code>G-XXXXXXXXXX</code>), <strong>GTM Container ID</strong> (<code>GTM-XXXXXXX</code>), <strong>Google Ads Conversion ID &amp; Label</strong>, and/or <strong>Meta Pixel ID</strong>.</li>
    <li>Toggle <strong>Enable All Marketing &amp; Conversion Pixels</strong> ON and click <strong>Save All Store Settings</strong>. All e-commerce events (<code>PageView</code>, <code>ViewContent</code>, <code>AddToCart</code>, <code>InitiateCheckout</code>, <code>Purchase</code>) begin firing immediately.</li>
  </ol>

  <h2>6. Cache Purging &amp; Full Database Backups</h2>
  <ul>
    <li><strong>Instant Cache Purge:</strong> Product, coupon, and settings updates automatically invalidate the server cache. You can also click <strong>Purge Cache</strong> in the Admin header at any time to force an immediate resync across all connected devices.</li>
    <li><strong>Database Backup Export:</strong> Open <strong>Admin Portal → Settings → Backup &amp; Restore</strong> and click <strong>Export Full JSON Backup</strong> to download a complete snapshot of all products, orders, coupons, settings, and audit logs.</li>
  </ul>

  <div class="footer-signoff">
    <span>M.shaies Haute Parfumerie · Admin Operations &amp; Maintenance Manual</span>
    <span>https://www.mshaiesfragrances.com · Confidential &amp; Proprietary</span>
  </div>
  `
);

const DOCUMENTS = [
  {
    baseName: "01_SRS_Software_Requirements_Specification",
    html: srsHtml,
  },
  {
    baseName: "02_SDD_System_and_Database_Design_Document",
    html: sddHtml,
  },
  {
    baseName: "03_Final_Deliverables_and_Project_Completion_Report",
    html: deliverablesHtml,
  },
  {
    baseName: "04_Domain_DNS_Vercel_and_Supabase_Deployment_Guide",
    html: deploymentHtml,
  },
  {
    baseName: "05_Admin_Operations_and_Maintenance_Manual",
    html: manualHtml,
  },
];

const TARGET_DIRS = [
  "C:\\Users\\moham\\OneDrive\\Documents\\mshaies_fra\\documents",
  "C:\\Users\\moham\\OneDrive\\Documents\\mshaiesfragrances",
  "c:\\Users\\moham\\Downloads\\mshaies fra\\documents",
];

async function main() {
  const browserExe = findBrowserExecutable();
  console.log("Using browser executable for PDF rendering:", browserExe);

  for (const dir of TARGET_DIRS) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const primaryDir = TARGET_DIRS[0];
  const tempHtmlDir = path.join(primaryDir, ".html_src");
  fs.mkdirSync(tempHtmlDir, { recursive: true });

  for (const doc of DOCUMENTS) {
    const htmlPath = path.join(tempHtmlDir, `${doc.baseName}.html`);
    const primaryPdfPath = path.join(primaryDir, `${doc.baseName}.pdf`);
    fs.writeFileSync(htmlPath, doc.html, "utf8");

    const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
    const result = spawnSync(
      browserExe,
      [
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--no-pdf-header-footer",
        `--print-to-pdf=${primaryPdfPath}`,
        fileUrl,
      ],
      { encoding: "utf8" }
    );

    if (!fs.existsSync(primaryPdfPath)) {
      throw new Error(`Failed to generate PDF ${primaryPdfPath}: ${result.stderr || result.stdout}`);
    }

    const sizeKb = Math.round(fs.statSync(primaryPdfPath).size / 1024);
    console.log(`Generated ${doc.baseName}.pdf (${sizeKb} KB)`);

    // Copy to the other target document directories
    for (let i = 1; i < TARGET_DIRS.length; i++) {
      const destPdf = path.join(TARGET_DIRS[i], `${doc.baseName}.pdf`);
      fs.copyFileSync(primaryPdfPath, destPdf);
    }
  }

  // Clean up temporary HTML source directory
  fs.rmSync(tempHtmlDir, { recursive: true, force: true });
  console.log("\nAll 5 PDF documents successfully generated and saved across all target directories!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
