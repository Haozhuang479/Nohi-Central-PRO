
import { useState } from "react"
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Search, ArrowLeft } from "lucide-react"

// Brand data with descriptions
const brandsData: Record<string, { name: string; logo: string; description: string; commission: string | null }> = {
  "loewe": {
    name: "Loewe",
    logo: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=80&h=80&fit=crop",
    description: "Loewe is a luxury fashion house known for its leather goods and ready-to-wear.",
    commission: null
  },
  "louis-vuitton": {
    name: "Louis Vuitton",
    logo: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=80&h=80&fit=crop",
    description: "Louis Vuitton is a French luxury fashion house and company founded in 1854.",
    commission: null
  },
  "rolex": {
    name: "Rolex",
    logo: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop",
    description: "Rolex is a Swiss luxury watchmaker known for precision and prestige.",
    commission: null
  },
  "burberry": {
    name: "Burberry",
    logo: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=80&h=80&fit=crop",
    description: "Burberry is a British luxury fashion house known for its iconic check pattern.",
    commission: null
  },
  "hermes": {
    name: "Hermes",
    logo: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=80&h=80&fit=crop",
    description: "Hermes is a French luxury goods manufacturer specializing in leather, lifestyle accessories, and more.",
    commission: null
  },
  "fendi": {
    name: "Fendi",
    logo: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=80&h=80&fit=crop",
    description: "Fendi is an Italian luxury fashion house known for its fur, ready-to-wear, and leather goods.",
    commission: null
  },
  "blundstone": {
    name: "Blundstone",
    logo: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=80&h=80&fit=crop",
    description: "Blundstone is an Australian footwear company known for its durable Chelsea boots.",
    commission: null
  },
  "alexander-mcqueen": {
    name: "Alexander McQueen",
    logo: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop",
    description: "Alexander McQueen is a British luxury fashion house known for its avant-garde designs.",
    commission: "Up to 1.75%"
  },
  "dolce-gabbana": {
    name: "Dolce and Gabbana",
    logo: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=80&h=80&fit=crop",
    description: "Dolce & Gabbana is an Italian luxury fashion house founded by Domenico Dolce and Stefano Gabbana.",
    commission: "Up to 2.8%"
  },
  "balenciaga": {
    name: "Balenciaga",
    logo: "https://images.unsplash.com/photo-1518894781321-630e638d0742?w=80&h=80&fit=crop",
    description: "Balenciaga is a Spanish luxury fashion house founded by Cristobal Balenciaga.",
    commission: null
  },
  "bottega-veneta": {
    name: "Bottega Veneta",
    logo: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=80&h=80&fit=crop",
    description: "Bottega Veneta is an Italian luxury fashion house known for its intrecciato leather weaving.",
    commission: null
  },
  "gucci": {
    name: "Gucci",
    logo: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=80&h=80&fit=crop",
    description: "Gucci is an Italian luxury fashion house known for its contemporary yet eclectic style.",
    commission: null
  }
}

// Sample products for each brand
const sampleProducts = [
  { id: "1", title: "Solo Ella Edp 15ml", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=300&h=300&fit=crop" },
  { id: "2", title: "Classic Sunglasses", image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300&h=300&fit=crop" },
  { id: "3", title: "Designer Sunglasses Dark", image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300&h=300&fit=crop" },
  { id: "4", title: "Parrot Bag Charm", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=300&fit=crop" },
  { id: "5", title: "Long-sleeve Cashmere Knit Mini Polo Dress", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop" },
  { id: "6", title: "Sports Bra", image: "https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=300&h=300&fit=crop" },
  { id: "7", title: "Mini Hammock Hobo Bag", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop" },
  { id: "8", title: "Asymmetric Button-front Shirt", image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=300&fit=crop" },
  { id: "9", title: "Logo Baseball Cap", image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&h=300&fit=crop" },
  { id: "10", title: "Classic Basket Raffia Tote Bag", image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=300&h=300&fit=crop" },
  { id: "11", title: "Signature Cat-eye Sunglasses", image: "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=300&h=300&fit=crop" },
  { id: "12", title: "Mini Puzzle Bag", image: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=300&h=300&fit=crop" },
]

export default function BrandDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [search, setSearch] = useState("")

  const brand = brandsData[slug]

  if (!brand) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h1 className="text-xl font-semibold text-foreground">Brand not found</h1>
        <Link to="/seller/catalog/nohi-database/brands" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Back to brands
        </Link>
      </div>
    )
  }

  const filteredProducts = sampleProducts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Back Link */}
      <Link 
        href="/seller/catalog/nohi-database/brands"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="size-4" />
        Back to brands
      </Link>

      {/* Brand Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="size-16 rounded-xl bg-secondary overflow-hidden shrink-0">
            <img
              src={brand.logo}
              alt={brand.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{brand.name}</h1>
            <p className="text-sm text-muted-foreground">
              {brand.description}
              {brand.commission ? ` Commission: ${brand.commission}.` : " This brand doesn't offer commission yet."}
            </p>
          </div>
        </div>
        <div className="relative w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredProducts.map((product) => (
          <div key={product.id} className="flex flex-col gap-2 group">
            <div className="aspect-square rounded-xl bg-secondary overflow-hidden">
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground line-clamp-2">{product.title}</span>
              <span className="text-xs text-muted-foreground">{brand.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
