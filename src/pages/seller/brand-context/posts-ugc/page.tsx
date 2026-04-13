import { useState, useRef, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Plus, ExternalLink, Trash2, Image as ImageIcon, Video, Star, X } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

// ── Types & mock data ─────────────────────────────────────────────────────────

interface NohiPost {
  id: string
  title: string
  content: string
  tags: string[]
  image?: string
  publishedAt: string
  status: "published" | "draft" | "scheduled"
}

interface Review {
  id: string
  author: string
  rating: number
  text: string
  product: string
  date: string
  verified: boolean
}

interface MediaAsset {
  id: string
  type: "image" | "video"
  name: string
  caption: string
  tags: string[]
  publishedAt: string
  url: string
}

interface UGCAsset {
  id: string
  creator: string
  platform: string
  type: "image" | "video"
  caption: string
  date: string
  approved: boolean
}

const initialPosts: NohiPost[] = [
  {
    id: "1",
    title: "Spring Collection 2026",
    content: "Introducing our new sustainable spring line. Each piece is crafted from organic cotton and recycled materials, designed for everyday versatility.",
    tags: ["Spring", "Sustainable", "New Arrival"],
    publishedAt: "2026-02-10",
    status: "published",
  },
  {
    id: "2",
    title: "Behind the Design: Minimal Essentials",
    content: "A look at how we design our bestselling essentials collection, from concept sketches to final production.",
    tags: ["Behind the Scenes", "Design"],
    publishedAt: "2026-02-15",
    status: "published",
  },
  {
    id: "3",
    title: "Summer Preview",
    content: "Sneak peek at our upcoming summer range, featuring breathable fabrics and resort-ready silhouettes.",
    tags: ["Summer", "Preview"],
    publishedAt: "2026-03-01",
    status: "scheduled",
  },
]

const initialReviews: Review[] = [
  {
    id: "r1",
    author: "Sarah M.",
    rating: 5,
    text: "Absolutely love the quality. The fabric feels premium and the fit is perfect. Will definitely buy more.",
    product: "Classic Cotton Tee",
    date: "2026-02-08",
    verified: true,
  },
  {
    id: "r2",
    author: "James L.",
    rating: 4,
    text: "Great shirt, runs slightly large. Material is top notch though. Arrived in 3 days.",
    product: "Relaxed Fit Hoodie",
    date: "2026-02-05",
    verified: true,
  },
  {
    id: "r3",
    author: "Mia K.",
    rating: 5,
    text: "The packaging was beautiful and the product exceeded expectations. Sustainable fashion done right.",
    product: "Organic Linen Pants",
    date: "2026-01-28",
    verified: true,
  },
]

const initialMedia: MediaAsset[] = [
  {
    id: "m1",
    type: "image",
    name: "hero-spring-2026.jpg",
    caption: "Spring 2026 collection hero shot featuring our bestselling organic cotton pieces.",
    tags: ["Campaign", "Spring", "Hero"],
    publishedAt: "2026-02-01",
    url: "#",
  },
  {
    id: "m2",
    type: "video",
    name: "behind-the-scenes.mp4",
    caption: "A day at our design studio: see how we bring ideas from sketch to shelf.",
    tags: ["BTS", "Brand Story"],
    publishedAt: "2026-01-20",
    url: "#",
  },
  {
    id: "m3",
    type: "image",
    name: "product-flatlay-01.jpg",
    caption: "Flat lay of our essentials collection on natural linen.",
    tags: ["Product", "Flatlay"],
    publishedAt: "2026-01-15",
    url: "#",
  },
]

const initialUGC: UGCAsset[] = [
  {
    id: "u1",
    creator: "@style_with_sarah",
    platform: "Instagram",
    type: "image",
    caption: "Styled the new organic linen pants for a casual brunch look. So comfortable!",
    date: "2026-02-12",
    approved: true,
  },
  {
    id: "u2",
    creator: "@minareviews",
    platform: "TikTok",
    type: "video",
    caption: "Unboxing the spring collection - the packaging alone is worth it!",
    date: "2026-02-10",
    approved: true,
  },
  {
    id: "u3",
    creator: "@dailyjames",
    platform: "Instagram",
    type: "image",
    caption: "My go-to hoodie for WFH days. This brand just gets it.",
    date: "2026-02-06",
    approved: false,
  },
]

