// scripts/seed.ts — Full TargetGlobal seed: 50 vendors, 60 products, 4 merchants
import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

const saPath = path.join(process.cwd(), "serviceAccountKey.json");
if (!fs.existsSync(saPath)) {
  console.error("❌ serviceAccountKey.json not found in project root.");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(saPath)),
  });
}

const db   = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const auth = admin.auth();

// ── Helpers ──────────────────────────────────────────────────
const ts = admin.firestore.FieldValue.serverTimestamp();
const now = new Date();

async function createUser(email: string, password: string, role: string, name: string) {
  let uid: string;
  try {
    const u = await auth.getUserByEmail(email);
    uid = u.uid;
    console.log(`  ♻  ${email} (existing)`);
  } catch {
    const u = await auth.createUser({ email, password, displayName: name });
    uid = u.uid;
    console.log(`  ✅ ${email}`);
  }
  await db.collection("users").doc(uid).set({
    uid, email, displayName: name, role,
    kycVerified: role === "merchant", createdAt: ts, lastLogin: ts,
  }, { merge: true });
  return uid;
}

// ── VENDORS (50) ─────────────────────────────────────────────
const VENDORS = [
  // Electronics
  { name:"Samsung Electronics",  country:"South Korea", specialty:"Consumer Electronics",    contact:"supply@samsung-trade.com",   website:"samsung.com",   status:"active", rating:4.9 },
  { name:"Anker Innovations",    country:"China",       specialty:"Charging & Accessories",   contact:"b2b@anker.com",              website:"anker.com",     status:"active", rating:4.8 },
  { name:"Xiaomi Global",        country:"China",       specialty:"Smart Devices & Gadgets",  contact:"wholesale@xiaomi.com",       website:"xiaomi.com",    status:"active", rating:4.7 },
  { name:"Belkin International", country:"USA",         specialty:"Tech Accessories",          contact:"trade@belkin.com",           website:"belkin.com",    status:"active", rating:4.6 },
  { name:"JBL Professional",     country:"USA",         specialty:"Audio Equipment",           contact:"jbl@harman.com",             website:"jbl.com",       status:"active", rating:4.8 },
  { name:"Logitech APAC",        country:"Switzerland", specialty:"Computer Peripherals",      contact:"supply@logitech.com",        website:"logitech.com",  status:"active", rating:4.7 },
  { name:"Baseus Tech",          country:"China",       specialty:"Mobile Accessories",        contact:"orders@baseus.com",          website:"baseus.com",    status:"active", rating:4.6 },
  { name:"Sony Trade Asia",      country:"Japan",       specialty:"Electronics & Audio",       contact:"trade@sony.com",             website:"sony.com",      status:"active", rating:4.9 },

  // Men's Clothing
  { name:"H&M Wholesale",        country:"Sweden",      specialty:"Men's Fast Fashion",        contact:"wholesale@hm.com",           website:"hm.com",        status:"active", rating:4.5 },
  { name:"Zara Trade Hub",       country:"Spain",       specialty:"Men's Contemporary Fashion",contact:"trade@zara.com",             website:"zara.com",      status:"active", rating:4.6 },
  { name:"Levi's Distribution",  country:"USA",         specialty:"Denim & Casual Wear",       contact:"dist@levis.com",             website:"levi.com",      status:"active", rating:4.7 },
  { name:"Tommy Hilfiger B2B",   country:"USA",         specialty:"Premium Men's Clothing",    contact:"b2b@tommy.com",              website:"tommy.com",     status:"active", rating:4.8 },
  { name:"Uniqlo Wholesale",     country:"Japan",       specialty:"Essential Men's Basics",    contact:"supply@uniqlo.com",          website:"uniqlo.com",    status:"active", rating:4.7 },
  { name:"Calvin Klein Trade",   country:"USA",         specialty:"Premium Menswear",          contact:"trade@ck.com",               website:"calvinklein.com",status:"active",rating:4.8 },
  { name:"Next Clothing UK",     country:"UK",          specialty:"Men's Casual & Smart",      contact:"wholesale@next.co.uk",       website:"next.co.uk",    status:"active", rating:4.5 },

  // Women's Clothing
  { name:"Shein Global Supply",  country:"China",       specialty:"Women's Fast Fashion",      contact:"b2b@shein.com",              website:"shein.com",     status:"active", rating:4.4 },
  { name:"Zara Women Division",  country:"Spain",       specialty:"Women's Contemporary",      contact:"women@zara.com",             website:"zara.com",      status:"active", rating:4.6 },
  { name:"ASOS Wholesale",       country:"UK",          specialty:"Women's Trendy Fashion",    contact:"wholesale@asos.com",         website:"asos.com",      status:"active", rating:4.5 },
  { name:"Forever 21 Supply",    country:"USA",         specialty:"Women's Budget Fashion",    contact:"supply@forever21.com",       website:"forever21.com", status:"active", rating:4.3 },
  { name:"Mango Fashion B2B",    country:"Spain",       specialty:"Women's Premium Fashion",   contact:"b2b@mango.com",              website:"mango.com",     status:"active", rating:4.6 },

  // Men's Shoes
  { name:"Nike Trade EMEA",      country:"USA",         specialty:"Athletic & Lifestyle Shoes",contact:"trade@nike.com",             website:"nike.com",      status:"active", rating:4.9 },
  { name:"Adidas Wholesale",     country:"Germany",     specialty:"Sports & Casual Shoes",     contact:"wholesale@adidas.com",       website:"adidas.com",    status:"active", rating:4.8 },
  { name:"New Balance B2B",      country:"USA",         specialty:"Running & Lifestyle Shoes", contact:"b2b@newbalance.com",         website:"newbalance.com",status:"active", rating:4.7 },
  { name:"Puma Trade Hub",       country:"Germany",     specialty:"Sports Footwear",           contact:"trade@puma.com",             website:"puma.com",      status:"active", rating:4.6 },
  { name:"Clarks International", country:"UK",          specialty:"Men's Formal & Casual",     contact:"intl@clarks.com",            website:"clarks.com",    status:"active", rating:4.7 },

  // Women's Shoes
  { name:"Steve Madden Trade",   country:"USA",         specialty:"Women's Fashion Shoes",     contact:"trade@stevemadden.com",      website:"stevemadden.com",status:"active",rating:4.6 },
  { name:"Aldo Wholesale",       country:"Canada",      specialty:"Women's Contemporary Shoes",contact:"wholesale@aldo.com",         website:"aldoshoes.com", status:"active", rating:4.5 },
  { name:"Nine West B2B",        country:"USA",         specialty:"Women's Dress & Casual",    contact:"b2b@ninewest.com",           website:"ninewest.com",  status:"active", rating:4.5 },
  { name:"Skechers Trade",       country:"USA",         specialty:"Comfort & Athletic Women's",contact:"trade@skechers.com",         website:"skechers.com",  status:"active", rating:4.6 },
  { name:"Charles & Keith B2B",  country:"Singapore",   specialty:"Women's Fashion Footwear",  contact:"b2b@charleskeith.com",       website:"charleskeith.com",status:"active",rating:4.7},

  // Men's Bags
  { name:"Samsonite Trade",      country:"Luxembourg",  specialty:"Men's Luggage & Bags",      contact:"trade@samsonite.com",        website:"samsonite.com", status:"active", rating:4.8 },
  { name:"Tumi Wholesale",       country:"USA",         specialty:"Premium Men's Bags",        contact:"wholesale@tumi.com",         website:"tumi.com",      status:"active", rating:4.9 },
  { name:"Herschel Supply B2B",  country:"Canada",      specialty:"Men's Backpacks & Bags",    contact:"b2b@herschel.com",           website:"herschel.com",  status:"active", rating:4.7 },
  { name:"Eastpak Trade",        country:"Belgium",     specialty:"Urban Bags & Backpacks",    contact:"trade@eastpak.com",          website:"eastpak.com",   status:"active", rating:4.6 },
  { name:"Fossil Group Trade",   country:"USA",         specialty:"Men's Leather Goods",       contact:"trade@fossil.com",           website:"fossil.com",    status:"active", rating:4.7 },

  // Women's Bags
  { name:"Coach Wholesale",      country:"USA",         specialty:"Women's Luxury Bags",       contact:"wholesale@coach.com",        website:"coach.com",     status:"active", rating:4.8 },
  { name:"Kate Spade Trade",     country:"USA",         specialty:"Women's Fashion Bags",      contact:"trade@katespade.com",        website:"katespade.com", status:"active", rating:4.7 },
  { name:"Michael Kors B2B",     country:"USA",         specialty:"Premium Women's Bags",      contact:"b2b@michaelkors.com",        website:"michaelkors.com",status:"active",rating:4.8 },
  { name:"Guess Accessories",    country:"USA",         specialty:"Women's Trendy Bags",       contact:"accessories@guess.com",      website:"guess.com",     status:"active", rating:4.5 },
  { name:"Aldo Bags Division",   country:"Canada",      specialty:"Women's Affordable Bags",   contact:"bags@aldo.com",              website:"aldoshoes.com", status:"active", rating:4.5 },

  // Fitness
  { name:"Under Armour Trade",   country:"USA",         specialty:"Athletic Wear & Gear",      contact:"trade@underarmour.com",      website:"underarmour.com",status:"active",rating:4.7 },
  { name:"Gymshark Wholesale",   country:"UK",          specialty:"Fitness Apparel",           contact:"wholesale@gymshark.com",     website:"gymshark.com",  status:"active", rating:4.8 },
  { name:"Decathlon B2B",        country:"France",      specialty:"Sports Equipment",           contact:"b2b@decathlon.com",          website:"decathlon.com", status:"active", rating:4.7 },
  { name:"Reebok Trade Hub",     country:"USA",         specialty:"Fitness & Lifestyle",       contact:"trade@reebok.com",           website:"reebok.com",    status:"active", rating:4.6 },

  // Kitchen & Home
  { name:"Cuisinart Trade",      country:"USA",         specialty:"Kitchen Appliances",        contact:"trade@cuisinart.com",        website:"cuisinart.com", status:"active", rating:4.7 },
  { name:"IKEA Wholesale APAC",  country:"Sweden",      specialty:"Home & Kitchen",            contact:"wholesale@ikea.com",         website:"ikea.com",      status:"active", rating:4.6 },

  // Beauty & Kids
  { name:"L'Oreal B2B",          country:"France",      specialty:"Beauty & Skincare",         contact:"b2b@loreal.com",             website:"loreal.com",    status:"active", rating:4.8 },
  { name:"Maybelline Trade",     country:"USA",         specialty:"Cosmetics & Makeup",        contact:"trade@maybelline.com",       website:"maybelline.com",status:"active", rating:4.7 },
  { name:"Carter's Wholesale",   country:"USA",         specialty:"Kids & Baby Clothing",      contact:"wholesale@carters.com",      website:"carters.com",   status:"active", rating:4.8 },
  { name:"Skip Hop Trade",       country:"USA",         specialty:"Baby & Toddler Products",   contact:"trade@skiphop.com",          website:"skiphop.com",   status:"active", rating:4.7 },
];

