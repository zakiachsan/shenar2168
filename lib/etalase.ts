import pool from './db';

export interface EtalaseProduct {
  productId: number;
  flashSaleStock?: number;
  flashSaleSold?: number;
}

export interface EtalaseSection {
  id: string;
  title: string;
  type: string;
  enabled: boolean;
  sortOrder: number;
  bannerImage?: string;
  bannerLink?: string;
  icon: string;
  isFlashSale: boolean;
  flashSaleEndTime?: string;
  products: EtalaseProduct[];
}

function getDefaultIcon(type: string): string {
  switch (type) {
    case 'flash_sale': return 'Zap';
    case 'discount': return 'Tag';
    case 'best_sellers': return 'TrendingUp';
    default: return 'LayoutGrid';
  }
}

async function getProductsForSection(sectionId: string): Promise<EtalaseProduct[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT product_id, flash_sale_stock, flash_sale_sold FROM etalase_products WHERE section_id = ?',
      [sectionId]
    );
    return (rows as any[]).map((r) => ({
      productId: r.product_id,
      flashSaleStock: r.flash_sale_stock ?? undefined,
      flashSaleSold: r.flash_sale_sold ?? undefined,
    }));
  } finally {
    connection.release();
  }
}

export async function getEtalase(): Promise<EtalaseSection[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute('SELECT * FROM etalase_sections ORDER BY sort_order');
    const sections = rows as any[];
    const result: EtalaseSection[] = [];
    for (const s of sections) {
      const products = await getProductsForSection(s.id);
      result.push({
        id: s.id,
        title: s.title,
        type: s.type,
        enabled: Boolean(s.enabled),
        sortOrder: s.sort_order,
        bannerImage: s.banner_image || undefined,
        bannerLink: s.banner_link || undefined,
        icon: s.icon || getDefaultIcon(s.type),
        isFlashSale: Boolean(s.is_flash_sale),
        flashSaleEndTime: s.flash_sale_end_time ? new Date(s.flash_sale_end_time).toISOString() : undefined,
        products,
      });
    }
    return result;
  } finally {
    connection.release();
  }
}

export async function getEnabledEtalase(): Promise<EtalaseSection[]> {
  const all = await getEtalase();
  return all.filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getEtalaseById(id: string): Promise<EtalaseSection | undefined> {
  const all = await getEtalase();
  return all.find((s) => s.id === id);
}

export async function saveEtalase(sections: EtalaseSection[]): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Delete all existing products first
    await connection.execute('DELETE FROM etalase_products');
    // Delete all existing sections
    await connection.execute('DELETE FROM etalase_sections');

    for (const s of sections) {
      await connection.execute(
        `INSERT INTO etalase_sections (id, title, type, enabled, sort_order, banner_image, banner_link, icon, is_flash_sale, flash_sale_end_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id,
          s.title,
          s.type,
          s.enabled ? 1 : 0,
          s.sortOrder,
          s.bannerImage || null,
          s.bannerLink || null,
          s.icon || getDefaultIcon(s.type),
          s.isFlashSale ? 1 : 0,
          s.flashSaleEndTime ? new Date(s.flashSaleEndTime) : null,
        ]
      );

      for (const p of s.products) {
        await connection.execute(
          `INSERT INTO etalase_products (section_id, product_id, flash_sale_stock, flash_sale_sold)
           VALUES (?, ?, ?, ?)`,
          [s.id, p.productId, p.flashSaleStock ?? null, p.flashSaleSold ?? null]
        );
      }
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
