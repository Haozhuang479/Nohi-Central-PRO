"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ArrowLeft, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"

// Product field options for mapping (from WooCommerce)
const productFieldOptions = [
  { value: "do-not-import", label: { en: "Do not import", zh: "不导入" } },
  { value: "", label: { en: "──────────", zh: "──────────" }, disabled: true },
  { value: "id", label: { en: "ID", zh: "ID" } },
  { value: "type", label: { en: "Type", zh: "类型" } },
  { value: "sku", label: { en: "SKU", zh: "SKU" } },
  { value: "gtin", label: { en: "GTIN, UPC, EAN, or ISBN", zh: "GTIN、UPC、EAN或ISBN" } },
  { value: "name", label: { en: "Name", zh: "名称" } },
  { value: "published", label: { en: "Published", zh: "已发布" } },
  { value: "is-featured", label: { en: "Is featured?", zh: "是否精选？" } },
  { value: "visibility", label: { en: "Visibility in catalog", zh: "目录可见性" } },
  { value: "short-description", label: { en: "Short description", zh: "简短描述" } },
  { value: "description", label: { en: "Description", zh: "描述" } },
  { value: "", label: { en: "── Price ──", zh: "── 价格 ──" }, disabled: true },
  { value: "regular-price", label: { en: "Regular price", zh: "原价" } },
  { value: "sale-price", label: { en: "Sale price", zh: "促销价" } },
  { value: "date-sale-start", label: { en: "Date sale price starts", zh: "促销开始日期" } },
  { value: "date-sale-end", label: { en: "Date sale price ends", zh: "促销结束日期" } },
  { value: "", label: { en: "──────────", zh: "──────────" }, disabled: true },
  { value: "tax-status", label: { en: "Tax status", zh: "税务状态" } },
  { value: "tax-class", label: { en: "Tax class", zh: "税类" } },
  { value: "in-stock", label: { en: "In stock?", zh: "有库存？" } },
  { value: "stock", label: { en: "Stock", zh: "库存" } },
  { value: "backorders", label: { en: "Backorders allowed?", zh: "允许缺货预订？" } },
  { value: "low-stock", label: { en: "Low stock amount", zh: "低库存数量" } },
  { value: "sold-individually", label: { en: "Sold individually?", zh: "单独销售？" } },
  { value: "weight", label: { en: "Weight (lbs)", zh: "重量(磅)" } },
  { value: "", label: { en: "── Dimensions ──", zh: "── 尺寸 ──" }, disabled: true },
  { value: "length", label: { en: "Length (in)", zh: "长度(英寸)" } },
  { value: "width", label: { en: "Width (in)", zh: "宽度(英寸)" } },
  { value: "height", label: { en: "Height (in)", zh: "高度(英寸)" } },
  { value: "", label: { en: "──────────", zh: "──────────" }, disabled: true },
  { value: "categories", label: { en: "Categories", zh: "分类" } },
  { value: "tags-comma", label: { en: "Tags (comma separated)", zh: "标签(逗号分隔)" } },
  { value: "tags-space", label: { en: "Tags (space separated)", zh: "标签(空格分隔)" } },
  { value: "shipping-class", label: { en: "Shipping class", zh: "配送类别" } },
  { value: "images", label: { en: "Images", zh: "图片" } },
  { value: "parent", label: { en: "Parent", zh: "父级" } },
  { value: "upsells", label: { en: "Upsells", zh: "追加销售" } },
  { value: "cross-sells", label: { en: "Cross-sells", zh: "交叉销售" } },
  { value: "grouped-products", label: { en: "Grouped products", zh: "组合产品" } },
  { value: "", label: { en: "── External product ──", zh: "── 外部产品 ──" }, disabled: true },
  { value: "external-url", label: { en: "External URL", zh: "外部URL" } },
  { value: "button-text", label: { en: "Button text", zh: "按钮文字" } },
  { value: "", label: { en: "── Downloads ──", zh: "── 下载 ──" }, disabled: true },
  { value: "download-id", label: { en: "Download ID", zh: "下载ID" } },
  { value: "download-name", label: { en: "Download name", zh: "下载名称" } },
  { value: "download-url", label: { en: "Download URL", zh: "下载URL" } },
  { value: "download-limit", label: { en: "Download limit", zh: "下载限制" } },
  { value: "download-expiry", label: { en: "Download expiry days", zh: "下载过期天数" } },
  { value: "", label: { en: "── Attributes ──", zh: "── 属性 ──" }, disabled: true },
  { value: "attribute-name", label: { en: "Attribute name", zh: "属性名称" } },
  { value: "attribute-values", label: { en: "Attribute value(s)", zh: "属性值" } },
  { value: "attribute-global", label: { en: "Is a global attribute?", zh: "是全局属性？" } },
  { value: "attribute-visibility", label: { en: "Attribute visibility", zh: "属性可见性" } },
  { value: "attribute-default", label: { en: "Default attribute", zh: "默认属性" } },
  { value: "", label: { en: "──────────", zh: "──────────" }, disabled: true },
  { value: "allow-reviews", label: { en: "Allow customer reviews?", zh: "允许客户评价？" } },
  { value: "purchase-note", label: { en: "Purchase note", zh: "购买备注" } },
  { value: "meta-data", label: { en: "Import as meta data", zh: "作为元数据导入" } },
  { value: "position", label: { en: "Position", zh: "位置" } },
  { value: "brands", label: { en: "Brands", zh: "品牌" } },
]