// ── PRODUCTS (60) ────────────────────────────────────────────
const PRODUCTS = [
  // Electronics & Accessories
  { name:"Samsung Galaxy Buds Pro",     category:"Electronics & Accessories", vendorKey:"Samsung Electronics",  basePrice:35,  retail:79.99,  stock:200, sku:"SAM-GBP-001", description:"Premium wireless earbuds with active noise cancellation, 28h battery life, and water resistance. Crystal clear sound for calls and music.",    images:["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600","https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600"], tags:["wireless","earbuds","samsung","anc"] },
  { name:"Anker PowerCore 20000mAh",    category:"Electronics & Accessories", vendorKey:"Anker Innovations",    basePrice:20,  retail:49.99,  stock:350, sku:"ANK-PC20-001", description:"High-capacity portable charger with dual USB ports and USB-C. Charge your phone 4-5 times. Compact and travel-friendly.",                        images:["https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600","https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600"], tags:["powerbank","anker","charging"] },
  { name:"Xiaomi Smart Watch Lite",     category:"Electronics & Accessories", vendorKey:"Xiaomi Global",        basePrice:28,  retail:64.99,  stock:180, sku:"XIA-SWL-001", description:"Smartwatch with heart rate monitor, SpO2 sensor, 14-day battery life, and 100+ workout modes. Compatible with iOS and Android.",               images:["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600","https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=600"], tags:["smartwatch","xiaomi","fitness"] },
  { name:"JBL Clip 4 Bluetooth Speaker",category:"Electronics & Accessories", vendorKey:"JBL Professional",    basePrice:22,  retail:54.99,  stock:250, sku:"JBL-CL4-001", description:"Portable waterproof Bluetooth speaker with carabiner clip. Bold JBL sound, 10h playtime, IP67 waterproof. Perfect for outdoor adventures.",     images:["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600","https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600"], tags:["speaker","jbl","bluetooth","outdoor"] },
  { name:"Logitech MX Master 3 Mouse",  category:"Electronics & Accessories", vendorKey:"Logitech APAC",        basePrice:40,  retail:89.99,  stock:150, sku:"LOG-MX3-001", description:"Advanced wireless mouse with ultra-fast MagSpeed scrolling. Works on any surface including glass. Ergonomic design for all-day comfort.",         images:["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600","https://images.unsplash.com/photo-1586449480537-3a81a31b2372?w=600"], tags:["mouse","logitech","wireless","productivity"] },
  { name:"Baseus 65W GaN Charger",      category:"Electronics & Accessories", vendorKey:"Baseus Tech",          basePrice:14,  retail:34.99,  stock:400, sku:"BAS-GAN-001", description:"Compact 65W GaN charger with 3 ports (2 USB-C + 1 USB-A). Charge laptop, phone, and tablet simultaneously. Foldable plug design.",             images:["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600","https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600"], tags:["charger","gan","baseus","fast-charge"] },
  { name:"Sony WH-1000XM5 Headphones",  category:"Electronics & Accessories", vendorKey:"Sony Trade Asia",      basePrice:95,  retail:229.99, stock:80,  sku:"SON-WH5-001", description:"Industry-leading noise canceling headphones. Exceptional sound quality with multipoint connection. 30h battery with quick charge. Foldable design.", images:["https://images.unsplash.com/photo-1546435770-a3e736863f1b?w=600","https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600"], tags:["headphones","sony","noise-canceling","premium"] },
  { name:"USB-C Hub 7-in-1",            category:"Electronics & Accessories", vendorKey:"Baseus Tech",          basePrice:16,  retail:39.99,  stock:300, sku:"BAS-HUB-001", description:"7-in-1 USB-C multiport hub: 4K HDMI, 100W PD charging, 2× USB 3.0, SD & TF card readers. Plug and play, no driver needed.",                   images:["https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=600","https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600"], tags:["usb-c","hub","accessories"] },

  // Men's Clothing
  { name:"Levi's 511 Slim Fit Jeans",   category:"Men's Clothing", vendorKey:"Levi's Distribution",  basePrice:25,  retail:59.99,  stock:300, sku:"LEV-511-001", description:"The iconic Levi's 511 slim fit jeans. Sits below the waist with a slim fit through the thigh and leg opening. Stretch fabric for all-day comfort.",     images:["https://images.unsplash.com/photo-1542272604-787c3835535d?w=600","https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600"], tags:["jeans","levis","denim","slim"] },
  { name:"Tommy Hilfiger Oxford Shirt",  category:"Men's Clothing", vendorKey:"Tommy Hilfiger B2B",   basePrice:22,  retail:54.99,  stock:200, sku:"TOM-OXF-001", description:"Classic Tommy Hilfiger Oxford shirt. 100% cotton, relaxed fit, button-down collar. Versatile enough for work or weekend.",                          images:["https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600","https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600"], tags:["shirt","tommy","oxford","classic"] },
  { name:"Uniqlo Ultra Light Down Jacket",category:"Men's Clothing", vendorKey:"Uniqlo Wholesale",    basePrice:30,  retail:69.99,  stock:150, sku:"UNI-ULD-001", description:"Incredibly light and compact down jacket. Packable into its own pocket. Warm and comfortable for cold weather. Multiple color options.",                images:["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600","https://images.unsplash.com/photo-1539533018257-246328e5e4d9?w=600"], tags:["jacket","uniqlo","down","winter"] },
  { name:"Calvin Klein Slim Fit Chinos",category:"Men's Clothing", vendorKey:"Calvin Klein Trade",   basePrice:28,  retail:64.99,  stock:180, sku:"CKJ-CHN-001", description:"Modern slim fit chinos with stretch cotton blend. Five-pocket styling. Versatile from casual to smart-casual occasions.",                             images:["https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600","https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600"], tags:["chinos","calvin-klein","slim","casual"] },
  { name:"H&M Men's Polo Shirt",         category:"Men's Clothing", vendorKey:"H&M Wholesale",        basePrice:10,  retail:24.99,  stock:500, sku:"HM-POL-001",  description:"Classic polo shirt in piqué fabric. Slim fit with ribbed collar and cuffs. Perfect for casual everyday wear.",                                        images:["https://images.unsplash.com/photo-1622445275576-721325763afe?w=600","https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600"], tags:["polo","hm","casual","basic"] },
  { name:"Next Formal Suit Jacket",      category:"Men's Clothing", vendorKey:"Next Clothing UK",     basePrice:45,  retail:109.99, stock:80,  sku:"NXT-SUJ-001", description:"Tailored formal suit jacket. Slim fit design with notched lapel. Available in navy and charcoal. Perfect for business and formal occasions.",            images:["https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600","https://images.unsplash.com/photo-1594938298603-c8148c4b4891?w=600"], tags:["suit","formal","jacket","business"] },

  // Women's Clothing
  { name:"Zara Floral Wrap Dress",       category:"Women's Clothing", vendorKey:"Zara Women Division",  basePrice:22,  retail:54.99,  stock:200, sku:"ZAR-FWD-001", description:"Elegant floral wrap dress with V-neckline and adjustable tie waist. Flowy fabric perfect for summer occasions and day-to-night styling.",           images:["https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600","https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600"], tags:["dress","zara","floral","summer"] },
  { name:"ASOS Linen Blazer Women's",    category:"Women's Clothing", vendorKey:"ASOS Wholesale",       basePrice:28,  retail:64.99,  stock:150, sku:"ASO-LBL-001", description:"Relaxed linen blazer. Perfect for layering over dresses or with tailored trousers. Single-button fastening and chest pocket.",                      images:["https://images.unsplash.com/photo-1594938298603-c8148c4b4891?w=600","https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600"], tags:["blazer","linen","asos","smart"] },
  { name:"Mango Satin Blouse",           category:"Women's Clothing", vendorKey:"Mango Fashion B2B",    basePrice:18,  retail:44.99,  stock:250, sku:"MAN-SAB-001", description:"Luxurious satin blouse with relaxed fit. Button-through front, V-neckline, and long sleeves. Elevates any outfit effortlessly.",                    images:["https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600","https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600"], tags:["blouse","satin","mango","elegant"] },
  { name:"Shein Ribbed Knit Dress",      category:"Women's Clothing", vendorKey:"Shein Global Supply",  basePrice:12,  retail:29.99,  stock:400, sku:"SHE-RKD-001", description:"Form-fitting ribbed knit midi dress. Square neckline with long sleeves. Comfortable stretch fabric that flatters all body types.",                    images:["https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=600","https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600"], tags:["dress","knit","shein","midi"] },
  { name:"Forever 21 Mom Jeans",         category:"Women's Clothing", vendorKey:"Forever 21 Supply",    basePrice:14,  retail:34.99,  stock:300, sku:"F21-MJN-001", description:"High-waisted mom jeans with relaxed fit through the hip and thigh. Distressed details and rolled cuffs for a vintage-inspired look.",               images:["https://images.unsplash.com/photo-1475180429745-f5cca486df70?w=600","https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600"], tags:["jeans","mom-jeans","forever21","vintage"] },

  // Men's Shoes
  { name:"Nike Air Force 1 Low",         category:"Men's Shoes", vendorKey:"Nike Trade EMEA",      basePrice:40,  retail:94.99,  stock:200, sku:"NIK-AF1-001", description:"The legendary Nike Air Force 1. Classic low-top design with leather upper and Air cushioning. Iconic style that goes with everything.",               images:["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600","https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600"], tags:["nike","air-force-1","sneakers","classic"] },
  { name:"Adidas Ultraboost 23",         category:"Men's Shoes", vendorKey:"Adidas Wholesale",     basePrice:55,  retail:129.99, stock:120, sku:"ADI-UB23-001", description:"Revolutionary running shoe with BOOST midsole for incredible energy return. Primeknit upper adapts to your foot for a perfect fit.",                 images:["https://images.unsplash.com/photo-1608231387042-66d1773d3028?w=600","https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"], tags:["adidas","ultraboost","running","premium"] },
  { name:"New Balance 574 Classic",      category:"Men's Shoes", vendorKey:"New Balance B2B",      basePrice:35,  retail:79.99,  stock:180, sku:"NB-574-001",  description:"The iconic New Balance 574. Suede and mesh upper with ENCAP midsole technology. Timeless style with everyday comfort.",                          images:["https://images.unsplash.com/photo-1539185441755-769473a23570?w=600","https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"], tags:["new-balance","574","sneakers","lifestyle"] },
  { name:"Clarks Desert Boot",           category:"Men's Shoes", vendorKey:"Clarks International", basePrice:42,  retail:99.99,  stock:100, sku:"CLK-DBT-001", description:"The original Desert Boot. Soft suede upper with crepe sole. Hand-sewn construction and unlined for breathability. A wardrobe essential.",           images:["https://images.unsplash.com/photo-1613987876445-fcb353b9a2cd?w=600","https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"], tags:["clarks","desert-boot","suede","classic"] },
  { name:"Puma RS-X Bold Sneaker",       category:"Men's Shoes", vendorKey:"Puma Trade Hub",       basePrice:32,  retail:74.99,  stock:160, sku:"PUM-RSX-001", description:"Chunky lifestyle sneaker with RS System cushioning. Bold design with multi-color paneling. Running System heritage meets street style.",           images:["https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600","https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"], tags:["puma","rs-x","chunky","lifestyle"] },

  // Women's Shoes
  { name:"Steve Madden Irenee Heels",    category:"Women's Shoes", vendorKey:"Steve Madden Trade",  basePrice:35,  retail:84.99,  stock:130, sku:"STM-IRN-001", description:"Classic block heel sandal with adjustable ankle strap. 3-inch block heel for all-day comfort and stability. Versatile for day and evening wear.",  images:["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600","https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=600"], tags:["heels","steve-madden","block-heel","sandal"] },
  { name:"Nike Air Max 270 Women's",     category:"Women's Shoes", vendorKey:"Nike Trade EMEA",     basePrice:45,  retail:104.99, stock:150, sku:"NIK-AM270W-001",description:"Women's Air Max 270 with the largest Air unit to date. Mesh upper with overlays for breathability. Modern running-inspired lifestyle shoe.",      images:["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600","https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=600"], tags:["nike","air-max","women","sneakers"] },
  { name:"Aldo Loafer Flats",            category:"Women's Shoes", vendorKey:"Aldo Wholesale",      basePrice:22,  retail:54.99,  stock:200, sku:"ALD-LOF-001", description:"Elegant leather loafer flats with metal bit detail. Cushioned insole for comfort. Versatile style that transitions from office to weekend.",        images:["https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=600","https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600"], tags:["loafers","aldo","flats","office"] },
  { name:"Skechers Go Walk Slip-On",     category:"Women's Shoes", vendorKey:"Skechers Trade",      basePrice:25,  retail:59.99,  stock:250, sku:"SKE-GWK-001", description:"Ultra-lightweight slip-on with Skechers Air Cooled Goga Mat insole. 5GEN midsole and flexible traction outsole. Maximum comfort for walking.",  images:["https://images.unsplash.com/photo-1562183241-b937e9102e5e?w=600","https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=600"], tags:["skechers","comfort","slip-on","walking"] },
  { name:"Charles & Keith Ankle Boots",  category:"Women's Shoes", vendorKey:"Charles & Keith B2B", basePrice:38,  retail:89.99,  stock:100, sku:"CNK-ABT-001", description:"Sleek ankle boots with pointed toe and block heel. Side zip closure for easy wear. Faux leather upper with cushioned insole.",                  images:["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600","https://images.unsplash.com/photo-1539971493031-f8ee23eb5a6a?w=600"], tags:["boots","ankle","charles-keith","pointed-toe"] },

  // Men's Bags
  { name:"Herschel Little America Backpack",category:"Men's Bags", vendorKey:"Herschel Supply B2B", basePrice:35, retail:84.99,  stock:150, sku:"HER-LAM-001", description:"The iconic Little America backpack. Padded 15\" laptop sleeve, side zip pockets, and signature stripe lining. 25L capacity for daily use.",     images:["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600","https://images.unsplash.com/photo-1622560480654-d96214fdc887?w=600"], tags:["backpack","herschel","laptop","travel"] },
  { name:"Samsonite Classic Briefcase",   category:"Men's Bags",  vendorKey:"Samsonite Trade",      basePrice:50,  retail:119.99, stock:80,  sku:"SAM-CBF-001", description:"Professional leather briefcase with laptop compartment. Multiple organization pockets. Detachable shoulder strap. Perfect for business travel.",   images:["https://images.unsplash.com/photo-1473188588951-666fce8e7c68?w=600","https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600"], tags:["briefcase","samsonite","leather","business"] },
  { name:"Eastpak Padded Pak'r Backpack", category:"Men's Bags",  vendorKey:"Eastpak Trade",        basePrice:25,  retail:59.99,  stock:200, sku:"EAS-PPR-001", description:"Iconic Eastpak backpack with padded back and shoulder straps. Front organizer pocket. 30L capacity with padded laptop sleeve.",                  images:["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600","https://images.unsplash.com/photo-1622560480654-d96214fdc887?w=600"], tags:["backpack","eastpak","school","daily"] },
  { name:"Fossil Defender Messenger Bag", category:"Men's Bags",  vendorKey:"Fossil Group Trade",   basePrice:45,  retail:104.99, stock:90,  sku:"FOS-DEF-001", description:"Rugged canvas messenger bag with leather trim. Multiple compartments and a dedicated laptop sleeve. Adjustable crossbody strap.",                 images:["https://images.unsplash.com/photo-1622560480654-d96214fdc887?w=600","https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600"], tags:["messenger","fossil","canvas","crossbody"] },
  { name:"Tumi Alpha 3 Duffel",          category:"Men's Bags",  vendorKey:"Tumi Wholesale",       basePrice:90,  retail:219.99, stock:50,  sku:"TUM-AL3-001", description:"Premium travel duffel with ballistic nylon construction. Removable shoulder strap, shoe compartment, and wet/dry pocket. The ultimate travel companion.", images:["https://images.unsplash.com/photo-1473188588951-666fce8e7c68?w=600","https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600"], tags:["duffel","tumi","travel","premium"] },

  // Women's Bags
  { name:"Kate Spade New York Satchel",  category:"Women's Bags", vendorKey:"Kate Spade Trade",     basePrice:55,  retail:129.99, stock:80,  sku:"KSP-SAT-001", description:"Structured leather satchel with top handle and detachable crossbody strap. Interior zip and slip pockets. Signature spade charm.",                images:["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600","https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600"], tags:["satchel","kate-spade","leather","structured"] },
  { name:"Michael Kors Mercer Tote",     category:"Women's Bags", vendorKey:"Michael Kors B2B",     basePrice:60,  retail:144.99, stock:70,  sku:"MKO-TOT-001", description:"Spacious pebbled leather tote. Open top with magnetic snap closure. Interior zip and two slip pockets. Removable pouch included.",                  images:["https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600","https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600"], tags:["tote","michael-kors","leather","spacious"] },
  { name:"Coach Tabby Shoulder Bag",     category:"Women's Bags", vendorKey:"Coach Wholesale",      basePrice:65,  retail:154.99, stock:60,  sku:"COA-TAB-001", description:"The iconic Coach Tabby. Pebble leather with signature turn-lock closure. Adjustable strap. Inner zip, open pockets. A Coach classic reimagined.",  images:["https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600","https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600"], tags:["shoulder","coach","leather","iconic"] },
  { name:"Guess Crossbody Mini Bag",     category:"Women's Bags", vendorKey:"Guess Accessories",    basePrice:28,  retail:64.99,  stock:150, sku:"GUE-CMB-001", description:"Chic mini crossbody with logo-embossed hardware. Adjustable chain strap and magnetic snap closure. Perfect for essentials on the go.",              images:["https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600","https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600"], tags:["crossbody","guess","mini","chain"] },
  { name:"Aldo Clutch Evening Bag",      category:"Women's Bags", vendorKey:"Aldo Bags Division",   basePrice:18,  retail:44.99,  stock:200, sku:"ALD-CLU-001", description:"Sleek envelope clutch for evening occasions. Gold chain strap, magnetic closure, and card slots inside. Available in black, gold, and silver.",      images:["https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600","https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600"], tags:["clutch","aldo","evening","envelope"] },

  // Fitness & Sports
  { name:"Gymshark Flex Leggings",       category:"Fitness & Sports", vendorKey:"Gymshark Wholesale",basePrice:22, retail:54.99,  stock:300, sku:"GYM-FLX-001", description:"High-waist sculpting leggings with seamless construction. 4-way stretch fabric wicks moisture. Perfect for yoga, gym, and everyday wear.",          images:["https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600","https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600"], tags:["leggings","gymshark","yoga","workout"] },
  { name:"Under Armour Tech T-Shirt",    category:"Fitness & Sports", vendorKey:"Under Armour Trade",basePrice:14, retail:34.99,  stock:400, sku:"UA-TEC-001",  description:"UA Tech fabric is quick-drying and has a more natural feel. Anti-odor technology prevents the growth of odor-causing microbes. Loose fit.",         images:["https://images.unsplash.com/photo-1520975954732-35dd22299614?w=600","https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600"], tags:["t-shirt","under-armour","gym","quick-dry"] },
  { name:"Decathlon Yoga Mat 6mm",       category:"Fitness & Sports", vendorKey:"Decathlon B2B",     basePrice:15, retail:34.99,  stock:200, sku:"DEC-YMA-001", description:"6mm thick non-slip yoga mat with alignment lines. Easy-grip texture on both sides. Includes carrying strap. Suitable for yoga and floor exercises.", images:["https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=600","https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=600"], tags:["yoga","mat","decathlon","non-slip"] },
  { name:"Reebok Nano X3 Training Shoe", category:"Fitness & Sports", vendorKey:"Reebok Trade Hub",  basePrice:48, retail:114.99, stock:120, sku:"REE-NX3-001", description:"Ultimate CrossFit-inspired training shoe. Stable for lifting, responsive for WODs. Flexweave upper and heel clip for lockdown support.",           images:["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600","https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600"], tags:["reebok","training","crossfit","gym"] },
  { name:"Resistance Band Set 5-Pack",   category:"Fitness & Sports", vendorKey:"Decathlon B2B",     basePrice:10, retail:24.99,  stock:500, sku:"DEC-RBS-001", description:"Set of 5 resistance bands with varying resistance levels (10–50 lbs). Includes carrying bag. Perfect for strength training and physical therapy.", images:["https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600","https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600"], tags:["resistance-bands","fitness","strength","set"] },

  // Kitchen & Home
  { name:"Cuisinart 12-Piece Cookware Set",category:"Kitchen & Home", vendorKey:"Cuisinart Trade",   basePrice:60, retail:144.99, stock:80,  sku:"CUI-12C-001", description:"Professional stainless steel cookware set. Even heat distribution, drip-free pouring rims. Dishwasher safe. Suitable for all cooktops including induction.", images:["https://images.unsplash.com/photo-1585515320310-259814833e62?w=600","https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600"], tags:["cookware","cuisinart","stainless","induction"] },
  { name:"IKEA 365+ Water Bottle 1L",    category:"Kitchen & Home", vendorKey:"IKEA Wholesale APAC", basePrice:6,  retail:14.99,  stock:600, sku:"IKE-WBT-001", description:"Durable 1-liter water bottle made from stainless steel. Keeps beverages cold 24h or hot 12h. Leakproof lid. BPA-free and dishwasher safe.",       images:["https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600","https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600"], tags:["water-bottle","ikea","stainless","insulated"] },
  { name:"Pour Over Coffee Set",         category:"Kitchen & Home", vendorKey:"Cuisinart Trade",     basePrice:18, retail:44.99,  stock:150, sku:"CUI-POC-001", description:"Complete pour-over coffee set: Chemex-style glass pour-over dripper, bamboo coaster, reusable stainless filter. Makes 2-4 cups. Perfect gift.",     images:["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600","https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600"], tags:["coffee","pour-over","kitchen","gift"] },
  { name:"Bamboo Cutting Board 3-Piece", category:"Kitchen & Home", vendorKey:"IKEA Wholesale APAC", basePrice:12, retail:29.99,  stock:300, sku:"IKE-BCB-001", description:"Set of 3 bamboo cutting boards in small, medium, and large. Antimicrobial bamboo surface. Juice grooves on one side. Easy grip handles.",         images:["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600","https://images.unsplash.com/photo-1585515320310-259814833e62?w=600"], tags:["bamboo","cutting-board","kitchen","eco"] },

  // Beauty & Skincare
  { name:"L'Oreal Revitalift Serum",     category:"Beauty & Skincare", vendorKey:"L'Oreal B2B",       basePrice:14, retail:34.99,  stock:300, sku:"LOR-RVS-001", description:"Anti-aging face serum with 1.5% pure hyaluronic acid. Visibly reduces wrinkles and plumps skin with moisture. Dermatologist tested.",             images:["https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600","https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600"], tags:["serum","loreal","anti-aging","hyaluronic"] },
  { name:"Maybelline Fit Me Foundation",  category:"Beauty & Skincare", vendorKey:"Maybelline Trade",   basePrice:6,  retail:14.99,  stock:500, sku:"MAY-FMF-001", description:"Foundation that fits and feels like a second skin. Formulated with SPF 18. Blurs pores, controls shine, and gives a natural, fresh finish.",      images:["https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600","https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600"], tags:["foundation","maybelline","makeup","coverage"] },
  { name:"L'Oreal Men Expert Face Wash",  category:"Beauty & Skincare", vendorKey:"L'Oreal B2B",       basePrice:6,  retail:14.99,  stock:400, sku:"LOR-MEF-001", description:"Men's energizing face wash with vitamin C. Removes impurities and excess oil without drying. Leaves skin feeling fresh and recharged.",          images:["https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600","https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600"], tags:["face-wash","men","loreal","skincare"] },

  // Kids & Baby
  { name:"Carter's Baby Bodysuit 5-Pack",category:"Kids & Baby", vendorKey:"Carter's Wholesale",      basePrice:16, retail:39.99,  stock:300, sku:"CAR-BB5-001", description:"5-pack cotton bodysuits for babies 0-24 months. Lap shoulder neckline for easy dressing. Expandable side snaps at bottom. Machine washable.",   images:["https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=600","https://images.unsplash.com/photo-1503944583220-79d4dd712bab?w=600"], tags:["baby","bodysuit","carters","cotton"] },
  { name:"Skip Hop Toddler Backpack",    category:"Kids & Baby", vendorKey:"Skip Hop Trade",          basePrice:14, retail:34.99,  stock:200, sku:"SKP-TBP-001", description:"Adorable toddler backpack with 3D animal design. Features reins for safety, a padded back panel, and pockets for snacks and essentials.",         images:["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600","https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=600"], tags:["backpack","kids","toddler","skip-hop"] },
  { name:"Carter's Girls Dress Set",     category:"Kids & Baby", vendorKey:"Carter's Wholesale",      basePrice:14, retail:34.99,  stock:200, sku:"CAR-GDS-001", description:"Cute 2-piece dress set for girls 2-8 years. Includes colorful print dress and matching shorts. Soft cotton blend. Machine washable.",             images:["https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600","https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=600"], tags:["dress","girls","kids","carters"] },

  // General & Lifestyle
  { name:"Samsonite Cabin Luggage 55cm", category:"General & Lifestyle", vendorKey:"Samsonite Trade",  basePrice:75, retail:179.99, stock:80,  sku:"SAM-CAB-001", description:"Lightweight spinner cabin bag. Meets most airlines' cabin requirements. 4 double spinner wheels for 360° mobility. TSA-approved lock. 38L.",    images:["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600","https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600"], tags:["luggage","samsonite","travel","cabin"] },
  { name:"IKEA Kallax Desk Organizer",   category:"General & Lifestyle", vendorKey:"IKEA Wholesale APAC",basePrice:8,retail:19.99, stock:400, sku:"IKE-KDO-001", description:"Bamboo desk organizer with 5 compartments. Holds pens, notebooks, phone, and more. Keeps your workspace tidy. Easy assembly, no tools needed.",  images:["https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600","https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600"], tags:["organizer","desk","bamboo","home-office"] },
];

