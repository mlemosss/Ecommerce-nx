import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { XMLParser } from 'fast-xml-parser';
import { PrismaService } from '../prisma/prisma.service';

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function toStringMap(row: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value === undefined || value === null ? '' : String(value)])
  );
}

function parseRows(
  format: 'csv' | 'xml',
  content: string,
  rootTag: string,
  rowTag: string
): Record<string, string>[] {
  if (format === 'csv') {
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });
  }
  const parsed = new XMLParser().parse(content) as Record<string, unknown>;
  const root = parsed[rootTag] as Record<string, unknown> | undefined;
  if (!root) return [];
  const rows = root[rowTag];
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  return list.map((row) => toStringMap(row as Record<string, unknown>));
}

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importCustomers(format: 'csv' | 'xml', content: string): Promise<ImportResult> {
    let rows: Record<string, string>[];
    try {
      rows = parseRows(format, content, 'customers', 'customer');
    } catch (err) {
      throw new BadRequestException(`Arquivo inválido: ${(err as Error).message}`);
    }

    const result: ImportResult = { total: rows.length, created: 0, updated: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;
      const name = row.name?.trim();
      if (!name) {
        result.errors.push({ row: rowNumber, message: 'Nome é obrigatório' });
        continue;
      }

      try {
        const email = row.email?.trim() || undefined;
        const documentNumber = row.documentNumber?.trim() || undefined;
        const data = {
          name,
          personType: row.personType?.trim().toUpperCase() === 'PJ' ? 'PJ' : 'PF',
          documentNumber: documentNumber ?? null,
          phone: row.phone?.trim() || null,
          email: email ?? null,
          city: row.city?.trim() || null,
          state: row.state?.trim() || null,
          zipCode: row.zipCode?.trim() || null,
          street: row.street?.trim() || null,
          number: row.number?.trim() || null,
          complement: row.complement?.trim() || null,
          neighborhood: row.neighborhood?.trim() || null,
        };

        const existing = email
          ? await this.prisma.customer.findFirst({ where: { email } })
          : documentNumber
          ? await this.prisma.customer.findFirst({ where: { documentNumber } })
          : null;

        if (existing) {
          await this.prisma.customer.update({ where: { id: existing.id }, data });
          result.updated++;
        } else {
          await this.prisma.customer.create({ data });
          result.created++;
        }
      } catch (err) {
        result.errors.push({ row: rowNumber, message: (err as Error).message });
      }
    }

    return result;
  }

  async importProducts(format: 'csv' | 'xml', content: string): Promise<ImportResult> {
    let rows: Record<string, string>[];
    try {
      rows = parseRows(format, content, 'products', 'product');
    } catch (err) {
      throw new BadRequestException(`Arquivo inválido: ${(err as Error).message}`);
    }

    const result: ImportResult = { total: rows.length, created: 0, updated: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;
      const name = row.name?.trim();
      const category = row.category?.trim();
      const color = row.color?.trim();
      const size = row.size?.trim();
      const price = Number(row.price);
      const costPrice = Number(row.costPrice);
      const stock = Number(row.stock ?? 0);

      if (!name || !category || !color || !size || Number.isNaN(price) || Number.isNaN(costPrice)) {
        result.errors.push({
          row: rowNumber,
          message: 'Campos obrigatórios ausentes ou inválidos (name, category, price, costPrice, color, size)',
        });
        continue;
      }

      try {
        const compareAtPrice = row.compareAtPrice?.trim() ? Number(row.compareAtPrice) : undefined;
        let product = await this.prisma.product.findFirst({ where: { name } });

        if (!product) {
          const slug = await this.uniqueSlug(name);
          product = await this.prisma.product.create({
            data: { name, slug, category, price, costPrice, compareAtPrice },
          });
          result.created++;
        } else {
          await this.prisma.product.update({
            where: { id: product.id },
            data: { category, price, costPrice, compareAtPrice },
          });
          result.updated++;
        }

        await this.prisma.productVariant.upsert({
          where: { productId_color_size: { productId: product.id, color, size } },
          create: { productId: product.id, color, size, stock: Number.isNaN(stock) ? 0 : stock },
          update: { stock: Number.isNaN(stock) ? 0 : stock },
        });
      } catch (err) {
        result.errors.push({ row: rowNumber, message: (err as Error).message });
      }
    }

    return result;
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let counter = 1;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter += 1;
    }
    return slug;
  }
}
