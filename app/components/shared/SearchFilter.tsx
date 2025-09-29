'use client';

import { useState } from 'react';
import { ComponentSpec } from './types';

interface SearchFilterProps<T extends ComponentSpec> {
  items: T[];
  onFilteredItems: (filteredItems: T[]) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchFilter<T extends ComponentSpec>({ 
  items, 
  onFilteredItems, 
  placeholder = "Search...",
  className = ""
}: SearchFilterProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'manufacture' | 'recent'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    filterAndSort(term, sortBy, sortOrder);
  };

  const handleSort = (newSortBy: typeof sortBy, newSortOrder: typeof sortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    filterAndSort(searchTerm, newSortBy, newSortOrder);
  };

  const filterAndSort = (term: string, sortField: typeof sortBy, order: typeof sortOrder) => {
    let filtered = items;

    // Apply search filter
    if (term.trim()) {
      const lowerTerm = term.toLowerCase();
      filtered = items.filter(item => {
        // Search in name
        if (item.name.toLowerCase().includes(lowerTerm)) return true;
        
        // Search in build style
        if (item.manufacture?.toLowerCase().includes(lowerTerm)) return true;
        
        // Search in specific fields based on item type
        if ('material' in item && item.material?.toLowerCase().includes(lowerTerm)) return true;
        if ('diameter' in item && item.diameter?.toLowerCase().includes(lowerTerm)) return true;
        if ('length' in item && item.length?.toLowerCase().includes(lowerTerm)) return true;
        if ('category' in item && item.category?.toLowerCase().includes(lowerTerm)) return true;
        if ('difficulty' in item && item.difficulty?.toLowerCase().includes(lowerTerm)) return true;
        if ('description' in item && item.description?.toLowerCase().includes(lowerTerm)) return true;
        if ('exposedLength' in item && item.exposedLength?.toLowerCase().includes(lowerTerm)) return true;
        
        // Search in assembly notes
        if (item.assemblyNotes?.toLowerCase().includes(lowerTerm)) return true;
        
        // Search in machining steps
        if (item.machiningSteps?.some(step => {
          return step.process?.toLowerCase().includes(lowerTerm) ||
                 step.size?.toLowerCase().includes(lowerTerm) ||
                 step.threadSize?.toLowerCase().includes(lowerTerm) ||
                 step.depth?.toLowerCase().includes(lowerTerm) ||
                 step.finalDiameter?.toLowerCase().includes(lowerTerm);
        })) return true;

        return false;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'manufacture':
          aValue = (a.manufacture || '').toLowerCase();
          bValue = (b.manufacture || '').toLowerCase();
          break;
        case 'recent':
          // Sort by ID as a proxy for creation order (newer IDs are more recent)
          aValue = a.id;
          bValue = b.id;
          break;
      }

      if (order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    onFilteredItems(filtered);
  };

  const clearSearch = () => {
    setSearchTerm('');
    filterAndSort('', sortBy, sortOrder);
  };

  const getResultText = () => {
    const filteredCount = items.length;
    if (searchTerm.trim()) {
      return `${filteredCount} result${filteredCount !== 1 ? 's' : ''} found`;
    }
    return `${filteredCount} total item${filteredCount !== 1 ? 's' : ''}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="block w-full pl-10 pr-10 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100 text-sm"
          placeholder={placeholder}
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Sort Controls and Results */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Sort by:
          </label>
          <select
            value={sortBy}
            onChange={(e) => handleSort(e.target.value as typeof sortBy, sortOrder)}
            className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
          >
            <option value="name">Name</option>
            <option value="manufacture">Manufacture</option>
            <option value="recent">Most Recent</option>
          </select>
          <button
            onClick={() => handleSort(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            <svg className={`h-4 w-4 transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          </button>
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-400">
          {getResultText()}
        </div>
      </div>

      {/* Search Help */}
      {searchTerm.trim() && (
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
          <p className="font-medium mb-1">Search Tips:</p>
          <p>Search across names, build styles, materials, dimensions, assembly notes, and machining steps</p>
        </div>
      )}
    </div>
  );
}