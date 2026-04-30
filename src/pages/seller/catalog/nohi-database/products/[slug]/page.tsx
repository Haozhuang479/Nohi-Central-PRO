
import { use } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProductData {
  id: string
  title: string
  brand: string
  image: string
  sourceUrl: string
  sourceDomain: string
  price: number
  originalPrice?: number
  description: string
  colors: { name: string; hex: string }[]
  materials: string[]
  categories: string[]
  features: string[]
}

const productsData: Record<string, ProductData> = {
  "trench-coat": {
    id: "trench-coat",
    title: "A-line Short Trench Coat",
    brand: "Abercrombie & Fitch",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=600&fit=crop",
    sourceUrl: "https://www.abercrombie.com/shop/us/p/a-line-short-trench-coat",
    sourceDomain: "abercrombie.com",
    price: 140,
    originalPrice: 180,
    description: "A classic A-line silhouette trench coat crafted from water-resistant cotton twill. Features a double-breasted front with horn buttons, storm flap, adjustable belt at waist, and back vent. Fully lined with signature striped lining. Perfect for transitional weather and effortless layering.",
    colors: [
      { name: "Khaki", hex: "#c4a77d" },
      { name: "Navy", hex: "#1e3a5f" },
      { name: "Black", hex: "#1a1a1a" },
    ],
    materials: ["Cotton twill", "Water-resistant coating", "Polyester lining"],
    categories: ["Outerwear", "Coats & Jackets", "Women"],
    features: [
      "Water-resistant cotton twill construction",
      "Classic double-breasted front with horn buttons",
      "Adjustable waist belt for customized fit",
      "Back vent for ease of movement",
      "Fully lined with signature striped lining",
    ],
  },
  "aftercare-red": {
    id: "aftercare-red",
    title: "Aftercare Replacement In Parade Red - Women",
    brand: "Burberry",
    image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=600&fit=crop",
    sourceUrl: "https://www.burberry.com/aftercare-replacement-parade-red",
    sourceDomain: "burberry.com",
    price: 1290,
    description: "A sophisticated piece from Burberry's latest collection featuring the signature check pattern in a bold parade red colorway. Crafted in Italy from premium materials with meticulous attention to detail.",
    colors: [
      { name: "Parade Red", hex: "#c41e3a" },
      { name: "Archive Beige", hex: "#d4c4a8" },
    ],
    materials: ["Premium cotton", "Signature check lining"],
    categories: ["Women", "Ready-to-Wear"],
    features: [
      "Made in Italy",
      "Signature Burberry check pattern",
      "Premium cotton construction",
      "Dry clean only",
    ],
  },
  "pom-beanie": {
    id: "pom-beanie",
    title: "Baby Horse Fair Isle Pom Beanie",
    brand: "Janie and Jack",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=600&fit=crop",
    sourceUrl: "https://www.janieandjack.com/baby-horse-fair-isle-pom-beanie",
    sourceDomain: "janieandjack.com",
    price: 24,
    originalPrice: 32,
    description: "An adorable fair isle knit beanie featuring playful horse motifs and a fluffy pom pom on top. Soft and cozy for little ones, perfect for chilly days.",
    colors: [
      { name: "Cream", hex: "#f5f5dc" },
      { name: "Pink", hex: "#ffb6c1" },
    ],
    materials: ["Soft acrylic knit", "Faux fur pom pom"],
    categories: ["Baby", "Accessories", "Hats"],
    features: [
      "Fair isle horse pattern",
      "Soft and cozy acrylic knit",
      "Fluffy faux fur pom pom",
      "Machine washable",
    ],
  },
  "sudadera-ekd": {
    id: "sudadera-ekd",
    title: "Sudadera En Algodon Con Ekd, Capucha Y Cremallera",
    brand: "Burberry",
    image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=600&fit=crop",
    sourceUrl: "https://www.burberry.com/sudadera-ekd-capucha-cremallera",
    sourceDomain: "burberry.com",
    price: 890,
    description: "Premium cotton hoodie featuring the iconic EKD (Equestrian Knight Design) embroidery. Full-zip front with ribbed cuffs and hem for a comfortable fit. A luxurious everyday essential.",
    colors: [
      { name: "Black", hex: "#1a1a1a" },
      { name: "Grey Melange", hex: "#9e9e9e" },
    ],
    materials: ["100% cotton", "Ribbed trims"],
    categories: ["Men", "Hoodies & Sweatshirts"],
    features: [
      "EKD embroidery detail",
      "Full-zip front closure",
      "Adjustable drawstring hood",
      "Kangaroo pocket",
      "Ribbed cuffs and hem",
    ],
  },
  "roasting-rack": {
    id: "roasting-rack",
    title: "Stainless-steel Roasting Rack",
    brand: "Williams Sonoma",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=600&fit=crop",
    sourceUrl: "https://www.williams-sonoma.com/stainless-steel-roasting-rack",
    sourceDomain: "williams-sonoma.com",
    price: 49.95,
    description: "Professional-grade stainless steel roasting rack designed for optimal air circulation. Fits standard roasting pans and elevates meats for even browning and crispy results.",
    colors: [
      { name: "Stainless Steel", hex: "#c0c0c0" },
    ],
    materials: ["18/10 stainless steel"],
    categories: ["Kitchen", "Cookware", "Roasting"],
    features: [
      "Heavy-gauge stainless steel construction",
      "Non-stick surface for easy release",
      "Fits standard roasting pans",
      "Dishwasher safe",
      "Elevates meat for even air circulation",
    ],
  },
  "dinner-plates": {
    id: "dinner-plates",
    title: "Famille Rose Scalloped Dinner Plates",
    brand: "Williams Sonoma",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop",
    sourceUrl: "https://www.williams-sonoma.com/famille-rose-scalloped-dinner-plates",
    sourceDomain: "williams-sonoma.com",
    price: 89.95,
    originalPrice: 120,
    description: "Elegant scalloped dinner plates inspired by 18th-century Chinese export porcelain. The Famille Rose pattern features delicate floral motifs in soft pink and green tones.",
    colors: [
      { name: "Pink Rose", hex: "#f4c2c2" },
      { name: "Sage Green", hex: "#9dc183" },
    ],
    materials: ["Fine porcelain", "Hand-painted details"],
    categories: ["Kitchen", "Dinnerware", "Plates"],
    features: [
      "Inspired by 18th-century Chinese porcelain",
      "Scalloped edge design",
      "Hand-painted floral motifs",
      "Dishwasher and microwave safe",
      "Set of 4 plates",
    ],
  },
  "rubber-bands": {
    id: "rubber-bands",
    title: "Alliance Sterling Multi-purpose #12 Rubber Bands",
    brand: "Alliance Rubber Company",
    image: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=600&fit=crop",
    sourceUrl: "https://www.alliancerubber.com/sterling-rubber-bands-12",
    sourceDomain: "alliancerubber.com",
    price: 8.99,
    description: "Premium quality rubber bands made from natural crepe rubber for superior elasticity and durability. Ideal for office, home, and industrial applications.",
    colors: [
      { name: "Natural", hex: "#d4a574" },
    ],
    materials: ["Natural crepe rubber"],
    categories: ["Office Supplies", "Rubber Bands"],
    features: [
      "Made from natural crepe rubber",
      "Superior stretch and recovery",
      "1 pound box",
      "Assorted sizes available",
      "Latex-free option available",
    ],
  },
  "smarties-candy": {
    id: "smarties-candy",
    title: "Smarties Hard Candy Assorted Flavors, 180 Count",
    brand: "Smarties",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
    sourceUrl: "https://www.smarties.com/hard-candy-180-count",
    sourceDomain: "smarties.com",
    price: 12.99,
    description: "Classic Smarties hard candy rolls in assorted fruit flavors. A nostalgic treat loved for generations, perfect for parties, trick-or-treating, or everyday snacking.",
    colors: [
      { name: "Assorted", hex: "#ff6b6b" },
    ],
    materials: ["Sugar", "Natural flavors", "Food coloring"],
    categories: ["Candy", "Hard Candy", "Party Supplies"],
    features: [
      "Assorted fruit flavors",
      "Individually wrapped rolls",
      "180 count bulk pack",
      "Gluten-free and vegan",
      "No artificial flavors",
    ],
  },
  "teak-oil": {
    id: "teak-oil",
    title: "Star Brite Outdoor Teak Oil, Cleaner And Brightener",
    brand: "Star brite",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=600&fit=crop",
    sourceUrl: "https://www.starbrite.com/teak-oil-cleaner-brightener",
    sourceDomain: "starbrite.com",
    price: 24.99,
    description: "Professional-grade teak oil that cleans, brightens, and protects outdoor teak furniture and marine woodwork. UV inhibitors prevent graying and weathering.",
    colors: [
      { name: "Natural Teak", hex: "#8b6914" },
    ],
    materials: ["Tung oil", "UV inhibitors"],
    categories: ["Home & Garden", "Wood Care", "Marine"],
    features: [
      "3-in-1 clean, brighten, and protect formula",
      "UV inhibitors prevent graying",
      "Safe for all exterior wood",
      "Easy wipe-on application",
      "32 oz bottle",
    ],
  },
  "wide-leg-pant": {
    id: "wide-leg-pant",
    title: "Becalm Mid-rise Wide-leg Pant",
    brand: "Lululemon",
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&h=600&fit=crop",
    sourceUrl: "https://www.lululemon.com/becalm-mid-rise-wide-leg-pant",
    sourceDomain: "lululemon.com",
    price: 128,
    description: "Relaxed wide-leg pants designed for all-day comfort. Made with soft, breathable fabric that moves with you. Features a mid-rise waist and side pockets.",
    colors: [
      { name: "Black", hex: "#1a1a1a" },
      { name: "Trench", hex: "#8b7355" },
      { name: "True Navy", hex: "#1e3a5f" },
    ],
    materials: ["Luon fabric", "Four-way stretch"],
    categories: ["Women", "Pants", "Athleisure"],
    features: [
      "Mid-rise, wide-leg fit",
      "Four-way stretch Luon fabric",
      "Hidden waistband pocket",
      "Side pockets",
      "31\" inseam",
    ],
  },
  "clock-radio": {
    id: "clock-radio",
    title: "Alarm Clock Radio For Ipod",
    brand: "MEMOREX",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop",
    sourceUrl: "https://www.memorex.com/alarm-clock-radio-ipod",
    sourceDomain: "memorex.com",
    price: 39.99,
    originalPrice: 59.99,
    description: "Dual alarm clock radio with iPod dock. Wake up to your favorite music or FM radio. Large LED display with adjustable brightness.",
    colors: [
      { name: "Black", hex: "#1a1a1a" },
      { name: "Silver", hex: "#c0c0c0" },
    ],
    materials: ["ABS plastic", "LED display"],
    categories: ["Electronics", "Audio", "Clocks"],
    features: [
      "Dual alarm settings",
      "FM radio with preset stations",
      "iPod/iPhone dock (30-pin)",
      "Large LED display",
      "Adjustable brightness",
      "Battery backup",
    ],
  },
  "ballpoint-pens": {
    id: "ballpoint-pens",
    title: "Staples Ballpoint Pens",
    brand: "Staples",
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&h=600&fit=crop",
    sourceUrl: "https://www.staples.com/ballpoint-pens-medium-point",
    sourceDomain: "staples.com",
    price: 6.99,
    description: "Reliable medium point ballpoint pens with smooth ink flow. Comfortable grip for extended writing sessions. Available in classic black ink.",
    colors: [
      { name: "Black Ink", hex: "#1a1a1a" },
      { name: "Blue Ink", hex: "#0066cc" },
    ],
    materials: ["Plastic barrel", "Rubber grip"],
    categories: ["Office Supplies", "Pens", "Writing"],
    features: [
      "Medium point (1.0mm)",
      "Smooth ink flow",
      "Comfortable rubber grip",
      "12 pens per pack",
      "Retractable tip",
    ],
  },
}

