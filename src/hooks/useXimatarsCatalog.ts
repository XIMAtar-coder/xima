import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

export type XimatarCatalogItem = {
  id: string;
  label: string; // db label (lowercase animal name)
  image_url: string | null;
  vector?: Record<string, any> | null;
  translation?: {
    title: string;
    core_traits?: string | null;
    weaknesses?: string | null;
    ideal_roles?: string | null;
    behavior?: string | null;
  } | null;
};

// Fetches all XIMAtars + translation for the current language
export const useXimatarsCatalog = () => {
  const { i18n } = useTranslation();
  const lang = (i18n.language || 'en').split('-')[0] as 'it' | 'en' | 'es';

  const [data, setData] = useState<XimatarCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('ximatars')
          .select(
            `id,label,image_url,vector,ximatar_translations:ximatar_translations!inner(lang,title,core_traits,weaknesses,ideal_roles,behavior)`
          )
          .eq('ximatar_translations.lang', lang)
          .order('label', { ascending: true });

        if (error) throw error;

        const items: XimatarCatalogItem[] = (data || []).map((row: any) => ({
          id: row.id,
          label: row.label,
          image_url: row.image_url,
          vector: row.vector,
          translation: row.ximatar_translations?.[0] || row.ximatar_translations,
        }));
        if (mounted) setData(items);
      } catch (e: any) {
        console.error('useXimatarsCatalog error', e);
        if (mounted) setError(e?.message || 'Failed to load XIMAtars');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [lang]);

  const catalogMap = useMemo(() => {
    const m = new Map<string, XimatarCatalogItem>();
    for (const item of data) m.set(item.label.toLowerCase(), item);
    return m;
  }, [data]);

  return { data, catalogMap, loading, error, lang } as const;
};
