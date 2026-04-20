// Store Information section of the Settings page.
// Extracted from src/pages/seller/settings/page.tsx (Phase D) so the host
// page can shed LOC and so this form can potentially be reused if the
// onboarding flow ever comes back. Draft state + persist handler are lifted
// up — this component is pure render/edit, never owns the settings.

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NohiSettings } from '../../../electron/main/engine/types'

const STORE_CATEGORIES = [
  'Fashion & Apparel',
  'Electronics',
  'Home & Garden',
  'Beauty & Personal Care',
  'Sports & Outdoors',
  'Food & Beverage',
  'Toys & Games',
  'Books & Media',
  'Other',
]

const GMV_RANGES = [
  'Under $10k/month',
  '$10k–$50k/month',
  '$50k–$200k/month',
  '$200k–$1M/month',
  'Over $1M/month',
]

const TEAM_SIZES = ['1 (Solo)', '2–5', '6–20', '21–50', '50+']

interface StoreSectionProps {
  draft: NohiSettings
  patch: <K extends keyof NohiSettings>(key: K, value: NohiSettings[K]) => void
  storeEditing: boolean
  setStoreEditing: (v: boolean) => void
  onSaveStore: () => void
  onResetDraft: () => void
  language: 'en' | 'zh'
}

export function StoreSection({
  draft,
  patch,
  storeEditing,
  setStoreEditing,
  onSaveStore,
  onResetDraft,
  language,
}: StoreSectionProps): JSX.Element {
  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {language === 'zh' ? '品牌名称' : 'Brand Name'}
          </label>
          <Input
            value={draft.storeName ?? ''}
            onChange={(e) => { patch('storeName', e.target.value); setStoreEditing(true) }}
            placeholder={language === 'zh' ? '您的品牌名称' : 'Your brand name'}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {language === 'zh' ? '店铺 URL' : 'Store URL'}
          </label>
          <Input
            type="url"
            value={draft.storeUrl ?? ''}
            onChange={(e) => { patch('storeUrl', e.target.value); setStoreEditing(true) }}
            placeholder="https://yourstore.com"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {language === 'zh' ? '品类' : 'Category'}
          </label>
          <Select
            value={draft.storeCategory ?? ''}
            onValueChange={(v) => { patch('storeCategory', v); setStoreEditing(true) }}
          >
            <SelectTrigger>
              <SelectValue placeholder={language === 'zh' ? '选择品类' : 'Select category'} />
            </SelectTrigger>
            <SelectContent>
              {STORE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {language === 'zh' ? 'GMV 范围' : 'GMV Range'}
          </label>
          <Select
            value={draft.storeGmvRange ?? ''}
            onValueChange={(v) => { patch('storeGmvRange', v); setStoreEditing(true) }}
          >
            <SelectTrigger>
              <SelectValue placeholder={language === 'zh' ? '选择 GMV 范围' : 'Select GMV range'} />
            </SelectTrigger>
            <SelectContent>
              {GMV_RANGES.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            {language === 'zh' ? '团队规模' : 'Team Size'}
          </label>
          <Select
            value={draft.teamSize ?? ''}
            onValueChange={(v) => { patch('teamSize', v); setStoreEditing(true) }}
          >
            <SelectTrigger>
              <SelectValue placeholder={language === 'zh' ? '选择团队规模' : 'Select team size'} />
            </SelectTrigger>
            <SelectContent>
              {TEAM_SIZES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={onSaveStore}>
          {language === 'zh' ? '保存' : 'Save'}
        </Button>
        {storeEditing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => { onResetDraft(); setStoreEditing(false) }}
          >
            {language === 'zh' ? '取消' : 'Cancel'}
          </Button>
        )}
      </div>
    </div>
  )
}