// Default product for unknown slugs
const defaultProduct: ProductData = {
  id: "default",
  title: "Supersoft Warm Toned Upcycled Organic Cotton Gauze Kids Quilt Duvet Cover Set",
  brand: "Crate & Kids",
  image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=600&fit=crop",
  sourceUrl: "https://www.crateandbarrel.com/supersoft-warm-toned-upcycled-organic-cotton-gauze-kids-quilt-duvet",
  sourceDomain: "crateandbarrel.com",
  price: 42.95,
  originalPrice: 189.95,
  description: "A kids bedding set featuring a patchwork quilt and duvet cover in warm-toned upcycled organic cotton gauze. Includes quilt, sham, and coordinating sheet set with a waffle-weave Scoop duvet cover that reverses to smooth cotton for two textures. Made from 100% organic cotton shells with recycled polyester fill for the quilt and sham; upcycled fabric scraps reduce waste. OEKO-TEX Standard 100 certified textile safety. Colors include pink, brown, and white in a patchwork pattern with a solid brown reverse.",
  colors: [
    { name: "Pink", hex: "#d4627a" },
    { name: "Cream", hex: "#f5f5f0" },
    { name: "Rust", hex: "#c67c4e" },
  ],
  materials: ["100% organic cotton shell", "recycled polyester fill", "upcycled fabric scraps"],
  categories: ["Duvet Covers", "Quilts & Comforters"],
  features: [
    "Duvet cover and sheet set: 100% organic cotton, grown without pesticides or synthetic fertilizers",
    "OEKO-TEX Standard 100 certified for textile safety",
    "Reversible design with waffle-weave and smooth cotton textures",
    "Machine washable for easy care",
    "Upcycled fabric scraps reduce environmental waste",
  ],
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const product = productsData[slug] || defaultProduct

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link 
          href="/seller/catalog/nohi-database/products" 
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Products
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground truncate max-w-[300px]">{product.title}</span>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Product Image */}
        <div className="aspect-square rounded-2xl bg-secondary overflow-hidden">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="flex flex-col gap-6">
          {/* Brand & Title */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">{product.brand}</p>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight mt-1 leading-tight">
              {product.title}
            </h1>
          </div>

          {/* Source & Price */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{product.sourceDomain}</span>
              <a 
                href={product.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground truncate max-w-[250px] transition-colors"
              >
                {product.sourceUrl}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold text-foreground">${product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">${product.originalPrice.toFixed(2)}</span>
              )}
              <a
                href={product.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-foreground">Description</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Colors */}
          {product.colors.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-foreground">Colors</h2>
              <div className="flex items-center gap-2">
                {product.colors.map((color) => (
                  <div
                    key={color.name}
                    className="size-8 rounded-full ring-1 ring-inset ring-foreground/10"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Materials */}
          {product.materials.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-foreground">Materials</h2>
              <div className="flex flex-wrap gap-2">
                {product.materials.map((material) => (
                  <span
                    key={material}
                    className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary/50 rounded-lg"
                  >
                    {material}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {product.categories.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-foreground">Categories</h2>
              <div className="flex flex-wrap gap-2">
                {product.categories.map((category) => (
                  <span
                    key={category}
                    className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary/50 rounded-lg"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Features */}
          {product.features.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-foreground">Key Features</h2>
              <ul className="list-disc list-inside space-y-1">
                {product.features.map((feature, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Add to Catalog Button */}
          <Button className="rounded-full mt-2" size="lg">
            Add to Catalog
          </Button>
        </div>
      </div>
    </div>
  )
}