async function main() {
  console.log("\n🌱 TargetGlobal — Full Database Seed\n");
  console.log("━".repeat(50));

  // ── 1. Auth users ─────────────────────────────────────────
  console.log("\n🔐 Auth users…");
  const adminUid = await createUser("admin@targetglobal.org", "Admin@1234!", "super_admin", "Super Admin");
  const alex  = await createUser("alex@trendhive.com",   "Merchant@1234!", "merchant", "Alex Morgan");
  const priya = await createUser("priya@gadgetnest.io",  "Merchant@1234!", "merchant", "Priya Sharma");
  const carlos= await createUser("carlos@petpalace.com", "Merchant@1234!", "merchant", "Carlos Ruiz");
  const fatima= await createUser("fatima@stylehaus.com", "Merchant@1234!", "merchant", "Fatima Al-Noor");

  // ── 2. Vendors ────────────────────────────────────────────
  console.log("\n🏭 Seeding 50 vendors…");
  const vendorMap: Record<string, string> = {};
  const vendorBatch = db.batch();
  for (const v of VENDORS) {
    const ref = db.collection("vendors").doc();
    vendorMap[v.name] = ref.id;
    vendorBatch.set(ref, {
      ...v, id: ref.id,
      productsCount: 0,
      joinedAt: ts, updatedAt: ts,
    });
  }
  await vendorBatch.commit();
  console.log(`  ✅ ${VENDORS.length} vendors created`);

  // ── 3. Products ───────────────────────────────────────────
  console.log("\n📦 Seeding 60 products…");
  const productMap: Record<string, any> = {};
  for (const p of PRODUCTS) {
    const vendorId = vendorMap[p.vendorKey] ?? "";
    const ref = db.collection("products").doc();
    const product = {
      id: ref.id, name: p.name, description: p.description,
      category: p.category, sku: p.sku,
      vendorId, vendorName: p.vendorKey,
      basePrice: p.basePrice ?? 0, suggestedRetail: p.retail ?? 0, retailPrice: p.retail ?? 0,
      stock: p.stock, images: p.images, tags: p.tags,
      status: "active", addedBy: adminUid,
      createdAt: ts, updatedAt: ts,
    };
    await ref.set(product);
    productMap[p.sku] = { ...product, id: ref.id };
  }
  console.log(`  ✅ ${PRODUCTS.length} products created`);

  // ── 4. Stores ─────────────────────────────────────────────
  console.log("\n🏪 Seeding merchant stores…");
  const stores = [
    { merchantId: alex,   storeName:"TrendHive Store",  category:"Electronics & Accessories", plan:"pro",     merchantMargin:0.20, commissionRate:0.02, maxProducts:999, rating:4.8, totalOrders:48, onTimeOrders:45, status:"active",  country:"United States" },
    { merchantId: priya,  storeName:"GadgetNest",        category:"Electronics & Accessories", plan:"growth",  merchantMargin:0.20, commissionRate:0.025,maxProducts:50,  rating:4.6, totalOrders:32, onTimeOrders:29, status:"active",  country:"India"         },
    { merchantId: carlos, storeName:"StyleKing",         category:"Men's Clothing",             plan:"starter", merchantMargin:0.20, commissionRate:0.03, maxProducts:10,  rating:4.5, totalOrders:18, onTimeOrders:16, status:"active",  country:"Mexico"        },
    { merchantId: fatima, storeName:"StyleHaus",         category:"Women's Clothing",           plan:"growth",  merchantMargin:0.20, commissionRate:0.025,maxProducts:50,  rating:0,   totalOrders:0,  onTimeOrders:0,  status:"pending", country:"UAE"           },
  ];
  const storeIds: Record<string, string> = {};
  for (const s of stores) {
    const ref = db.collection("stores").doc();
    storeIds[s.merchantId] = ref.id;
    await ref.set({ ...s, id: ref.id, settings: { currency:"USD", salesTarget: 10000, deliveryDays: 3 }, joinedAt: ts, updatedAt: ts });
  }
  console.log(`  ✅ ${stores.length} stores created`);

  // ── 5. KYC ────────────────────────────────────────────────
  console.log("\n🪪 Seeding KYC submissions…");
  await db.collection("kyc_submissions").add({ merchantId:alex,   storeId:storeIds[alex],   storeName:"TrendHive Store", merchantName:"Alex Morgan",    merchantEmail:"alex@trendhive.com",   idType:"passport",        idNumber:"US7741829", dateOfBirth:"1990-03-15", issuingCountry:"United States", idExpiryDate:"2030-03-14", fullAddress:"123 Market St, San Francisco, CA", status:"approved", submittedAt:ts });
  await db.collection("kyc_submissions").add({ merchantId:priya,  storeId:storeIds[priya],  storeName:"GadgetNest",       merchantName:"Priya Sharma",   merchantEmail:"priya@gadgetnest.io",  idType:"national_id",     idNumber:"IN4428817", dateOfBirth:"1993-07-22", issuingCountry:"India",         idExpiryDate:"2028-07-21", fullAddress:"45 Tech Park, Bangalore, India",   status:"approved", submittedAt:ts });
  await db.collection("kyc_submissions").add({ merchantId:carlos, storeId:storeIds[carlos], storeName:"StyleKing",         merchantName:"Carlos Ruiz",    merchantEmail:"carlos@petpalace.com", idType:"drivers_license", idNumber:"MX9934521", dateOfBirth:"1988-11-05", issuingCountry:"Mexico",        idExpiryDate:"2027-11-04", fullAddress:"78 Reforma Ave, Mexico City",       status:"approved", submittedAt:ts });
  await db.collection("kyc_submissions").add({ merchantId:fatima, storeId:storeIds[fatima], storeName:"StyleHaus",         merchantName:"Fatima Al-Noor", merchantEmail:"fatima@stylehaus.com", idType:"national_id",     idNumber:"AE1122839", dateOfBirth:"1995-05-18", issuingCountry:"UAE",           idExpiryDate:"2029-05-17", fullAddress:"12 Sheikh Zayed Rd, Dubai",         status:"pending",  submittedAt:ts });
  console.log("  ✅ 4 KYC submissions created");

  // ── 6. Wallets ────────────────────────────────────────────
  console.log("\n💰 Seeding wallets…");
  // ── Wallets — prevent duplicates ────────────────────────────
  const walletBalances = [
    { merchantId:alex,   storeId:storeIds[alex],   balances:{ BTC:0.00421, ETH:0.12, USDT_TRC20:842, USDT_ERC20:0 }, usdEquivalent:1482.22 },
    { merchantId:priya,  storeId:storeIds[priya],  balances:{ BTC:0.0012,  ETH:0.05, USDT_TRC20:200, USDT_ERC20:0 }, usdEquivalent:340.00  },
    { merchantId:carlos, storeId:storeIds[carlos], balances:{ BTC:0.0089,  ETH:0.15, USDT_TRC20:410, USDT_ERC20:0 }, usdEquivalent:860.00  },
    { merchantId:fatima, storeId:storeIds[fatima], balances:{ BTC:0,       ETH:0,    USDT_TRC20:24.5,USDT_ERC20:0 }, usdEquivalent:24.50   },
  ];
  for (const w of walletBalances) {
    // Check for existing wallet to prevent duplicates
    const existing = await db.collection("wallets").where("merchantId","==",w.merchantId).limit(1).get();
    if (existing.empty) {
      await db.collection("wallets").add({ ...w, updatedAt:ts });
    } else {
      await existing.docs[0].ref.update({ ...w, updatedAt:ts });
      console.log(`  ♻  Wallet updated for merchantId ${w.merchantId}`);
    }
  }

  // Deposit addresses for each merchant
  const depAddrs = [
    { coin:"BTC",  network:"Bitcoin",  address:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" },
    { coin:"ETH",  network:"Ethereum", address:"0x71C7656EC7ab88b098defB751B7401B5f6d8976F" },
    { coin:"USDT", network:"TRC20",    address:"TJf8qX7KPxLmPzQo5YGWN3cB9RmXaVuTe"         },
    { coin:"USDT", network:"ERC20",    address:"0x4aB8c3F2d1E9A7c056D3e4F891bC2A5d6E7f8012" },
  ];
  for (const mid of [alex, priya, carlos, fatima]) {
    for (const a of depAddrs) {
      await db.collection("deposit_addresses").add({ merchantId:mid, storeId:storeIds[mid], ...a, isActive:true, createdAt:ts });
    }
  }
  console.log("  ✅ Wallets and deposit addresses created");

  // ── 7. Store Products (add some to each active store) ─────
  console.log("\n🛍 Adding products to stores…");
  const activeProductSkus = [
    "SAM-GBP-001","ANK-PC20-001","JBL-CL4-001","BAS-GAN-001","USB-HUB",
    "NIK-AF1-001","ADI-UB23-001","LEV-511-001","TOM-OXF-001","UNI-ULD-001",
  ];
  let spCount = 0;
  for (const prod of Object.values(productMap).slice(0, 30)) {
    const p = prod as any;
    // Add to alex's store
    await db.collection("store_products").add({
      storeId: storeIds[alex], merchantId: alex,
      productId: p.id, productName: p.name,
      productImage: p.images?.[0] ?? "📦",
      basePrice: p.basePrice ?? 0, retailPrice: p.retail ?? 0,
      suggestedRetail: p.retail ?? 0,
      merchantProfit: +(p.retail * 0.20 - p.retail * 0.03).toFixed(2),
      vendorId: p.vendorId, vendorName: p.vendorName,
      category: p.category, isVisible: true, addedAt: ts,
    });
    spCount++;
  }
  // Add some to priya's store
  for (const prod of Object.values(productMap).slice(0, 15)) {
    const p = prod as any;
    await db.collection("store_products").add({
      storeId: storeIds[priya], merchantId: priya,
      productId: p.id, productName: p.name,
      productImage: p.images?.[0] ?? "📦",
      basePrice: p.basePrice ?? 0, retailPrice: p.retail ?? 0,
      suggestedRetail: p.retail ?? 0,
      merchantProfit: +(p.retail * 0.20 - p.retail * 0.03).toFixed(2),
      vendorId: p.vendorId, vendorName: p.vendorName,
      category: p.category, isVisible: true, addedAt: ts,
    });
    spCount++;
  }
  console.log(`  ✅ ${spCount} store products added`);

  // ── 8. Sample Orders ──────────────────────────────────────
  console.log("\n🛒 Seeding sample orders…");
  const sampleOrders = [
    { merchantId:alex, storeId:storeIds[alex], customer:{name:"James Wilson",email:"james@email.com",phone:"+1 555 0101",address:{line1:"100 Broadway",city:"New York",state:"NY",zip:"10001",country:"USA"}}, items:[{productName:"Samsung Galaxy Buds Pro",quantity:1,unitPrice:79.99,basePrice:35}], total:79.99, totalBaseCost:35, status:"delivered", merchantEarnings:9.59, placedByAdmin:true },
    { merchantId:alex, storeId:storeIds[alex], customer:{name:"Sarah Chen",  email:"sarah@email.com",phone:"+1 555 0102",address:{line1:"50 Oak Ave",city:"Chicago",state:"IL",zip:"60601",country:"USA"}},  items:[{productName:"Anker PowerCore 20000mAh",quantity:2,unitPrice:49.99,basePrice:20}], total:99.98, totalBaseCost:40, status:"shipped",   merchantEarnings:null, placedByAdmin:true },
    { merchantId:alex, storeId:storeIds[alex], customer:{name:"Mike Davis",  email:"mike@email.com",phone:"+1 555 0103",address:{line1:"25 Pine St",city:"Austin",state:"TX",zip:"78701",country:"USA"}},   items:[{productName:"Nike Air Force 1 Low",quantity:1,unitPrice:94.99,basePrice:40}],  total:94.99, totalBaseCost:40, status:"pending",   merchantEarnings:null, placedByAdmin:true },
    { merchantId:priya,storeId:storeIds[priya],customer:{name:"Raj Patel",   email:"raj@email.com",phone:"+91 98765 43210",address:{line1:"15 MG Road",city:"Mumbai",state:"MH",zip:"400001",country:"India"}},items:[{productName:"Logitech MX Master 3 Mouse",quantity:1,unitPrice:89.99,basePrice:40}],total:89.99,totalBaseCost:40,status:"processing",merchantEarnings:null,placedByAdmin:true},
  ];
  for (const o of sampleOrders) {
    const custPay = +(o.totalBaseCost * 1.20);
    const comm    = +(custPay * 0.03);
    await db.collection("orders").add({
      ...o, adminId:adminUid,
      customerPayment: custPay, platformCommission: comm,
      totalReimbursement: +(custPay - comm),
      fundsDeducted: o.status!=="pending",
      reimbursed: o.status==="delivered",
      placedAt:ts, updatedAt:ts,
      estimatedDelivery: new Date(Date.now() + 3*24*60*60*1000),
    });
  }
  console.log("  ✅ 4 sample orders created");

  // ── 9. Chat rooms ─────────────────────────────────────────
  console.log("\n💬 Seeding chat rooms…");
  for (const [mid, sname] of [[alex,"Alex – TrendHive"],[priya,"Priya – GadgetNest"],[carlos,"Carlos – StyleKing"]]) {
    const roomRef = db.collection("chat_rooms").doc();
    await roomRef.set({ merchantId:mid, storeName:sname, unreadAdmin:0, unreadMerchant:0, lastMessage:"Welcome! How can we help?", lastMessageAt:ts, createdAt:ts });
    await roomRef.collection("messages").add({ senderId:adminUid, senderRole:"admin", text:`Welcome to TargetGlobal, ${(sname as string).split("–")[0].trim()}! 👋 We're here to help you grow your store. Feel free to message us anytime.`, createdAt:ts, read:true });
  }
  console.log("  ✅ Chat rooms created");

  // ── 10. Notifications ─────────────────────────────────────
  console.log("\n🔔 Seeding notifications…");
  const notifs = [
    { userId:alex,   title:"🎉 Store Approved!", body:"Your store TrendHive is live! Start adding products from the catalog.", type:"kyc",   read:false },
    { userId:alex,   title:"📦 New Order Received", body:"A new order has been placed on your store. Submit it to process.", type:"order", read:false },
    { userId:alex,   title:"💰 Payment Received!", body:"$116.40 has been credited to your wallet (order delivered).", type:"earning",read:true  },
    { userId:priya,  title:"🎉 Store Approved!", body:"Your GadgetNest store is now active. Browse the catalog to start selling!", type:"kyc",  read:false },
    { userId:carlos, title:"⚡ Submit Your Order", body:"You have 1 pending order. Submit it to start the shipping process.", type:"order",read:false },
  ];
  for (const n of notifs) {
    await db.collection("notifications").add({ ...n, createdAt:ts });
  }
  console.log("  ✅ Notifications created");

  console.log("\n" + "━".repeat(50));
  console.log("🎉 Database seed complete!\n");
  console.log("📧 Login credentials:");
  console.log("   Admin:    admin@targetglobal.org  / Admin@1234!");
  console.log("   Merchant: alex@trendhive.com     / Merchant@1234!");
  console.log("   Merchant: priya@gadgetnest.io    / Merchant@1234!");
  console.log("   Merchant: carlos@petpalace.com   / Merchant@1234!");
  console.log("   Merchant: fatima@stylehaus.com   / Merchant@1234!");
  console.log("\n⚠  Note: Delete postcss.config.js and tailwind.config.js from admin folder before running.\n");
  process.exit(0);
}

main().catch(e => { console.error("\n❌", e.message); process.exit(1); });