type Step = "upload" | "mapping" | "import" | "done"

interface CSVColumn {
  name: string
  sample: string
  mapping: string
}

export default function ImportProductsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t, language } = useLanguage()
  
  // Step state
  const [currentStep, setCurrentStep] = useState<Step>("upload")
  
  // Upload step state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [serverPath, setServerPath] = useState("")
  const [delimiter, setDelimiter] = useState(",")
  const [usePreviousMapping, setUsePreviousMapping] = useState(false)
  const [encoding, setEncoding] = useState("auto")
  
  // Mapping step state
  const [csvColumns, setCsvColumns] = useState<CSVColumn[]>([])
  
  // Import step state
  const [importProgress, setImportProgress] = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  
  // Done step state
  const [fileName, setFileName] = useState("")

  // Character encoding options
  const encodingOptions = [
    { value: "auto", label: t("import.autodetect") },
    { value: "utf-8", label: "UTF-8" },
    { value: "iso-8859-1", label: "ISO-8859-1" },
    { value: "windows-1252", label: "Windows-1252" },
  ]

  const steps = [
    { id: "upload", label: t("import.step1") },
    { id: "mapping", label: t("import.step2") },
    { id: "import", label: t("import.step3") },
    { id: "done", label: t("import.step4") },
  ]

  const getStepIndex = (step: Step) => steps.findIndex(s => s.id === step)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setFileName(file.name)
    }
  }

  const handleContinueFromUpload = () => {
    if (!selectedFile) return
    
    // Parse CSV headers and sample data
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n")
      if (lines.length > 0) {
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ""))
        const sampleLine = lines.length > 1 ? lines[1].split(delimiter).map(s => s.trim().replace(/"/g, "")) : []
        
        const columns: CSVColumn[] = headers.map((header, index) => ({
          name: header,
          sample: sampleLine[index] || "",
          mapping: "do-not-import"
        }))
        
        setCsvColumns(columns)
        setCurrentStep("mapping")
      }
    }
    reader.readAsText(selectedFile)
  }

  const handleContinueFromMapping = () => {
    setCurrentStep("import")
    // Simulate import progress
    simulateImport()
  }

  const simulateImport = () => {
    let progress = 0
    const totalProducts = Math.floor(Math.random() * 50) + 50 // Random 50-100 products
    
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setImportedCount(totalProducts)
        setTimeout(() => {
          setCurrentStep("done")
        }, 500)
      }
      setImportProgress(progress)
    }, 200)
  }

  const handleColumnMappingChange = (index: number, value: string) => {
    const newColumns = [...csvColumns]
    newColumns[index].mapping = value
    setCsvColumns(newColumns)
  }

  const getFieldLabel = (opt: typeof productFieldOptions[0]) => {
    return language === "zh" ? opt.label.zh : opt.label.en
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/seller/catalog/own-supply">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t("import.title")}</h1>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-0">
        {steps.map((step, index) => {
          const stepIndex = getStepIndex(step.id as Step)
          const currentIndex = getStepIndex(currentStep)
          const isCompleted = stepIndex < currentIndex
          const isCurrent = stepIndex === currentIndex
          
          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <span className={cn(
                  "text-sm font-medium mb-2",
                  isCurrent ? "text-[#2271b1]" : isCompleted ? "text-[#2271b1]" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                <div className="flex items-center">
                  {index > 0 && (
                    <div className={cn(
                      "w-24 h-[3px]",
                      isCompleted || isCurrent ? "bg-[#2271b1]" : "bg-muted-foreground/30"
                    )} />
                  )}
                  <div className={cn(
                    "size-3 rounded-full border-2 shrink-0",
                    isCompleted ? "bg-[#2271b1] border-[#2271b1]" : 
                    isCurrent ? "bg-[#2271b1] border-[#2271b1]" : 
                    "bg-background border-muted-foreground/30"
                  )} />
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "w-24 h-[3px]",
                      isCompleted ? "bg-[#2271b1]" : "bg-muted-foreground/30"
                    )} />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Content Card */}
      <div className="rounded-xl bg-background border border-border overflow-hidden">
        {/* Step 1: Upload CSV */}
        {currentStep === "upload" && (
          <>
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-medium text-foreground">{t("import.uploadTitle")}</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {t("import.uploadDesc")}
              </p>
            </div>
            
            <div className="p-6 space-y-6 border-b border-border">
              {/* File Upload */}
              <div className="flex items-start gap-8">
                <Label className="text-sm text-foreground w-48 pt-2 shrink-0">
                  {t("import.chooseFile")}
                </Label>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-md"
                    >
                      {t("import.chooseFileBtn")}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedFile ? selectedFile.name : t("import.noFileChosen")}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t("import.maxSize")}</p>
                </div>
              </div>

              {/* Update Existing */}
              <div className="flex items-start gap-8">
                <Label className="text-sm text-foreground w-48 shrink-0">
                  {t("import.updateExisting")}
                </Label>
                <div className="flex-1">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="update-existing"
                      checked={updateExisting}
                      onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
                    />
                    <label htmlFor="update-existing" className="text-sm text-muted-foreground leading-relaxed">
                      {t("import.updateExistingDesc")}
                    </label>
                  </div>
                </div>
              </div>

              {/* Advanced Options */}
              {showAdvanced && (
                <div className="space-y-6 pt-4 border-t border-border mt-6">
                  {/* Server Path */}
                  <div className="flex items-start gap-8">
                    <Label className="text-sm text-foreground w-48 pt-2 shrink-0">
                      {t("import.serverPath")}
                    </Label>
                    <div className="flex-1">
                      <Input
                        value={serverPath}
                        onChange={(e) => setServerPath(e.target.value)}
                        placeholder="/wordpress/core/6.9.4/"
                        className="rounded-md"
                      />
                    </div>
                  </div>

                  {/* CSV Delimiter */}
                  <div className="flex items-start gap-8">
                    <Label className="text-sm text-foreground w-48 pt-2 shrink-0">
                      {t("import.delimiter")}
                    </Label>
                    <div className="flex-1">
                      <Input
                        value={delimiter}
                        onChange={(e) => setDelimiter(e.target.value)}
                        className="w-16 rounded-md text-center"
                        maxLength={1}
                      />
                    </div>
                  </div>

                  {/* Use Previous Mapping */}
                  <div className="flex items-start gap-8">
                    <Label className="text-sm text-foreground w-48 shrink-0">
                      {t("import.usePrevious")}
                    </Label>
                    <div className="flex-1">
                      <Checkbox
                        id="use-previous"
                        checked={usePreviousMapping}
                        onCheckedChange={(checked) => setUsePreviousMapping(checked as boolean)}
                      />
                    </div>
                  </div>

                  {/* Character Encoding */}
                  <div className="flex items-start gap-8">
                    <Label className="text-sm text-foreground w-48 pt-2 shrink-0">
                      {t("import.encoding")}
                    </Label>
                    <div className="flex-1">
                      <Select value={encoding} onValueChange={setEncoding}>
                        <SelectTrigger className="w-48 rounded-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {encodingOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 flex items-center justify-between">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                {showAdvanced ? t("import.hideAdvanced") : t("import.showAdvanced")}
              </button>
              <Button
                onClick={handleContinueFromUpload}
                disabled={!selectedFile}
                className="rounded-md bg-[#2271b1] hover:bg-[#1a5a8e]"
              >
                {t("import.continue")}
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Column Mapping */}
        {currentStep === "mapping" && (
          <>
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-medium text-foreground">{t("import.mapTitle")}</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {t("import.mapDesc")}
              </p>
            </div>
            
            <div className="p-6 border-b border-border">
              {/* Column Headers */}
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                <div className="flex-1">
                  <span className="text-sm font-semibold text-foreground">{t("import.columnName")}</span>
                </div>
                <div className="w-64">
                  <span className="text-sm font-semibold text-foreground">{t("import.mapToField")}</span>
                </div>
              </div>

              {/* Column Mappings */}
              <div className="divide-y divide-border">
                {csvColumns.map((column, index) => (
                  <div key={index} className="flex items-start gap-4 py-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{column.name}</p>
                      {column.sample && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {t("import.sample")}: {column.sample}
                        </p>
                      )}
                    </div>
                    <div className="w-64">
                      <Select
                        value={column.mapping}
                        onValueChange={(value) => handleColumnMappingChange(index, value)}
                      >
                        <SelectTrigger className="rounded-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          {productFieldOptions.map((opt, i) => (
                            opt.disabled ? (
                              <div key={i} className="px-2 py-1 text-xs text-muted-foreground">
                                {getFieldLabel(opt)}
                              </div>
                            ) : (
                              <SelectItem key={opt.value || i} value={opt.value}>
                                {getFieldLabel(opt)}
                              </SelectItem>
                            )
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep("upload")}
                className="rounded-md"
              >
                {t("import.back")}
              </Button>
              <Button
                onClick={handleContinueFromMapping}
                className="rounded-md bg-[#2271b1] hover:bg-[#1a5a8e]"
              >
                {t("import.runImport")}
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Import Progress */}
        {currentStep === "import" && (
          <>
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium text-foreground">{t("import.importing")}</h2>
                <div className="size-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t("import.importingDesc")}
              </p>
            </div>
            
            <div className="p-6">
              {/* Progress Bar */}
              <div className="h-10 bg-muted rounded-md overflow-hidden">
                <div
                  className="h-full bg-[#2271b1] transition-all duration-200"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          </>
        )}

        {/* Step 4: Done */}
        {currentStep === "done" && (
          <>
            <div className="p-12 flex flex-col items-center justify-center text-center">
              {/* Success Icon */}
              <div className="size-24 rounded-full bg-[#2271b1] flex items-center justify-center mb-8">
                <Check className="size-12 text-white" strokeWidth={3} />
              </div>
              
              <p className="text-lg text-foreground">
                {t("import.complete")} <span className="font-semibold">{importedCount}</span> {t("import.productsImported")} <span className="font-semibold">{fileName}</span>
              </p>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex items-center justify-end">
              <Button
                onClick={() => router.push("/seller/catalog/own-supply")}
                className="rounded-md bg-[#2271b1] hover:bg-[#1a5a8e]"
              >
                {t("import.viewProducts")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