const postTagSuggestions = [
  "New Arrival", "Sale", "Sustainable", "Behind the Scenes",
  "Spring", "Summer", "Fall", "Winter", "Campaign",
  "Design", "Preview", "Collaboration", "Limited Edition",
]

const mediaTagSuggestions = [
  "Campaign", "Product", "Lifestyle", "Flatlay", "Hero",
  "BTS", "Brand Story", "Seasonal", "UGC", "Studio",
]

// ── SimpleTagInput ────────────────────────────────────────────────────────────

interface SimpleTagInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  suggestions: string[]
  placeholder?: string
}

function SimpleTagInput({ tags, onTagsChange, suggestions, placeholder }: SimpleTagInputProps) {
  const [inputVal, setInputVal] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (tag: string) => {
    const val = tag.trim()
    if (val && !tags.includes(val)) onTagsChange([...tags, val])
    setInputVal("")
    setShowSuggestions(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(inputVal) }
    if (e.key === "Backspace" && !inputVal && tags.length > 0)
      onTagsChange(tags.slice(0, -1))
  }

  const filtered = inputVal
    ? suggestions.filter((s) => s.toLowerCase().includes(inputVal.toLowerCase()) && !tags.includes(s))
    : suggestions.filter((s) => !tags.includes(s)).slice(0, 8)

  return (
    <div className="flex flex-col gap-2 relative">
      <div
        className="min-h-9 flex flex-wrap gap-1.5 rounded-xl bg-secondary border border-border px-3 py-2 cursor-text"
        onClick={() => { inputRef.current?.focus(); setShowSuggestions(true) }}
      >
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-foreground text-background text-xs font-medium">
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTagsChange(tags.filter((t) => t !== tag)) }}
              className="hover:opacity-70"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => { setInputVal(e.target.value); setShowSuggestions(true) }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-20 bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground"
        />
      </div>
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl bg-popover border border-border shadow-md overflow-hidden">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(s) }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── PostStatusBadge ───────────────────────────────────────────────────────────

function PostStatusBadge({ status }: { status: NohiPost["status"] }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const label =
    status === "published" ? (zh ? "已发布" : "Published")
    : status === "scheduled" ? (zh ? "已排期" : "Scheduled")
    : (zh ? "草稿" : "Draft")
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs capitalize",
        status === "published" && "bg-foreground/10 text-foreground",
        status === "scheduled" && "bg-secondary text-muted-foreground",
        status === "draft" && "bg-secondary text-muted-foreground"
      )}
    >
      {label}
    </Badge>
  )
}

// ── CreatePostDialog ──────────────────────────────────────────────────────────

