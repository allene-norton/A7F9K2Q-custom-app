// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format cost range
 */
export function formatCostRange(min: number, max: number): string {
  return `${formatCurrency(min)}-${formatCurrency(max)}`;
}

/**
 * Get category color classes for badges
 */
export function getCategoryColor(category: string): string {
  switch (category) {
    case 'Urgent':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Recommended':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Cosmetic':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'No Issue':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Get status color classes
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'To Do':
      return 'bg-gray-100 text-gray-800';
    case 'In Progress':
      return 'bg-blue-100 text-blue-800';
    case 'Complete':
      return 'bg-green-100 text-green-800';
    case 'On Hold':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/**
 * Group items by category
 */
export function groupByCategory<T extends { category: string }>(items: T[]): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Sort items by priority (Urgent > Recommended > Cosmetic > No Issue)
 */
export function sortByPriority<T extends { category: string }>(items: T[]): T[] {
  const priorityOrder: Record<string, number> = {
    'Urgent': 1,
    'Recommended': 2,
    'Cosmetic': 3,
    'No Issue': 4
  };
  
  return [...items].sort((a, b) => {
    return (priorityOrder[a.category] || 99) - (priorityOrder[b.category] || 99);
  });
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