function CreatePostDialog({ onSubmit }: { onSubmit: (p: Pick<NohiPost, "title" | "content" | "tags" | "image">) => void }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [image, setImage] = useState("")

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return
    onSubmit({ title, content, tags, image: image || undefined })
    setTitle(""); setContent(""); setTags([]); setImage(""); setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5">
          <Plus className="size-3.5" />
          {zh ? "新建帖子" : "New Post"}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{zh ? "创建帖子" : "Create Post"}</DialogTitle>
          <DialogDescription>
            {zh ? "添加一篇新的品牌帖子供智能体参考。" : "Add a new brand post for agents to reference."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="post-title" className="text-sm">{zh ? "标题" : "Title"}</Label>
            <Input id="post-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={zh ? "帖子标题…" : "Post title…"} className="rounded-xl" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="post-content" className="text-sm">{zh ? "内容" : "Content"}</Label>
            <Textarea id="post-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder={zh ? "帖子内容…" : "Post content…"} rows={4} className="rounded-xl resize-none" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="post-image" className="text-sm">{zh ? "图片链接（可选）" : "Image URL (optional)"}</Label>
            <Input id="post-image" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" className="rounded-xl" />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">{zh ? "标签" : "Tags"}</Label>
            <SimpleTagInput tags={tags} onTagsChange={setTags} suggestions={postTagSuggestions} placeholder={zh ? "添加标签…" : "Add tags…"} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-full">{zh ? "取消" : "Cancel"}</Button>
          <Button onClick={handleSubmit} className="rounded-full" disabled={!title.trim() || !content.trim()}>{zh ? "创建" : "Create Post"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── CreateMediaDialog ─────────────────────────────────────────────────────────

function CreateMediaDialog({ onSubmit }: { onSubmit: (a: Pick<MediaAsset, "type" | "name" | "caption" | "tags">) => void }) {
  const { language } = useLanguage()
  const zh = language === "zh"
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<"image" | "video">("image")
  const [name, setName] = useState("")
  const [caption, setCaption] = useState("")
  const [tags, setTags] = useState<string[]>([])

  const handleSubmit = () => {
    if (!name.trim()) return
    onSubmit({ type, name, caption, tags })
    setName(""); setCaption(""); setTags([]); setType("image"); setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5">
          <Plus className="size-3.5" />
          {zh ? "上传媒体" : "Upload Media"}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{zh ? "上传品牌媒体" : "Upload Brand Media"}</DialogTitle>
          <DialogDescription>
            {zh ? "添加图片或视频资产供智能体参考。" : "Add image or video assets for agents to reference."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label className="text-sm">{zh ? "类型" : "Type"}</Label>
            <div className="flex gap-2">
              {(["image", "video"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={cn("px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                    type === t ? "bg-foreground text-background border-foreground" : "bg-secondary border-border text-foreground hover:bg-secondary/80"
                  )}>
                  {t === "image" ? (zh ? "图片" : "Image") : (zh ? "视频" : "Video")}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="media-name" className="text-sm">{zh ? "文件名" : "File Name"}</Label>
            <Input id="media-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={zh ? "filename.jpg" : "filename.jpg"} className="rounded-xl" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="media-caption" className="text-sm">{zh ? "描述" : "Caption"}</Label>
            <Textarea id="media-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={zh ? "描述这个媒体…" : "Describe this media…"} rows={3} className="rounded-xl resize-none" />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">{zh ? "标签" : "Tags"}</Label>
            <SimpleTagInput tags={tags} onTagsChange={setTags} suggestions={mediaTagSuggestions} placeholder={zh ? "添加标签…" : "Add tags…"} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-full">{zh ? "取消" : "Cancel"}</Button>
          <Button onClick={handleSubmit} className="rounded-full" disabled={!name.trim()}>{zh ? "上传" : "Upload"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PostsUGCPage() {
  const { language } = useLanguage()
  const zh = language === "zh"

  const [posts, setPosts] = useState(initialPosts)
  const [reviews] = useState(initialReviews)
  const [media, setMedia] = useState(initialMedia)
  const [ugc, setUGC] = useState(initialUGC)

  const pendingUGC = ugc.filter((u) => !u.approved).length

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {zh ? "帖子与 UGC" : "Posts & UGC"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {zh
            ? "管理帖子、已验证评价、品牌媒体和用户生成内容。"
            : "Manage posts, verified reviews, brand media, and UGC content."}
          {pendingUGC > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-foreground text-background text-xs font-medium">
              {pendingUGC} {zh ? "条待审核" : "pending review"}
            </span>
          )}
        </p>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full justify-start rounded-xl bg-secondary p-1 h-auto flex-wrap">
          <TabsTrigger value="posts" className="rounded-lg text-sm data-[state=active]:bg-background">
            {zh ? "品牌帖子" : "Nohi Posts"}
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-lg text-sm data-[state=active]:bg-background">
            {zh ? "已验证评价" : "Verified Reviews"}
          </TabsTrigger>
          <TabsTrigger value="media" className="rounded-lg text-sm data-[state=active]:bg-background">
            {zh ? "品牌媒体" : "Brand Media"}
          </TabsTrigger>
          <TabsTrigger value="ugc" className="rounded-lg text-sm data-[state=active]:bg-background">
            {zh ? "UGC 内容" : "UGC Assets"}
            {pendingUGC > 0 && (
              <span className="ml-1 size-4 inline-flex items-center justify-center rounded-full bg-foreground text-background text-[10px] font-semibold">
                {pendingUGC}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts" className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {posts.length} {zh ? "篇帖子" : "posts"}
            </p>
            <CreatePostDialog
              onSubmit={(post) =>
                setPosts((prev) => [
                  { ...post, id: String(Date.now()), publishedAt: new Date().toISOString().slice(0, 10), status: "draft" },
                  ...prev,
                ])
              }
            />
          </div>
          <div className="flex flex-col rounded-2xl divide-y divide-secondary bg-secondary/50 overflow-hidden">
            {posts.map((post) => (
              <div key={post.id} className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground truncate">{post.title}</h3>
                      <PostStatusBadge status={post.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPosts((prev) => prev.filter((p) => p.id !== post.id))}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                  <span className="text-xs text-muted-foreground tabular-nums ml-auto">{post.publishedAt}</span>
                </div>
              </div>
            ))}
            {posts.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                {zh ? "暂无帖子。" : "No posts yet."}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="mt-6 flex flex-col gap-4">
          <div className="rounded-xl bg-secondary/50 p-4 flex items-start gap-3">
            <div className="size-5 shrink-0 rounded-full bg-foreground/10 flex items-center justify-center mt-0.5">
              <span className="text-xs text-foreground/70">💡</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium">
                {zh ? "连接您的评价平台" : "Connect your review platform"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {zh
                  ? "将 Shopify、Judge.me 或其他平台的评价同步到此处供智能体引用。"
                  : "Sync reviews from Shopify, Judge.me or other platforms for agents to reference."}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {reviews.length} {zh ? "条已验证评价" : "verified reviews"}
          </p>
          <div className="flex flex-col rounded-2xl divide-y divide-secondary bg-secondary/50 overflow-hidden">
            {reviews.map((review) => (
              <div key={review.id} className="p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{review.author}</span>
                    {review.verified && (
                      <Badge variant="secondary" className="text-xs">{zh ? "已验证" : "Verified"}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("size-3.5", i < review.rating ? "fill-foreground text-foreground" : "text-border")} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-foreground">{review.text}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{zh ? "产品：" : "Product: "}{review.product}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{review.date}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Brand Media Tab */}
        <TabsContent value="media" className="mt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {media.length} {zh ? "个媒体资产" : "media assets"}
            </p>
            <CreateMediaDialog
              onSubmit={(asset) =>
                setMedia((prev) => [
                  { ...asset, id: String(Date.now()), publishedAt: new Date().toISOString().slice(0, 10), url: "#" },
                  ...prev,
                ])
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {media.map((item) => (
              <div key={item.id} className="rounded-2xl bg-secondary/50 overflow-hidden flex flex-col">
                <div className="h-36 bg-secondary flex items-center justify-center">
                  {item.type === "image" ? (
                    <ImageIcon className="size-8 text-muted-foreground/40" />
                  ) : (
                    <Video className="size-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                    <button
                      type="button"
                      onClick={() => setMedia((prev) => prev.filter((m) => m.id !== item.id))}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.caption}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground tabular-nums">{item.publishedAt}</span>
                    <a href={item.url} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                      {zh ? "打开" : "Open"} <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* UGC Tab */}
        <TabsContent value="ugc" className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {ugc.length} {zh ? "条 UGC 内容" : "UGC assets"}
            {pendingUGC > 0 && (
              <span className="ml-2 text-muted-foreground">
                · {pendingUGC} {zh ? "条待审核" : "pending review"}
              </span>
            )}
          </p>
          <div className="flex flex-col rounded-2xl divide-y divide-secondary bg-secondary/50 overflow-hidden">
            {ugc.map((item) => (
              <div key={item.id} className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{item.creator}</span>
                      <Badge variant="secondary" className="text-xs">{item.platform}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {item.type === "image" ? (zh ? "图片" : "Image") : (zh ? "视频" : "Video")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.caption}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!item.approved ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs h-7"
                        onClick={() =>
                          setUGC((prev) =>
                            prev.map((u) => u.id === item.id ? { ...u, approved: true } : u)
                          )
                        }
                      >
                        {zh ? "审批" : "Approve"}
                      </Button>
                    ) : (
                      <Badge className="bg-foreground text-background text-xs">
                        {zh ? "已审批" : "Approved"}
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => setUGC((prev) => prev.filter((u) => u.id !== item.id))}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{item.date}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
